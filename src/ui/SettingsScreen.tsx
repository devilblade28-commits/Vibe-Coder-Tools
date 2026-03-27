import { useState } from 'react'
import { Eye, EyeOff, AlertTriangle, ChevronRight, Zap } from 'lucide-react'
import type { AIProvider, CustomProviderConfig } from '../types'
import type { AISettingsSnapshot } from '../storage/ls'
import { PROVIDER_MODELS, API_KEY_LINKS } from '../ai/providers'

interface SettingsScreenProps {
  settings: AISettingsSnapshot
  projectName: string
  fileCount: number
  onUpdateProvider: (provider: AIProvider) => void
  onUpdateModel: (provider: AIProvider, model: string) => void
  onUpdateApiKey: (provider: AIProvider, key: string) => void
  onUpdateSystemInstruction: (text: string) => void
  onUpdateCustomProvider: (config: CustomProviderConfig) => void
  onDeleteProject: () => void
  onResetAll: () => void
}

const PROVIDER_TABS: { id: AIProvider; label: string; color: string }[] = [
  { id: 'gemini', label: 'Gemini', color: '#4285f4' },
  { id: 'claude', label: 'Claude', color: '#d97706' },
  { id: 'openai', label: 'OpenAI', color: '#22c55e' },
  { id: 'custom', label: 'Custom', color: '#8b5cf6' },
]

export function SettingsScreen({
  settings, projectName, fileCount,
  onUpdateProvider, onUpdateModel, onUpdateApiKey,
  onUpdateSystemInstruction, onUpdateCustomProvider, onDeleteProject, onResetAll,
}: SettingsScreenProps) {
  const [showApiKey, setShowApiKey] = useState(false)
  const [showCustomApiKey, setShowCustomApiKey] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  // Local draft for custom provider (saves on blur/change)
  const [customDraft, setCustomDraft] = useState<CustomProviderConfig>(settings.customProvider)

  const activeProvider = settings.activeProvider
  const isCustom = activeProvider === 'custom'

  const builtinGroup = PROVIDER_MODELS.find((g) => g.provider === activeProvider)
  const currentApiKey = isCustom ? settings.customProvider.apiKey : (settings.apiKeys[activeProvider] ?? '')

  const handleCustomChange = (field: keyof CustomProviderConfig, value: string) => {
    const updated = { ...customDraft, [field]: value }
    setCustomDraft(updated)
    onUpdateCustomProvider(updated)
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '0 0 32px' }}>

      {/* Provider & Model section */}
      <SectionHeader>Provider & Model</SectionHeader>
      <div style={{ padding: '0 16px 16px' }}>

        {/* Provider tabs — scrollable on narrow screen */}
        <div style={{
          display: 'flex', background: '#1c1c1f', borderRadius: '10px',
          padding: '3px', gap: '2px', marginBottom: '16px', overflowX: 'auto',
          scrollbarWidth: 'none',
        }}>
          {PROVIDER_TABS.map((p) => (
            <button
              key={p.id}
              onClick={() => onUpdateProvider(p.id)}
              style={{
                flex: '1 0 auto',
                minWidth: '60px',
                height: '38px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: activeProvider === p.id ? 600 : 400,
                background: activeProvider === p.id ? '#2a2a30' : 'transparent',
                color: activeProvider === p.id ? '#f0f0f2' : '#6d6d7a',
                transition: 'all 0.15s',
                WebkitTapHighlightColor: 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                whiteSpace: 'nowrap',
              }}
            >
              {activeProvider === p.id && (
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.color, flexShrink: 0 }} />
              )}
              {p.label}
            </button>
          ))}
        </div>

        {/* ── Built-in providers ─────────────────────────────────────────── */}
        {!isCustom && builtinGroup && (
          <>
            {/* Model dropdown */}
            <FieldLabel>Model</FieldLabel>
            <select
              value={settings.activeModel}
              onChange={(e) => onUpdateModel(activeProvider, e.target.value)}
              style={{ ...inputStyle, marginBottom: '16px', cursor: 'pointer' }}
            >
              {builtinGroup.models.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}{m.description ? ` — ${m.description}` : ''}
                </option>
              ))}
            </select>

            {/* API Key */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <FieldLabel style={{ margin: 0 }}>
                API Key — {builtinGroup.label}
              </FieldLabel>
              <a
                href={API_KEY_LINKS[activeProvider]}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '11px', color: '#a855f7', display: 'flex', alignItems: 'center', gap: '2px' }}
              >
                Get key <ChevronRight size={11} />
              </a>
            </div>
            <div style={{ position: 'relative', marginBottom: '6px' }}>
              <input
                type={showApiKey ? 'text' : 'password'}
                value={currentApiKey}
                onChange={(e) => onUpdateApiKey(activeProvider, e.target.value)}
                placeholder={`Paste your ${builtinGroup.label} API key…`}
                style={{ ...inputStyle, paddingRight: '46px' }}
              />
              <button
                onClick={() => setShowApiKey((v) => !v)}
                style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  color: '#4a4a54', width: '32px', height: '32px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {!currentApiKey && (
              <p style={{ fontSize: '11px', color: '#f59e0b', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={11} /> Add an API key to use AI features.
              </p>
            )}
            {currentApiKey && (
              <p style={{ fontSize: '11px', color: '#4a4a54', margin: '4px 0 0' }}>
                Stored locally in your browser only — never sent to any server.
              </p>
            )}

            {/* Current model badge */}
            <div style={{ marginTop: '12px', padding: '8px 12px', background: '#141416', border: '1px solid #2a2a30', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={12} style={{ color: builtinGroup.color, flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: '#8b8b96' }}>Active model:</span>
              <span style={{ fontSize: '12px', color: '#f0f0f2', fontFamily: 'monospace', fontWeight: 600 }}>
                {settings.activeModel}
              </span>
            </div>
          </>
        )}

        {/* ── Custom provider ────────────────────────────────────────────── */}
        {isCustom && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '8px 12px', background: '#1a0533', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '8px' }}>
              <p style={{ fontSize: '12px', color: '#c084fc', margin: 0, lineHeight: 1.5 }}>
                Custom mode: use any OpenAI-compatible endpoint (OpenRouter, Groq, local proxy, etc.)
              </p>
            </div>

            <div>
              <FieldLabel>Provider Label</FieldLabel>
              <input
                type="text"
                value={customDraft.label}
                onChange={(e) => handleCustomChange('label', e.target.value)}
                placeholder="e.g. OpenRouter, Groq, Local Proxy"
                style={inputStyle}
              />
            </div>

            <div>
              <FieldLabel>Base Endpoint URL</FieldLabel>
              <input
                type="url"
                value={customDraft.endpoint}
                onChange={(e) => handleCustomChange('endpoint', e.target.value)}
                placeholder="https://api.openai.com/v1"
                style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '12px' }}
              />
              <p style={{ fontSize: '11px', color: '#4a4a54', margin: '4px 0 0' }}>
                Must be an OpenAI-compatible /chat/completions endpoint.
              </p>
            </div>

            <div>
              <FieldLabel>Model String</FieldLabel>
              <input
                type="text"
                value={customDraft.model}
                onChange={(e) => handleCustomChange('model', e.target.value)}
                placeholder="e.g. claude-sonnet-4-6 or gpt-5.4"
                style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '12px' }}
              />
            </div>

            <div>
              <FieldLabel>API Key</FieldLabel>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCustomApiKey ? 'text' : 'password'}
                  value={customDraft.apiKey}
                  onChange={(e) => handleCustomChange('apiKey', e.target.value)}
                  placeholder="Your API key"
                  style={{ ...inputStyle, paddingRight: '46px' }}
                />
                <button
                  onClick={() => setShowCustomApiKey((v) => !v)}
                  style={{
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                    color: '#4a4a54', width: '32px', height: '32px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {showCustomApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {!customDraft.apiKey && (
                <p style={{ fontSize: '11px', color: '#f59e0b', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertTriangle size={11} /> Add an API key to use this provider.
                </p>
              )}
            </div>

            <div>
              <FieldLabel>Extra Headers (optional JSON)</FieldLabel>
              <textarea
                value={customDraft.extraHeaders}
                onChange={(e) => handleCustomChange('extraHeaders', e.target.value)}
                placeholder={'{"HTTP-Referer": "https://myapp.com", "X-Title": "My App"}'}
                rows={3}
                style={{
                  ...inputStyle, height: 'auto', minHeight: '72px', resize: 'vertical',
                  fontFamily: 'monospace', fontSize: '11px', padding: '10px 14px', lineHeight: 1.5,
                }}
              />
              <p style={{ fontSize: '11px', color: '#4a4a54', margin: '4px 0 0' }}>
                Useful for OpenRouter (HTTP-Referer, X-Title) or other custom headers.
              </p>
            </div>

            {/* Active config badge */}
            {customDraft.model && (
              <div style={{ padding: '8px 12px', background: '#141416', border: '1px solid #2a2a30', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={12} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: '#8b8b96' }}>Active model:</span>
                <span style={{ fontSize: '12px', color: '#f0f0f2', fontFamily: 'monospace', fontWeight: 600 }}>
                  {customDraft.model}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Memory section */}
      <SectionHeader>Memory & Instructions</SectionHeader>
      <div style={{ padding: '0 16px 16px' }}>
        <FieldLabel>Custom Instruction</FieldLabel>
        <textarea
          value={settings.customInstruction}
          onChange={(e) => onUpdateSystemInstruction(e.target.value)}
          placeholder="E.g. Always use Tailwind CSS. Prefer dark mode. Write comments in code."
          rows={4}
          style={{
            ...inputStyle,
            height: 'auto',
            minHeight: '96px',
            maxHeight: '200px',
            resize: 'vertical',
            fontFamily: 'inherit',
            lineHeight: 1.6,
            padding: '10px 14px',
            marginBottom: '6px',
          }}
        />
        <p style={{ fontSize: '11px', color: '#4a4a54', margin: 0 }}>
          Included in every AI request as system context.
        </p>
      </div>

      {/* Project info section */}
      <SectionHeader>About This Project</SectionHeader>
      <div style={{ padding: '0 16px 16px' }}>
        <InfoRow label="Project name" value={projectName} />
        <InfoRow label="Files" value={`${fileCount} file${fileCount !== 1 ? 's' : ''}`} />
        <InfoRow label="Storage" value="IndexedDB (local)" />
      </div>

      {/* Maintenance section */}
      <SectionHeader>Maintenance</SectionHeader>
      <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} style={dangerBtn}>
            Delete project data
          </button>
        ) : (
          <div style={{ background: '#1f0707', border: '1px solid #ef4444', borderRadius: '10px', padding: '12px' }}>
            <p style={{ fontSize: '13px', color: '#f0f0f2', margin: '0 0 10px' }}>
              Delete all files in this project? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { onDeleteProject(); setConfirmDelete(false) }} style={{ ...dangerBtn, flex: 1, height: '40px' }}>Yes, delete</button>
              <button onClick={() => setConfirmDelete(false)} style={{ ...cancelBtn, flex: 1, height: '40px' }}>Cancel</button>
            </div>
          </div>
        )}

        {!confirmReset ? (
          <button onClick={() => setConfirmReset(true)} style={dangerBtn}>
            <AlertTriangle size={14} style={{ marginRight: '6px' }} />
            Reset all data
          </button>
        ) : (
          <div style={{ background: '#1f0707', border: '1px solid #ef4444', borderRadius: '10px', padding: '12px' }}>
            <p style={{ fontSize: '13px', color: '#f0f0f2', margin: '0 0 4px', fontWeight: 600 }}>⚠️ Delete everything?</p>
            <p style={{ fontSize: '12px', color: '#ef4444', margin: '0 0 10px' }}>
              This will wipe all projects, files, and settings permanently.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { onResetAll(); setConfirmReset(false) }} style={{ ...dangerBtn, flex: 1, height: '40px' }}>Yes, reset</button>
              <button onClick={() => setConfirmReset(false)} style={{ ...cancelBtn, flex: 1, height: '40px' }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '16px 16px 8px', borderBottom: '1px solid #1f1f23' }}>
      <p style={{ fontSize: '11px', fontWeight: 600, color: '#4a4a54', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
        {children}
      </p>
    </div>
  )
}

function FieldLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{ fontSize: '12px', color: '#8b8b96', marginBottom: '6px', marginTop: 0, ...style }}>
      {children}
    </p>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      height: '44px', borderBottom: '1px solid #1f1f23',
    }}>
      <span style={{ fontSize: '14px', color: '#8b8b96' }}>{label}</span>
      <span style={{ fontSize: '14px', color: '#f0f0f2', fontWeight: 500 }}>{value}</span>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '44px',
  background: '#1c1c1f',
  border: '1px solid #2a2a30',
  borderRadius: '8px',
  color: '#f0f0f2',
  fontSize: '14px',
  padding: '0 14px',
  outline: 'none',
  display: 'block',
  boxSizing: 'border-box',
}

const dangerBtn: React.CSSProperties = {
  width: '100%',
  height: '48px',
  borderRadius: '10px',
  background: '#1f0707',
  border: '1px solid rgba(239,68,68,0.4)',
  color: '#ef4444',
  fontSize: '14px',
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const cancelBtn: React.CSSProperties = {
  width: '100%',
  height: '48px',
  borderRadius: '10px',
  background: '#1c1c1f',
  border: '1px solid #2a2a30',
  color: '#8b8b96',
  fontSize: '14px',
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}
