/**
 * AcodeHeader — Header bar clone Acode editor
 * Layout: hamburger | file-icon | filename | [spacer] | search | play | more
 */
import type { ProjectFile } from '../types'

// File type icon colors (VS Code conventions)
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

// HTML5 icon SVG
function Html5Icon({ size = 18, color = '#e44d26' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M1.5 0h21l-1.91 21.563L11.977 24l-8.565-2.438L1.5 0zm7.031 9.75l-.232-2.718 10.059.003.23-2.622L5.412 4.41l.698 8.01h9.126l-.326 3.426-2.91.804-2.955-.81-.188-2.11H6.248l.33 4.171L12 19.351l5.379-1.443.744-8.157H8.531z"/>
    </svg>
  )
}

// Generic file icon
function FileIcon({ name, size = 18 }: { name: string; size?: number }) {
  const ext = getFileExt(name)
  const color = getFileColor(name)

  if (ext === 'html' || ext === 'htm') {
    return <Html5Icon size={size} color={color} />
  }

  // Generic colored text icon
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill={color} opacity="0.85"/>
      <path d="M14 2v6h6" fill="none" stroke={color} strokeWidth="1.5"/>
    </svg>
  )
}

interface AcodeHeaderProps {
  activeFile: ProjectFile | null
  onHamburgerClick: () => void
  onSearchClick: () => void
  onPlayClick: () => void
  onMoreClick?: () => void
}

export function AcodeHeader({
  activeFile,
  onHamburgerClick,
  onSearchClick,
  onPlayClick,
  onMoreClick,
}: AcodeHeaderProps) {
  return (
    <div
      style={{
        height: '56px',
        background: '#0d0d0f',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: '4px',
        paddingRight: '4px',
        gap: '0px',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {/* Hamburger button */}
      <button
        onClick={onHamburgerClick}
        style={{
          width: '44px',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          color: '#f0f0f2',
          WebkitTapHighlightColor: 'transparent',
          flexShrink: 0,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <rect x="3" y="5" width="18" height="2" rx="1"/>
          <rect x="3" y="11" width="18" height="2" rx="1"/>
          <rect x="3" y="17" width="18" height="2" rx="1"/>
        </svg>
      </button>

      {/* File icon */}
      {activeFile && (
        <div style={{ flexShrink: 0, marginRight: '6px', display: 'flex', alignItems: 'center' }}>
          <FileIcon name={activeFile.name} size={18} />
        </div>
      )}

      {/* Filename */}
      <span
        style={{
          flex: 1,
          fontSize: '16px',
          fontWeight: 500,
          color: '#f0f0f2',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          minWidth: 0,
        }}
      >
        {activeFile?.name ?? 'No file'}
      </span>

      {/* Action icons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingRight: '4px', flexShrink: 0 }}>
        {/* Search */}
        <button
          onClick={onSearchClick}
          style={{
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            color: '#d4d4d4',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>

        {/* Play (green) */}
        <button
          onClick={onPlayClick}
          style={{
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            color: '#4caf50',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </button>

        {/* More (3 dots) */}
        <button
          onClick={onMoreClick}
          style={{
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            color: '#d4d4d4',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="1.5"/>
            <circle cx="12" cy="12" r="1.5"/>
            <circle cx="12" cy="19" r="1.5"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
