/**
 * Asset URL resolution for preview.
 * Maps asset filenames to blob object URLs.
 * 
 * This module manages the lifecycle of blob URLs created from imported assets.
 * Object URLs must be tracked and revoked to prevent memory leaks.
 */

import type { AssetObjectUrls } from './previewTypes'

// ─── Internal State ───────────────────────────────────────────────────────────

/**
 * Map of asset filename → object URL.
 * Populated when assets are imported and used by the preview engine.
 */
let assetObjectUrls: Record<string, string> = {}

/**
 * List of all object URLs that have been created.
 * Used for cleanup when revoking URLs.
 */
let previousUrls: string[] = []

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get the object URL for an asset by filename.
 * Returns null if the asset hasn't been registered.
 */
export function getAssetUrl(fileName: string): string | null {
  return assetObjectUrls[fileName] ?? null
}

/**
 * Set the object URL for an asset directly.
 * Used when the URL has already been created elsewhere.
 */
export function setAssetUrl(fileName: string, url: string): void {
  assetObjectUrls[fileName] = url
  previousUrls.push(url)
}

/**
 * Create and register an object URL from a blob.
 * Returns the created URL for immediate use.
 */
export function registerAssetUrl(fileName: string, blob: Blob): string {
  const url = URL.createObjectURL(blob)
  assetObjectUrls[fileName] = url
  previousUrls.push(url)
  return url
}

/**
 * Revoke all object URLs and clear the registry.
 * Call this when the preview is rebuilt or the component unmounts.
 */
export function revokeAllAssetUrls(): void {
  for (const url of previousUrls) {
    try {
      URL.revokeObjectURL(url)
    } catch {
      // Ignore errors if URL was already revoked
    }
  }
  previousUrls = []
  assetObjectUrls = {}
}

/**
 * Get a copy of the current asset URL map.
 * Useful for passing to the preview builder.
 */
export function getAssetObjectUrls(): AssetObjectUrls {
  return { ...assetObjectUrls }
}

/**
 * Set the entire asset URL map.
 * Used by the preview builder to sync URLs.
 */
export function setAssetObjectUrls(urls: AssetObjectUrls): void {
  assetObjectUrls = { ...urls }
  // Track these URLs for cleanup
  for (const url of Object.values(urls)) {
    if (!previousUrls.includes(url)) {
      previousUrls.push(url)
    }
  }
}

/**
 * Remove a specific asset URL from the registry.
 * Does NOT revoke the URL - caller must handle that if needed.
 */
export function removeAssetUrl(fileName: string): void {
  delete assetObjectUrls[fileName]
}

/**
 * Check if an asset URL exists for the given filename.
 */
export function hasAssetUrl(fileName: string): boolean {
  return fileName in assetObjectUrls
}