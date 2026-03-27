import { useState, useRef, useEffect } from 'react'
import { Send, Square, RotateCcw, Copy, Check, Maximize2, X, Loader2 } from 'lucide-react'
import type { ChatMessage, ActionExecutionResult, AIFileAction } from '../types'

interface ChatScreenProps {
  messages: ChatMessage[]
  isStreaming: boolean
  onSend: (text: string) => void
  onStop: () => void
  onRetry: () => void
  error: string | null
  hasApiKey: boolean
  onGoToSettings: () => void
  onApplyAction: (action: AIFileAction) => Promise<{ success: boolean; error?: string }>
  onOpenImport: () => void
}

const QUICK_ACTIONS = [
  { label: '✨ Create App', prompt: 'Buat single-page app sederhana untuk project ini. Buat file HTML, CSS, dan JS yang dibutuhkan.' },
  { label: '➕ Add Feature', prompt: 'Tambahkan fitur baru yang relevan ke app yang sudah ada di project ini.' },
  { label: '🐛 Fix Bug', prompt: 'Periksa semua file di project ini dan perbaiki bug atau error yang mungkin ada.' },
  { label: '🎨 Improve UI', prompt: 'Perbaiki tampilan dan UX app ini. Buat lebih modern, rapi, dan mobile-friendly.' },
  { label: '📁 Import Files', prompt: '__IMPORT__' },
]

export function ChatScreen({
  messages,
  isStreaming,
  onSend,
  onStop,
  onRetry,
  error,
  hasApiKey,
  onGoToSettings,
  onApplyAction,
  onOpenImport,
}: ChatScreenProps) {
  const [input, setInput] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const el = listRef.current
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
  }, [messages, isStreaming])

  const handleSend = () => {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')
    onSend(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Auto-grow textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const handleQuickAction = (prompt: string) => {
    if (prompt === '__IMPORT__') {
      onOpenImport()
    } else {
      onSend(prompt)
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Message list */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {isEmpty && (
          <EmptyChat onQuickAction={handleQuickAction} />
        )}

        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isLast={i === messages.length - 1}
            onRetry={onRetry}
            onApplyAction={onApplyAction}
          />
        ))}

        {/* Typing indicator — only when last message is user's (AI hasn't responded yet) */}
        {isStreaming && messages[messages.length - 1]?.role === 'user' && (
          <TypingIndicator />
        )}
      </div>

      {/* Missing API key banner */}
      {!hasApiKey && (
        <div
          style={{
            margin: '0 12px 8px',
            padding: '10px 12px',
            background: '#1a0533',
            border: '1px solid rgba(168,85,247,0.3)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '13px', color: '#c084fc' }}>
            API key not set. Add one in Settings to start building.
          </span>
          <button
            onClick={onGoToSettings}
            style={{
              padding: '5px 10px',
              background: '#a855f7',
              borderRadius: '6px',
              color: 'white',
              fontSize: '12px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Settings →
          </button>
        </div>
      )}

      {/* Generic error */}
      {error && (
        <div
          style={{
            margin: '0 12px 8px',
            padding: '8px 12px',
            background: '#1f0707',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            color: '#ef4444',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={onRetry} style={{ color: '#ef4444', flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
            <RotateCcw size={14} />
          </button>
        </div>
      )}

      {/* Quick actions strip — visible only when there are messages */}
      {!isEmpty && (
        <div style={{
          display: 'flex',
          gap: '6px',
          padding: '6px 12px',
          overflowX: 'auto',
          borderTop: '1px solid #1f1f23',
          scrollbarWidth: 'none',
          flexShrink: 0,
        }}>
          {QUICK_ACTIONS.map(({ label, prompt }) => (
            <button
              key={label}
              onClick={() => handleQuickAction(prompt)}
              disabled={isStreaming}
              style={{
                whiteSpace: 'nowrap',
                height: '32px',
                padding: '0 10px',
                background: '#1c1c1f',
                border: '1px solid #2a2a30',
                borderRadius: '9999px',
                color: '#8b8b96',
                fontSize: '12px',
                fontWeight: 500,
                flexShrink: 0,
                WebkitTapHighlightColor: 'transparent',
                opacity: isStreaming ? 0.4 : 1,
                cursor: isStreaming ? 'not-allowed' : 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div
        style={{
          padding: '10px 12px',
          background: '#141416',
          borderTop: '1px solid #1f1f23',
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-end',
          flexShrink: 0,
        }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask AI to build something…"
          rows={1}
          disabled={isStreaming}
          spellCheck={false}
          style={{
            flex: 1,
            background: '#1c1c1f',
            border: `1px solid ${input.trim() ? '#3d3d45' : '#2a2a30'}`,
            borderRadius: '12px',
            padding: '10px 14px',
            color: '#f0f0f2',
            fontSize: '15px',
            resize: 'none',
            maxHeight: '120px',
            minHeight: '44px',
            lineHeight: 1.5,
            outline: 'none',
            fontFamily: 'inherit',
            overflow: 'hidden',
          }}
        />
        <button
          onClick={isStreaming ? onStop : handleSend}
          disabled={!isStreaming && !input.trim()}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            background: isStreaming ? '#1f0707' : '#a855f7',
            border: isStreaming ? '1px solid #ef4444' : 'none',
            color: isStreaming ? '#ef4444' : 'white',
            opacity: !isStreaming && !input.trim() ? 0.35 : 1,
            transition: 'opacity 0.15s, background 0.15s',
            WebkitTapHighlightColor: 'transparent',
            cursor: !isStreaming && !input.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {isStreaming ? <Square size={18} /> : <Send size={18} />}
        </button>
      </div>

      {/* Expand modal portal — rendered at root level */}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes typingPulse {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeInModal {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

// ─── Empty chat state ─────────────────────────────────────────────────────────

function EmptyChat({ onQuickAction }: { onQuickAction: (prompt: string) => void }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      gap: '20px',
      padding: '24px 8px',
      textAlign: 'center',
    }}>
      <div>
        <div style={{
          width: '52px', height: '52px', borderRadius: '14px',
          background: 'linear-gradient(135deg, #1a0533 0%, #2d1060 100%)',
          border: '1px solid rgba(168,85,247,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px',
          fontSize: '22px',
        }}>
          ⌨️
        </div>
        <p style={{ fontSize: '15px', fontWeight: 600, color: '#f0f0f2', margin: '0 0 6px' }}>
          AI Coding Assistant
        </p>
        <p style={{ fontSize: '13px', color: '#6d6d7a', margin: 0, maxWidth: '260px', lineHeight: 1.5 }}>
          Describe what you want to build and I'll generate the files for you.
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: '320px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {QUICK_ACTIONS.map(({ label, prompt }) => (
          <button
            key={label}
            onClick={() => onQuickAction(prompt)}
            style={{
              padding: '12px 10px',
              background: '#141416',
              border: '1px solid #2a2a30',
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '4px',
              textAlign: 'left',
              WebkitTapHighlightColor: 'transparent',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '16px' }}>{label.split(' ')[0]}</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#f0f0f2', lineHeight: 1.3 }}>
              {label.split(' ').slice(1).join(' ')}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  message,
  isLast,
  onRetry,
  onApplyAction,
}: {
  message: ChatMessage
  isLast: boolean
  onRetry: () => void
  onApplyAction: (action: AIFileAction) => Promise<{ success: boolean; error?: string }>
}) {
  const isUser = message.role === 'user'
  const displayText = stripActionBlocks(message.content)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', gap: '6px' }}>
      {/* Bubble */}
      {displayText.trim() && (
        <div
          style={{
            maxWidth: '85%',
            padding: '10px 14px',
            borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
            background: isUser ? '#1a0533' : '#1c1c1f',
            border: `1px solid ${isUser ? 'rgba(168,85,247,0.2)' : '#242428'}`,
            color: '#f0f0f2',
            fontSize: '15px',
            lineHeight: 1.55,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {displayText}
          {message.isStreaming && (
            <span
              style={{
                display: 'inline-block',
                width: '2px',
                height: '15px',
                background: '#a855f7',
                marginLeft: '2px',
                verticalAlign: 'middle',
                animation: 'blink 1s step-end infinite',
              }}
            />
          )}
        </div>
      )}

      {/* Artifact cards — file actions */}
      {message.actionResults && message.actionResults.length > 0 && (
        <ArtifactCards results={message.actionResults} onApplyAction={onApplyAction} />
      )}

      {/* Error + retry */}
      {message.error && isLast && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '85%' }}>
          <span style={{ fontSize: '12px', color: '#ef4444' }}>{message.error}</span>
          <button
            onClick={onRetry}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              background: '#1f0707',
              border: '1px solid #ef4444',
              borderRadius: '6px',
              color: '#ef4444',
              fontSize: '11px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={11} />
            Retry
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Artifact cards ───────────────────────────────────────────────────────────

function ArtifactCards({
  results,
  onApplyAction,
}: {
  results: ActionExecutionResult[]
  onApplyAction: (action: AIFileAction) => Promise<{ success: boolean; error?: string }>
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '340px' }}>
      {results.map((result, i) => (
        <ArtifactCard key={i} result={result} onApplyAction={onApplyAction} />
      ))}
    </div>
  )
}

// ─── File icon helper ─────────────────────────────────────────────────────────

function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'html') return '🌐'
  if (ext === 'css') return '🎨'
  if (ext === 'js') return '⚡'
  if (ext === 'json') return '{}'
  if (ext === 'md') return '📝'
  if (ext === 'ts' || ext === 'tsx') return '🔷'
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(ext)) return '🖼'
  return '📄'
}

// ─── Action badge meta ────────────────────────────────────────────────────────

const ACTION_META: Record<string, { label: string; bg: string; color: string }> = {
  create_file:   { label: 'CREATE', bg: '#052e16', color: '#22c55e' },
  update_file:   { label: 'UPDATE', bg: '#0a1628', color: '#3b82f6' },
  delete_file:   { label: 'DELETE', bg: '#1f0707', color: '#ef4444' },
  create_folder: { label: 'FOLDER', bg: '#1c1002', color: '#f59e0b' },
}

// ─── Expand modal ─────────────────────────────────────────────────────────────

function ExpandModal({
  filename,
  content,
  onClose,
}: {
  filename: string
  content: string
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.82)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          background: '#141416',
          border: '1px solid #2a2a30',
          borderRadius: '16px 16px 0 0',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeInModal 0.18s ease-out',
          overflow: 'hidden',
        }}
      >
        {/* Modal header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: '1px solid #2a2a30',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span style={{ fontSize: '15px' }}>{getFileIcon(filename)}</span>
            <span style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#f0f0f2',
              fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {filename}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button
              onClick={handleCopy}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                background: '#1c1c1f',
                border: '1px solid #2a2a30',
                borderRadius: '6px',
                color: copied ? '#22c55e' : '#8b8b96',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '30px',
                height: '30px',
                background: '#1c1c1f',
                border: '1px solid #2a2a30',
                borderRadius: '8px',
                color: '#8b8b96',
                cursor: 'pointer',
              }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Code content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px 16px',
          fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
          fontSize: '12.5px',
          lineHeight: 1.7,
          color: '#c9c9d4',
          background: '#0d0d0f',
          whiteSpace: 'pre',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}>
          {content}
        </div>
      </div>
    </div>
  )
}

// ─── Single artifact card ─────────────────────────────────────────────────────

function ArtifactCard({
  result,
  onApplyAction,
}: {
  result: ActionExecutionResult
  onApplyAction: (action: AIFileAction) => Promise<{ success: boolean; error?: string }>
}) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)

  const meta = ACTION_META[result.action.action] ?? { label: result.action.action.toUpperCase(), bg: '#1c1c1f', color: '#8b8b96' }
  const hasContent = result.success && result.action.content && result.action.action !== 'delete_file'
  const filename = result.action.file || result.action.folder || ''

  const handleCopy = async () => {
    if (!result.action.content) return
    await navigator.clipboard.writeText(result.action.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleApply = async () => {
    if (applying || applied) return
    setApplying(true)
    setApplyError(null)
    try {
      const res = await onApplyAction(result.action)
      if (res.success) {
        setApplied(true)
      } else {
        setApplyError(res.error ?? 'Failed to apply action')
      }
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setApplying(false)
    }
  }

  // Preview: first 3 lines of content
  const preview = hasContent
    ? result.action.content!.split('\n').slice(0, 3).join('\n')
    : null

  const isDeleteOrFolder = result.action.action === 'delete_file' || result.action.action === 'create_folder'

  return (
    <>
      <div style={{
        background: '#141416',
        border: `1px solid ${result.success ? '#2a2a30' : 'rgba(239,68,68,0.25)'}`,
        borderRadius: '10px',
        overflow: 'hidden',
      }}>
        {/* Card header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '9px 12px',
          borderBottom: (preview) ? '1px solid #1f1f23' : 'none',
          gap: '8px',
        }}>
          {/* Left: icon + filename */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: '14px', flexShrink: 0, lineHeight: 1 }}>
              {getFileIcon(filename)}
            </span>
            <span style={{
              fontSize: '12.5px',
              color: '#e0e0e8',
              fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {filename}
            </span>
          </div>

          {/* Right: action badge */}
          <span style={{
            fontSize: '9.5px',
            fontWeight: 700,
            letterSpacing: '0.07em',
            padding: '2px 6px',
            borderRadius: '4px',
            background: result.success ? meta.bg : '#1f0707',
            color: result.success ? meta.color : '#ef4444',
            flexShrink: 0,
            lineHeight: 1.6,
          }}>
            {result.success ? meta.label : '✗ FAILED'}
          </span>
        </div>

        {/* Code preview with fade */}
        {preview && (
          <div style={{ position: 'relative', height: '62px', overflow: 'hidden', background: '#0d0d0f' }}>
            <div style={{
              padding: '8px 12px',
              fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
              fontSize: '11.5px',
              color: '#6d6d7a',
              lineHeight: 1.65,
              whiteSpace: 'pre',
              overflow: 'hidden',
            }}>
              {preview}
            </div>
            {/* Fade overlay */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '40px',
              background: 'linear-gradient(to bottom, transparent, #0d0d0f)',
              pointerEvents: 'none',
            }} />
          </div>
        )}

        {/* Failed error */}
        {!result.success && result.error && (
          <div style={{ padding: '6px 12px', fontSize: '11.5px', color: '#ef4444', background: '#0d0d0f' }}>
            {result.error}
          </div>
        )}

        {/* Action buttons footer */}
        {result.success && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 10px',
            borderTop: preview ? '1px solid #1f1f23' : (isDeleteOrFolder ? '1px solid #1f1f23' : 'none'),
            background: '#141416',
          }}>
            {/* Copy button */}
            {hasContent && (
              <button
                onClick={handleCopy}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 9px',
                  height: '28px',
                  background: '#1c1c1f',
                  border: '1px solid #2a2a30',
                  borderRadius: '6px',
                  color: copied ? '#22c55e' : '#8b8b96',
                  fontSize: '11px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'color 0.15s',
                  flexShrink: 0,
                }}
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}

            {/* Expand button */}
            {hasContent && (
              <button
                onClick={() => setExpanded(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 9px',
                  height: '28px',
                  background: '#1c1c1f',
                  border: '1px solid #2a2a30',
                  borderRadius: '6px',
                  color: '#8b8b96',
                  fontSize: '11px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <Maximize2 size={11} />
                Expand
              </button>
            )}

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Apply to File button */}
            {!isDeleteOrFolder && (
              <button
                onClick={handleApply}
                disabled={applying || applied}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 11px',
                  height: '28px',
                  background: applied ? '#052e16' : applying ? '#2d1a4a' : '#7c3aed',
                  border: `1px solid ${applied ? '#22c55e40' : applying ? '#a855f740' : '#9333ea'}`,
                  borderRadius: '6px',
                  color: applied ? '#22c55e' : applying ? '#c084fc' : 'white',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: applying || applied ? 'not-allowed' : 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.2s',
                  opacity: applying ? 0.85 : 1,
                }}
              >
                {applying ? (
                  <>
                    <Loader2 size={11} style={{ animation: 'spin 0.8s linear infinite' }} />
                    Applying…
                  </>
                ) : applied ? (
                  <>
                    <Check size={11} />
                    Applied
                  </>
                ) : (
                  <>
                    Apply to File ▶
                  </>
                )}
              </button>
            )}

            {/* Delete action apply button */}
            {result.action.action === 'delete_file' && (
              <button
                onClick={handleApply}
                disabled={applying || applied}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 11px',
                  height: '28px',
                  background: applied ? '#052e16' : applying ? '#2d1a4a' : '#7c1a1a',
                  border: `1px solid ${applied ? '#22c55e40' : '#ef444440'}`,
                  borderRadius: '6px',
                  color: applied ? '#22c55e' : applying ? '#fca5a5' : '#fca5a5',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: applying || applied ? 'not-allowed' : 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.2s',
                }}
              >
                {applying ? (
                  <>
                    <Loader2 size={11} style={{ animation: 'spin 0.8s linear infinite' }} />
                    Deleting…
                  </>
                ) : applied ? (
                  <>
                    <Check size={11} />
                    Deleted
                  </>
                ) : (
                  <>
                    Delete File ▶
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Apply error */}
        {applyError && (
          <div style={{
            padding: '5px 12px 8px',
            fontSize: '11px',
            color: '#ef4444',
            background: '#141416',
            borderTop: '1px solid #1f1f23',
          }}>
            ⚠ {applyError}
          </div>
        )}
      </div>

      {/* Expand modal */}
      {expanded && hasContent && (
        <ExpandModal
          filename={filename}
          content={result.action.content!}
          onClose={() => setExpanded(false)}
        />
      )}

      {/* Spin keyframe (inline for loader) */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{
        padding: '10px 14px',
        borderRadius: '14px 14px 14px 4px',
        background: '#1c1c1f',
        border: '1px solid #242428',
        display: 'flex',
        gap: '4px',
        alignItems: 'center',
      }}>
        {[0, 0.2, 0.4].map((delay, i) => (
          <span
            key={i}
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#4a4a54',
              animation: 'typingPulse 1.2s ease-in-out infinite',
              animationDelay: `${delay}s`,
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: '12px', color: '#4a4a54' }}>Generating…</span>
    </div>
  )
}

function stripActionBlocks(text: string): string {
  return text
    .replace(/```(?:json)?\s*\{[\s\S]*?\}\s*```/g, '')
    .replace(/\{[\s\S]*?"actions"\s*:\s*\[[\s\S]*?\][\s\S]*?\}/g, '')
    .trim()
}
