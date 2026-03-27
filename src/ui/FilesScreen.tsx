import { useState } from 'react'
import {
  FilePlus, ChevronRight, ChevronDown,
  MoreHorizontal, ChevronLeft, FileText, Image, Folder,
} from 'lucide-react'
import type { ProjectFile, ProjectFolder, FileSystemUIState } from '../types'
import { getFileExtension } from '../workspace/projectService'

interface FilesScreenProps {
  files: ProjectFile[]
  folders: ProjectFolder[]
  activeFileId: string | null
  uiState: FileSystemUIState
  onUiStateChange: (state: FileSystemUIState) => void
  onSelectFile: (file: ProjectFile) => void
  onCreateFile: (name: string) => void
  onDeleteFile: (file: ProjectFile) => void
  onUpdateContent: (fileId: string, content: string) => void
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

export function FilesScreen({
  files, folders, activeFileId, uiState, onUiStateChange,
  onSelectFile, onCreateFile, onDeleteFile, onUpdateContent,
}: FilesScreenProps) {
  const { view, expandedFolderIds, isCreatingFile } = uiState
  const [newFileName, setNewFileName] = useState('')
  const [showMenuFor, setShowMenuFor] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const activeFile = files.find((f) => f.id === activeFileId) ?? null

  const setView = (v: 'tree' | 'editor') => onUiStateChange({ ...uiState, view: v })
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
          {/* New File — always visible */}
          <button
            onClick={showCreate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              height: '32px',
              padding: '0 10px',
              background: '#1c1c1f',
              border: '1px solid #2a2a30',
              borderRadius: '7px',
              color: '#a855f7',
              fontSize: '12px',
              fontWeight: 600,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <FilePlus size={13} />
            New file
          </button>
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
                    onOpen={() => { onSelectFile(file); setView('editor') }}
                    onMenuToggle={(e) => { e.stopPropagation(); setShowMenuFor(showMenuFor === file.id ? null : file.id) }}
                    onDeleteRequest={() => setConfirmDeleteId(file.id)}
                    onDeleteConfirm={() => handleDeleteConfirm(file)}
                    onDeleteCancel={() => setConfirmDeleteId(null)}
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
              onOpen={() => { onSelectFile(file); setView('editor') }}
              onMenuToggle={(e) => { e.stopPropagation(); setShowMenuFor(showMenuFor === file.id ? null : file.id) }}
              onDeleteRequest={() => setConfirmDeleteId(file.id)}
              onDeleteConfirm={() => handleDeleteConfirm(file)}
              onDeleteCancel={() => setConfirmDeleteId(null)}
            />
          ))}

          {/* Empty state */}
          {files.length === 0 && !isCreatingFile && (
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
            <span style={{
              flex: 1,
              fontSize: '13px',
              fontWeight: 500,
              color: '#f0f0f2',
              fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {activeFile.name}
            </span>
            <span style={{ fontSize: '11px', color: '#3d3d45', flexShrink: 0, paddingRight: '4px' }}>
              {activeFile.type === 'text' ? `${(activeFile.size / 1024).toFixed(1)} KB` : activeFile.mimeType}
            </span>
          </>
        ) : (
          <span style={{ flex: 1, fontSize: '13px', color: '#6d6d7a' }}>No file selected</span>
        )}
      </div>

      {/* Editor body */}
      {activeFile ? (
        activeFile.type === 'text' ? (
          <textarea
            key={activeFile.id}
            defaultValue={activeFile.content}
            onChange={(e) => onUpdateContent(activeFile.id, e.target.value)}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            autoComplete="off"
            style={{
              flex: 1,
              width: '100%',
              background: '#0d0d0f',
              color: '#d4d4d8',
              fontFamily: "'Geist Mono', 'JetBrains Mono', 'Courier New', monospace",
              fontSize: '13px',
              lineHeight: 1.65,
              padding: '16px',
              border: 'none',
              resize: 'none',
              outline: 'none',
              tabSize: 2,
            }}
          />
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
  onOpen: () => void
  onMenuToggle: (e: React.MouseEvent) => void
  onDeleteRequest: () => void
  onDeleteConfirm: () => void
  onDeleteCancel: () => void
}

function FileRow({
  file, isActive, indent, showMenu, confirmDelete,
  onOpen, onMenuToggle, onDeleteRequest, onDeleteConfirm, onDeleteCancel,
}: FileRowProps) {
  return (
    <div style={{
      position: 'relative',
      background: isActive ? '#1a0533' : 'transparent',
      borderLeft: `2px solid ${isActive ? '#a855f7' : 'transparent'}`,
    }}>
      <div style={{ height: '44px', display: 'flex', alignItems: 'center', padding: `0 10px 0 ${indent ? 28 : 12}px`, gap: '8px' }}>
        {/* File name — tap to open */}
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
      {showMenu && !confirmDelete && (
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
