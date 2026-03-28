/**
 * Asset Service - Binary asset CRUD operations.
 * 
 * This service handles asset-level operations:
 * - Asset CRUD (create, list, delete)
 * - Binary file handling (images, fonts, etc.)
 * 
 * All IndexedDB access goes through the storage layer.
 * This service does NOT import React - it's pure TypeScript.
 */

import { v4 as uuid } from 'uuid'
import type { ProjectAsset } from './filesystemTypes'
import * as idb from '../storage/indexedDBService'

// ─── Asset CRUD ───────────────────────────────────────────────────────────────

/**
 * Gets all assets for a project from IndexedDB.
 */
export async function getAssets(projectId: string): Promise<ProjectAsset[]> {
  return idb.getAssetsForProject<ProjectAsset>(projectId)
}

/**
 * Creates a new asset from a File object.
 * Stores the binary blob in IndexedDB.
 */
export async function createAsset(
  projectId: string,
  file: File
): Promise<ProjectAsset> {
  const asset: ProjectAsset = {
    id: uuid(),
    projectId,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    blob: file,
    size: file.size,
    createdAt: new Date().toISOString(),
  }
  
  await idb.putAsset(asset)
  return asset
}

/**
 * Creates an asset from raw data.
 * Useful when the blob is created programmatically.
 */
export async function createAssetFromBlob(
  projectId: string,
  fileName: string,
  mimeType: string,
  blob: Blob
): Promise<ProjectAsset> {
  const asset: ProjectAsset = {
    id: uuid(),
    projectId,
    fileName,
    mimeType,
    blob,
    size: blob.size,
    createdAt: new Date().toISOString(),
  }
  
  await idb.putAsset(asset)
  return asset
}

/**
 * Deletes an asset by ID.
 */
export async function deleteAsset(assetId: string): Promise<void> {
  await idb.deleteAsset(assetId)
}

/**
 * Gets an asset URL for display.
 * Creates a temporary object URL for the blob.
 * Remember to revoke the URL when done to avoid memory leaks.
 */
export function getAssetUrl(asset: ProjectAsset): string {
  return URL.createObjectURL(asset.blob)
}

/**
 * Revokes an asset URL to free memory.
 */
export function revokeAssetUrl(url: string): void {
  URL.revokeObjectURL(url)
}