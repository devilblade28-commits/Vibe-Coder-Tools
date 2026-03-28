/**
 * Folder Service - Folder CRUD operations.
 * 
 * This service handles folder-level operations:
 * - Folder CRUD (create, list, delete)
 * - Folder hierarchy management
 * 
 * All IndexedDB access goes through the storage layer.
 * This service does NOT import React - it's pure TypeScript.
 */

import { v4 as uuid } from 'uuid'
import type { ProjectFolder, CreateFolderInput } from './filesystemTypes'
import * as idb from '../storage/indexedDBService'

// ─── Folder CRUD ──────────────────────────────────────────────────────────────

/**
 * Gets all folders for a project from IndexedDB.
 */
export async function getFolders(projectId: string): Promise<ProjectFolder[]> {
  return idb.getFoldersForProject<ProjectFolder>(projectId)
}

/**
 * Creates a new folder within a project.
 * Folders can be nested via parentId (null = root level).
 */
export async function createFolder(
  projectId: string,
  name: string,
  parentId: string | null = null
): Promise<ProjectFolder> {
  const trimmedName = name.trim()
  if (!trimmedName) throw new Error('Folder name cannot be empty')

  const folder: ProjectFolder = {
    id: uuid(),
    projectId,
    parentId,
    name: trimmedName,
    createdAt: new Date().toISOString(),
  }
  
  await idb.putFolder(folder)
  return folder
}

/**
 * Deletes a folder by ID.
 * Note: This does NOT delete files within the folder.
 * The caller should handle file cleanup if needed.
 */
export async function deleteFolder(folderId: string): Promise<void> {
  await idb.deleteFolder(folderId)
}

/**
 * Gets all descendant folder IDs for a given folder.
 * Useful for recursive operations like delete.
 */
export async function getDescendantFolderIds(
  projectId: string,
  folderId: string
): Promise<string[]> {
  const allFolders = await getFolders(projectId)
  const descendants: string[] = []
  
  function collectChildren(parentId: string) {
    const children = allFolders.filter(f => f.parentId === parentId)
    for (const child of children) {
      descendants.push(child.id)
      collectChildren(child.id)
    }
  }
  
  collectChildren(folderId)
  return descendants
}