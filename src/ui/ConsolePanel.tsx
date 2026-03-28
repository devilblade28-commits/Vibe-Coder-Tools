/**
 * ConsolePanel - Console log viewer for preview output.
 * Shows intercepted console.log, console.error, etc. from the preview iframe.
 */

import { useState, useRef, useEffect } from 'react'
import { Terminal, X, ChevronDown, ChevronUp, Trash2, AlertCircle, AlertTriangle, Info, Bug, CheckCircle } from 'lucide-react'

export interface ConsoleEntry {
  id: string
  type: 'log' | 'error' | 'warn' | 'info' | 'debug' | 'table'
  args: string[]
  timestamp: number
}

interface ConsolePanelProps {
  entries: ConsoleEntry[]
  onClear: () => void
  defaultExpanded?: boolean
}

export function ConsolePanel({ entries, onClear, defaultExpanded = false }: ConsolePanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [autoScroll, setAutoScroll] = useState(true)
  const listRef = useRef<HTMLDivElement>(null)
  
  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (autoScroll && listRef.current && expanded) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [entries, autoScroll, expanded])
  
  const errorCount = entries.filter(e => e.type === 'error').length
  const warnCount = entries.filter(e => e.type === 'warn').length
  
  return (
    <div style={{
      background: '#0d0d0f',
      borderTop: '1px solid #1f1f23',
      display: 'flex',
      flexDirection: 'column',
      maxHeight: expanded ? '200px' : 'auto',
    }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: '#141416',
          border: 'none',
          color: '#8b8b96',
          cursor: 'pointer',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={14} />
          <span style={{ fontSize: '12px', fontWeight: 500 }}>Console</span>
          {entries.length > 0 && (
            <span style={{
              fontSize: '11px',
              color: '#6d6d7a',
              background: '#0d0d0f',
              padding: '2px 6px',
              borderRadius: '4px',
            }}>
              {entries.length}
            </span>
          )}
          {errorCount > 0 && (
            <span style={{
              fontSize: '11px',
              color: '#ef4444',
              background: 'rgba(239, 68, 68, 0.15)',
              padding: '2px 6px',
              borderRadius: '4px',
            }}>
              {errorCount} error{errorCount !== 1 ? 's' : ''}
            </span>
          )}
          {warnCount > 0 && (
            <span style={{
              fontSize: '11px',
              color: '#f59e0b',
              background: 'rgba(245, 158, 11, 0.15)',
              padding: '2px 6px',
              borderRadius: '4px',
            }}>
              {warnCount} warn{warnCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {entries.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); onClear() }}
              style={{
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                color: '#6d6d7a',
                cursor: 'pointer',
                borderRadius: '6px',
              }}
            >
              <Trash2 size={12} />
            </button>
          )}
          {expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </div>
      </button>
      
      {/* Content */}
      {expanded && (
        <div
          ref={listRef}
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '8px 0',
            fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
            fontSize: '11px',
          }}
        >
          {entries.length === 0 ? (
            <div style={{
              padding: '16px 12px',
              textAlign: 'center',
              color: '#4a4a54',
            }}>
              No console output yet
            </div>
          ) : (
            entries.map((entry) => (
              <ConsoleEntryRow key={entry.id} entry={entry} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// Single console entry row
function ConsoleEntryRow({ entry }: { entry: ConsoleEntry }) {
  const [expanded, setExpanded] = useState(false)
  
  const icon = entry.type === 'error' ? (
    <AlertCircle size={12} style={{ color: '#ef4444' }} />
  ) : entry.type === 'warn' ? (
    <AlertTriangle size={12} style={{ color: '#f59e0b' }} />
  ) : entry.type === 'info' ? (
    <Info size={12} style={{ color: '#3b82f6' }} />
  ) : entry.type === 'debug' ? (
    <Bug size={12} style={{ color: '#8b5cf6' }} />
  ) : (
    <CheckCircle size={12} style={{ color: '#22c55e' }} />
  )
  
  const bgColor = entry.type === 'error'
    ? 'rgba(239, 68, 68, 0.08)'
    : entry.type === 'warn'
    ? 'rgba(245, 158, 11, 0.08)'
    : 'transparent'
  
  const content = entry.args.join(' ')
  const isLong = content.length > 100 || content.includes('\n')
  
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        padding: '6px 12px',
        background: bgColor,
        borderBottom: '1px solid #1f1f23',
        cursor: isLong ? 'pointer' : 'default',
      }}
      onClick={() => isLong && setExpanded(!expanded)}
    >
      <div style={{ flexShrink: 0, marginTop: '2px' }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        {expanded ? (
          <pre style={{
            margin: 0,
            color: entry.type === 'error' ? '#fca5a5' : entry.type === 'warn' ? '#fcd34d' : '#d4d4d8',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            lineHeight: 1.5,
          }}>
            {content}
          </pre>
        ) : (
          <div style={{
            color: entry.type === 'error' ? '#fca5a5' : entry.type === 'warn' ? '#fcd34d' : '#d4d4d8',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {content}
          </div>
        )}
      </div>
      <div style={{
        flexShrink: 0,
        fontSize: '10px',
        color: '#4a4a54',
        marginTop: '2px',
      }}>
        {formatTime(entry.timestamp)}
      </div>
    </div>
  )
}

// Format timestamp as HH:MM:SS
function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default ConsolePanel