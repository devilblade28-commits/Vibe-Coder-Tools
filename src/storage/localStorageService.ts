/**
 * localStorage Service
 * 
 * Handles lightweight metadata storage using the browser's localStorage API.
 * This is designed for small, synchronous data that needs fast access.
 * 
 * **IMPORTANT: NEVER store file content, blobs, or large data here.**
 * Use IndexedDB (indexedDBService.ts) for project content and assets.
 * 
 * Key schema: `app:{key}` - all keys are prefixed to avoid collisions.
 * 
 * @module localStorageService
 */

import type { AIProvider, AppPreferences, CustomProviderConfig } from '../types'
import { STORAGE_KEYS, getApiKeyKey, type ProjectIndexItem } from './storageTypes'

// ─── Generic Helpers ───────────────────────────────────────────────────────────

/**
 * Retrieves an item from localStorage and parses it as JSON.
 * Returns the fallback value if the key doesn't exist or parsing fails.
 * 
 * @template T - The expected type of the stored value
 * @param key - The localStorage key to retrieve
 * @param fallback - The default value if key doesn't exist or parsing fails
 * @returns The parsed value or fallback
 */
function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch (error) {
    console.warn(`[localStorage] Failed to parse key "${key}":`, error)
    return fallback
  }
}

/**
 * Serializes a value to JSON and stores it in localStorage.
 * 
 * @template T - The type of the value to store
 * @param key - The localStorage key to set
 * @param value - The value to serialize and store
 */
function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`[localStorage] Failed to set key "${key}":`, error)
    throw error
  }
}

/**
 * Removes an item from localStorage.
 * 
 * @param key - The localStorage key to remove
 */
function removeItem(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.warn(`[localStorage] Failed to remove key "${key}":`, error)
  }
}

// ─── Provider & Model ──────────────────────────────────────────────────────────

/**
 * Default model names for each provider.
 * Used when no model has been explicitly set.
 */
const DEFAULT_MODELS: Record<string, string> = {
  gemini: 'gemini-2.5-flash',
  claude: 'claude-sonnet-4-6',
  openai: 'gpt-5.4-mini',
  custom: '',
}

/**
 * Gets the currently active AI provider.
 * Defaults to 'gemini' if not set.
 * 
 * @returns The active AI provider
 */
export function getActiveProvider(): AIProvider {
  return getItem<AIProvider>(STORAGE_KEYS.PROVIDER, 'gemini')
}

/**
 * Sets the active AI provider.
 * 
 * @param provider - The provider to set as active
 */
export function setActiveProvider(provider: AIProvider): void {
  setItem(STORAGE_KEYS.PROVIDER, provider)
}

/**
 * Gets the active model name for the current provider.
 * For custom providers, returns the model from the custom config.
 * 
 * @returns The active model name
 */
export function getActiveModel(): string {
  const provider = getActiveProvider()
  // If custom, the model comes from the custom config
  if (provider === 'custom') {
    return getCustomProviderConfig().model
  }
  return getItem<string>(STORAGE_KEYS.MODEL, DEFAULT_MODELS[provider] ?? '')
}

/**
 * Sets the active model name.
 * Note: For custom providers, this is stored in the custom config.
 * 
 * @param model - The model name to set
 */
export function setActiveModel(model: string): void {
  setItem(STORAGE_KEYS.MODEL, model)
}

/**
 * Gets the API key for a specific provider.
 * 
 * @param provider - The provider name (e.g., 'gemini', 'claude', 'openai')
 * @returns The API key or empty string if not set
 */
export function getApiKey(provider: string): string {
  return getItem<string>(getApiKeyKey(provider), '')
}

/**
 * Sets the API key for a specific provider.
 * 
 * @param provider - The provider name
 * @param key - The API key to store
 */
export function setApiKey(provider: string, key: string): void {
  setItem(getApiKeyKey(provider), key)
}

// ─── Custom Provider Config ───────────────────────────────────────────────────

/**
 * Default configuration for custom provider.
 */
const DEFAULT_CUSTOM_CONFIG: CustomProviderConfig = {
  label: 'Custom',
  endpoint: 'https://api.openai.com/v1',
  model: '',
  apiKey: '',
  extraHeaders: '',
}

/**
 * Gets the custom provider configuration.
 * Returns defaults if not configured.
 * 
 * @returns The custom provider configuration
 */
export function getCustomProviderConfig(): CustomProviderConfig {
  return getItem<CustomProviderConfig>(STORAGE_KEYS.CUSTOM_PROVIDER, DEFAULT_CUSTOM_CONFIG)
}

/**
 * Sets the custom provider configuration.
 * 
 * @param config - The configuration to store
 */
export function setCustomProviderConfig(config: CustomProviderConfig): void {
  setItem(STORAGE_KEYS.CUSTOM_PROVIDER, config)
}

// ─── Custom Instruction ───────────────────────────────────────────────────────

/**
 * Gets the custom system instruction for the AI.
 * This is appended to the system prompt.
 * 
 * @returns The custom instruction or empty string
 */
export function getCustomInstruction(): string {
  return getItem<string>(STORAGE_KEYS.CUSTOM_INSTRUCTION, '')
}

/**
 * Sets the custom system instruction for the AI.
 * 
 * @param instruction - The instruction text
 */
export function setCustomInstruction(instruction: string): void {
  setItem(STORAGE_KEYS.CUSTOM_INSTRUCTION, instruction)
}

// ─── Project Index ────────────────────────────────────────────────────────────

/**
 * Gets the project index from localStorage.
 * The project index is a lightweight list of all known projects.
 * 
 * @returns Array of project index items
 */
export function getProjectIndex(): ProjectIndexItem[] {
  return getItem<ProjectIndexItem[]>(STORAGE_KEYS.PROJECT_INDEX, [])
}

/**
 * Sets the entire project index.
 * 
 * @param index - The complete project index to store
 */
export function setProjectIndex(index: ProjectIndexItem[]): void {
  setItem(STORAGE_KEYS.PROJECT_INDEX, index)
}

/**
 * Adds or updates a project in the index.
 * If the project already exists, it's updated; otherwise, it's added to the front.
 * 
 * @param id - The project ID
 * @param name - The project name
 */
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

/**
 * Updates a project's name in the index.
 * Does nothing if the project is not found.
 * 
 * @param id - The project ID
 * @param name - The new project name
 */
export function updateProjectInIndex(id: string, name: string): void {
  const index = getProjectIndex()
  const i = index.findIndex((p) => p.id === id)
  if (i >= 0) {
    index[i] = { ...index[i], name, updatedAt: new Date().toISOString() }
    setProjectIndex(index)
  }
}

/**
 * Removes a project from the index.
 * 
 * @param id - The project ID to remove
 */
export function removeProjectFromIndex(id: string): void {
  const index = getProjectIndex().filter((p) => p.id !== id)
  setProjectIndex(index)
}

// ─── Last Project ID ──────────────────────────────────────────────────────────

/**
 * Gets the ID of the last opened project.
 * Used to restore the user's last active project on startup.
 * 
 * @returns The last project ID or null if none
 */
export function getLastProjectId(): string | null {
  return getItem<string | null>(STORAGE_KEYS.LAST_PROJECT_ID, null)
}

/**
 * Sets the last opened project ID.
 * Pass null to clear it.
 * 
 * @param id - The project ID or null to clear
 */
export function setLastProjectId(id: string | null): void {
  if (id === null) {
    removeItem(STORAGE_KEYS.LAST_PROJECT_ID)
  } else {
    setItem(STORAGE_KEYS.LAST_PROJECT_ID, id)
  }
}

// ─── Theme & Preferences ──────────────────────────────────────────────────────

/**
 * Gets the current UI theme preference.
 * 
 * @returns 'dark' or 'light', defaults to 'dark'
 */
export function getTheme(): 'dark' | 'light' {
  return getItem<'dark' | 'light'>(STORAGE_KEYS.THEME, 'dark')
}

/**
 * Sets the UI theme preference.
 * 
 * @param theme - The theme to set
 */
export function setTheme(theme: 'dark' | 'light'): void {
  setItem(STORAGE_KEYS.THEME, theme)
}

/**
 * Gets the application preferences object.
 * 
 * @returns The preferences object
 */
export function getPreferences(): AppPreferences {
  return getItem<AppPreferences>(STORAGE_KEYS.PREFERENCES, { theme: 'dark' })
}

// ─── AI Settings Snapshot ─────────────────────────────────────────────────────

/**
 * A snapshot of all AI-related settings.
 * Convenient for components that need all settings at once.
 */
export interface AISettingsSnapshot {
  activeProvider: AIProvider
  activeModel: string
  apiKeys: Record<string, string>
  customInstruction: string
  customProvider: CustomProviderConfig
}

/**
 * Gets a complete snapshot of all AI settings.
 * Useful for initializing AI context or debugging.
 * 
 * @returns An object containing all AI settings
 */
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

// ─── Reset & Cleanup ─────────────────────────────────────────────────────────

/**
 * Removes all app:* keys from localStorage.
 * Used during "Reset All" to clear all app data.
 * 
 * **Note:** This does NOT clear IndexedDB data (projects, files, assets).
 * Use indexedDBService.deleteDatabase() for that.
 */
export function clearAllAppKeys(): void {
  try {
    const toRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('app:')) toRemove.push(key)
    }
    toRemove.forEach((k) => localStorage.removeItem(k))
  } catch (error) {
    console.error('[localStorage] Failed to clear app keys:', error)
    throw error
  }
}

// Re-export STORAGE_KEYS for external use
export { STORAGE_KEYS }