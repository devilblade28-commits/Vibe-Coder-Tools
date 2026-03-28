/**
 * Workspace Service - Project lifecycle operations.
 * 
 * This service handles workspace-level operations:
 * - Project CRUD (create, load, rename, delete)
 * - Project index management
 * - Last opened project tracking
 * 
 * All IndexedDB access goes through the storage layer.
 * This service does NOT import React - it's pure TypeScript.
 */

import { v4 as uuid } from 'uuid'
import type { Project, ProjectIndexItem } from './workspaceTypes'
import * as idb from '../storage/indexedDBService'
import * as ls from '../storage/localStorageService'

// ─── Project CRUD ─────────────────────────────────────────────────────────────

/**
 * Creates a new project with the given name.
 * Automatically adds it to the project index and sets it as the last opened project.
 */
export async function createProject(name = 'Untitled Project'): Promise<Project> {
  const now = new Date().toISOString()
  const project: Project = {
    id: uuid(),
    name,
    createdAt: now,
    updatedAt: now,
    activeFileId: null,
  }
  await idb.putProject(project)
  ls.addProjectToIndex(project.id, project.name)
  ls.setLastProjectId(project.id)
  return project
}

/**
 * Loads a project by ID from IndexedDB.
 * Updates the last opened project ID on successful load.
 * Returns null if the project doesn't exist.
 */
export async function loadProject(id: string): Promise<Project | null> {
  const project = await idb.getProject<Project>(id)
  if (!project) return null
  ls.setLastProjectId(id)
  return project
}

/**
 * Renames a project.
 * Updates both IndexedDB and the project index.
 */
export async function renameProject(id: string, name: string): Promise<void> {
  const project = await idb.getProject<Project>(id)
  if (!project) return
  project.name = name.trim() || 'Untitled Project'
  project.updatedAt = new Date().toISOString()
  await idb.putProject(project)
  ls.updateProjectInIndex(id, project.name)
}

/**
 * Saves a project to IndexedDB.
 * Updates the updatedAt timestamp.
 */
export async function saveProject(project: Project): Promise<void> {
  project.updatedAt = new Date().toISOString()
  await idb.putProject(project)
}

/**
 * Deletes a project and ALL its associated data (files, folders, assets).
 * Also removes it from the project index.
 */
export async function deleteProject(id: string): Promise<void> {
  await Promise.all([
    idb.deleteProject(id),
    idb.deleteFilesForProject(id),
    idb.deleteFoldersForProject(id),
    idb.deleteAssetsForProject(id),
  ])
  ls.removeProjectFromIndex(id)
  if (ls.getLastProjectId() === id) {
    ls.setLastProjectId(null)
  }
}

/**
 * Restores the last opened project.
 * Returns null if no valid last project ID exists, or if the project
 * no longer exists in IndexedDB (cleans up stale references).
 */
export async function getOrRestoreLastProject(): Promise<Project | null> {
  const lastId = ls.getLastProjectId()
  if (!lastId) return null
  const project = await idb.getProject<Project>(lastId)
  if (!project) {
    // Stale reference — clean up
    ls.setLastProjectId(null)
    ls.removeProjectFromIndex(lastId)
    return null
  }
  return project
}

// ─── Project Index ────────────────────────────────────────────────────────────

/**
 * Lists all projects from the index.
 * Returns lightweight items for quick navigation.
 */
export function listProjects(): ProjectIndexItem[] {
  return ls.getProjectIndex()
}

/**
 * Gets the ID of the last opened project.
 */
export function getLastOpenedProjectId(): string | null {
  return ls.getLastProjectId()
}

/**
 * Sets the last opened project ID.
 */
export function setLastOpenedProjectId(id: string | null): void {
  ls.setLastProjectId(id)
}