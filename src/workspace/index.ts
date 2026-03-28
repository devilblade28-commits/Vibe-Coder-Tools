/**
 * Workspace Layer - Barrel Export
 * 
 * Exports all workspace-related functionality:
 * - Types
 * - Service functions
 * - React context and hook
 */

// Types
export type { Project, ProjectIndexItem, WorkspaceState } from './workspaceTypes'

// Service functions (pure TypeScript, no React)
export {
  createProject,
  loadProject,
  renameProject,
  saveProject,
  deleteProject,
  getOrRestoreLastProject,
  listProjects,
  getLastOpenedProjectId,
  setLastOpenedProjectId,
} from './workspaceService'

// React context and hook
export { WorkspaceProvider, useWorkspace, WorkspaceContext } from './WorkspaceContext'