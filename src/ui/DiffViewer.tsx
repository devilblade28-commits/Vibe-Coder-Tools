/**
 * DiffViewer - Git-style diff display component.
 * Shows line-by-line diff with additions (green) and deletions (red).
 */

import { useState } from 'react'
import { Copy, Check, ChevronDown, ChevronUp, X, Maximize2 } from 'lucide-react'
import { computeDiff, type DiffLine } from '../utils/diff'

interface DiffViewerProps {
  oldText: string
  newText: string
  filename?: string
  maxHeight?: number
  compact?: boolean
  onAccept?: () => void
  onReject?: () => void
  showActions?: boolean
}

export function DiffViewer({
  oldText,
  newText,
  filename,
  maxHeight = 400,
  compact = false,
  onAccept,
  onReject,
  showActions = false,
}: DiffViewerProps) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(!compact)
  const [fullscreen, setFullscreen] = useState(false)
  
  const { lines, additions, deletions } = computeDiff(oldText, newText)
  
  // For compact mode, show only changed lines with some context
  const displayLines = compact && !expanded
    ? lines.filter(l => l.type !== 'context').slice(0, 10)
    : lines
  
  const handleCopy = async () => {
    const text = lines.map(l => {
      const prefix = l.type === 'add' ? '+' : l.type === 'remove' ? '-' : ' '
      return `${prefix}${l.content}`
    }).join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const hasChanges = additions > 0 || deletions > 0
  
  return (
    <div style={{
      background: '#141416',
      border: '1px solid #2a2a30',
      borderRadius: '8px',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: compact ? '6px 10px' : '10px 12px',
        borderBottom: '1px solid #1f1f23',
        background: '#1c1c1f',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          {filename && (
            <span style={{
              fontSize: '12px',
              fontWeight: 500,
              color: '#f0f0f2',
              fontFamily: "'Geist Mono', monospace",
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {filename}
            </span>
          )}
          {hasChanges && (
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              {additions > 0 && (
                <span style={{
                  fontSize: '11px',
                  color: '#22c55e',
                  background: 'rgba(34, 197, 94, 0.15)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}>
                  +{additions}
                </span>
              )}
              {deletions > 0 && (
                <span style={{
                  fontSize: '11px',
                  color: '#ef4444',
                  background: 'rgba(239, 68, 68, 0.15)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}>
                  -{deletions}
                </span>
              )}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          <button
            onClick={handleCopy}
            title="Copy diff"
            style={{
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: '1px solid #2a2a30',
              borderRadius: '6px',
              color: copied ? '#22c55e' : '#8b8b96',
              cursor: 'pointer',
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
          <button
            onClick={() => setFullscreen(true)}
            title="Expand"
            style={{
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: '1px solid #2a2a30',
              borderRadius: '6px',
              color: '#8b8b96',
              cursor: 'pointer',
            }}
          >
            <Maximize2 size={12} />
          </button>
          {compact && lines.length > 10 && (
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: '1px solid #2a2a30',
                borderRadius: '6px',
                color: '#8b8b96',
                cursor: 'pointer',
              }}
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
        </div>
      </div>
      
      {/* Diff content */}
      <div style={{
        maxHeight: expanded ? 'none' : maxHeight,
        overflow: expanded ? 'visible' : 'auto',
        background: '#0d0d0f',
      }}>
        {!hasChanges ? (
          <div style={{
            padding: '16px',
            textAlign: 'center',
            color: '#6d6d7a',
            fontSize: '13px',
          }}>
            No changes
          </div>
        ) : (
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
            fontSize: '12px',
            lineHeight: 1.6,
          }}>
            <tbody>
              {displayLines.map((line, i) => (
                <DiffLineRow key={i} line={line} />
              ))}
            </tbody>
          </table>
        )}
        
        {/* Show more indicator */}
        {compact && !expanded && lines.length > 10 && (
          <button
            onClick={() => setExpanded(true)}
            style={{
              width: '100%',
              padding: '8px',
              background: '#1c1c1f',
              border: 'none',
              borderTop: '1px solid #1f1f23',
              color: '#8b8b96',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            <ChevronDown size={12} />
            Show {lines.length - 10} more lines
          </button>
        )}
      </div>
      
      {/* Action buttons */}
      {showActions && hasChanges && (
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '10px 12px',
          borderTop: '1px solid #1f1f23',
          background: '#1c1c1f',
        }}>
          <button
            onClick={onAccept}
            style={{
              flex: 1,
              height: '32px',
              background: '#22c55e',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Accept Changes
          </button>
          <button
            onClick={onReject}
            style={{
              flex: 1,
              height: '32px',
              background: '#1c1c1f',
              border: '1px solid #ef4444',
              borderRadius: '6px',
              color: '#ef4444',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reject
          </button>
        </div>
      )}
      
      {/* Fullscreen modal */}
      {fullscreen && (
        <DiffFullscreenModal
          lines={lines}
          filename={filename}
          additions={additions}
          deletions={deletions}
          onClose={() => setFullscreen(false)}
        />
      )}
    </div>
  )
}

// Single diff line row
function DiffLineRow({ line }: { line: DiffLine }) {
  const bg = line.type === 'add'
    ? 'rgba(34, 197, 94, 0.1)'
    : line.type === 'remove'
    ? 'rgba(239, 68, 68, 0.1)'
    : 'transparent'
  
  const borderColor = line.type === 'add'
    ? 'rgba(34, 197, 94, 0.3)'
    : line.type === 'remove'
    ? 'rgba(239, 68, 68, 0.3)'
    : 'transparent'
  
  const prefix = line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '
  const prefixColor = line.type === 'add' ? '#22c55e' : line.type === 'remove' ? '#ef4444' : '#4a4a54'
  
  return (
    <tr style={{ background: bg }}>
      {/* Old line number */}
      <td style={{
        width: '40px',
        minWidth: '40px',
        padding: '0 8px',
        textAlign: 'right',
        color: '#4a4a54',
        background: 'rgba(0,0,0,0.2)',
        borderRight: '1px solid #1f1f23',
        userSelect: 'none',
        borderLeft: `3px solid ${borderColor}`,
      }}>
        {line.oldLineNumber ?? ''}
      </td>
      {/* New line number */}
      <td style={{
        width: '40px',
        minWidth: '40px',
        padding: '0 8px',
        textAlign: 'right',
        color: '#4a4a54',
        background: 'rgba(0,0,0,0.2)',
        borderRight: '1px solid #1f1f23',
        userSelect: 'none',
      }}>
        {line.newLineNumber ?? ''}
      </td>
      {/* Prefix */}
      <td style={{
        width: '16px',
        minWidth: '16px',
        padding: '0 4px',
        textAlign: 'center',
        color: prefixColor,
        userSelect: 'none',
      }}>
        {prefix}
      </td>
      {/* Content */}
      <td style={{
        padding: '0 12px 0 4px',
        color: line.type === 'add' ? '#86efac' : line.type === 'remove' ? '#fca5a5' : '#d4d4d8',
        whiteSpace: 'pre',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {line.content || ' '}
      </td>
    </tr>
  )
}

// Fullscreen modal for diff viewing
function DiffFullscreenModal({
  lines,
  filename,
  additions,
  deletions,
  onClose,
}: {
  lines: DiffLine[]
  filename?: string
  additions: number
  deletions: number
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = async () => {
    const text = lines.map(l => {
      const prefix = l.type === 'add' ? '+' : l.type === 'remove' ? '-' : ' '
      return `${prefix}${l.content}`
    }).join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }
  
  // Close on Escape
  React.useEffect(() => {
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
        background: 'rgba(0,0,0,0.85)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{
        width: '100%',
        maxWidth: '900px',
        maxHeight: '90vh',
        background: '#141416',
        border: '1px solid #2a2a30',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: '1px solid #2a2a30',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {filename && (
              <span style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#f0f0f2',
                fontFamily: "'Geist Mono', monospace",
              }}>
                {filename}
              </span>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{
                fontSize: '12px',
                color: '#22c55e',
                background: 'rgba(34, 197, 94, 0.15)',
                padding: '3px 8px',
                borderRadius: '4px',
              }}>
                +{additions}
              </span>
              <span style={{
                fontSize: '12px',
                color: '#ef4444',
                background: 'rgba(239, 68, 68, 0.15)',
                padding: '3px 8px',
                borderRadius: '4px',
              }}>
                -{deletions}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleCopy}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                background: '#1c1c1f',
                border: '1px solid #2a2a30',
                borderRadius: '6px',
                color: copied ? '#22c55e' : '#8b8b96',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#1c1c1f',
                border: '1px solid #2a2a30',
                borderRadius: '8px',
                color: '#8b8b96',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          background: '#0d0d0f',
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
            fontSize: '13px',
            lineHeight: 1.7,
          }}>
            <tbody>
              {lines.map((line, i) => (
                <DiffLineRow key={i} line={line} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Need to import React for useEffect in fullscreen modal
import React from 'react'