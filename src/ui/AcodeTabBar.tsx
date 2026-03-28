/**
 * AcodeTabBar — Tab bar clone Acode editor
 * Horizontal scrollable tabs dengan underline aktif + file-type icon
 */
import type { ProjectFile } from '../types'
import { X } from 'lucide-react'

const FILE_COLORS: Record<string, string> = {
  html: '#e44d26', htm: '#e44d26',
  css: '#264de4',
  js: '#f7df1e', mjs: '#f7df1e',
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

// Tiny HTML5 icon
function Html5IconSmall({ color }: { color: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}>
      <path d="M1.5 0h21l-1.91 21.563L11.977 24l-8.565-2.438L1.5 0zm7.031 9.75l-.232-2.718 10.059.003.23-2.622L5.412 4.41l.698 8.01h9.126l-.326 3.426-2.91.804-2.955-.81-.188-2.11H6.248l.33 4.171L12 19.351l5.379-1.443.744-8.157H8.531z"/>
    </svg>
  )
}

function FileTypeIconSmall({ name }: { name: string }) {
  const ext = getFileExt(name)
  const color = getFileColor(name)
  if (ext === 'html' || ext === 'htm') return <Html5IconSmall color={color} />
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
      <path d="M14 2v6h6" fill="none" stroke="#0d0d0f" strokeWidth="1.5"/>
    </svg>
  )
}

interface AcodeTabBarProps {
  openFiles: ProjectFile[]
  activeFileId: string | null
  onSelectFile: (file: ProjectFile) => void
  onCloseTab: (fileId: string) => void
}

export function AcodeTabBar({
  openFiles,
  activeFileId,
  onSelectFile,
  onCloseTab,
}: AcodeTabBarProps) {
  if (openFiles.length === 0) return null

  return (
    <div
      style={{
        height: '40px',
        background: '#1a1a1d',
        display: 'flex',
        alignItems: 'stretch',
        overflow: 'hidden',
        flexShrink: 0,
        borderBottom: '1px solid #2a2a30',
        position: 'relative',
      }}
    >
      {/* Scrollable tabs container */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'stretch',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
        }}
      >
        {openFiles.map((file) => {
          const isActive = file.id === activeFileId
          const fileColor = getFileColor(file.name)

          return (
            <div
              key={file.id}
              onClick={() => onSelectFile(file)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '0 10px',
                minWidth: '80px',
                maxWidth: '150px',
                flexShrink: 0,
                cursor: 'pointer',
                position: 'relative',
                background: isActive ? '#0d0d0f' : 'transparent',
                borderRight: '1px solid #2a2a30',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {/* Active underline */}
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: fileColor,
                    borderRadius: '2px 2px 0 0',
                  }}
                />
              )}

              <FileTypeIconSmall name={file.name} />

              <span
                style={{
                  fontSize: '12px',
                  color: isActive ? '#f0f0f2' : '#6d6d7a',
                  fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {file.name}
              </span>

              {/* Close button — only show on active or hover */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onCloseTab(file.id)
                }}
                style={{
                  width: '14px',
                  height: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '2px',
                  color: isActive ? '#6d6d7a' : '#3d3d45',
                  flexShrink: 0,
                  background: 'transparent',
                  WebkitTapHighlightColor: 'transparent',
                  opacity: isActive ? 1 : 0.5,
                }}
              >
                <X size={10} />
              </button>
            </div>
          )
        })}
      </div>

      {/* Sort/filter icon at right */}
      <div
        style={{
          width: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderLeft: '1px solid #2a2a30',
          flexShrink: 0,
          color: '#4a4a54',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="6" x2="20" y2="6"/>
          <line x1="8" y1="12" x2="20" y2="12"/>
          <line x1="12" y1="18" x2="20" y2="18"/>
        </svg>
      </div>
    </div>
  )
}
