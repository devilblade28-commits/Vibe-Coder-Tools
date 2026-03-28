import React, { useState, useCallback } from 'react'
import {
  FilePlus, ChevronRight, ChevronDown,
  MoreHorizontal, ChevronLeft, FileText, Image, Folder, Upload, X, Pencil, Split, Columns,
} from 'lucide-react'
import type { ProjectFile, ProjectFolder, ProjectAsset, FileSystemUIState } from '../types'
import { getFileExtension } from '../workspace/projectService'
import { CodeEditor } from './CodeEditor'
import { SymbolToolbar } from './SymbolToolbar'
import { AcodeHeader } from './AcodeHeader'
import { AcodeTabBar } from './AcodeTabBar'
import { AcodeStatusBar } from './AcodeStatusBar'
import { AcodeToolbar } from './AcodeToolbar'
import { FileSidebar } from './FileSidebar'

// Helper function to get language from filename
function getLanguageFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  if (['html', 'htm'].includes(ext)) return 'html'
  if (['css', 'scss', 'less'].includes(ext)) return 'css'
  if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) return 'javascript'
  if (['json'].includes(ext)) return 'json'
  if (['md', 'markdown'].includes(ext)) return 'markdown'
  return 'text'
}

// File type colors matching VS Code conventions
const FILE_COLORS: Record<string, string> = {
  html: '#e34c26', htm: '#e34c26',
  css: '#264de4',
  js: '#f7df1e', mjs: '#f7df1e',
  ts: '#3178c6', tsx: '#3178c6',
  jsx: '#61dafb',
  json: '#8bc34a',
  md: '#78909c', markdown: '#78909c',
  txt: '#9e9e9e',
  svg: '#ffb13b',
  png: '#ab47bc', jpg: '#ab47bc', jpeg: '#ab47bc',
  webp: '#ab47bc', gif: '#ab47bc',
}

function getFileColor(name: string): string {
  return FILE_COLORS[getFileExtension(name)] ?? '#6d6d7a'
}

function FileTypeIcon({ name }: { name: string }) {
  const ext = getFileExtension(name)
  const color = getFileColor(name)
  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
    return <Image size={15} style={{ color, flexShrink: 0 }} />
  }
  return <FileText size={15} style={{ color, flexShrink: 0 }} />
}

// Build breadcrumb path from file and folders
function buildBreadcrumb(file: ProjectFile, folders: ProjectFolder[]): string[] {
  const path: string[] = []
  
  // Find folder chain
  let currentFolderId = file.folderId
  const folderMap = new Map(folders.map(f => [f.id, f]))
  
  while (currentFolderId) {
    const folder = folderMap.get(currentFolderId)
    if (folder) {
      path.unshift(folder.name)
      currentFolderId = folder.parentId
    } else {
      break
    }
  }
  
  // Add filename
  path.push(file.name)
  
  return path
}

interface FilesScreenProps {
  files: ProjectFile[]
  folders: ProjectFolder[]
  assets: ProjectAsset[]
  activeFileId: string | null
  uiState: FileSystemUIState
  onUiStateChange: (state: FileSystemUIState) => void
  onSelectFile: (file: ProjectFile) => void
  onCreateFile: (name: string) => void
  onDeleteFile: (file: ProjectFile) => void
  onUpdateContent: (fileId: string, content: string) => void
  onOpenImport: () => void
  onRenameFile: (fileId: string, newName: string) => Promise<void>
  onCloseTab: (fileId: string) => void
  // New props for Acode layout
  projectName?: string
  onOpenChat?: () => void
  onOpenPreview?: () => void
  onOpenSettings?: () => void
}

export function FilesScreen({
  files, folders, assets, activeFileId, uiState, onUiStateChange,
  onSelectFile, onCreateFile, onDeleteFile, onUpdateContent, onOpenImport,
  onRenameFile, onCloseTab,
  projectName = 'PROJECT',
  onOpenChat,
  onOpenPreview,
  onOpenSettings,
}: FilesScreenProps) {
  const { view, expandedFolderIds, isCreatingFile, openFileIds } = uiState
  const [newFileName, setNewFileName] = useState('')
  const [showMenuFor, setShowMenuFor] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // Acode sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  // Cursor position for status bar
  const [cursorLine, setCursorLine] = useState(1)
  const [cursorCol, setCursorCol] = useState(1)

  const activeFile = files.find((f) => f.id === activeFileId) ?? null
  
  // Split view state
  const [isSplitView, setIsSplitView] = useState(false)
  const [splitViewFileId, setSplitViewFileId] = useState<string | null>(null)
  const splitFile = files.find((f) => f.id === splitViewFileId) ?? null

  const setView = (v: 'tree' | 'editor' | 'split') => onUiStateChange({ ...uiState, view: v })
  const toggleFolder = (id: string) => {
    const next = expandedFolderIds.includes(id)
      ? expandedFolderIds.filter((x) => x !== id)
      : [...expandedFolderIds, id]
    onUiStateChange({ ...uiState, expandedFolderIds: next })
  }

  const handleCreateFile = () => {
    const name = newFileName.trim()
    if (!name) return
    onCreateFile(name)
    setNewFileName('')
    onUiStateChange({ ...uiState, isCreatingFile: false })
  }

  const showCreate = () => onUiStateChange({ ...uiState, isCreatingFile: true })
  const hideCreate = () => {
    setNewFileName('')
    onUiStateChange({ ...uiState, isCreatingFile: false })
  }

  const handleDeleteConfirm = (file: ProjectFile) => {
    onDeleteFile(file)
    setConfirmDeleteId(null)
    setShowMenuFor(null)
  }

  const handleRenameStart = (fileId: string) => {
    setRenamingFileId(fileId)
    const file = files.find(f => f.id === fileId)
    setRenameValue(file?.name ?? '')
    setShowMenuFor(null)
  }

  const handleRenameCommit = useCallback(async () => {
    if (!renamingFileId) return
    const trimmedName = renameValue.trim()
    if (!trimmedName) {
      setRenamingFileId(null)
      setRenameValue('')
      return
    }
    const file = files.find(f => f.id === renamingFileId)
    if (file && trimmedName !== file.name) {
      await onRenameFile(renamingFileId, trimmedName)
    }
    setRenamingFileId(null)
    setRenameValue('')
  }, [renamingFileId, renameValue, files, onRenameFile])

  const handleRenameCancel = () => {
    setRenamingFileId(null)
    setRenameValue('')
  }

  // ── Toolbar keyboard actions ──────────────────────────────────────────────

  const dispatchKey = (key: string) => {
    const el = document.querySelector('.cm-content') as HTMLElement | null
    if (el) {
      el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
    }
  }

  // Get open files for tabs
  const openFiles = openFileIds.map(id => files.find(f => f.id === id)).filter(Boolean) as ProjectFile[]

  // ── File sidebar (replaces tree view) + editor view ───────────────────────

  // If no files and not in editor view, we still show the editor layout
  // Tree view is now replaced by FileSidebar overlay

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* ── File Sidebar Overlay ────────────────────────────────────────── */}
      <FileSidebar
        isOpen={isSidebarOpen}
        files={files}
        folders={folders}
        activeFileId={activeFileId}
        projectName={projectName}
        onSelectFile={(file) => {
          onSelectFile(file)
          onUiStateChange({ ...uiState, view: 'editor', openFileIds: openFileIds.includes(file.id) ? openFileIds : [...openFileIds.slice(-4), file.id] })
          setIsSidebarOpen(false)
        }}
        onClose={() => setIsSidebarOpen(false)}
        onCreateFile={() => {
          setIsSidebarOpen(false)
          showCreate()
        }}
        onOpenChat={() => { setIsSidebarOpen(false); onOpenChat?.() }}
        onOpenPreview={() => { setIsSidebarOpen(false); onOpenPreview?.() }}
        onOpenSettings={() => { setIsSidebarOpen(false); onOpenSettings?.() }}
      />

      {/* ── Acode Header ───────────────────────────────────────────────── */}
      <AcodeHeader
        activeFile={activeFile}
        onHamburgerClick={() => setIsSidebarOpen(true)}
        onSearchClick={() => {
          // trigger CodeMirror Cmd+F
          const ev = new KeyboardEvent('keydown', { key: 'f', metaKey: true, ctrlKey: true, bubbles: true, cancelable: true })
          document.querySelector('.cm-content')?.dispatchEvent(ev)
        }}
        onPlayClick={() => onOpenPreview?.()}
        onMoreClick={() => {}}
      />

      {/* ── Acode Tab Bar ──────────────────────────────────────────────── */}
      <AcodeTabBar
        openFiles={openFiles}
        activeFileId={activeFileId}
        onSelectFile={onSelectFile}
        onCloseTab={onCloseTab}
      />

      {/* ── New file input (floating below tab bar when creating) ──────── */}
      {isCreatingFile && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #1f1f23', display: 'flex', gap: '6px', flexShrink: 0, background: '#0d0d0f', zIndex: 10 }}>
          <input
            autoFocus
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFile()
              if (e.key === 'Escape') hideCreate()
            }}
            placeholder="index.html"
            style={{
              flex: 1,
              background: '#1c1c1f',
              border: '1px solid #a855f7',
              borderRadius: '7px',
              padding: '8px 10px',
              color: '#f0f0f2',
              fontSize: '13px',
              outline: 'none',
              fontFamily: "'Geist Mono', monospace",
            }}
          />
          <button onClick={handleCreateFile} style={{ padding: '0 12px', height: '38px', background: '#a855f7', borderRadius: '7px', color: 'white', fontSize: '13px', fontWeight: 600, flexShrink: 0 }}>
            Buat
          </button>
          <button onClick={hideCreate} style={{ width: '38px', height: '38px', background: '#1c1c1f', border: '1px solid #2a2a30', borderRadius: '7px', color: '#6d6d7a', fontSize: '16px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Split view file selector ────────────────────────────────────── */}
      {isSplitView && activeFile && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          background: '#0d0d0f',
          borderBottom: '1px solid #1f1f23',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '11px', color: '#4a4a54' }}>Split dengan:</span>
          <select
            value={splitViewFileId ?? ''}
            onChange={(e) => setSplitViewFileId(e.target.value || null)}
            style={{
              flex: 1,
              background: '#1c1c1f',
              border: '1px solid #2a2a30',
              borderRadius: '6px',
              padding: '5px 10px',
              color: '#f0f0f2',
              fontSize: '12px',
              outline: 'none',
            }}
          >
            <option value="">Pilih file...</option>
            {files.filter(f => f.type === 'text' && f.id !== activeFile.id).map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          {splitFile && (
            <button
              onClick={() => setSplitViewFileId(null)}
              style={{ padding: '4px 8px', background: '#1c1c1f', border: '1px solid #2a2a30', borderRadius: '4px', color: '#6d6d7a', fontSize: '11px' }}
            >
              Clear
            </button>
          )}
          <button
            onClick={() => setIsSplitView(false)}
            title="Close split view"
            style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', color: '#6d6d7a', background: 'transparent', border: '1px solid #2a2a30' }}
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* ── Editor Body ────────────────────────────────────────────────── */}
      {activeFile ? (
        activeFile.type === 'text' ? (
          isSplitView && splitFile ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ flex: 1, overflow: 'hidden', borderBottom: '1px solid #1f1f23' }}>
                <CodeEditor
                  key={activeFile.id}
                  value={activeFile.content}
                  filename={activeFile.name}
                  onChange={(content) => onUpdateContent(activeFile.id, content)}
                  onCursorChange={(ln, col) => { setCursorLine(ln); setCursorCol(col) }}
                />
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <CodeEditor
                  key={splitFile.id}
                  value={splitFile.content}
                  filename={splitFile.name}
                  onChange={(content) => onUpdateContent(splitFile.id, content)}
                />
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
              <CodeEditor
                key={activeFile.id}
                value={activeFile.content}
                filename={activeFile.name}
                onChange={(content) => onUpdateContent(activeFile.id, content)}
                onCursorChange={(ln, col) => { setCursorLine(ln); setCursorCol(col) }}
                showSymbolToolbar={false}
              />
              {/* Split view toggle — small button overlaying editor top-right */}
              <button
                onClick={() => setIsSplitView(true)}
                title="Split view"
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  color: '#4a4a54',
                  background: 'rgba(13,13,15,0.8)',
                  border: '1px solid #2a2a30',
                  zIndex: 5,
                }}
              >
                <Columns size={12} />
              </button>
            </div>
          )
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            color: '#6d6d7a',
            padding: '32px',
            textAlign: 'center',
          }}>
            <Image size={36} style={{ color: '#3d3d45' }} />
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#6d6d7a', margin: 0 }}>Binary asset</p>
            <p style={{ fontSize: '12px', color: '#4a4a54', margin: 0 }}>{activeFile.name}</p>
            <p style={{ fontSize: '11px', color: '#3d3d45', margin: 0 }}>{activeFile.mimeType} · {(activeFile.size / 1024).toFixed(1)} KB</p>
          </div>
        )
      ) : (
        /* Empty state — no file selected */
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          color: '#4a4a54',
          padding: '32px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '40px', opacity: 0.2 }}>📄</div>
          <p style={{ fontSize: '14px', margin: 0 }}>Pilih file untuk diedit</p>
          <button
            onClick={() => setIsSidebarOpen(true)}
            style={{
              padding: '8px 16px',
              background: '#1c1c1f',
              border: '1px solid #2a2a30',
              borderRadius: '8px',
              color: '#8b8b96',
              fontSize: '13px',
            }}
          >
            Lihat file
          </button>
        </div>
      )}

      {/* ── Acode Status Bar ───────────────────────────────────────────── */}
      <AcodeStatusBar
        line={cursorLine}
        col={cursorCol}
        language={activeFile?.name ?? ''}
      />

      {/* ── Acode Toolbar ──────────────────────────────────────────────── */}
      <AcodeToolbar
        onTabIndent={() => dispatchKey('Tab')}
        onArrowUp={() => dispatchKey('ArrowUp')}
        onArrowDown={() => dispatchKey('ArrowDown')}
        onArrowLeft={() => dispatchKey('ArrowLeft')}
        onArrowRight={() => dispatchKey('ArrowRight')}
        onAIClick={() => onOpenChat?.()}
      />
    </div>
  )
}

// ─── File row ─────────────────────────────────────────────────────────────────

interface FileRowProps {
  file: ProjectFile
  isActive: boolean
  indent?: boolean
  showMenu: boolean
  confirmDelete: boolean
  isRenaming: boolean
  renameValue: string
  onOpen: () => void
  onMenuToggle: (e: React.MouseEvent) => void
  onDeleteRequest: () => void
  onDeleteConfirm: () => void
  onDeleteCancel: () => void
  onRenameStart: () => void
  onRenameChange: (value: string) => void
  onRenameCommit: () => void
  onRenameCancel: () => void
}

function FileRow({
  file, isActive, indent, showMenu, confirmDelete,
  isRenaming, renameValue,
  onOpen, onMenuToggle, onDeleteRequest, onDeleteConfirm, onDeleteCancel,
  onRenameStart, onRenameChange, onRenameCommit, onRenameCancel,
}: FileRowProps) {
  return (
    <div style={{
      position: 'relative',
      background: isActive ? '#1a0533' : 'transparent',
      borderLeft: `2px solid ${isActive ? '#a855f7' : 'transparent'}`,
    }}>
      <div style={{ height: '44px', display: 'flex', alignItems: 'center', padding: `0 10px 0 ${indent ? 28 : 12}px`, gap: '8px' }}>
        {/* File name — tap to open or rename input */}
        <button
          onClick={onOpen}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            minWidth: 0,
            height: '44px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <FileTypeIcon name={file.name} />
          {isRenaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => onRenameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onRenameCommit()
                if (e.key === 'Escape') onRenameCancel()
                e.stopPropagation()
              }}
              onClick={(e) => e.stopPropagation()}
              onBlur={onRenameCommit}
              style={{
                flex: 1,
                background: '#1c1c1f',
                border: '1px solid #a855f7',
                borderRadius: '4px',
                padding: '2px 6px',
                color: '#f0f0f2',
                fontSize: '13px',
                outline: 'none',
                fontFamily: "'Geist Mono', monospace",
              }}
            />
          ) : (
            <span style={{
              fontSize: '13px',
              color: isActive ? '#f0f0f2' : '#a1a1aa',
              fontWeight: isActive ? 500 : 400,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              textAlign: 'left',
              fontFamily: "'Geist Mono', monospace",
            }}>
              {file.name}
            </span>
          )}
        </button>

        {/* More menu trigger */}
        <button
          onClick={onMenuToggle}
          style={{
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: showMenu ? '#a855f7' : '#4a4a54',
            borderRadius: '6px',
            flexShrink: 0,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <MoreHorizontal size={16} />
        </button>
      </div>

      {/* Context menu */}
      {showMenu && !confirmDelete && !isRenaming && (
        <div style={{
          position: 'absolute',
          right: '8px',
          top: '44px',
          background: '#242428',
          border: '1px solid #3d3d45',
          borderRadius: '8px',
          zIndex: 20,
          minWidth: '130px',
          overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}>
          <button
            onClick={(e) => { e.stopPropagation(); onRenameStart() }}
            style={{
              width: '100%',
              padding: '11px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#f0f0f2',
              fontSize: '13px',
              fontWeight: 500,
              borderBottom: '1px solid #2a2a30',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Pencil size={14} style={{ color: '#a855f7' }} />
            Rename
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteRequest() }}
            style={{
              width: '100%',
              padding: '11px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#ef4444',
              fontSize: '13px',
              fontWeight: 500,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Hapus file
          </button>
        </div>
      )}

      {/* Delete confirmation inline */}
      {confirmDelete && (
        <div style={{
          position: 'absolute',
          right: '8px',
          top: '44px',
          background: '#242428',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          zIndex: 20,
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          minWidth: '180px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}
          onClick={(e) => e.stopPropagation()}
        >
          <p style={{ fontSize: '12px', color: '#f0f0f2', margin: 0 }}>Hapus <strong>{file.name}</strong>?</p>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={onDeleteConfirm}
              style={{ flex: 1, height: '32px', background: '#ef4444', borderRadius: '6px', color: 'white', fontSize: '12px', fontWeight: 600 }}
            >
              Hapus
            </button>
            <button
              onClick={onDeleteCancel}
              style={{ flex: 1, height: '32px', background: '#1c1c1f', border: '1px solid #3d3d45', borderRadius: '6px', color: '#8b8b96', fontSize: '12px' }}
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
