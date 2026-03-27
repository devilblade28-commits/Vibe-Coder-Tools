import { useState } from 'react'
import { Eye, EyeOff, AlertTriangle, ChevronRight } from 'lucide-react'
import type { AIProvider } from '../types'
import type { AISettingsSnapshot } from '../storage/ls'

interface SettingsScreenProps {
  settings: AISettingsSnapshot
  projectName: string
  fileCount: number
  onUpdateProvider: (provider: AIProvider) => void
  onUpdateModel: (provider: AIProvider, model: string) => void
  onUpdateApiKey: (provider: AIProvider, key: string) => void
  onUpdateSystemInstruction: (text: string) => void
  onDeleteProject: () => void
  onResetAll: () => void
}

const PROVIDERS: { id: AIProvider; label: string; color: string }[] = [
  { id: 'gemini', label: 'Gemini', color: '#4285f4' },
  { id: 'claude', label: 'Claude', color: '#d97706' },
  { id: 'openai', label: 'OpenAI', color: '#22c55e' },
]

const MODELS: Record<AIProvider, { value: string; label: string }[]> = {
  gemini: [
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (fast)' },
    { value: 'gemini-2.5-pro-preview-03-25', label: 'Gemini 2.5 Pro (best)' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  ],
  claude: [
    { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (fast)' },
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-opus-4-5', label: 'Claude Opus (best)' },
  ],
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (fast)' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4.1', label: 'GPT-4.1 (best)' },
  ],
}

const API_KEY_LINKS: Record<AIProvider, string> = {
  gemini: 'https://aistudio.google.com/app/apikey',
  claude: 'https://console.anthropic.com/settings/keys',
  openai: 'https://platform.openai.com/api-keys',
}

export function SettingsScreen({
  settings, projectName, fileCount,
  onUpdateProvider, onUpdateModel, onUpdateApiKey,
  onUpdateSystemInstruction, onDeleteProject, onResetAll,
}: SettingsScreenProps) {
  const [showApiKey, setShowApiKey] = useState<Record<AIProvider, boolean>>({
    gemini: false, claude: false, openai: false,
  })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const activeProvider = settings.activeProvider
  const currentApiKey = settings.apiKeys[activeProvider]

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '0 0 32px' }}>

      {/* Provider & Model section */}
      <SectionHeader>Provider & Model</SectionHeader>
      <div style={{ padding: '0 16px 16px' }}>
        {/* Provider pills */}
        <div style={{ display: 'flex', background: '#1c1c1f', borderRadius: '10px', padding: '3px', gap: '2px', marginBottom: '16px' }}>
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => onUpdateProvider(p.id)}
              style={{
                flex: 1,
                height: '38px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: activeProvider === p.id ? 600 : 400,
                background: activeProvider === p.id ? '#2a2a30' : 'transparent',
                color: activeProvider === p.id ? '#f0f0f2' : '#6d6d7a',
                transition: 'all 0.15s',
                WebkitTapHighlightColor: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
              }}
            >
              {activeProvider === p.id && (
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.color, flexShrink: 0 }} />
              )}
              {p.label}
            </button>
          ))}
        </div>

        {/* Model */}
        <FieldLabel>Model</FieldLabel>
        <select
          value={settings.activeModel}
          onChange={(e) => onUpdateModel(activeProvider, e.target.value)}
          style={{ ...inputStyle, marginBottom: '16px', cursor: 'pointer' }}
        >
          {MODELS[activeProvider].map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>

        {/* API Key */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <FieldLabel style={{ margin: 0 }}>
            API Key — {PROVIDERS.find((p) => p.id === activeProvider)?.label}
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
            type={showApiKey[activeProvider] ? 'text' : 'password'}
            value={currentApiKey}
            onChange={(e) => onUpdateApiKey(activeProvider, e.target.value)}
            placeholder={`Paste your ${PROVIDERS.find((p) => p.id === activeProvider)?.label} API key…`}
            style={{ ...inputStyle, paddingRight: '46px' }}
          />
          <button
            onClick={() => setShowApiKey((prev) => ({ ...prev, [activeProvider]: !prev[activeProvider] }))}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#4a4a54',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {showApiKey[activeProvider] ? <EyeOff size={15} /> : <Eye size={15} />}
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
    <div style={{
      padding: '16px 16px 8px',
      borderBottom: '1px solid #1f1f23',
      marginBottom: '0',
    }}>
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
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      height: '44px',
      borderBottom: '1px solid #1f1f23',
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
