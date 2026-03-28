/**
 * SymbolToolbar — toolbar bawah ala Acode
 * Berisi: Tab indent, navigasi baris ↑↓, simbol kode, undo/redo
 */

import { Undo2, Redo2, MoveUp, MoveDown } from 'lucide-react'

interface SymbolToolbarProps {
  language: string
  onInsert: (symbol: string) => void
  onUndo: () => void
  onRedo: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

// Simbol per bahasa
const LANG_SYMBOLS: Record<string, string[]> = {
  html: ['<', '>', '/', '=', '"', "'", '!', '-', '(', ')', '{', '}', '[', ']', ';'],
  css:  ['{', '}', ':', ';', '(', ')', '.', '#', '@', '-', '!', '/', '*', '%', '"'],
  javascript: ['{', '}', '(', ')', '[', ']', '=>', '===', '!==', '?.', '??', '...', ';', ':', "'"],
  json: ['{', '}', '[', ']', ':', ',', '"', 'true', 'false', 'null'],
  markdown: ['#', '**', '*', '`', '```', '-', '[', ']', '(', ')', '!', '>', '---'],
  text: ['{', '}', '(', ')', '[', ']', '<', '>', '/', '=', '"', "'", ';', ':', '.'],
}

// Style tombol toolbar
const btnStyle = (active?: boolean): React.CSSProperties => ({
  height: '36px',
  minWidth: '36px',
  padding: '0 8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: active ? 'rgba(168,85,247,0.15)' : 'transparent',
  border: 'none',
  borderRadius: '6px',
  color: active ? '#a855f7' : '#8b8b96',
  fontSize: '13px',
  fontFamily: 'monospace',
  flexShrink: 0,
  WebkitTapHighlightColor: 'transparent',
  cursor: 'pointer',
})

export function SymbolToolbar({
  language, onInsert, onUndo, onRedo, onMoveUp, onMoveDown,
}: SymbolToolbarProps) {
  const symbols = LANG_SYMBOLS[language] ?? LANG_SYMBOLS.text

  return (
    <div style={{
      background: '#141416',
      borderTop: '1px solid #1f1f23',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Row 1: Kontrol utama */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '4px 6px',
        gap: '2px',
        borderBottom: '1px solid #1f1f23',
      }}>
        {/* Tab indent */}
        <button
          style={btnStyle()}
          onMouseDown={(e) => { e.preventDefault(); onInsert('  ') }}
          title="Tab indent"
        >
          →|
        </button>

        {/* Divider */}
        <div style={{ width: '1px', height: '20px', background: '#2a2a30', margin: '0 2px' }} />

        {/* Navigasi baris */}
        <button
          style={btnStyle()}
          onMouseDown={(e) => { e.preventDefault(); onMoveUp() }}
          title="Pindah baris ke atas"
        >
          ↑
        </button>
        <button
          style={btnStyle()}
          onMouseDown={(e) => { e.preventDefault(); onMoveDown() }}
          title="Pindah baris ke bawah"
        >
          ↓
        </button>

        {/* Divider */}
        <div style={{ width: '1px', height: '20px', background: '#2a2a30', margin: '0 2px' }} />

        {/* Undo / Redo */}
        <button
          style={btnStyle()}
          onMouseDown={(e) => { e.preventDefault(); onUndo() }}
          title="Undo"
        >
          <Undo2 size={14} />
        </button>
        <button
          style={btnStyle()}
          onMouseDown={(e) => { e.preventDefault(); onRedo() }}
          title="Redo"
        >
          <Redo2 size={14} />
        </button>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Info posisi cursor — opsional, bisa dihapus */}
        <span style={{ fontSize: '11px', color: '#3d3d45', paddingRight: '4px' }}>
          {language.toUpperCase()}
        </span>
      </div>

      {/* Row 2: Simbol kode — scrollable horizontal */}
      <div style={{
        display: 'flex',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        padding: '4px 6px',
        gap: '2px',
      }}>
        {symbols.map((sym) => (
          <button
            key={sym}
            style={{
              ...btnStyle(),
              minWidth: sym.length > 2 ? 'auto' : '36px',
              padding: sym.length > 2 ? '0 10px' : '0',
              fontSize: sym.length > 2 ? '11px' : '14px',
              color: '#d4d4d8',
              background: '#1c1c1f',
              border: '1px solid #2a2a30',
            }}
            onMouseDown={(e) => { e.preventDefault(); onInsert(sym) }}
          >
            {sym}
          </button>
        ))}
      </div>
    </div>
  )
}