import { Check } from 'lucide-react'
import type { AIProvider } from '../types'

const PROVIDER_MODELS: { provider: AIProvider; label: string; models: { value: string; label: string }[] }[] = [
  {
    provider: 'gemini',
    label: 'Google Gemini',
    models: [
      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      { value: 'gemini-2.5-pro-preview-03-25', label: 'Gemini 2.5 Pro' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    ],
  },
  {
    provider: 'claude',
    label: 'Anthropic Claude',
    models: [
      { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
      { value: 'claude-opus-4-5', label: 'Claude Opus 4.5' },
    ],
  },
  {
    provider: 'openai',
    label: 'OpenAI',
    models: [
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4.1', label: 'GPT-4.1' },
    ],
  },
]

interface ModelSelectorProps {
  activeProvider: AIProvider
  activeModel: string
  onSelect: (provider: AIProvider, model: string) => void
  onClose: () => void
}

export function ModelSelector({ activeProvider, activeModel, onSelect, onClose }: ModelSelectorProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50, backdropFilter: 'blur(2px)' }}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxWidth: '430px',
          margin: '0 auto',
          background: '#1c1c1f',
          borderRadius: '16px 16px 0 0',
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
          zIndex: 51,
          animation: 'slideUp 200ms ease-out',
        }}
      >
        {/* Handle */}
        <div style={{ width: '36px', height: '4px', background: '#3d3d45', borderRadius: '9999px', margin: '8px auto 16px' }} />

        <p style={{ fontSize: '15px', fontWeight: 600, color: '#f0f0f2', padding: '0 20px 12px' }}>
          Select Model
        </p>

        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {PROVIDER_MODELS.map((group) => (
            <div key={group.provider}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#4a4a54', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 20px 4px' }}>
                {group.label}
              </p>
              {group.models.map((m) => {
                const isActive = activeProvider === group.provider && activeModel === m.value
                return (
                  <button
                    key={m.value}
                    onClick={() => { onSelect(group.provider, m.value); onClose() }}
                    style={{
                      width: '100%',
                      height: '52px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0 20px',
                      color: isActive ? '#c084fc' : '#8b8b96',
                      fontWeight: isActive ? 500 : 400,
                      fontSize: '14px',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <span>{m.label}</span>
                    {isActive && <Check size={16} style={{ color: '#a855f7' }} />}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <div style={{ padding: '12px 16px 0' }}>
          <button
            onClick={onClose}
            style={{
              width: '100%',
              height: '48px',
              background: '#242428',
              border: '1px solid #3d3d45',
              borderRadius: '10px',
              color: '#8b8b96',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  )
}
