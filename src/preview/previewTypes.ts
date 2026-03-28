/**
 * Preview layer types - preview document and assets.
 * These types are pure data structures and do not import React.
 */

// ─── Preview State Types ──────────────────────────────────────────────────────

export interface PreviewState {
  html: string
  hasHtml: boolean
  error?: string
  refreshTrigger: number
}

// ─── Asset Types ──────────────────────────────────────────────────────────────

/**
 * Map of asset filename to blob object URL.
 */
export interface AssetObjectUrls {
  [fileName: string]: string
}

/**
 * Result of building a preview document.
 */
export interface PreviewBuildResult {
  html: string
  hasHtml: boolean
  error?: string
}