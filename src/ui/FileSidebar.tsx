/**
 * FileSidebar — File sidebar overlay clone Acode editor
 * Slides in from left, ~80% width, full height
 * Sections: TopNav, Header (BERKAS), Project name, File list
 */
import { useState } from 'react'
import type { ProjectFile, ProjectFolder } from '../types'

// ─── File Colors ──────────────────────────────────────────────────────────────

const FILE_COLORS: Record<string, string> = {
  html: '#e44d26', htm: '#e44d26',
  css: '#264de4',
  js: '#f7df1e',
  ts: '#3178c6', tsx: '#3178c6',
  jsx: '#61dafb',
  json: '#8bc34a',
  md: '#78909c', markdown: '#78909c',
}

function getFileExt(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

function getFileColor(name: string): string {
  return FILE_COLORS[getFileExt(name)] ?? '#6d6d7a'
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function Html5Icon({ color = '#e44d26', size = 14 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}>
      <path d="M1.5 0h21l-1.91 21.563L11.977 24l-8.565-2.438L1.5 0zm7.031 9.75l-.232-2.718 10.059.003.23-2.622L5.412 4.41l.698 8.01h9.126l-.326 3.426-2.91.804-2.955-.81-.188-2.11H6.248l.33 4.171L12 19.351l5.379-1.443.744-8.157H8.531z"/>
    </svg>
  )
}

function FileIcon({ name, size = 14 }: { name: string; size?: number }) {
  const ext = getFileExt(name)
  const color = getFileColor(name)
  if (ext === 'html' || ext === 'htm') return <Html5Icon color={color} size={size} />
  if (ext === 'md' || ext === 'markdown') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
        <rect x="1" y="4" width="22" height="16" rx="2" stroke={color} strokeWidth="2"/>
        <path d="M6 15V9l3 3 3-3v6" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M16 15V9M13 12h6" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} opacity="0.85" style={{ flexShrink: 0 }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface FileSidebarProps {
  isOpen: boolean
  files: ProjectFile[]
  folders: ProjectFolder[]
  activeFileId: string | null
  projectName: string
  onSelectFile: (file: ProjectFile) => void
  onClose: () => void
  onCreateFile: () => void
  onOpenChat: () => void
  onOpenPreview: () => void
  onOpenSettings: () => void
}

// Sidebar navigation tab IDs
type SidebarTab = 'run' | 'files' | 'search' | 'git' | 'profile' | 'more'

export function FileSidebar({
  isOpen,
  files,
  folders: _folders,
  activeFileId,
  projectName,
  onSelectFile,
  onClose,
  onCreateFile,
  onOpenChat,
  onOpenPreview,
  onOpenSettings,
}: FileSidebarProps) {
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('files')
  const [isProjectExpanded, setIsProjectExpanded] = useState(true)

  // Separate running file detection (first HTML file as "running")
  const runningFileId = files.find(f => f.name.endsWith('.html'))?.id ?? null

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 100,
          }}
        />
      )}

      {/* Sidebar panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '82%',
          maxWidth: '360px',
          background: '#0d0d0f',
          zIndex: 101,
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          borderRight: '1px solid #2a2a30',
          willChange: 'transform',
        }}
      >
        {/* ── Top Navigation Bar ─────────────────────────────────────────── */}
        <div
          style={{
            height: '52px',
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid #2a2a30',
            flexShrink: 0,
            paddingTop: 'env(safe-area-inset-top)',
          }}
        >
          {/* Run */}
          <SidebarNavBtn
            active={activeSidebarTab === 'run'}
            onClick={() => { setActiveSidebarTab('run'); onOpenPreview() }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" opacity="0.9"/>
            </svg>
          </SidebarNavBtn>

          {/* Folder (Files) */}
          <SidebarNavBtn
            active={activeSidebarTab === 'files'}
            onClick={() => setActiveSidebarTab('files')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          </SidebarNavBtn>

          {/* Search */}
          <SidebarNavBtn
            active={activeSidebarTab === 'search'}
            onClick={() => setActiveSidebarTab('search')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </SidebarNavBtn>

          {/* Git — with badge */}
          <div style={{ position: 'relative', flex: 1, display: 'flex', justifyContent: 'center' }}>
            <SidebarNavBtn
              active={activeSidebarTab === 'git'}
              onClick={() => setActiveSidebarTab('git')}
              noflex
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="18" r="3"/>
                <circle cx="6" cy="6" r="3"/>
                <path d="M13 6h3a2 2 0 0 1 2 2v7"/>
                <line x1="6" y1="9" x2="6" y2="21"/>
              </svg>
              {/* Badge */}
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  background: '#1e3a8a',
                  color: '#93c5fd',
                  fontSize: '9px',
                  fontWeight: 700,
                  borderRadius: '6px',
                  padding: '1px 4px',
                  lineHeight: 1.3,
                  minWidth: '14px',
                  textAlign: 'center',
                }}
              >
                {files.length > 0 ? files.length : ''}
              </span>
            </SidebarNavBtn>
          </div>

          {/* Profile/Chat */}
          <SidebarNavBtn
            active={activeSidebarTab === 'profile'}
            onClick={() => { setActiveSidebarTab('profile'); onOpenChat() }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </SidebarNavBtn>

          {/* More */}
          <SidebarNavBtn
            active={activeSidebarTab === 'more'}
            onClick={() => { setActiveSidebarTab('more'); onOpenSettings() }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.5"/>
              <circle cx="12" cy="12" r="1.5"/>
              <circle cx="12" cy="19" r="1.5"/>
            </svg>
          </SidebarNavBtn>
        </div>

        {/* ── Section Header: BERKAS ──────────────────────────────────────── */}
        <div
          style={{
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            borderBottom: '1px solid #1a1a1d',
            flexShrink: 0,
            gap: '6px',
          }}
        >
          <span
            style={{
              flex: 1,
              fontSize: '11px',
              fontWeight: 600,
              color: '#6d6d7a',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Berkas
          </span>

          {/* Search icon */}
          <MiniIconBtn title="Search in files">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7"/>
              <line x1="21" y1="21" x2="16.1" y2="16.1"/>
            </svg>
          </MiniIconBtn>

          {/* Bookmark */}
          <MiniIconBtn title="Bookmarks">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          </MiniIconBtn>

          {/* New file */}
          <MiniIconBtn title="New file" onClick={onCreateFile}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <line x1="12" y1="13" x2="12" y2="19"/>
              <line x1="9" y1="16" x2="15" y2="16"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </MiniIconBtn>

          {/* New folder */}
          <MiniIconBtn title="New folder">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              <line x1="12" y1="11" x2="12" y2="17"/>
              <line x1="9" y1="14" x2="15" y2="14"/>
            </svg>
          </MiniIconBtn>

          {/* More actions */}
          <MiniIconBtn title="More actions">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="1.5"/>
              <circle cx="12" cy="12" r="1.5"/>
              <circle cx="19" cy="12" r="1.5"/>
            </svg>
          </MiniIconBtn>
        </div>

        {/* ── File List ──────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Project section */}
          <button
            onClick={() => setIsProjectExpanded(!isProjectExpanded)}
            style={{
              width: '100%',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              padding: '0 12px',
              gap: '6px',
              WebkitTapHighlightColor: 'transparent',
              borderBottom: isProjectExpanded ? 'none' : '1px solid #1a1a1d',
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4ec9b0"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: isProjectExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                transition: 'transform 0.2s',
                flexShrink: 0,
              }}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#4ec9b0',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                flex: 1,
                textAlign: 'left',
              }}
            >
              {projectName || 'PROJECT'}
            </span>
          </button>

          {/* Files */}
          {isProjectExpanded && files.map((file) => {
            const isActive = file.id === activeFileId
            const isRunning = file.id === runningFileId && isActive

            return (
              <button
                key={file.id}
                onClick={() => {
                  onSelectFile(file)
                  onClose()
                }}
                style={{
                  width: '100%',
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px 0 28px',
                  gap: '8px',
                  WebkitTapHighlightColor: 'transparent',
                  position: 'relative',
                  background: isActive ? 'rgba(255,255,255,0.04)' : 'transparent',
                }}
              >
                {/* Active left border */}
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '6px',
                      bottom: '6px',
                      width: '3px',
                      background: getFileColor(file.name),
                      borderRadius: '0 2px 2px 0',
                    }}
                  />
                )}

                {/* Running indicator */}
                {isRunning && (
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="#4caf50"
                    style={{ flexShrink: 0, position: 'absolute', left: '14px' }}
                  >
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}

                <FileIcon name={file.name} size={14} />

                <span
                  style={{
                    flex: 1,
                    fontSize: '13px',
                    color: isActive ? '#f0f0f2' : '#c8c8cc',
                    textAlign: 'left',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {file.name}
                </span>

                {/* More icon */}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="#4a4a54"
                  style={{ flexShrink: 0, opacity: isActive ? 1 : 0 }}
                >
                  <circle cx="5" cy="12" r="1.5"/>
                  <circle cx="12" cy="12" r="1.5"/>
                  <circle cx="19" cy="12" r="1.5"/>
                </svg>
              </button>
            )
          })}

          {/* Empty state */}
          {files.length === 0 && (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', opacity: 0.25, marginBottom: '8px' }}>📂</div>
              <p style={{ fontSize: '13px', color: '#4a4a54', margin: '0 0 4px' }}>Belum ada file</p>
              <p style={{ fontSize: '11px', color: '#3d3d45', margin: 0, lineHeight: 1.5 }}>
                Buat file baru atau minta AI untuk membuat sesuatu.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Helper sub-components ────────────────────────────────────────────────────

function SidebarNavBtn({
  active,
  onClick,
  children,
  noflex,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  noflex?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: noflex ? 'none' : 1,
        width: noflex ? '44px' : undefined,
        height: '52px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: active ? '#f0f0f2' : '#4a4a54',
        WebkitTapHighlightColor: 'transparent',
        position: 'relative',
      }}
    >
      {children}
      {active && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: '20%',
            right: '20%',
            height: '2px',
            background: '#f0f0f2',
            borderRadius: '2px 2px 0 0',
          }}
        />
      )}
    </button>
  )
}

function MiniIconBtn({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode
  title?: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: '26px',
        height: '26px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '5px',
        color: '#6d6d7a',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {children}
    </button>
  )
}
