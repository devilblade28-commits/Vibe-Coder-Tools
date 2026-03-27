// ─── Core data models ───────────────────────────────────────────────────────

export interface Project {
  id: string          // UUID v4
  name: string
  createdAt: string   // ISO 8601
  updatedAt: string   // ISO 8601
  activeFileId: string | null
}

export interface ProjectFile {
  id: string          // UUID v4
  projectId: string
  folderId: string | null  // null = root
  name: string        // "index.html"
  path: string        // "/index.html" or "/src/index.html"
  type: 'text' | 'asset'
  content: string     // for type 'text'; empty string for 'asset'
  assetRef: string | null  // IDB asset key for type 'asset'
  mimeType: string
  size: number
  createdAt: string
  updatedAt: string
}

export interface ProjectFolder {
  id: string
  projectId: string
  parentId: string | null  // null = root level
  name: string
  createdAt: string
}

export interface ProjectAsset {
  id: string
  projectId: string
  fileName: string
  mimeType: string
  blob: Blob          // stored in IDB
  size: number
  createdAt: string
}

// ─── localStorage schema ─────────────────────────────────────────────────────

export interface ProjectIndexItem {
  id: string
  name: string
  updatedAt: string
}

export interface AppPreferences {
  theme: 'dark' | 'light'
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: string
  actionResults?: ActionExecutionResult[]
  isStreaming?: boolean
  error?: string
}

// ─── AI ──────────────────────────────────────────────────────────────────────

export type AIProvider = 'gemini' | 'claude' | 'openai' | 'custom'

/** Configuration for the Custom provider mode */
export interface CustomProviderConfig {
  label: string       // e.g. "OpenRouter", "Groq", "Local Proxy"
  endpoint: string    // e.g. "https://api.openai.com/v1"
  model: string       // e.g. "claude-sonnet-4-6"
  apiKey: string
  extraHeaders: string // JSON string of extra headers (optional)
}

export type AIActionType = 'create_file' | 'update_file' | 'delete_file' | 'create_folder' | 'rename_file'

export interface AIFileAction {
  action: AIActionType
  file: string         // filename for file actions
  folder?: string      // folder name for create_folder
  content?: string     // for create_file / update_file
  newName?: string     // for rename_file (future)
}

/** Structured response from AI — parsed from JSON block in response */
export interface AIStructuredResponse {
  actions: AIFileAction[]
  explanation: string
}

export interface ValidationResult {
  valid: boolean
  error?: string
}

export interface ActionExecutionResult {
  action: AIFileAction
  success: boolean
  error?: string
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export type TabId = 'chat' | 'files' | 'preview' | 'settings'

// ─── File system UI state (not persisted) ────────────────────────────────────

export interface FileSystemUIState {
  view: 'tree' | 'editor'
  expandedFolderIds: string[]
  isCreatingFile: boolean
}
