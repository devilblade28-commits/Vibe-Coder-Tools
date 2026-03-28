/**
 * Storage Layer Types
 * 
 * Types that belong specifically to the storage layer.
 * These are internal to how data is persisted and hydrated.
 */

/**
 * Defines the type of value stored for a given storage key.
 * Used for type-safe storage operations.
 */
export interface StorageKey {
  key: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
}

/**
 * Project index item stored in localStorage.
 * 
 * This is a lightweight reference to a project for quick access
 * without loading the full project from IndexedDB.
 * 
 * @property id - Unique project identifier (UUID v4)
 * @property name - Human-readable project name
 * @property updatedAt - ISO 8601 timestamp of last modification
 * @property fileCount - Optional metadata about number of files (not always accurate)
 */
export interface ProjectIndexItem {
  id: string
  name: string
  updatedAt: string
  fileCount?: number  // metadata only, may not always be up-to-date
}

/**
 * Result of the hydration process at application startup.
 * Contains all data needed to initialize the React context.
 */
export interface HydrationResult {
  /** The ID of the last opened project, if any */
  lastProjectId: string | null
  /** Lightweight index of all known projects */
  projectIndex: ProjectIndexItem[]
}

/**
 * Internal key constants for localStorage.
 * All keys are prefixed with 'app:' to avoid collisions.
 */
export const STORAGE_KEYS = {
  /** Active AI provider selection */
  PROVIDER: 'app:provider',
  /** Active model name for current provider */
  MODEL: 'app:model',
  /** Gemini API key */
  API_KEY_GEMINI: 'app:apiKey:gemini',
  /** Claude API key */
  API_KEY_CLAUDE: 'app:apiKey:claude',
  /** OpenAI API key */
  API_KEY_OPENAI: 'app:apiKey:openai',
  /** System instruction text for AI */
  CUSTOM_INSTRUCTION: 'app:customInstruction',
  /** Custom provider configuration (JSON) */
  CUSTOM_PROVIDER: 'app:customProvider',
  /** Project index array (JSON) */
  PROJECT_INDEX: 'app:projectIndex',
  /** Last opened project ID */
  LAST_PROJECT_ID: 'app:lastProjectId',
  /** UI theme preference */
  THEME: 'app:theme',
  /** User preferences object */
  PREFERENCES: 'app:preferences',
} as const

/**
 * Generates an API key storage key for a given provider.
 * @param provider - The provider name (e.g., 'gemini', 'claude', 'openai')
 * @returns The storage key for that provider's API key
 */
export function getApiKeyKey(provider: string): string {
  return `app:apiKey:${provider}` as const
}