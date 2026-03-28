/**
 * Hydration Service
 * 
 * Orchestrates the restoration of application state at startup.
 * Coordinates between localStorage (lightweight metadata) and IndexedDB (project content).
 * 
 * This service is called once at application startup to:
 * 1. Restore the last active project ID
 * 2. Load the project index for the sidebar
 * 3. Provide initial state for React contexts
 * 
 * @module hydrationService
 */

import * as ls from './localStorageService'
import type { ProjectIndexItem, HydrationResult } from './storageTypes'

// Re-export the HydrationResult type for consumers
export type { HydrationResult }

/**
 * Hydrates application state at startup.
 * 
 * This function should be called once when the application initializes.
 * It retrieves lightweight metadata from localStorage to quickly
 * render the UI without needing to load full project content from IndexedDB.
 * 
 * The returned data is used to initialize React contexts:
 * - `lastProjectId` → Used to auto-open the last active project
 * - `projectIndex` → Used to render the project list in the sidebar
 * 
 * @returns Promise resolving to the hydration result
 * @example
 * ```ts
 * // In your app initialization
 * const { lastProjectId, projectIndex } = await hydrateAtStartup()
 * 
 * // Use to initialize React state/contexts
 * setProjects(projectIndex)
 * if (lastProjectId) {
 *   loadProject(lastProjectId)
 * }
 * ```
 */
export async function hydrateAtStartup(): Promise<HydrationResult> {
  try {
    // Get last project ID from localStorage (synchronous, but wrapped for consistency)
    const lastProjectId = ls.getLastProjectId()
    
    // Get project index from localStorage
    const projectIndex = ls.getProjectIndex()
    
    console.log('[Hydration] Startup hydration complete', {
      lastProjectId,
      projectCount: projectIndex.length
    })
    
    return {
      lastProjectId,
      projectIndex
    }
  } catch (error) {
    console.error('[Hydration] Failed to hydrate at startup:', error)
    // Return safe defaults on error
    return {
      lastProjectId: null,
      projectIndex: []
    }
  }
}

/**
 * Updates the project index after a project is created or modified.
 * 
 * This function updates both the localStorage index and returns the fresh index
 * for immediate use in React state updates.
 * 
 * @param id - The project ID
 * @param name - The project name
 * @param fileCount - Optional file count metadata
 * @returns The updated project index
 * @example
 * ```ts
 * // After creating a new project
 * const updatedIndex = updateProjectIndex(project.id, project.name, 0)
 * setProjects(updatedIndex)
 * ```
 */
export function updateProjectIndex(
  id: string, 
  name: string, 
  fileCount?: number
): ProjectIndexItem[] {
  try {
    // Get current index
    const currentIndex = ls.getProjectIndex()
    
    // Find existing entry
    const existingIndex = currentIndex.findIndex(p => p.id === id)
    
    // Create updated entry
    const updatedEntry: ProjectIndexItem = {
      id,
      name,
      updatedAt: new Date().toISOString(),
      ...(fileCount !== undefined && { fileCount })
    }
    
    // Update or add the entry
    let newIndex: ProjectIndexItem[]
    if (existingIndex >= 0) {
      // Preserve fileCount if not provided and exists
      const existing = currentIndex[existingIndex]
      const entry: ProjectIndexItem = {
        ...updatedEntry,
        fileCount: fileCount ?? existing.fileCount
      }
      newIndex = [...currentIndex]
      newIndex[existingIndex] = entry
    } else {
      // Add to front for most recent first ordering
      newIndex = [updatedEntry, ...currentIndex]
    }
    
    // Persist to localStorage
    ls.setProjectIndex(newIndex)
    
    return newIndex
  } catch (error) {
    console.error('[Hydration] Failed to update project index:', error)
    // Return current index on error (no changes made)
    return ls.getProjectIndex()
  }
}

/**
 * Removes a project from the index.
 * 
 * Call this when a project is deleted to keep the index in sync.
 * 
 * @param id - The project ID to remove
 * @returns The updated project index
 */
export function removeProjectFromIndex(id: string): ProjectIndexItem[] {
  try {
    ls.removeProjectFromIndex(id)
    return ls.getProjectIndex()
  } catch (error) {
    console.error('[Hydration] Failed to remove project from index:', error)
    return ls.getProjectIndex()
  }
}

/**
 * Sets the last active project ID.
 * 
 * This is called when a project is opened to enable
 * auto-restoration on the next app launch.
 * 
 * @param id - The project ID to save, or null to clear
 */
export function setLastProjectId(id: string | null): void {
  try {
    ls.setLastProjectId(id)
  } catch (error) {
    console.error('[Hydration] Failed to set last project ID:', error)
  }
}

/**
 * Gets the current project index.
 * 
 * Convenience function that wraps the localStorage service.
 * 
 * @returns The current project index
 */
export function getProjectIndex(): ProjectIndexItem[] {
  return ls.getProjectIndex()
}