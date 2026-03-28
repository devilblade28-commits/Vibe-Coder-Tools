/**
 * TemplateModal - Modal for selecting project templates.
 * Allows users to quickly start with pre-built starter projects.
 */

import { useState } from 'react'
import { X, Check, Loader2 } from 'lucide-react'
import { PROJECT_TEMPLATES, type ProjectTemplate } from '../data/templates'

interface TemplateModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (template: ProjectTemplate) => void
}

export function TemplateModal({ isOpen, onClose, onSelect }: TemplateModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  
  if (!isOpen) return null
  
  const handleSelect = async (template: ProjectTemplate) => {
    setSelectedId(template.id)
    setApplying(true)
    try {
      await onSelect(template)
      onClose()
    } finally {
      setApplying(false)
      setSelectedId(null)
    }
  }
  
  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !applying) onClose()
  }
  
  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !applying) onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose, applying])
  
  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div style={{
        width: '100%',
        maxWidth: '500px',
        maxHeight: '90vh',
        background: '#141416',
        border: '1px solid #2a2a30',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'fadeInModal 0.2s ease-out',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #2a2a30',
        }}>
          <div>
            <h2 style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#f0f0f2',
              margin: 0,
            }}>
              Start from Template
            </h2>
            <p style={{
              fontSize: '13px',
              color: '#6d6d7a',
              margin: '4px 0 0',
            }}>
              Choose a starter project to begin
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={applying}
            style={{
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#1c1c1f',
              border: '1px solid #2a2a30',
              borderRadius: '8px',
              color: '#8b8b96',
              cursor: applying ? 'not-allowed' : 'pointer',
              opacity: applying ? 0.5 : 1,
            }}
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Template list */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '12px',
        }}>
          {PROJECT_TEMPLATES.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isSelected={selectedId === template.id}
              isApplying={applying && selectedId === template.id}
              onSelect={() => handleSelect(template)}
              disabled={applying}
            />
          ))}
        </div>
        
        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid #2a2a30',
          textAlign: 'center',
        }}>
          <p style={{
            fontSize: '12px',
            color: '#4a4a54',
            margin: 0,
          }}>
            Templates create new files. Existing files won't be modified.
          </p>
        </div>
      </div>
      
      <style>{`
        @keyframes fadeInModal {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

// Individual template card
function TemplateCard({
  template,
  isSelected,
  isApplying,
  onSelect,
  disabled,
}: {
  template: ProjectTemplate
  isSelected: boolean
  isApplying: boolean
  onSelect: () => void
  disabled: boolean
}) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px',
        background: isSelected ? 'rgba(168, 85, 247, 0.1)' : '#1c1c1f',
        border: `1px solid ${isSelected ? '#a855f7' : '#2a2a30'}`,
        borderRadius: '12px',
        marginBottom: '10px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'left',
        transition: 'all 0.15s',
        opacity: disabled && !isSelected ? 0.5 : 1,
      }}
    >
      {/* Icon */}
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #1a0533, #2d1060)',
        border: '1px solid rgba(168, 85, 247, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        flexShrink: 0,
      }}>
        {template.icon}
      </div>
      
      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{
            fontSize: '15px',
            fontWeight: 600,
            color: '#f0f0f2',
          }}>
            {template.name}
          </span>
          <span style={{
            fontSize: '11px',
            color: '#6d6d7a',
            background: '#0d0d0f',
            padding: '2px 6px',
            borderRadius: '4px',
          }}>
            {template.files.length} files
          </span>
        </div>
        <p style={{
          fontSize: '13px',
          color: '#6d6d7a',
          margin: '4px 0 0',
          lineHeight: 1.4,
        }}>
          {template.description}
        </p>
      </div>
      
      {/* Status */}
      <div style={{ flexShrink: 0 }}>
        {isApplying ? (
          <Loader2 size={20} style={{
            color: '#a855f7',
            animation: 'spin 0.8s linear infinite',
          }} />
        ) : isSelected ? (
          <Check size={20} style={{ color: '#a855f7' }} />
        ) : (
          <div style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            border: '2px solid #4a4a54',
          }} />
        )}
      </div>
    </button>
  )
}

// Need React for useEffect
import React from 'react'