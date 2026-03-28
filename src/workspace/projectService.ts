/**
 * Project & File System service layer.
 * 
 * ⚠️ DEPRECATED: This file delegates to the new layered architecture.
 * 
 * For new code, import directly from:
 * - Workspace layer: `src/workspace` (workspaceService.ts)
 * - Filesystem layer: `src/filesystem` (fileService.ts, folderService.ts, assetService.ts)
 * 
 * This file is kept for backward compatibility with existing imports.
 */

import { v4 as uuid } from 'uuid'
import type { Project, ProjectFile, ProjectFolder, ProjectAsset } from '../types'
import * as idb from '../storage/indexedDBService'
import * as ls from '../storage/localStorageService'

// Import from new layers
import * as workspaceService from './workspaceService'
import * as fileService from '../filesystem/fileService'
import * as folderService from '../filesystem/folderService'
import * as assetService from '../filesystem/assetService'

// ─── Project CRUD ─────────────────────────────────────────────────────────────

export async function createProject(name = 'Untitled Project'): Promise<Project> {
  return workspaceService.createProject(name)
}

export async function loadProject(id: string): Promise<Project | null> {
  return workspaceService.loadProject(id)
}

export async function renameProject(id: string, name: string): Promise<void> {
  return workspaceService.renameProject(id, name)
}

export async function saveProject(project: Project): Promise<void> {
  return workspaceService.saveProject(project)
}

export async function deleteProjectData(id: string): Promise<void> {
  return workspaceService.deleteProject(id)
}

export async function getOrRestoreLastProject(): Promise<Project | null> {
  return workspaceService.getOrRestoreLastProject()
}

// ─── File CRUD ────────────────────────────────────────────────────────────────

export async function getProjectFiles(projectId: string): Promise<ProjectFile[]> {
  return fileService.getFiles(projectId) as Promise<ProjectFile[]>
}

export async function createFile(
  projectId: string,
  name: string,
  content = '',
  folderId: string | null = null
): Promise<ProjectFile> {
  return fileService.createFile(projectId, { name, content, folderId }) as Promise<ProjectFile>
}

export async function updateFileContent(
  file: ProjectFile,
  content: string
): Promise<ProjectFile> {
  return fileService.updateFile(file, content) as Promise<ProjectFile>
}

export async function deleteFile(fileId: string): Promise<void> {
  return fileService.deleteFile(fileId)
}

export async function upsertFileByName(
  projectId: string,
  name: string,
  content: string,
  folderId: string | null = null
): Promise<ProjectFile> {
  return fileService.upsertFileByName(projectId, name, content, folderId) as Promise<ProjectFile>
}

// ─── Folder CRUD ──────────────────────────────────────────────────────────────

export async function getProjectFolders(projectId: string): Promise<ProjectFolder[]> {
  return folderService.getFolders(projectId) as Promise<ProjectFolder[]>
}

export async function createFolder(
  projectId: string,
  name: string,
  parentId: string | null = null
): Promise<ProjectFolder> {
  return folderService.createFolder(projectId, name, parentId) as Promise<ProjectFolder>
}

// ─── Asset CRUD ───────────────────────────────────────────────────────────────

export async function getProjectAssets(projectId: string): Promise<ProjectAsset[]> {
  return assetService.getAssets(projectId) as Promise<ProjectAsset[]>
}

export async function createAsset(
  projectId: string,
  fileName: string,
  mimeType: string,
  blob: Blob
): Promise<ProjectAsset> {
  const file = new File([blob], fileName, { type: mimeType })
  return assetService.createAsset(projectId, file) as Promise<ProjectAsset>
}

export async function deleteAsset(assetId: string): Promise<void> {
  return assetService.deleteAsset(assetId)
}

// ─── Hydration helper ─────────────────────────────────────────────────────────

export interface LoadedProject {
  project: Project
  files: ProjectFile[]
  folders: ProjectFolder[]
  assets: ProjectAsset[]
}

export async function loadFullProject(id: string): Promise<LoadedProject | null> {
  const project = await loadProject(id)
  if (!project) return null

  const [files, folders, assets] = await Promise.all([
    getProjectFiles(id),
    getProjectFolders(id),
    getProjectAssets(id),
  ])

  // Validate activeFileId still exists
  if (project.activeFileId && !files.find((f) => f.id === project.activeFileId)) {
    project.activeFileId = null
    await idb.putProject(project)
  }

  return { project, files, folders, assets }
}

// ─── Helpers (re-exported for backward compatibility) ──────────────────────────

export const isValidFileName = fileService.isValidFileName
export const getFileExtension = fileService.getFileExtension
export const isTextExtension = fileService.isTextExtension
export const getFileTemplate = fileService.getFileTemplate