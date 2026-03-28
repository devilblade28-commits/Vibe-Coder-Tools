/**
 * Preview Context - React state management for preview operations.
 * 
 * Provides:
 * - Preview HTML state
 * - Refresh trigger for iframe updates
 * - Preview building from project files
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { PreviewState, AssetObjectUrls } from './previewTypes'
import type { ProjectFile, ProjectAsset } from '../filesystem/filesystemTypes'
import { buildPreviewDocument, setAssetObjectUrls } from './buildPreview'
import * as assetResolver from './assetResolver'

// ─── Context Types ────────────────────────────────────────────────────────────

interface PreviewContextValue extends PreviewState {
  // Preview building
  rebuild: (files: ProjectFile[], assets?: ProjectAsset[]) => void
  clear: () => void
  
  // Asset URL management
  setAssetUrls: (urls: AssetObjectUrls) => void
  getAssetUrls: () => AssetObjectUrls
  revokeAssetUrls: () => void
}

const PreviewContext = createContext<PreviewContextValue | null>(null)

// ─── Provider Component ───────────────────────────────────────────────────────

interface PreviewProviderProps {
  children: ReactNode
}

export function PreviewProvider({ children }: PreviewProviderProps) {
  const [html, setHtml] = useState('')
  const [hasHtml, setHasHtml] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // ─── Rebuild Preview ───────────────────────────────────────────────────────

  const rebuild = useCallback((files: ProjectFile[], assets?: ProjectAsset[]): void => {
    try {
      setError(undefined)
      
      // Sync asset URLs from the resolver to the preview builder
      const assetUrls = assetResolver.getAssetObjectUrls()
      setAssetObjectUrls(assetUrls)
      
      // Build the preview document
      const result = buildPreviewDocument(files, assets)
      
      setHtml(result.html)
      setHasHtml(result.hasHtml)
      if (result.error) {
        setError(result.error)
      }
      
      // Increment refresh trigger to force iframe reload
      setRefreshTrigger(prev => prev + 1)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to build preview'
      setError(errorMessage)
      setHasHtml(false)
    }
  }, [])

  // ─── Clear Preview ───────────────────────────────────────────────────────────

  const clear = useCallback((): void => {
    setHtml('')
    setHasHtml(false)
    setError(undefined)
    setRefreshTrigger(prev => prev + 1)
  }, [])

  // ─── Asset URL Management ────────────────────────────────────────────────────

  const setAssetUrls = useCallback((urls: AssetObjectUrls): void => {
    assetResolver.setAssetObjectUrls(urls)
    setAssetObjectUrls(urls)
  }, [])

  const getAssetUrls = useCallback((): AssetObjectUrls => {
    return assetResolver.getAssetObjectUrls()
  }, [])

  const revokeAssetUrls = useCallback((): void => {
    assetResolver.revokeAllAssetUrls()
  }, [])

  // ─── Context Value ──────────────────────────────────────────────────────────

  const value: PreviewContextValue = {
    // State
    html,
    hasHtml,
    error,
    refreshTrigger,
    
    // Preview building
    rebuild,
    clear,
    
    // Asset URL management
    setAssetUrls,
    getAssetUrls,
    revokeAssetUrls,
  }

  return (
    <PreviewContext.Provider value={value}>
      {children}
    </PreviewContext.Provider>
  )
}

// ─── Custom Hook ──────────────────────────────────────────────────────────────

/**
 * Hook to access the preview context.
 * Throws an error if used outside of PreviewProvider.
 */
export function usePreview(): PreviewContextValue {
  const context = useContext(PreviewContext)
  if (!context) {
    throw new Error('usePreview must be used within a PreviewProvider')
  }
  return context
}

// ─── Exports ───────────────────────────────────────────────────────────────────

export { PreviewContext }