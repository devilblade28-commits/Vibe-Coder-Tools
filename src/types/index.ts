// ─── Core data models ───────────────────────────────────────────────────────
// Re-exported from the new layered architecture for backward compatibility.

// Workspace types
export type { Project, ProjectIndexItem } from '../workspace/workspaceTypes'

// FileSystem types
export type {
  ProjectFile,
  ProjectFolder,
  ProjectAsset,
  CreateFileInput,
  UpdateFileInput,
  CreateFolderInput,
  FileSystemUIState,
  FileSystemState,
} from '../filesystem/filesystemTypes'

// AI types (re-exported from AI layer)
export type {
  AIProvider,
  CustomProviderConfig,
  MessageRole,
  ChatMessage,
  AIActionType,
  AIFileAction,
  AIStructuredResponse,
  ValidationResult,
  ActionExecutionResult,
} from '../ai/aiTypes'

// Preview types (re-exported from Preview layer)
export type {
  PreviewState,
  AssetObjectUrls,
  PreviewBuildResult,
} from '../preview/previewTypes'

// ─── App preferences ────────────────────────────────────────────────────────

export interface AppPreferences {
  theme: 'dark' | 'light'
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export type TabId = 'chat' | 'files' | 'preview' | 'settings'