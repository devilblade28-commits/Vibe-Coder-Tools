/**
 * Preview Layer - Preview document building and asset management.
 * 
 * This layer handles all preview-related functionality:
 * - Building preview documents from project files
 * - Asset URL resolution and lifecycle management
 * - Preview state management
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type {
  PreviewState,
  AssetObjectUrls,
  PreviewBuildResult,
} from './previewTypes'

// ─── Context ──────────────────────────────────────────────────────────────────

export { PreviewProvider, usePreview } from './PreviewContext'

// ─── Services ─────────────────────────────────────────────────────────────────

export {
  buildPreviewDocument,
  revokePreviewObjectUrls,
  setAssetObjectUrls,
} from './buildPreview'

export {
  getAssetUrl,
  setAssetUrl,
  registerAssetUrl,
  revokeAllAssetUrls,
  getAssetObjectUrls,
  setAssetObjectUrls as setAssetUrlsMap,
  removeAssetUrl,
  hasAssetUrl,
} from './assetResolver'