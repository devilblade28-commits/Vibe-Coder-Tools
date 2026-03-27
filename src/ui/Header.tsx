import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import type { AIProvider } from '../types'

interface HeaderProps {
  projectName: string
  onRenameProject: (name: string) => void
  activeProvider: AIProvider
  activeModel: string
  onOpenModelSelector: () => void
  onOpenSettings: () => void
}

const PROVIDER_SHORT: Record<AIProvider, string> = {
  gemini: 'Gemini',
  claude: 'Claude',
  openai: 'OpenAI',
}

// Shorten model names for the chip
function shortModelName(model: string): string {
  if (model.includes('gemini-2.5-pro')) return 'Gemini 2.5 Pro'
  if (model.includes('gemini-2.0-flash')) return 'Flash 2.0'
  if (model.includes('gemini-1.5-flash')) return 'Flash 1.5'
  if (model.includes('claude-opus')) return 'Opus'
  if (model.includes('claude-3-5-sonnet')) return 'Sonnet 3.5'
  if (model.includes('claude-3-5-haiku')) return 'Haiku 3.5'
  if (model.includes('gpt-4.1')) return 'GPT-4.1'
  if (model.includes('gpt-4o-mini')) return '4o Mini'
  if (model.includes('gpt-4o')) return 'GPT-4o'
  // Fallback: take last segment after last '-'
  const parts = model.split('-')
  return parts.slice(-2).join('-')
}

export function Header({
  projectName,
  onRenameProject,
  activeProvider,
  activeModel,
  onOpenModelSelector,
}: HeaderProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(projectName)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft(projectName)
  }, [projectName])

  const startEdit = () => {
    setDraft(projectName)
    setEditing(true)
    requestAnimationFrame(() => inputRef.current?.select())
  }

  const commitEdit = () => {
    const name = draft.trim()
    if (name && name !== projectName) onRenameProject(name)
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') setEditing(false)
  }

  return (
    <>
      {/* Project name / inline edit */}
      {editing ? (
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '4px', minWidth: 0 }}>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            autoFocus
            style={{
              flex: 1,
              minWidth: 0,
              background: '#1c1c1f',
              border: '1px solid #a855f7',
              borderRadius: '4px',
              padding: '5px 8px',
              color: '#f0f0f2',
              fontSize: '14px',
              fontWeight: 600,
              outline: 'none',
            }}
          />
          <button
            onClick={commitEdit}
            style={{
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              color: '#22c55e',
              flexShrink: 0,
            }}
          >
            <Check size={16} />
          </button>
        </div>
      ) : (
        <button
          onClick={startEdit}
          style={{
            flex: 1,
            minWidth: 0,
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            paddingLeft: '8px',
            WebkitTapHighlightColor: 'transparent',
            textAlign: 'left',
          }}
        >
          <span style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#f0f0f2',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'block',
          }}>
            {projectName}
          </span>
        </button>
      )}

      {/* Model chip — tap to open model selector */}
      <button
        onClick={onOpenModelSelector}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          background: '#1c1c1f',
          border: '1px solid #2a2a30',
          borderRadius: '9999px',
          padding: '5px 10px',
          color: '#8b8b96',
          fontSize: '12px',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          flexShrink: 0,
          height: '32px',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <span style={{ color: '#6d6d7a', fontSize: '11px' }}>{PROVIDER_SHORT[activeProvider]}</span>
        <span style={{ color: '#1f1f23', fontSize: '11px' }}>/</span>
        <span>{shortModelName(activeModel)}</span>
        <ChevronDown size={11} />
      </button>
    </>
  )
}
