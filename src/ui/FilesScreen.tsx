import React, { useState, useCallback } from 'react'
import {
  FilePlus, ChevronRight, ChevronDown,
  MoreHorizontal, ChevronLeft, FileText, Image, Folder, Upload, X, Pencil, Split, Columns,
} from 'lucide-react'
import type { ProjectFile, ProjectFolder, ProjectAsset, FileSystemUIState } from '../types'
import { getFileExtension } from '../workspace/projectService'
import { CodeEditor } from './CodeEditor'

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
}

export function FilesScreen({
  files, folders, assets, activeFileId, uiState, onUiStateChange,
  onSelectFile, onCreateFile, onDeleteFile, onUpdateContent, onOpenImport,
  onRenameFile, onCloseTab,
}: FilesScreenProps) {
  const { view, expandedFolderIds, isCreatingFile, openFileIds } = uiState
  const [newFileName, setNewFileName] = useState('')
  const [showMenuFor, setShowMenuFor] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

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

  // ── Tree view ─────────────────────────────────────────────────────────────

  if (view === 'tree') {
    const rootFiles = files.filter((f) => f.folderId === null)
    const folderFiles = (fid: string) => files.filter((f) => f.folderId === fid)

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Panel header — always visible */}
        <div style={{
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          borderBottom: '1px solid #1f1f23',
          flexShrink: 0,
          gap: '8px',
        }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#6d6d7a', textTransform: 'uppercase', letterSpacing: '0.08em', flex: 1 }}>
            Files {files.length > 0 && <span style={{ color: '#4a4a54', fontWeight: 400 }}>({files.length})</span>}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={onOpenImport}
              title="Import files"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '32px', height: '32px',
                background: '#1c1c1f', border: '1px solid #2a2a30',
                borderRadius: '7px', color: '#6d6d7a',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <Upload size={13} />
            </button>
            <button
              onClick={showCreate}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                height: '32px', padding: '0 10px',
                background: '#1c1c1f', border: '1px solid #2a2a30',
                borderRadius: '7px', color: '#a855f7',
                fontSize: '12px', fontWeight: 600,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <FilePlus size={13} />
              New file
            </button>
          </div>
        </div>

        {/* New file input */}
        {isCreatingFile && (
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #1f1f23', display: 'flex', gap: '6px', flexShrink: 0 }}>
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
              Create
            </button>
            <button onClick={hideCreate} style={{ width: '38px', height: '38px', background: '#1c1c1f', border: '1px solid #2a2a30', borderRadius: '7px', color: '#6d6d7a', fontSize: '16px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ✕
            </button>
          </div>
        )}

        {/* File list */}
        <div
          style={{ flex: 1, overflowY: 'auto' }}
          onClick={() => { setShowMenuFor(null); setConfirmDeleteId(null) }}
        >
          {/* Folders */}
          {folders.filter((f) => !f.parentId).map((folder) => {
            const isExpanded = expandedFolderIds.includes(folder.id)
            const fFiles = folderFiles(folder.id)
            return (
              <div key={folder.id}>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFolder(folder.id) }}
                  style={{
                    width: '100%', height: '44px', display: 'flex', alignItems: 'center',
                    padding: '0 12px', gap: '8px', WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {isExpanded
                    ? <ChevronDown size={14} style={{ color: '#6d6d7a', flexShrink: 0 }} />
                    : <ChevronRight size={14} style={{ color: '#6d6d7a', flexShrink: 0 }} />}
                  <Folder size={15} style={{ color: '#f59e0b', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: '#a1a1aa', flex: 1, textAlign: 'left' }}>{folder.name}</span>
                </button>
                {isExpanded && fFiles.map((file) => (
                  <FileRow
                    key={file.id}
                    file={file}
                    isActive={file.id === activeFileId}
                    indent
                    showMenu={showMenuFor === file.id}
                    confirmDelete={confirmDeleteId === file.id}
                    isRenaming={renamingFileId === file.id}
                    renameValue={renameValue}
                    onOpen={() => { onSelectFile(file); setView('editor') }}
                    onMenuToggle={(e) => { e.stopPropagation(); setShowMenuFor(showMenuFor === file.id ? null : file.id) }}
                    onDeleteRequest={() => setConfirmDeleteId(file.id)}
                    onDeleteConfirm={() => handleDeleteConfirm(file)}
                    onDeleteCancel={() => setConfirmDeleteId(null)}
                    onRenameStart={() => handleRenameStart(file.id)}
                    onRenameChange={setRenameValue}
                    onRenameCommit={handleRenameCommit}
                    onRenameCancel={handleRenameCancel}
                  />
                ))}
              </div>
            )
          })}

          {/* Root files */}
          {rootFiles.map((file) => (
            <FileRow
              key={file.id}
              file={file}
              isActive={file.id === activeFileId}
              showMenu={showMenuFor === file.id}
              confirmDelete={confirmDeleteId === file.id}
              isRenaming={renamingFileId === file.id}
              renameValue={renameValue}
              onOpen={() => { onSelectFile(file); setView('editor') }}
              onMenuToggle={(e) => { e.stopPropagation(); setShowMenuFor(showMenuFor === file.id ? null : file.id) }}
              onDeleteRequest={() => setConfirmDeleteId(file.id)}
              onDeleteConfirm={() => handleDeleteConfirm(file)}
              onDeleteCancel={() => setConfirmDeleteId(null)}
              onRenameStart={() => handleRenameStart(file.id)}
              onRenameChange={setRenameValue}
              onRenameCommit={handleRenameCommit}
              onRenameCancel={handleRenameCancel}
            />
          ))}

          {/* Assets section */}
          {assets.length > 0 && (
            <div>
              <div style={{
                height: '36px', display: 'flex', alignItems: 'center',
                padding: '0 12px', gap: '6px',
                borderTop: files.length > 0 ? '1px solid #1f1f23' : 'none',
              }}>
                <Image size={13} style={{ color: '#ab47bc', flexShrink: 0 }} />
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#4a4a54', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Assets ({assets.length})
                </span>
              </div>
              {assets.map((asset) => (
                <div key={asset.id} style={{
                  height: '40px', display: 'flex', alignItems: 'center',
                  padding: '0 12px 0 24px', gap: '8px',
                }}>
                  <Image size={14} style={{ color: '#ab47bc', flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: '#6d6d7a', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {asset.fileName}
                  </span>
                  <span style={{ fontSize: '10px', color: '#3d3d45', flexShrink: 0 }}>
                    {(asset.size / 1024).toFixed(1)}KB
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {files.length === 0 && assets.length === 0 && !isCreatingFile && (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.3 }}>📂</div>
              <p style={{ fontSize: '14px', color: '#4a4a54', margin: '0 0 4px', fontWeight: 500 }}>No files yet</p>
              <p style={{ fontSize: '12px', color: '#3d3d45', margin: 0, lineHeight: 1.5 }}>
                Create a file manually or ask AI to build something.
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Editor view ───────────────────────────────────────────────────────────

  // Get open files for tabs
  const openFiles = openFileIds.map(id => files.find(f => f.id === id)).filter(Boolean) as ProjectFile[]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tab bar - show when multiple files are open */}
      {openFiles.length > 1 && (
        <div style={{
          display: 'flex',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          background: '#0d0d0f',
          borderBottom: '1px solid #1f1f23',
          flexShrink: 0,
        }}>
          {openFiles.map(tabFile => {
            const isActive = tabFile.id === activeFileId
            return (
              <div
                key={tabFile.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0 12px',
                  height: '36px',
                  minWidth: '80px',
                  maxWidth: '140px',
                  flexShrink: 0,
                  background: isActive ? '#141416' : 'transparent',
                  borderRight: '1px solid #1f1f23',
                  borderBottom: isActive ? '2px solid #a855f7' : '2px solid transparent',
                  cursor: 'pointer',
                }}
                onClick={() => onSelectFile(tabFile)}
              >
                <FileTypeIcon name={tabFile.name} />
                <span style={{
                  fontSize: '12px',
                  color: isActive ? '#f0f0f2' : '#6d6d7a',
                  fontFamily: 'monospace',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}>
                  {tabFile.name}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation();e.preventDefault(); onCloseTab(tabFile.id) }}
                  style={{
                    width: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '3px',
                    color: '#4a4a54',
                    fontSize: '10px',
                    flexShrink: 0,
                    background: 'transparent',
                  }}
                >
                  <X size={10} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Editor header */}
      <div style={{
        height: '48px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '0 6px 0 10px',
        borderBottom: '1px solid #1f1f23',
        background: '#141416',
        flexShrink: 0,
      }}>
        <button
          onClick={() => setView('tree')}
          style={{
            width: '40px', height: '40px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '8px', color: '#8b8b96',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <ChevronLeft size={20} />
        </button>
        {activeFile ? (
          <>
            <FileTypeIcon name={activeFile.name} />
            {/* Breadcrumb path */}
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              overflow: 'hidden',
              minWidth: 0,
            }}>
              {buildBreadcrumb(activeFile, folders).map((part, i, arr) => (
                <React.Fragment key={i}>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: i === arr.length - 1 ? 500 : 400,
                    color: i === arr.length - 1 ? '#f0f0f2' : '#6d6d7a',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {part}
                  </span>
                  {i < arr.length - 1 && (
                    <ChevronRight size={12} style={{ color: '#4a4a54', flexShrink: 0 }} />
                  )}
                </React.Fragment>
              ))}
            </div>
            <span style={{ fontSize: '11px', color: '#3d3d45', flexShrink: 0, paddingRight: '4px' }}>
              {activeFile.type === 'text' ? `${(activeFile.size / 1024).toFixed(1)} KB` : activeFile.mimeType}
            </span>
          </>
        ) : (
          <span style={{ flex: 1, fontSize: '13px', color: '#6d6d7a' }}>No file selected</span>
        )}
        {/* Split view toggle */}
        {activeFile && activeFile.type === 'text' && (
          <button
            onClick={() => setIsSplitView(!isSplitView)}
            title={isSplitView ? 'Close split view' : 'Open split view'}
            style={{
              width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '6px', color: isSplitView ? '#a855f7' : '#6d6d7a',
              background: isSplitView ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
              border: '1px solid #2a2a30',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Columns size={14} />
          </button>
        )}
      </div>

      {/* Split view file selector */}
      {isSplitView && activeFile && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          background: '#0d0d0f',
          borderBottom: '1px solid #1f1f23',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '11px', color: '#4a4a54' }}>Split with:</span>
          <select
            value={splitViewFileId ?? ''}
            onChange={(e) => setSplitViewFileId(e.target.value || null)}
            style={{
              flex: 1,
              background: '#1c1c1f',
              border: '1px solid #2a2a30',
              borderRadius: '6px',
              padding: '6px 10px',
              color: '#f0f0f2',
              fontSize: '12px',
              outline: 'none',
            }}
          >
            <option value="">Select file...</option>
            {files.filter(f => f.type === 'text' && f.id !== activeFile.id).map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          {splitFile && (
            <button
              onClick={() => setSplitViewFileId(null)}
              style={{
                padding: '4px 8px',
                background: '#1c1c1f',
                border: '1px solid #2a2a30',
                borderRadius: '4px',
                color: '#6d6d7a',
                fontSize: '11px',
              }}
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Editor body */}
      {activeFile ? (
        activeFile.type === 'text' ? (
          isSplitView && splitFile ? (
            /* Split view with two editors */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ flex: 1, overflow: 'hidden', borderBottom: '1px solid #1f1f23' }}>
                <CodeEditor
                  key={activeFile.id}
                  value={activeFile.content}
                  filename={activeFile.name}
                  onChange={(content) => onUpdateContent(activeFile.id, content)}
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
            <CodeEditor
              key={activeFile.id}
              value={activeFile.content}
              filename={activeFile.name}
              onChange={(content) => onUpdateContent(activeFile.id, content)}
            />
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
          <FileText size={32} style={{ color: '#3d3d45' }} />
          <p style={{ fontSize: '14px', margin: 0 }}>Select a file to edit</p>
          <button
            onClick={() => setView('tree')}
            style={{
              padding: '8px 16px',
              background: '#1c1c1f',
              border: '1px solid #2a2a30',
              borderRadius: '8px',
              color: '#8b8b96',
              fontSize: '13px',
            }}
          >
            Browse files
          </button>
        </div>
      )}
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
            Delete file
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
          <p style={{ fontSize: '12px', color: '#f0f0f2', margin: 0 }}>Delete <strong>{file.name}</strong>?</p>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={onDeleteConfirm}
              style={{ flex: 1, height: '32px', background: '#ef4444', borderRadius: '6px', color: 'white', fontSize: '12px', fontWeight: 600 }}
            >
              Delete
            </button>
            <button
              onClick={onDeleteCancel}
              style={{ flex: 1, height: '32px', background: '#1c1c1f', border: '1px solid #3d3d45', borderRadius: '6px', color: '#8b8b96', fontSize: '12px' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}