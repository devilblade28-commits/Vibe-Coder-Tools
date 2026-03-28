/**
 * AcodeToolbar — Bottom toolbar clone Acode editor
 * Icons: →| ∧ ∨ < > [AI] ⌘ »
 * AI button has special rounded background styling
 */

interface AcodeToolbarProps {
  onTabIndent: () => void
  onArrowUp: () => void
  onArrowDown: () => void
  onArrowLeft: () => void
  onArrowRight: () => void
  onAIClick: () => void
  onCommandClick?: () => void
  onExpandClick?: () => void
}

const ICON_BTN: React.CSSProperties = {
  flex: 1,
  height: '48px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#d4d4d4',
  WebkitTapHighlightColor: 'transparent',
  fontSize: '18px',
  fontFamily: "'Geist Mono', monospace",
  fontWeight: 400,
  minWidth: 0,
}

export function AcodeToolbar({
  onTabIndent,
  onArrowUp,
  onArrowDown,
  onArrowLeft,
  onArrowRight,
  onAIClick,
  onCommandClick,
  onExpandClick,
}: AcodeToolbarProps) {
  return (
    <div
      style={{
        height: '48px',
        background: '#1a1a1d',
        display: 'flex',
        alignItems: 'center',
        borderTop: '1px solid #2a2a30',
        flexShrink: 0,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Tab indent: →| */}
      <button onClick={onTabIndent} style={ICON_BTN}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 7h12M3 12h12M3 17h7M15 5l4 7-4 7"/>
          <line x1="21" y1="5" x2="21" y2="19"/>
        </svg>
      </button>

      {/* Arrow up: ∧ */}
      <button onClick={onArrowUp} style={ICON_BTN}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15"/>
        </svg>
      </button>

      {/* Arrow down: ∨ */}
      <button onClick={onArrowDown} style={ICON_BTN}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* Arrow left: < */}
      <button onClick={onArrowLeft} style={ICON_BTN}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>

      {/* Arrow right: > */}
      <button onClick={onArrowRight} style={ICON_BTN}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>

      {/* AI button — special styling */}
      <button
        onClick={onAIClick}
        style={{
          ...ICON_BTN,
          flex: 'none',
          width: '48px',
          margin: '0 4px',
        }}
      >
        <span
          style={{
            background: 'linear-gradient(135deg, #2d1b69 0%, #1a0e3d 100%)',
            border: '1px solid #4a2f8a',
            borderRadius: '8px',
            padding: '4px 8px',
            fontSize: '12px',
            fontWeight: 700,
            color: '#c4b5fd',
            letterSpacing: '0.05em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '32px',
            height: '26px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          AI
        </span>
      </button>

      {/* Command key: ⌘ */}
      <button onClick={onCommandClick} style={ICON_BTN}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 9H5a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2h4V9zM9 9V5a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4h4zM15 15h4a2 2 0 0 0 2-2v0a2 2 0 0 0-2-2h-4v4zM15 15v4a2 2 0 0 0 2 2v0a2 2 0 0 0 2-2v-4h-4z"/>
        </svg>
      </button>

      {/* Expand: » */}
      <button onClick={onExpandClick} style={ICON_BTN}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="13 17 18 12 13 7"/>
          <polyline points="6 17 11 12 6 7"/>
        </svg>
      </button>
    </div>
  )
}
