import { Check, ChevronRight } from 'lucide-react'
import type { AIProvider } from '../types'
import { PROVIDER_MODELS } from '../ai/providers'

interface ModelSelectorProps {
  activeProvider: AIProvider
  activeModel: string
  onSelect: (provider: AIProvider, model: string) => void
  onClose: () => void
  onOpenCustom?: () => void
}

export function ModelSelector({ activeProvider, activeModel, onSelect, onClose, onOpenCustom }: ModelSelectorProps) {
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

        <div style={{ maxHeight: '65vh', overflowY: 'auto' }}>
          {PROVIDER_MODELS.map((group) => (
            <div key={group.provider}>
              {/* Provider header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 20px 4px',
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: group.color, flexShrink: 0 }} />
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#4a4a54', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                  {group.label}
                </p>
              </div>
              {group.models.map((m) => {
                const isActive = activeProvider === group.provider && activeModel === m.value
                return (
                  <button
                    key={m.value}
                    onClick={() => { onSelect(group.provider, m.value); onClose() }}
                    style={{
                      width: '100%',
                      minHeight: '52px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 20px',
                      background: isActive ? 'rgba(168,85,247,0.08)' : 'transparent',
                      WebkitTapHighlightColor: 'transparent',
                      gap: '8px',
                    }}
                  >
                    <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: '14px', color: isActive ? '#c084fc' : '#e0e0e8', fontWeight: isActive ? 600 : 400 }}>
                        {m.label}
                      </span>
                      {m.description && (
                        <span style={{ display: 'block', fontSize: '11px', color: '#4a4a54', marginTop: '1px' }}>
                          {m.description}
                        </span>
                      )}
                    </div>
                    {isActive && <Check size={16} style={{ color: '#a855f7', flexShrink: 0 }} />}
                  </button>
                )
              })}
            </div>
          ))}

          {/* Custom provider option */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 20px 4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#8b5cf6', flexShrink: 0 }} />
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#4a4a54', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                Custom
              </p>
            </div>
            <button
              onClick={() => {
                onSelect('custom', '')
                if (onOpenCustom) { onOpenCustom(); onClose() } else { onClose() }
              }}
              style={{
                width: '100%',
                minHeight: '52px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 20px',
                background: activeProvider === 'custom' ? 'rgba(168,85,247,0.08)' : 'transparent',
                WebkitTapHighlightColor: 'transparent',
                gap: '8px',
              }}
            >
              <div style={{ textAlign: 'left', flex: 1 }}>
                <span style={{ display: 'block', fontSize: '14px', color: activeProvider === 'custom' ? '#c084fc' : '#e0e0e8', fontWeight: activeProvider === 'custom' ? 600 : 400 }}>
                  Custom Endpoint
                </span>
                <span style={{ display: 'block', fontSize: '11px', color: '#4a4a54', marginTop: '1px' }}>
                  OpenRouter, Groq, local proxy, any OpenAI-compatible API
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                {activeProvider === 'custom' && <Check size={16} style={{ color: '#a855f7' }} />}
                <ChevronRight size={14} style={{ color: '#4a4a54' }} />
              </div>
            </button>
          </div>
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
