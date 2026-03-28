/**
 * File system types - files, folders, assets.
 * 
 * These types represent the file system abstraction layer, which manages
 * all content within a project (files, folders, and binary assets).
 */

// ─── File Types ───────────────────────────────────────────────────────────────

/**
 * A file within a project.
 * Can be either a text file (editable) or an asset reference.
 */
export interface ProjectFile {
  id: string
  projectId: string
  folderId: string | null
  name: string
  path: string
  type: 'text' | 'asset'
  content: string
  assetRef: string | null
  mimeType: string
  size: number
  createdAt: string
  updatedAt: string
}

/**
 * Input for creating a new file.
 */
export interface CreateFileInput {
  name: string
  content?: string
  folderId?: string | null
}

/**
 * Input for updating a file.
 */
export interface UpdateFileInput {
  content?: string
  name?: string
  folderId?: string | null
}

// ─── Folder Types ─────────────────────────────────────────────────────────────

/**
 * A folder within a project.
 * Folders can be nested (parentId = null means root level).
 */
export interface ProjectFolder {
  id: string
  projectId: string
  parentId: string | null  // null = root
  name: string
  createdAt: string
}

/**
 * Input for creating a new folder.
 */
export interface CreateFolderInput {
  name: string
  parentId?: string | null
}

// ─── Asset Types ──────────────────────────────────────────────────────────────

/**
 * A binary asset within a project (images, fonts, etc.).
 * Stored as a Blob in IndexedDB.
 */
export interface ProjectAsset {
  id: string
  projectId: string
  fileName: string
  mimeType: string
  blob: Blob
  size: number
  createdAt: string
}

// ─── UI State Types ───────────────────────────────────────────────────────────

/**
 * UI state for the file system (not persisted).
 * Tracks view mode, expanded folders, open files, and creation state.
 */
export interface FileSystemUIState {
  view: 'tree' | 'editor'
  expandedFolderIds: string[]
  isCreatingFile: boolean
  openFileIds: string[]
}

/**
 * Full state for the file system context.
 */
export interface FileSystemState {
  files: ProjectFile[]
  folders: ProjectFolder[]
  assets: ProjectAsset[]
  activeFile: ProjectFile | null
  isLoading: boolean
  error: string | null
}