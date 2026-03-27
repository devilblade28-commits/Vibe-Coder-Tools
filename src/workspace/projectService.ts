/**
 * Project & File System service layer.
 * All IndexedDB access goes through here — UI components never touch IDB directly.
 */

import { v4 as uuid } from 'uuid'
import type { Project, ProjectFile, ProjectFolder, ProjectAsset } from '../types'
import * as idb from '../storage/idb'
import * as ls from '../storage/ls'

// ─── Project CRUD ─────────────────────────────────────────────────────────────

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

export async function loadProject(id: string): Promise<Project | null> {
  const project = await idb.getProject<Project>(id)
  if (!project) return null
  ls.setLastProjectId(id)
  return project
}

export async function renameProject(id: string, name: string): Promise<void> {
  const project = await idb.getProject<Project>(id)
  if (!project) return
  project.name = name.trim() || 'Untitled Project'
  project.updatedAt = new Date().toISOString()
  await idb.putProject(project)
  ls.updateProjectInIndex(id, project.name)
}

export async function saveProject(project: Project): Promise<void> {
  project.updatedAt = new Date().toISOString()
  await idb.putProject(project)
}

/** Full delete: project record + all files/folders/assets. */
export async function deleteProjectData(id: string): Promise<void> {
  await Promise.all([
    idb.deleteProject(id),
    idb.deleteFilesForProject(id),
    idb.deleteFoldersForProject(id),
    idb.deleteAssetsForProject(id),
  ])
  ls.removeProjectFromIndex(id)
  if (ls.getLastProjectId() === id) ls.setLastProjectId(null)
}

/**
 * Restore the last opened project from IDB.
 * Returns null if no valid lastProjectId, or if IDB doesn't have it.
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

// ─── File CRUD ────────────────────────────────────────────────────────────────

export async function getProjectFiles(projectId: string): Promise<ProjectFile[]> {
  return idb.getFilesForProject<ProjectFile>(projectId)
}

/**
 * Create a new file.
 * Rejects with a descriptive error if a file with the same name already exists
 * in the same folder.
 */
export async function createFile(
  projectId: string,
  name: string,
  content = '',
  folderId: string | null = null
): Promise<ProjectFile> {
  const trimmedName = name.trim()
  if (!trimmedName) throw new Error('File name cannot be empty')
  if (!isValidFileName(trimmedName)) throw new Error(`Invalid file name: "${trimmedName}"`)

  // Duplicate check within same folder
  const existing = await getProjectFiles(projectId)
  const duplicate = existing.find(
    (f) => f.name.toLowerCase() === trimmedName.toLowerCase() && f.folderId === folderId
  )
  if (duplicate) {
    throw new Error(`A file named "${trimmedName}" already exists in this location`)
  }

  const ext = getFileExtension(trimmedName)
  const now = new Date().toISOString()
  const file: ProjectFile = {
    id: uuid(),
    projectId,
    folderId,
    name: trimmedName,
    path: buildFilePath(trimmedName, folderId),
    type: isTextExtension(ext) ? 'text' : 'asset',
    content,
    assetRef: null,
    mimeType: getMimeType(ext),
    size: content.length,
    createdAt: now,
    updatedAt: now,
  }
  await idb.putFile(file)
  return file
}

/**
 * Update file content.
 * Takes the in-memory file object to avoid an extra IDB read per keystroke.
 */
export async function updateFileContent(
  file: ProjectFile,
  content: string
): Promise<ProjectFile> {
  const updated: ProjectFile = {
    ...file,
    content,
    size: content.length,
    updatedAt: new Date().toISOString(),
  }
  await idb.putFile(updated)
  return updated
}

export async function deleteFile(fileId: string): Promise<void> {
  await idb.deleteFile(fileId)
}

/**
 * Create or update a file by name within a project.
 * Used by AI actions — upsert semantics.
 */
export async function upsertFileByName(
  projectId: string,
  name: string,
  content: string,
  folderId: string | null = null
): Promise<ProjectFile> {
  const files = await getProjectFiles(projectId)
  const existing = files.find(
    (f) => f.name.toLowerCase() === name.toLowerCase()
  )
  if (existing) {
    return updateFileContent(existing, content)
  }
  return createFile(projectId, name, content, folderId)
}

// ─── Folder CRUD ──────────────────────────────────────────────────────────────

export async function getProjectFolders(projectId: string): Promise<ProjectFolder[]> {
  return idb.getFoldersForProject<ProjectFolder>(projectId)
}

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
    name: trimmedName,
    parentId,
    createdAt: new Date().toISOString(),
  }
  await idb.putFolder(folder)
  return folder
}

// ─── Asset CRUD ───────────────────────────────────────────────────────────────

export async function getProjectAssets(projectId: string): Promise<ProjectAsset[]> {
  return idb.getAssetsForProject<ProjectAsset>(projectId)
}

// ─── Hydration helper ─────────────────────────────────────────────────────────

export interface LoadedProject {
  project: Project
  files: ProjectFile[]
  folders: ProjectFolder[]
  assets: ProjectAsset[]
}

/**
 * Deterministic hydration: load project + all its data.
 * Validates activeFileId still exists.
 */
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function isValidFileName(name: string): boolean {
  if (!name || name.trim().length === 0) return false
  // No path separators, no control chars, must have extension
  if (/[/\\:*?"<>|]/.test(name)) return false
  if (!name.includes('.')) return false
  return true
}

export function getFileExtension(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

function buildFilePath(name: string, folderId: string | null): string {
  // Use simple root-based paths since we don't have folder names at this point
  return folderId ? `/${folderId}/${name}` : `/${name}`
}

export function isTextExtension(ext: string): boolean {
  return ['html', 'htm', 'css', 'js', 'ts', 'json', 'md', 'txt', 'xml', 'svg'].includes(ext)
}

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    html: 'text/html', htm: 'text/html',
    css: 'text/css',
    js: 'text/javascript', ts: 'text/typescript',
    json: 'application/json',
    md: 'text/markdown',
    txt: 'text/plain',
    svg: 'image/svg+xml',
    xml: 'application/xml',
    png: 'image/png', jpg: 'image/jpeg',
    jpeg: 'image/jpeg', webp: 'image/webp',
  }
  return map[ext] ?? 'text/plain'
}

export function getFileTemplate(name: string): string {
  const ext = getFileExtension(name)
  if (ext === 'html' || ext === 'htm') {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>

  <script src="script.js"></script>
</body>
</html>`
  }
  if (ext === 'css') return `/* Styles */\n\nbody {\n  margin: 0;\n  font-family: sans-serif;\n}\n`
  if (ext === 'js') return `// Script\n\nconsole.log('Hello!');\n`
  if (ext === 'json') return `{\n  \n}\n`
  if (ext === 'md') return `# Document\n\n`
  return ''
}
