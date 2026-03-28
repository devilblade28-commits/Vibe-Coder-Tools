/**
 * Workspace Context - React state management for workspace operations.
 * 
 * Provides:
 * - Active project state
 * - Project CRUD operations
 * - Loading and error states
 */

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { Project, ProjectIndexItem, WorkspaceState } from './workspaceTypes'
import * as workspaceService from './workspaceService'

// ─── Context Types ────────────────────────────────────────────────────────────

interface WorkspaceContextValue extends WorkspaceState {
  // Project operations
  createProject: (name?: string) => Promise<Project>
  loadProject: (id: string) => Promise<Project | null>
  renameProject: (id: string, name: string) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  
  // Project index
  listProjects: () => ProjectIndexItem[]
  getLastOpenedProjectId: () => string | null
  setLastOpenedProjectId: (id: string | null) => void
  
  // Active project management
  setActiveProject: (project: Project | null) => void
  updateActiveProject: (updates: Partial<Project>) => Promise<Project | null>
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

// ─── Provider Component ───────────────────────────────────────────────────────

interface WorkspaceProviderProps {
  children: ReactNode
  autoRestoreLastProject?: boolean
}

export function WorkspaceProvider({ 
  children, 
  autoRestoreLastProject = true 
}: WorkspaceProviderProps) {
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Auto-restore last opened project on mount
  useEffect(() => {
    if (!autoRestoreLastProject) {
      setIsLoading(false)
      return
    }

    let mounted = true

    async function restoreLastProject() {
      try {
        setIsLoading(true)
        setError(null)
        const restoredProject = await workspaceService.getOrRestoreLastProject()
        const project = restoredProject ?? await workspaceService.createProject('My First Project')
        if (mounted) {
          setActiveProject(project)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to restore last project')
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    restoreLastProject()

    return () => {
      mounted = false
    }
  }, [autoRestoreLastProject])

  // ─── Project Operations ─────────────────────────────────────────────────────

  const createProject = useCallback(async (name?: string): Promise<Project> => {
    try {
      setError(null)
      const project = await workspaceService.createProject(name)
      setActiveProject(project)
      return project
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create project'
      setError(message)
      throw err
    }
  }, [])

  const loadProject = useCallback(async (id: string): Promise<Project | null> => {
    try {
      setIsLoading(true)
      setError(null)
      const project = await workspaceService.loadProject(id)
      setActiveProject(project)
      return project
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load project'
      setError(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const renameProject = useCallback(async (id: string, name: string): Promise<void> => {
    try {
      setError(null)
      await workspaceService.renameProject(id, name)
      // Update active project if it's the one being renamed
      if (activeProject?.id === id) {
        setActiveProject(prev => prev ? { ...prev, name } : null)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to rename project'
      setError(message)
      throw err
    }
  }, [activeProject?.id])

  const deleteProject = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null)
      await workspaceService.deleteProject(id)
      // Clear active project if it's the one being deleted
      if (activeProject?.id === id) {
        setActiveProject(null)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete project'
      setError(message)
      throw err
    }
  }, [activeProject?.id])

  // ─── Project Index Operations ───────────────────────────────────────────────

  const listProjects = useCallback((): ProjectIndexItem[] => {
    return workspaceService.listProjects()
  }, [])

  const getLastOpenedProjectId = useCallback((): string | null => {
    return workspaceService.getLastOpenedProjectId()
  }, [])

  const setLastOpenedProjectId = useCallback((id: string | null): void => {
    workspaceService.setLastOpenedProjectId(id)
  }, [])

  // ─── Active Project Management ───────────────────────────────────────────────

  const updateActiveProject = useCallback(async (updates: Partial<Project>): Promise<Project | null> => {
    if (!activeProject) return null
    const updated = { ...activeProject, ...updates, updatedAt: new Date().toISOString() }
    await workspaceService.saveProject(updated)
    setActiveProject(updated)
    return updated
  }, [activeProject])

  const value: WorkspaceContextValue = {
    // State
    activeProject,
    isLoading,
    error,
    
    // Project operations
    createProject,
    loadProject,
    renameProject,
    deleteProject,
    
    // Project index
    listProjects,
    getLastOpenedProjectId,
    setLastOpenedProjectId,
    
    // Active project management
    setActiveProject,
    updateActiveProject,
  }

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

// ─── Custom Hook ──────────────────────────────────────────────────────────────

/**
 * Hook to access the workspace context.
 * Throws an error if used outside of WorkspaceProvider.
 */
export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext)
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  }
  return context
}

// ─── Exports ───────────────────────────────────────────────────────────────────

export { WorkspaceContext }