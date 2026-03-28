/**
 * AcodeStatusBar — Status bar clone Acode editor
 * Layout: Ln X, Col Y [spacer] Sp: 2 · HTML · LF · UTF-8
 */

interface AcodeStatusBarProps {
  line: number
  col: number
  language: string
  indentSize?: number
}

const LANGUAGE_NAMES: Record<string, string> = {
  html: 'HTML',
  htm: 'HTML',
  css: 'CSS',
  js: 'JavaScript',
  mjs: 'JavaScript',
  ts: 'TypeScript',
  tsx: 'TypeScript',
  jsx: 'JavaScript',
  json: 'JSON',
  md: 'Markdown',
  markdown: 'Markdown',
  txt: 'Plain Text',
  svg: 'SVG',
}

function getLanguageName(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  return LANGUAGE_NAMES[ext] ?? (ext.toUpperCase() || 'Text')
}

export function AcodeStatusBar({ line, col, language, indentSize = 2 }: AcodeStatusBarProps) {
  const langName = getLanguageName(language)

  return (
    <div
      style={{
        height: '28px',
        background: '#1a1a1d',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        borderTop: '1px solid #2a2a30',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {/* Left: cursor position */}
      <span
        style={{
          fontSize: '11px',
          color: '#8b8b96',
          fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
          whiteSpace: 'nowrap',
        }}
      >
        Ln {line}, Col {col}
      </span>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Right: file info */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '11px',
          color: '#8b8b96',
          fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
          whiteSpace: 'nowrap',
        }}
      >
        <span>Sp: {indentSize}</span>
        <span style={{ color: '#3d3d45' }}>·</span>
        <span>{langName}</span>
        <span style={{ color: '#3d3d45' }}>·</span>
        <span>LF</span>
        <span style={{ color: '#3d3d45' }}>·</span>
        <span>UTF-8</span>
      </div>
    </div>
  )
}
