import { useState, useEffect, useRef, useCallback } from 'react'
import { AppShell } from './ui/AppShell'
import { Header } from './ui/Header'
import { ChatScreen } from './ui/ChatScreen'
import { FilesScreen } from './ui/FilesScreen'
import { PreviewScreen } from './ui/PreviewScreen'
import { SettingsScreen } from './ui/SettingsScreen'
import { ModelSelector } from './ui/ModelSelector'
import { ImportModal, type ImportResult } from './ui/ImportModal'
import type {
  TabId, Project, ProjectFile, ProjectFolder, ProjectAsset, ChatMessage,
  AIProvider, FileSystemUIState, AIFileAction, CustomProviderConfig,
} from './types'
import * as projectService from './workspace/projectService'
import * as ls from './storage/ls'
import * as idb from './storage/idb'
import { sendMessage, buildSystemPrompt, PROVIDER_MODELS } from './ai/providers'
import { executeActions, buildActionSummary } from './ai/executeActions'
import { v4 as uuid } from 'uuid'

// ─── File save debounce ───────────────────────────────────────────────────────
const FILE_SAVE_DEBOUNCE_MS = 500

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('chat')
  const [project, setProject] = useState<Project | null>(null)
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [folders, setFolders] = useState<ProjectFolder[]>([])
  const [assets, setAssets] = useState<ProjectAsset[]>([])
  const [showImportModal, setShowImportModal] = useState(false)

  // File system UI state — lifted here so it survives tab switches
  const [fsUiState, setFsUiState] = useState<FileSystemUIState>({
    view: 'tree',
    expandedFolderIds: [],
    isCreatingFile: false,
  })

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [aiSettings, setAiSettings] = useState(() => ls.getAISettings())
  const [isInitializing, setIsInitializing] = useState(true)

  const abortRef = useRef<AbortController | null>(null)
  const lastUserMsgRef = useRef<string>('')

  // Debounce timer for file content saves
  const saveTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // ── Initialization — deterministic hydration ────────────────────────────

  useEffect(() => {
    async function init() {
      try {
        const lastId = ls.getLastProjectId()

        if (lastId) {
          const loaded = await projectService.loadFullProject(lastId)
          if (loaded) {
            setProject(loaded.project)
            setFiles(loaded.files)
            setFolders(loaded.folders)
            setAssets(loaded.assets)
            // Open editor if there's a valid active file
            if (loaded.project.activeFileId) {
              setFsUiState((prev) => ({ ...prev, view: 'editor' }))
            }
            return
          }
          // Project in LS not found in IDB — already cleaned up by loadFullProject
        }

        // No valid last project — create a fresh one
        const p = await projectService.createProject('My First Project')
        setProject(p)
        setFiles([])
        setFolders([])
        setAssets([])
      } catch (err) {
        console.error('Failed to initialize workspace:', err)
        // Create fresh project as fallback
        try {
          const p = await projectService.createProject('My First Project')
          setProject(p)
        } catch { /* ignore */ }
      } finally {
        setIsInitializing(false)
      }
    }
    init()
  }, [])

  // ── Reload files from IDB ────────────────────────────────────────────────

  const reloadFiles = useCallback(async (projectId: string) => {
    const [f, fo, a] = await Promise.all([
      projectService.getProjectFiles(projectId),
      projectService.getProjectFolders(projectId),
      projectService.getProjectAssets(projectId),
    ])
    setFiles(f)
    setFolders(fo)
    setAssets(a)
    setRefreshTrigger((n) => n + 1)
  }, [])

  // ── Project rename ───────────────────────────────────────────────────────

  const handleRenameProject = useCallback(async (name: string) => {
    if (!project) return
    await projectService.renameProject(project.id, name)
    setProject((prev) => prev ? { ...prev, name: name.trim() || prev.name } : prev)
  }, [project])

  // ── File operations ──────────────────────────────────────────────────────

  const handleCreateFile = useCallback(async (name: string) => {
    if (!project) return
    try {
      const file = await projectService.createFile(
        project.id, name, projectService.getFileTemplate(name), null
      )
      setFiles((prev) => [...prev, file])
      const updated: Project = { ...project, activeFileId: file.id, updatedAt: new Date().toISOString() }
      setProject(updated)
      await projectService.saveProject(updated)
      setFsUiState((prev) => ({ ...prev, view: 'editor', isCreatingFile: false }))
      setRefreshTrigger((n) => n + 1)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      alert(msg)
    }
  }, [project])

  const handleSelectFile = useCallback(async (file: ProjectFile) => {
    if (!project) return
    const updated: Project = { ...project, activeFileId: file.id, updatedAt: new Date().toISOString() }
    setProject(updated)
    await projectService.saveProject(updated)
    setFsUiState((prev) => ({ ...prev, view: 'editor' }))
  }, [project])

  const handleDeleteFile = useCallback(async (file: ProjectFile) => {
    if (!project) return
    // Cancel any pending save for this file
    if (saveTimerRef.current[file.id]) {
      clearTimeout(saveTimerRef.current[file.id])
      delete saveTimerRef.current[file.id]
    }
    await projectService.deleteFile(file.id)
    setFiles((prev) => prev.filter((f) => f.id !== file.id))

    const remaining = files.filter((f) => f.id !== file.id)
    const newActiveId = project.activeFileId === file.id
      ? (remaining[0]?.id ?? null)
      : project.activeFileId

    if (newActiveId !== project.activeFileId) {
      const updated: Project = { ...project, activeFileId: newActiveId }
      setProject(updated)
      await projectService.saveProject(updated)
    }

    if (!newActiveId) {
      setFsUiState((prev) => ({ ...prev, view: 'tree' }))
    }
    setRefreshTrigger((n) => n + 1)
  }, [project, files])

  /**
   * Called on every keystroke in the editor.
   * Updates in-memory state immediately for a snappy UI,
   * debounces the IDB write by FILE_SAVE_DEBOUNCE_MS.
   */
  const handleUpdateContent = useCallback((fileId: string, content: string) => {
    // Optimistic in-memory update
    setFiles((prev) =>
      prev.map((f) => f.id === fileId ? { ...f, content, size: content.length } : f)
    )

    // Debounce IDB write
    if (saveTimerRef.current[fileId]) clearTimeout(saveTimerRef.current[fileId])
    saveTimerRef.current[fileId] = setTimeout(async () => {
      const fileInState = files.find((f) => f.id === fileId)
      if (!fileInState) return
      try {
        const saved = await projectService.updateFileContent(
          { ...fileInState, content },
          content
        )
        // Update state with the saved version (has new updatedAt)
        setFiles((prev) => prev.map((f) => f.id === fileId ? saved : f))
      } catch (err) {
        console.error('Failed to save file content:', err)
      }
    }, FILE_SAVE_DEBOUNCE_MS)
  }, [files])

  // ── Import handler ────────────────────────────────────────────────────────

  const handleImport = useCallback(async (results: ImportResult[]) => {
    if (!project) return

    for (const result of results) {
      if (result.kind === 'text') {
        // Check if file already exists → upsert
        await projectService.upsertFileByName(project.id, result.name, result.content)
      } else if (result.kind === 'asset') {
        // Check if asset with same name already exists → replace
        const existingAssets = await projectService.getProjectAssets(project.id)
        const existing = existingAssets.find((a) => a.fileName === result.name)
        if (existing) {
          await projectService.deleteAsset(existing.id)
        }
        await projectService.createAsset(project.id, result.name, result.mimeType, result.blob)
      }
    }

    await reloadFiles(project.id)
    setActiveTab('files')
  }, [project, reloadFiles])

  // ── Apply action from chat artifact ──────────────────────────────────────

  const handleApplyAction = useCallback(async (
    action: AIFileAction
  ): Promise<{ success: boolean; error?: string }> => {
    if (!project) return { success: false, error: 'No project loaded' }

    try {
      const results = await executeActions(project.id, [action])
      const result = results[0]
      if (!result) return { success: false, error: 'No result returned' }

      if (result.success) {
        await reloadFiles(project.id)
        setRefreshTrigger((n) => n + 1)
        return { success: true }
      } else {
        return { success: false, error: result.error }
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      return { success: false, error }
    }
  }, [project, reloadFiles])

  // ── Chat / AI ────────────────────────────────────────────────────────────

  const buildProjectContext = useCallback(() => {
    if (files.length === 0) return 'No files yet — start fresh!'
    return files
      .filter((f) => f.type === 'text')
      .map((f) => {
        const preview = f.content.slice(0, 800)
        const truncated = f.content.length > 800 ? '\n...(truncated)' : ''
        return `=== ${f.name} ===\n${preview}${truncated}`
      })
      .join('\n\n')
  }, [files])

  const handleSend = useCallback(async (text: string) => {
    if (!project || isStreaming) return

    setChatError(null)
    lastUserMsgRef.current = text

    const userMsg: ChatMessage = {
      id: uuid(), role: 'user', content: text, timestamp: new Date().toISOString(),
    }
    const assistantMsgId = uuid()
    const assistantMsg: ChatMessage = {
      id: assistantMsgId, role: 'assistant', content: '',
      timestamp: new Date().toISOString(), isStreaming: true,
    }

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setIsStreaming(true)
    abortRef.current = new AbortController()

    const provider = aiSettings.activeProvider
    const isCustom = provider === 'custom'
    const apiKey = isCustom ? aiSettings.customProvider.apiKey : (aiSettings.apiKeys[provider] ?? '')

    if (!apiKey) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: `⚠️ No API key set for ${provider}. Go to Settings to add your key.`, isStreaming: false }
            : m
        )
      )
      setIsStreaming(false)
      return
    }

    let fullDisplayText = ''

    try {
      const systemPrompt = buildSystemPrompt(aiSettings.customInstruction, buildProjectContext())

      const isCustomProvider = provider === 'custom'
      const result = await sendMessage({
        provider,
        model: isCustomProvider ? aiSettings.customProvider.model : aiSettings.activeModel,
        apiKey,
        endpoint: isCustomProvider ? aiSettings.customProvider.endpoint : undefined,
        extraHeaders: isCustomProvider ? aiSettings.customProvider.extraHeaders : undefined,
        messages: [...messages, userMsg].filter((m) => m.role !== 'system'),
        systemPrompt,
        onChunk: (chunk) => {
          // During streaming, show raw text; we'll clean it up after
          fullDisplayText += chunk
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId ? { ...m, content: fullDisplayText } : m
            )
          )
        },
        signal: abortRef.current.signal,
      })

      // Execute file actions automatically
      let actionResults = undefined
      let finalContent = result.displayText || result.rawText

      if (result.structured?.actions && result.structured.actions.length > 0) {
        actionResults = await executeActions(project.id, result.structured.actions)
        await reloadFiles(project.id)
        setActiveTab('files')

        // Build action summary to append
        const summary = buildActionSummary(actionResults)
        if (summary) {
          finalContent = finalContent
            ? `${finalContent}\n\n${summary}`
            : summary
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: finalContent, isStreaming: false, actionResults }
            : m
        )
      )
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err)
      if (error.includes('abort') || error.toLowerCase().includes('aborterror')) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: fullDisplayText || '(stopped)', isStreaming: false }
              : m
          )
        )
      } else {
        setChatError(error)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: fullDisplayText || 'Something went wrong.', isStreaming: false, error }
              : m
          )
        )
      }
    } finally {
      setIsStreaming(false)
    }
  }, [project, isStreaming, aiSettings, messages, buildProjectContext, reloadFiles])

  const handleStop = useCallback(() => { abortRef.current?.abort() }, [])

  const handleRetry = useCallback(() => {
    if (!lastUserMsgRef.current) return
    // Remove the last user+assistant pair before retrying
    setMessages((prev) => {
      const lastUserIdx = [...prev].reverse().findIndex((m) => m.role === 'user')
      if (lastUserIdx < 0) return prev
      const cutAt = prev.length - 1 - lastUserIdx
      return prev.slice(0, cutAt)
    })
    handleSend(lastUserMsgRef.current)
  }, [handleSend])

  // ── Settings ─────────────────────────────────────────────────────────────

  const handleUpdateProvider = useCallback((provider: AIProvider) => {
    ls.setActiveProvider(provider)
    // Auto-select first model for built-in providers
    if (provider !== 'custom') {
      const group = PROVIDER_MODELS.find((g) => g.provider === provider)
      if (group) ls.setActiveModel(group.models[0].value)
    }
    setAiSettings(ls.getAISettings())
  }, [])

  const handleUpdateModel = useCallback((_provider: AIProvider, model: string) => {
    ls.setActiveModel(model)
    setAiSettings(ls.getAISettings())
  }, [])

  const handleUpdateApiKey = useCallback((provider: AIProvider, key: string) => {
    ls.setApiKey(provider, key)
    setAiSettings(ls.getAISettings())
  }, [])

  const handleUpdateSystemInstruction = useCallback((text: string) => {
    ls.setCustomInstruction(text)
    setAiSettings(ls.getAISettings())
  }, [])

  const handleUpdateCustomProvider = useCallback((config: CustomProviderConfig) => {
    ls.setCustomProviderConfig(config)
    setAiSettings(ls.getAISettings())
  }, [])

  const handleDeleteProject = useCallback(async () => {
    if (!project) return
    await projectService.deleteProjectData(project.id)
    const p = await projectService.createProject('New Project')
    setProject(p)
    setFiles([])
    setFolders([])
    setAssets([])
    setMessages([])
    setFsUiState({ view: 'tree', expandedFolderIds: [], isCreatingFile: false })
    setRefreshTrigger((n) => n + 1)
  }, [project])

  const handleResetAll = useCallback(async () => {
    // Clear localStorage first
    ls.clearAllAppKeys()
    // Delete entire IDB database
    await idb.deleteDatabase()
    window.location.reload()
  }, [])

  const handleModelSelect = useCallback((provider: AIProvider, model: string) => {
    ls.setActiveProvider(provider)
    ls.setActiveModel(model)
    setAiSettings(ls.getAISettings())
  }, [])

  // ── Loading state ────────────────────────────────────────────────────────

  if (isInitializing) {
    return (
      <div style={{ height: '100dvh', background: '#0d0d0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#4a4a54', fontSize: '13px' }}>
          <div style={{ width: '32px', height: '32px', border: '2px solid #242428', borderTopColor: '#a855f7', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
          Loading workspace…
        </div>
      </div>
    )
  }

  const activeProvider = aiSettings.activeProvider
  const activeModel = aiSettings.activeModel

  return (
    <>
      <style>{globalStyles}</style>

      <AppShell
        activeTab={activeTab}
        onTabChange={setActiveTab}
        header={
          <Header
            projectName={project?.name ?? 'Project'}
            onRenameProject={handleRenameProject}
            activeProvider={activeProvider}
            activeModel={activeProvider === 'custom' ? aiSettings.customProvider.model : activeModel}
            customProviderLabel={aiSettings.customProvider.label}
            onOpenModelSelector={() => setShowModelSelector(true)}
            onOpenSettings={() => setActiveTab('settings')}
          />
        }

      >
        {/* All tabs are rendered but only the active one is visible.
            This preserves local state (e.g. editor view) across tab switches. */}

        <div style={{ display: activeTab === 'chat' ? 'flex' : 'none', height: '100%', flexDirection: 'column' }}>
          <ChatScreen
            messages={messages}
            isStreaming={isStreaming}
            onSend={handleSend}
            onStop={handleStop}
            onRetry={handleRetry}
            error={chatError}
            hasApiKey={!!aiSettings.apiKeys[activeProvider]}
            onGoToSettings={() => setActiveTab('settings')}
            onApplyAction={handleApplyAction}
            onOpenImport={() => setShowImportModal(true)}
          />
        </div>

        <div style={{ display: activeTab === 'files' ? 'flex' : 'none', height: '100%', flexDirection: 'column' }}>
          <FilesScreen
            files={files}
            folders={folders}
            assets={assets}
            activeFileId={project?.activeFileId ?? null}
            uiState={fsUiState}
            onUiStateChange={setFsUiState}
            onSelectFile={handleSelectFile}
            onCreateFile={handleCreateFile}
            onDeleteFile={handleDeleteFile}
            onUpdateContent={handleUpdateContent}
            onOpenImport={() => setShowImportModal(true)}
          />
        </div>

        <div style={{ display: activeTab === 'preview' ? 'flex' : 'none', height: '100%', flexDirection: 'column' }}>
          <PreviewScreen
            files={files}
            assets={assets}
            refreshTrigger={refreshTrigger}
          />
        </div>

        <div style={{ display: activeTab === 'settings' ? 'flex' : 'none', height: '100%', flexDirection: 'column' }}>
          <SettingsScreen
            settings={aiSettings}
            projectName={project?.name ?? ''}
            fileCount={files.length}
            onUpdateProvider={handleUpdateProvider}
            onUpdateModel={handleUpdateModel}
            onUpdateApiKey={handleUpdateApiKey}
            onUpdateSystemInstruction={handleUpdateSystemInstruction}
            onUpdateCustomProvider={handleUpdateCustomProvider}
            onDeleteProject={handleDeleteProject}
            onResetAll={handleResetAll}
          />
        </div>
      </AppShell>

      {showModelSelector && (
        <ModelSelector
          activeProvider={activeProvider}
          activeModel={activeModel}
          onSelect={handleModelSelect}
          onClose={() => setShowModelSelector(false)}
        />
      )}

      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImport={handleImport}
        />
      )}
    </>
  )
}

const globalStyles = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  @keyframes typingPulse {
    0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
    30% { opacity: 1; transform: translateY(-3px); }
  }
  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
  * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
  html, body, #root { margin: 0; padding: 0; height: 100%; background: #0d0d0f; font-family: 'DM Sans', system-ui, sans-serif; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #2a2a30; border-radius: 4px; }
  select { appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b8b96' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px !important; }
  option { background: #1c1c1f; color: #f0f0f2; }
`
