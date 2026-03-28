/**
 * Workspace-level types - project lifecycle and project index.
 * 
 * These types represent the workspace abstraction layer, which manages
 * project lifecycle (create, load, rename, delete) and maintains the
 * project index for quick navigation.
 */

// Re-export ProjectIndexItem from storage layer (it's a storage-level type)
export type { ProjectIndexItem } from '../storage/storageTypes'

/**
 * A project is the top-level container for files, folders, and assets.
 * It represents a complete workspace that a user can work on.
 */
export interface Project {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  activeFileId: string | null
}

/**
 * React state for the workspace context.
 * Tracks the active project and loading state.
 */
export interface WorkspaceState {
  activeProject: Project | null
  isLoading: boolean
  error: string | null
}