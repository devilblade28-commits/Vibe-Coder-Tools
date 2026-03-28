/**
 * App - Main Application Component (Acode Editor UI)
 *
 * Layout: Acode-style mobile code editor
 *   Header → TabBar → EditorArea → StatusBar → Toolbar
 * File sidebar slides in from left on hamburger click.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { AcodeHeader } from './ui/AcodeHeader'
import { AcodeTabBar } from './ui/AcodeTabBar'
import { AcodeStatusBar } from './ui/AcodeStatusBar'
import { AcodeToolbar } from './ui/AcodeToolbar'
import { FileSidebar } from './ui/FileSidebar'
import { CodeEditor } from './ui/CodeEditor'
import { ChatScreen } from './ui/ChatScreen'
import { PreviewScreen } from './ui/PreviewScreen'
import { SettingsScreen } from './ui/SettingsScreen'
import { ModelSelector } from './ui/ModelSelector'
import { ImportModal, type ImportResult } from './ui/ImportModal'
import type { TabId, ProjectFile, AIFileAction, FileSystemUIState } from './types'
import type { ProjectTemplate } from './data/templates'

// Context hooks
import { useWorkspace } from './workspace/WorkspaceContext'
import { useFileSystem } from './filesystem/FileSystemContext'
import { useAI, type SendContext } from './ai/AIContext'

// Services (for operations not in contexts)
import * as projectService from './workspace/projectService'

// ─── Constants ────────────────────────────────────────────────────────────────

const FILE_SAVE_DEBOUNCE_MS = 500

// ─── Main Component ──────────────────────────────────────────────────────────

export default function App() {
  // ─── Context Hooks ────────────────────────────────────────────────────────

  const workspace = useWorkspace()
  const fileSystem = useFileSystem()
  const ai = useAI()

  // ─── Local UI State ───────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState<TabId>('files')
  const [hasVisitedPreview, setHasVisitedPreview] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [previewRefreshTrigger, setPreviewRefreshTrigger] = useState(0)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [cursorLine, setCursorLine] = useState(1)
  const [cursorCol, setCursorCol] = useState(1)
  const [fsUiState, setFsUiState] = useState<FileSystemUIState>({
    view: 'editor',
    expandedFolderIds: [],
    isCreatingFile: false,
    openFileIds: [],
  })

  // Debounce timer for file content saves
  const saveTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const lastUserMsgRef = useRef<string>('')

  // ─── Derived State ─────────────────────────────────────────────────────────

  const project = workspace.activeProject
  const files = fileSystem.files
  const folders = fileSystem.folders
  const assets = fileSystem.assets

  const activeFile = files.find(f => f.id === project?.activeFileId) ?? null
  const openFiles = fsUiState.openFileIds.map(id => files.find(f => f.id === id)).filter(Boolean) as ProjectFile[]

  // ─── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (project?.activeFileId) {
      setFsUiState(prev => ({ ...prev, view: 'editor' }))
    }
  }, [project?.activeFileId])

  // ─── Project Operations ─────────────────────────────────────────────────────

  const handleRenameProject = useCallback(async (name: string) => {
    if (!project) return
    await workspace.renameProject(project.id, name)
  }, [project, workspace])

  const handleDeleteProject = useCallback(async () => {
    if (!project) return
    await fileSystem.clearFileSystem()
    await projectService.deleteProjectData(project.id)
    const newProject = await workspace.createProject('New Project')
    workspace.setActiveProject(newProject)
    ai.clearMessages()
    setFsUiState({ view: 'tree', expandedFolderIds: [], isCreatingFile: false, openFileIds: [] })
  }, [project, workspace, fileSystem, ai])

  // ─── File Operations ────────────────────────────────────────────────────────

  const handleCreateFile = useCallback(async (name: string) => {
    if (!project) return
    try {
      const template = projectService.getFileTemplate(name)
      const file = await fileSystem.createFile(project.id, { name, content: template })
      await workspace.updateActiveProject({ activeFileId: file.id })
      setPreviewRefreshTrigger(prev => prev + 1)
      setFsUiState(prev => ({
        ...prev,
        view: 'editor',
        isCreatingFile: false,
        openFileIds: [...prev.openFileIds, file.id].slice(-5),
      }))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      alert(msg)
    }
  }, [project, fileSystem, workspace])

  const handleSelectFile = useCallback(async (file: ProjectFile) => {
    if (!project) return
    setIsSidebarOpen(false)
    setActiveTab('files')
    setFsUiState(prev => {
      const isOpen = prev.openFileIds.includes(file.id)
      if (isOpen) return { ...prev, view: 'editor' }
      const newOpenIds = [...prev.openFileIds, file.id]
      return {
        ...prev,
        view: 'editor',
        openFileIds: newOpenIds.length > 5 ? newOpenIds.slice(newOpenIds.length - 5) : newOpenIds,
      }
    })
    await workspace.updateActiveProject({ activeFileId: file.id })
  }, [project, workspace])

  const handleDeleteFile = useCallback(async (file: ProjectFile) => {
    if (!project) return
    if (saveTimerRef.current[file.id]) {
      clearTimeout(saveTimerRef.current[file.id])
      delete saveTimerRef.current[file.id]
    }
    await fileSystem.deleteFile(file.id)
    setPreviewRefreshTrigger(prev => prev + 1)
    setFsUiState(prev => ({
      ...prev,
      openFileIds: prev.openFileIds.filter(id => id !== file.id),
    }))
    const remaining = files.filter(f => f.id !== file.id)
    const newActiveId = project.activeFileId === file.id
      ? (remaining[0]?.id ?? null)
      : project.activeFileId
    if (newActiveId !== project.activeFileId) {
      await workspace.updateActiveProject({ activeFileId: newActiveId })
    }
    if (!newActiveId) {
      setFsUiState(prev => ({ ...prev, view: 'tree' }))
    }
  }, [project, files, fileSystem, workspace])

  const handleUpdateContent = useCallback((fileId: string, content: string) => {
    const file = files.find(f => f.id === fileId)
    if (!file) return
    fileSystem.setFileContentLocally(fileId, content)
    if (saveTimerRef.current[fileId]) clearTimeout(saveTimerRef.current[fileId])
    saveTimerRef.current[fileId] = setTimeout(async () => {
      const latestFile = fileSystem.files.find(f => f.id === fileId) ?? file
      try {
        await fileSystem.updateFile(latestFile, content)
      } catch (err) {
        console.error('Failed to save file content:', err)
      }
    }, FILE_SAVE_DEBOUNCE_MS)
  }, [files, fileSystem])

  const handleRenameFile = useCallback(async (fileId: string, newName: string) => {
    const file = files.find(f => f.id === fileId)
    if (!file || file.name === newName) return
    fileSystem.setFileContentLocally(fileId, file.content)
    const updatedFile = { ...file, name: newName, path: `/${newName}`, updatedAt: new Date().toISOString() }
    try {
      const { putFile } = await import('./storage/indexedDBService')
      await putFile(updatedFile)
      await fileSystem.loadFullProject(project!.id)
      setPreviewRefreshTrigger(prev => prev + 1)
    } catch (err) {
      console.error('Failed to rename file:', err)
      alert('Failed to rename file')
    }
  }, [files, fileSystem, project])

  const handleCloseTab = useCallback((fileId: string) => {
    setFsUiState(prev => {
      const newOpenIds = prev.openFileIds.filter(id => id !== fileId)
      if (project?.activeFileId === fileId && newOpenIds.length > 0) {
        const newActiveId = newOpenIds[newOpenIds.length - 1]
        workspace.updateActiveProject({ activeFileId: newActiveId })
      }
      return { ...prev, openFileIds: newOpenIds }
    })
  }, [project?.activeFileId, workspace])

  // ─── Import Handler ─────────────────────────────────────────────────────────

  const handleImport = useCallback(async (results: ImportResult[]) => {
    if (!project) return
    for (const result of results) {
      if (result.kind === 'text') {
        await fileSystem.upsertFileByName(project.id, result.name, result.content)
      } else if (result.kind === 'asset') {
        const existing = assets.find(a => a.fileName === result.name)
        if (existing) await fileSystem.deleteAsset(existing.id)
        await fileSystem.createAsset(project.id, new File([result.blob], result.name, { type: result.mimeType }))
      }
    }
    await fileSystem.loadFullProject(project.id)
    setPreviewRefreshTrigger(prev => prev + 1)
    setActiveTab('files')
  }, [project, assets, fileSystem])

  // ─── AI Chat Operations ─────────────────────────────────────────────────────

  const buildProjectContext = useCallback(() => {
    if (files.length === 0) return 'No files yet — start fresh!'
    return files
      .filter(f => f.type === 'text')
      .map(f => {
        const preview = f.content.slice(0, 800)
        const truncated = f.content.length > 800 ? '\n...(truncated)' : ''
        return `=== ${f.name} ===\n${preview}${truncated}`
      })
      .join('\n\n')
  }, [files])

  const handleSend = useCallback(async (text: string) => {
    if (!project) return
    lastUserMsgRef.current = text
    const context: SendContext = {
      projectId: project.id,
      projectContext: buildProjectContext(),
      onActionsExecuted: async () => {
        await fileSystem.loadFullProject(project.id)
        setPreviewRefreshTrigger(prev => prev + 1)
        setActiveTab('files')
      },
    }
    await ai.send(text, context)
  }, [project, buildProjectContext, ai, fileSystem])

  const handleStop = useCallback(() => { ai.stop() }, [ai])

  const handleRetry = useCallback(() => {
    if (!project) return
    const context: SendContext = {
      projectId: project.id,
      projectContext: buildProjectContext(),
      onActionsExecuted: async () => {
        await fileSystem.loadFullProject(project.id)
        setPreviewRefreshTrigger(prev => prev + 1)
        setActiveTab('files')
      },
    }
    ai.retry(context)
  }, [project, buildProjectContext, ai, fileSystem])

  const handleApplyAction = useCallback(async (
    action: AIFileAction
  ): Promise<{ success: boolean; error?: string }> => {
    if (!project) return { success: false, error: 'No project loaded' }
    try {
      const { executeActions } = await import('./ai/executeActions')
      const results = await executeActions(project.id, [action])
      const result = results[0]
      if (!result) return { success: false, error: 'No result returned' }
      if (result.success) {
        await fileSystem.loadFullProject(project.id)
        setPreviewRefreshTrigger(prev => prev + 1)
        return { success: true }
      } else {
        return { success: false, error: result.error }
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      return { success: false, error }
    }
  }, [project, fileSystem])

  // ─── Settings Handlers ──────────────────────────────────────────────────────

  const handleModelSelect = useCallback((provider: typeof ai.settings.activeProvider, model: string) => {
    ai.updateProvider(provider)
    ai.updateModel(provider, model)
  }, [ai])

  // ─── Template Handler ────────────────────────────────────────────────────────

  const handleCreateFromTemplate = useCallback(async (template: ProjectTemplate) => {
    if (!project) return
    for (const file of template.files) {
      await fileSystem.upsertFileByName(project.id, file.name, file.content)
    }
    await fileSystem.loadFullProject(project.id)
    setPreviewRefreshTrigger(prev => prev + 1)
    setActiveTab('files')
  }, [project, fileSystem])

  // ─── Reset All ───────────────────────────────────────────────────────────────

  const handleResetAll = useCallback(async () => {
    const { clearAllAppKeys } = await import('./storage/localStorageService')
    const { deleteDatabase } = await import('./storage/indexedDBService')
    clearAllAppKeys()
    await deleteDatabase()
    window.location.reload()
  }, [])

  // ─── Toolbar actions ─────────────────────────────────────────────────────────

  const dispatchEditorKey = (key: string) => {
    const view = (window as any).__CM_VIEW
    if (!view) return
    // dispatch keyboard event to editor
    const el = view.contentDOM as HTMLElement
    el?.focus?.()
    // Use CodeMirror window globals
    const CM = (window as any).__CM
    if (key === 'ArrowUp' && CM?.cursorLineUp) CM.cursorLineUp(view)
    else if (key === 'ArrowDown' && CM?.cursorLineDown) CM.cursorLineDown(view)
    else if (key === 'ArrowLeft') {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    }
    else if (key === 'ArrowRight') {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    }
    else if (key === 'Tab') {
      document.dispatchEvent(new CustomEvent('cm-insert', { detail: '  ' }))
    }
  }

  // ─── Loading State ───────────────────────────────────────────────────────────

  if (workspace.isLoading) {
    return (
      <div style={{ height: '100dvh', background: '#0d0d0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#4a4a54', fontSize: '13px' }}>
          <div style={{ width: '32px', height: '32px', border: '2px solid #242428', borderTopColor: '#a855f7', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
          Loading workspace…
        </div>
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  const activeProvider = ai.settings.activeProvider
  const activeModel = ai.settings.activeProvider === 'custom'
    ? ai.settings.customProvider.model
    : ai.settings.activeModel

  // Show editor if on 'files' tab, else show chat/preview/settings
  const showEditor = activeTab === 'files'

  return (
    <>
      <style>{globalStyles}</style>

      {/* File sidebar overlay */}
      <FileSidebar
        isOpen={isSidebarOpen}
        files={files}
        folders={folders}
        activeFileId={project?.activeFileId ?? null}
        projectName={project?.name ?? 'PROJECT'}
        onSelectFile={handleSelectFile}
        onClose={() => setIsSidebarOpen(false)}
        onCreateFile={() => {
          setIsSidebarOpen(false)
          const name = prompt('File name (e.g. index.html):')
          if (name) handleCreateFile(name)
        }}
        onOpenChat={() => { setIsSidebarOpen(false); setActiveTab('chat') }}
        onOpenPreview={() => {
          setIsSidebarOpen(false)
          setHasVisitedPreview(true)
          setPreviewRefreshTrigger(p => p + 1)
          setActiveTab('preview')
        }}
        onOpenSettings={() => { setIsSidebarOpen(false); setActiveTab('settings') }}
      />

      {/* Main app */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100dvh',
          maxWidth: '430px',
          margin: '0 auto',
          background: '#0d0d0f',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ───────────────────────────────────────────────── */}
        <AcodeHeader
          activeFile={activeFile}
          onHamburgerClick={() => setIsSidebarOpen(v => !v)}
          onSearchClick={() => setActiveTab('files')}
          onPlayClick={() => {
            setHasVisitedPreview(true)
            setPreviewRefreshTrigger(p => p + 1)
            setActiveTab('preview')
          }}
          onMoreClick={() => setActiveTab('settings')}
        />

        {/* ── Tab bar (only in editor mode) ────────────────────────── */}
        {showEditor && openFiles.length > 0 && (
          <AcodeTabBar
            openFiles={openFiles}
            activeFileId={project?.activeFileId ?? null}
            onSelectFile={handleSelectFile}
            onCloseTab={handleCloseTab}
          />
        )}

        {/* ── Content area ─────────────────────────────────────────── */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* Files / Editor */}
          {showEditor && (
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {activeFile && activeFile.type === 'text' ? (
                <CodeEditor
                  key={activeFile.id}
                  value={activeFile.content}
                  filename={activeFile.name}
                  onChange={(content) => handleUpdateContent(activeFile.id, content)}
                  onCursorChange={(ln, col) => { setCursorLine(ln); setCursorCol(col) }}
                  showSymbolToolbar={false}
                />
              ) : activeFile && activeFile.type !== 'text' ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#6d6d7a', padding: '32px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.25 }}>🖼️</div>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: '#6d6d7a', margin: '0 0 4px' }}>Binary asset</p>
                  <p style={{ fontSize: '12px', color: '#4a4a54', margin: 0 }}>{activeFile.name}</p>
                </div>
              ) : (
                /* No file selected */
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '32px', textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', opacity: 0.15 }}>📄</div>
                  <p style={{ fontSize: '15px', color: '#6d6d7a', margin: 0 }}>No file open</p>
                  <p style={{ fontSize: '13px', color: '#4a4a54', margin: 0, lineHeight: 1.5 }}>
                    Tap <strong style={{ color: '#d4d4d4' }}>☰</strong> to browse files
                  </p>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button
                      onClick={() => setIsSidebarOpen(true)}
                      style={{ padding: '10px 20px', background: '#1c1c1f', border: '1px solid #2a2a30', borderRadius: '8px', color: '#d4d4d4', fontSize: '13px' }}
                    >
                      Browse files
                    </button>
                    <button
                      onClick={() => setActiveTab('chat')}
                      style={{ padding: '10px 20px', background: '#2d1b69', border: '1px solid #4a2f8a', borderRadius: '8px', color: '#c4b5fd', fontSize: '13px', fontWeight: 600 }}
                    >
                      Ask AI
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Chat */}
          {activeTab === 'chat' && (
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <ChatScreen
                messages={ai.messages}
                isStreaming={ai.isStreaming}
                onSend={handleSend}
                onStop={handleStop}
                onRetry={handleRetry}
                error={ai.error}
                hasApiKey={ai.hasApiKey}
                onGoToSettings={() => setActiveTab('settings')}
                onApplyAction={handleApplyAction}
                onOpenImport={() => setShowImportModal(true)}
                onCreateFromTemplate={handleCreateFromTemplate}
              />
            </div>
          )}

          {/* Preview */}
          {activeTab === 'preview' && (
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {hasVisitedPreview && (
                <PreviewScreen
                  files={files}
                  assets={assets}
                  refreshTrigger={previewRefreshTrigger}
                />
              )}
            </div>
          )}

          {/* Settings */}
          {activeTab === 'settings' && (
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
              <SettingsScreen
                settings={ai.settings}
                projectName={project?.name ?? ''}
                fileCount={files.length}
                onUpdateProvider={ai.updateProvider}
                onUpdateModel={ai.updateModel}
                onUpdateApiKey={ai.updateApiKey}
                onUpdateSystemInstruction={ai.updateCustomInstruction}
                onUpdateCustomProvider={ai.updateCustomProvider}
                onDeleteProject={handleDeleteProject}
                onResetAll={handleResetAll}
              />
            </div>
          )}
        </div>

        {/* ── Status bar (only in editor mode) ─────────────────────── */}
        {showEditor && (
          <AcodeStatusBar
            line={cursorLine}
            col={cursorCol}
            language={activeFile?.name ?? ''}
          />
        )}

        {/* ── Bottom toolbar ────────────────────────────────────────── */}
        <AcodeToolbar
          onTabIndent={() => { document.dispatchEvent(new CustomEvent('cm-insert', { detail: '  ' })) }}
          onArrowUp={() => dispatchEditorKey('ArrowUp')}
          onArrowDown={() => dispatchEditorKey('ArrowDown')}
          onArrowLeft={() => dispatchEditorKey('ArrowLeft')}
          onArrowRight={() => dispatchEditorKey('ArrowRight')}
          onAIClick={() => setActiveTab('chat')}
          onCommandClick={() => setShowModelSelector(true)}
          onExpandClick={() => setActiveTab(prev => prev === 'chat' ? 'files' : 'chat')}
        />
      </div>

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

// ─── Global Styles ─────────────────────────────────────────────────────────────

const globalStyles = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  @keyframes typingPulse {
    0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
    30% { opacity: 1; transform: translateY(-3px); }
  }
  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
  * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
  html, body, #root { margin: 0; padding: 0; height: 100%; background: #0d0d0f; font-family: 'Trebuchet MS', 'Segoe UI', system-ui, sans-serif; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #2a2a30; border-radius: 4px; }
  select { appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b8b96' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px !important; }
  option { background: #1c1c1f; color: #f0f0f2; }
  button { background: none; border: none; cursor: pointer; padding: 0; margin: 0; }
`
