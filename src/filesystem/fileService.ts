/**
 * File Service - File CRUD operations.
 * 
 * This service handles file-level operations:
 * - File CRUD (create, read, update, delete)
 * - File validation
 * - File type detection
 * 
 * All IndexedDB access goes through the storage layer.
 * This service does NOT import React - it's pure TypeScript.
 */

import { v4 as uuid } from 'uuid'
import type { ProjectFile, CreateFileInput } from './filesystemTypes'
import * as idb from '../storage/indexedDBService'

// ─── File CRUD ────────────────────────────────────────────────────────────────

/**
 * Gets all files for a project from IndexedDB.
 */
export async function getFiles(projectId: string): Promise<ProjectFile[]> {
  return idb.getFilesForProject<ProjectFile>(projectId)
}

/**
 * Gets a single file by ID.
 * Returns null if the file doesn't exist.
 */
export async function getFile(fileId: string): Promise<ProjectFile | null> {
  const files = await idb.getFilesForProject<ProjectFile>(fileId)
  // This isn't efficient - IDB should have a getFile method
  // For now, we'll work around it
  return null // TODO: Add getFile to indexedDBService
}

/**
 * Creates a new file within a project.
 * Validates the file name and checks for duplicates.
 */
export async function createFile(
  projectId: string, 
  input: CreateFileInput
): Promise<ProjectFile> {
  const trimmedName = input.name.trim()
  if (!trimmedName) throw new Error('File name cannot be empty')
  if (!isValidFileName(trimmedName)) {
    throw new Error(`Invalid file name: "${trimmedName}"`)
  }

  const folderId = input.folderId ?? null

  // Duplicate check within same folder
  const existing = await getFiles(projectId)
  const duplicate = existing.find(
    (f) => f.name.toLowerCase() === trimmedName.toLowerCase() && f.folderId === folderId
  )
  if (duplicate) {
    throw new Error(`A file named "${trimmedName}" already exists in this location`)
  }

  const ext = getFileExtension(trimmedName)
  const now = new Date().toISOString()
  const content = input.content ?? getFileTemplate(trimmedName)
  
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
 * Updates a file's content.
 * Takes the current file object to avoid an extra IDB read.
 */
export async function updateFile(
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

/**
 * Deletes a file by ID.
 */
export async function deleteFile(fileId: string): Promise<void> {
  await idb.deleteFile(fileId)
}

/**
 * Upserts a file by name within a project.
 * Creates if it doesn't exist, updates if it does.
 * Used by AI actions for deterministic file operations.
 */
export async function upsertFileByName(
  projectId: string,
  name: string,
  content: string,
  folderId: string | null = null
): Promise<ProjectFile> {
  const files = await getFiles(projectId)
  const existing = files.find(
    (f) => f.name.toLowerCase() === name.toLowerCase()
  )
  if (existing) {
    return updateFile(existing, content)
  }
  return createFile(projectId, { name, content, folderId })
}

// ─── File Validation ───────────────────────────────────────────────────────────

/**
 * Validates a file name.
 * Returns true if the name is valid.
 */
export function isValidFileName(name: string): boolean {
  if (!name || name.trim().length === 0) return false
  // No path separators, no control chars, must have extension
  if (/[/\\:*?"<>|]/.test(name)) return false
  if (!name.includes('.')) return false
  return true
}

/**
 * Gets the file extension from a file name.
 * Returns lowercase extension without the dot.
 */
export function getFileExtension(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

/**
 * Determines if a file extension represents a text file.
 */
export function isTextExtension(ext: string): boolean {
  return ['html', 'htm', 'css', 'js', 'ts', 'json', 'md', 'txt', 'xml', 'svg'].includes(ext)
}

// ─── File Helpers ──────────────────────────────────────────────────────────────

/**
 * Builds a file path from name and folder ID.
 * Uses simple root-based paths.
 */
function buildFilePath(name: string, folderId: string | null): string {
  return folderId ? `/${folderId}/${name}` : `/${name}`
}

/**
 * Gets the MIME type for a file extension.
 */
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

/**
 * Gets a default content template for a new file.
 */
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