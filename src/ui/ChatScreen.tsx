import { useState, useRef, useEffect } from 'react'
import { Send, Square, RotateCcw, Sparkles, Plus, Wrench, Palette, Copy, Check } from 'lucide-react'
import type { ChatMessage, ActionExecutionResult } from '../types'

interface ChatScreenProps {
  messages: ChatMessage[]
  isStreaming: boolean
  onSend: (text: string) => void
  onStop: () => void
  onRetry: () => void
  error: string | null
  /** Whether the active provider has an API key configured */
  hasApiKey: boolean
  onGoToSettings: () => void
}

const QUICK_ACTIONS = [
  { label: '✨ Create App', prompt: 'Buat single-page app sederhana untuk project ini dengan HTML, CSS, dan JavaScript.' },
  { label: '➕ Add Feature', prompt: 'Tambahkan fitur baru yang berguna ke app yang sudah ada.' },
  { label: '🐛 Fix Bug', prompt: 'Periksa kode yang ada dan perbaiki bug atau masalah yang mungkin ada.' },
  { label: '🎨 Improve UI', prompt: 'Perbaiki tampilan dan UX app ini agar lebih modern dan menarik.' },
]

export function ChatScreen({ messages, isStreaming, onSend, onStop, onRetry, error, hasApiKey, onGoToSettings }: ChatScreenProps) {
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
          <EmptyChat onSend={onSend} />
        )}

        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isLast={i === messages.length - 1}
            onRetry={onRetry}
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
          <button onClick={onRetry} style={{ color: '#ef4444', flexShrink: 0 }}>
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
              onClick={() => onSend(prompt)}
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
          }}
        >
          {isStreaming ? <Square size={18} /> : <Send size={18} />}
        </button>
      </div>
    </div>
  )
}

// ─── Empty chat state ─────────────────────────────────────────────────────────

function EmptyChat({ onSend }: { onSend: (text: string) => void }) {
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
            onClick={() => onSend(prompt)}
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
}: {
  message: ChatMessage
  isLast: boolean
  onRetry: () => void
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
        <ArtifactCards results={message.actionResults} />
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

function ArtifactCards({ results }: { results: ActionExecutionResult[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', maxWidth: '320px' }}>
      {results.map((result, i) => (
        <ArtifactCard key={i} result={result} />
      ))}
    </div>
  )
}

function ArtifactCard({ result }: { result: ActionExecutionResult }) {
  const [copied, setCopied] = useState(false)

  const ACTION_META: Record<string, { label: string; bg: string; color: string }> = {
    create_file: { label: 'CREATE', bg: '#052e16', color: '#22c55e' },
    update_file: { label: 'UPDATE', bg: '#0a1628', color: '#3b82f6' },
    delete_file: { label: 'DELETE', bg: '#1f0707', color: '#ef4444' },
    create_folder: { label: 'FOLDER', bg: '#1c1002', color: '#f59e0b' },
  }

  const meta = ACTION_META[result.action.action] ?? { label: result.action.action.toUpperCase(), bg: '#1c1c1f', color: '#8b8b96' }
  const hasContent = result.success && result.action.content && result.action.action !== 'delete_file'

  const handleCopy = async () => {
    if (!result.action.content) return
    await navigator.clipboard.writeText(result.action.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Preview: first 3 lines of content
  const preview = hasContent
    ? result.action.content!.split('\n').slice(0, 3).join('\n')
    : null

  return (
    <div style={{
      background: '#141416',
      border: `1px solid ${result.success ? '#2a2a30' : '#ef44441a'}`,
      borderRadius: '10px',
      overflow: 'hidden',
    }}>
      {/* Card header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        borderBottom: hasContent ? '1px solid #1f1f23' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            padding: '2px 6px',
            borderRadius: '4px',
            background: result.success ? meta.bg : '#1f0707',
            color: result.success ? meta.color : '#ef4444',
            flexShrink: 0,
          }}>
            {result.success ? meta.label : '✗ FAILED'}
          </span>
          <span style={{
            fontSize: '13px',
            color: '#f0f0f2',
            fontFamily: 'monospace',
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {result.action.file}
          </span>
        </div>

        {hasContent && (
          <button
            onClick={handleCopy}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              background: '#1c1c1f',
              border: '1px solid #2a2a30',
              borderRadius: '6px',
              color: copied ? '#22c55e' : '#8b8b96',
              fontSize: '11px',
              fontWeight: 500,
              flexShrink: 0,
              height: '28px',
            }}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>

      {/* Code preview */}
      {preview && (
        <div style={{
          padding: '8px 12px',
          fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
          fontSize: '12px',
          color: '#6d6d7a',
          lineHeight: 1.6,
          background: '#0d0d0f',
          WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
          maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
          maxHeight: '64px',
          overflow: 'hidden',
          whiteSpace: 'pre',
        }}>
          {preview}
        </div>
      )}

      {/* Error message */}
      {!result.success && result.error && (
        <div style={{ padding: '6px 12px', fontSize: '12px', color: '#ef4444', background: '#0d0d0f' }}>
          {result.error}
        </div>
      )}
    </div>
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
