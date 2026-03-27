/**
 * localStorage — only for lightweight metadata.
 * Key schema: app:{key}
 *
 * Allowed keys:
 *   app:provider            — active AI provider
 *   app:model               — active model name
 *   app:apiKey:{provider}   — API key per provider
 *   app:customInstruction   — system instruction text
 *   app:customProvider      — CustomProviderConfig JSON
 *   app:projectIndex        — [{id, name, updatedAt}]
 *   app:lastProjectId       — last opened project ID
 *   app:theme               — 'dark' | 'light'
 *   app:preferences         — UserPreferences object
 *
 * NEVER store file content, blobs, or large data here.
 */

import type { AIProvider, ProjectIndexItem, AppPreferences, CustomProviderConfig } from '../types'

const KEYS = {
  PROVIDER: 'app:provider',
  MODEL: 'app:model',
  CUSTOM_INSTRUCTION: 'app:customInstruction',
  CUSTOM_PROVIDER: 'app:customProvider',
  PROJECT_INDEX: 'app:projectIndex',
  LAST_PROJECT_ID: 'app:lastProjectId',
  THEME: 'app:theme',
  PREFERENCES: 'app:preferences',
  apiKey: (p: string) => `app:apiKey:${p}` as const,
} as const

// ─── Generic helpers ─────────────────────────────────────────────────────────

function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

function removeItem(key: string): void {
  localStorage.removeItem(key)
}

// ─── Provider & Model ────────────────────────────────────────────────────────

const DEFAULT_MODELS: Record<string, string> = {
  gemini: 'gemini-2.5-flash',
  claude: 'claude-sonnet-4-6',
  openai: 'gpt-5.4-mini',
  custom: '',
}

export function getActiveProvider(): AIProvider {
  return getItem<AIProvider>(KEYS.PROVIDER, 'gemini')
}

export function setActiveProvider(provider: AIProvider): void {
  setItem(KEYS.PROVIDER, provider)
}

export function getActiveModel(): string {
  const provider = getActiveProvider()
  // If custom, the model comes from the custom config
  if (provider === 'custom') {
    return getCustomProviderConfig().model
  }
  return getItem<string>(KEYS.MODEL, DEFAULT_MODELS[provider] ?? '')
}

export function setActiveModel(model: string): void {
  setItem(KEYS.MODEL, model)
}

export function getApiKey(provider: string): string {
  return getItem<string>(KEYS.apiKey(provider), '')
}

export function setApiKey(provider: string, key: string): void {
  setItem(KEYS.apiKey(provider), key)
}

// ─── Custom Provider Config ───────────────────────────────────────────────────

const DEFAULT_CUSTOM_CONFIG: CustomProviderConfig = {
  label: 'Custom',
  endpoint: 'https://api.openai.com/v1',
  model: '',
  apiKey: '',
  extraHeaders: '',
}

export function getCustomProviderConfig(): CustomProviderConfig {
  return getItem<CustomProviderConfig>(KEYS.CUSTOM_PROVIDER, DEFAULT_CUSTOM_CONFIG)
}

export function setCustomProviderConfig(config: CustomProviderConfig): void {
  setItem(KEYS.CUSTOM_PROVIDER, config)
}

// ─── Custom Instruction ───────────────────────────────────────────────────────

export function getCustomInstruction(): string {
  return getItem<string>(KEYS.CUSTOM_INSTRUCTION, '')
}

export function setCustomInstruction(instruction: string): void {
  setItem(KEYS.CUSTOM_INSTRUCTION, instruction)
}

// ─── Project Index ────────────────────────────────────────────────────────────

export function getProjectIndex(): ProjectIndexItem[] {
  return getItem<ProjectIndexItem[]>(KEYS.PROJECT_INDEX, [])
}

export function setProjectIndex(index: ProjectIndexItem[]): void {
  setItem(KEYS.PROJECT_INDEX, index)
}

export function addProjectToIndex(id: string, name: string): void {
  const index = getProjectIndex()
  const existing = index.findIndex((p) => p.id === id)
  const entry: ProjectIndexItem = { id, name, updatedAt: new Date().toISOString() }
  if (existing >= 0) {
    index[existing] = entry
  } else {
    index.unshift(entry)
  }
  setProjectIndex(index)
}

export function updateProjectInIndex(id: string, name: string): void {
  const index = getProjectIndex()
  const i = index.findIndex((p) => p.id === id)
  if (i >= 0) {
    index[i] = { ...index[i], name, updatedAt: new Date().toISOString() }
    setProjectIndex(index)
  }
}

export function removeProjectFromIndex(id: string): void {
  const index = getProjectIndex().filter((p) => p.id !== id)
  setProjectIndex(index)
}

// ─── Last Project ID ──────────────────────────────────────────────────────────

export function getLastProjectId(): string | null {
  return getItem<string | null>(KEYS.LAST_PROJECT_ID, null)
}

export function setLastProjectId(id: string | null): void {
  if (id === null) {
    removeItem(KEYS.LAST_PROJECT_ID)
  } else {
    setItem(KEYS.LAST_PROJECT_ID, id)
  }
}

// ─── Theme & Preferences ──────────────────────────────────────────────────────

export function getTheme(): 'dark' | 'light' {
  return getItem<'dark' | 'light'>(KEYS.THEME, 'dark')
}

export function setTheme(theme: 'dark' | 'light'): void {
  setItem(KEYS.THEME, theme)
}

export function getPreferences(): AppPreferences {
  return getItem<AppPreferences>(KEYS.PREFERENCES, { theme: 'dark' })
}

// ─── Full AI settings snapshot (for component consumption) ───────────────────

export interface AISettingsSnapshot {
  activeProvider: AIProvider
  activeModel: string
  apiKeys: Record<string, string>
  customInstruction: string
  customProvider: CustomProviderConfig
}

export function getAISettings(): AISettingsSnapshot {
  const provider = getActiveProvider()
  return {
    activeProvider: provider,
    activeModel: getActiveModel(),
    apiKeys: {
      gemini: getApiKey('gemini'),
      claude: getApiKey('claude'),
      openai: getApiKey('openai'),
    },
    customInstruction: getCustomInstruction(),
    customProvider: getCustomProviderConfig(),
  }
}

// ─── Reset ────────────────────────────────────────────────────────────────────

/** Remove all app:* keys from localStorage. */
export function clearAllAppKeys(): void {
  const toRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('app:')) toRemove.push(key)
  }
  toRemove.forEach((k) => localStorage.removeItem(k))
}
