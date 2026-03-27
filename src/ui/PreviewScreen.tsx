import { useRef, useEffect, useState, useCallback } from 'react'
import { RefreshCw, Maximize2, X, AlertTriangle } from 'lucide-react'
import type { ProjectFile, ProjectAsset } from '../types'
import { buildPreviewDocument, revokePreviewObjectUrls } from '../preview/buildPreview'

interface PreviewScreenProps {
  files: ProjectFile[]
  assets: ProjectAsset[]
  refreshTrigger: number
}

const DEBOUNCE_MS = 300

export function PreviewScreen({ files, assets, refreshTrigger }: PreviewScreenProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [srcdocCache, setSrcdocCache] = useState('')
  const [hasHtml, setHasHtml] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [lastUpdated, setLastUpdated] = useState('')
  const [jsErrors, setJsErrors] = useState<string[]>([])
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const applyPreview = useCallback((currentFiles: ProjectFile[]) => {
    setIsUpdating(true)
    setJsErrors([])

    const { html, hasHtml: found } = buildPreviewDocument(currentFiles, assets)
    setHasHtml(found)

    const srcdoc = found
      ? html
      : `<html><body style="margin:0;background:#0d0d0f;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:system-ui,sans-serif;gap:12px;">
          <div style="font-size:40px;opacity:0.25">📄</div>
          <p style="font-size:14px;color:#6d6d7a;margin:0;font-weight:500">No HTML file found</p>
          <p style="font-size:12px;color:#4a4a54;margin:0;text-align:center;max-width:220px;line-height:1.5">Create an index.html or ask AI to build something.</p>
        </body></html>`

    setSrcdocCache(srcdoc)
    if (iframeRef.current) iframeRef.current.srcdoc = srcdoc
    setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    setTimeout(() => setIsUpdating(false), 200)
  }, [])

  const scheduleRebuild = useCallback((f: ProjectFile[]) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => applyPreview(f), DEBOUNCE_MS)
  }, [applyPreview])

  const forceRebuild = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    applyPreview(files)
  }, [applyPreview, files])

  // Debounced on file content changes (typing)
  useEffect(() => {
    scheduleRebuild(files)
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current) }
  }, [files, scheduleRebuild])

  // Immediate on trigger (AI actions, tab switch)
  useEffect(() => {
    if (refreshTrigger > 0) forceRebuild()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger])

  // Revoke object URLs on unmount
  useEffect(() => () => revokePreviewObjectUrls(), [])

  // Listen for JS errors from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'preview-error') {
        const msg = `${e.data.message}${e.data.line ? ` (line ${e.data.line})` : ''}`
        setJsErrors((prev) => [...prev.slice(-3), msg])
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{
        height: '44px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '0 8px',
        background: '#141416',
        borderBottom: '1px solid #1f1f23',
        flexShrink: 0,
      }}>
        <button
          onClick={forceRebuild}
          title="Refresh preview"
          style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', color: '#8b8b96', WebkitTapHighlightColor: 'transparent' }}
        >
          <RefreshCw size={16} style={{ animation: isUpdating ? 'spin 0.6s linear infinite' : 'none' }} />
        </button>

        <span style={{
          flex: 1,
          textAlign: 'center',
          fontSize: '12px',
          color: isUpdating ? '#c084fc' : hasHtml ? '#4a4a54' : '#3d3d45',
        }}>
          {isUpdating ? 'Updating…' : hasHtml && lastUpdated ? `Updated ${lastUpdated}` : hasHtml ? 'Preview' : 'No preview'}
        </span>

        <button
          onClick={() => setFullscreen(true)}
          title="Fullscreen"
          style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', color: '#8b8b96', WebkitTapHighlightColor: 'transparent', opacity: hasHtml ? 1 : 0.3 }}
          disabled={!hasHtml}
        >
          <Maximize2 size={16} />
        </button>
      </div>

      {/* iframe area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <iframe
          ref={iframeRef}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          style={{ width: '100%', height: '100%', border: 'none', background: hasHtml ? 'white' : '#0d0d0f' }}
          title="Preview"
        />

        {/* JS error banner */}
        {jsErrors.length > 0 && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: '#1c1002',
            borderTop: '1px solid #f59e0b',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
          }}>
            <AlertTriangle size={14} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '1px' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              {jsErrors.map((e, i) => (
                <p key={i} style={{ fontSize: '11px', color: '#f59e0b', margin: '0 0 2px', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e}
                </p>
              ))}
            </div>
            <button
              onClick={() => setJsErrors([])}
              style={{ color: '#f59e0b', flexShrink: 0, padding: '2px' }}
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Fullscreen overlay */}
      {fullscreen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'white' }}>
          <iframe
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            srcDoc={srcdocCache}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Preview Fullscreen"
          />
          <button
            onClick={() => setFullscreen(false)}
            style={{
              position: 'fixed',
              top: 'calc(16px + env(safe-area-inset-top))',
              right: '16px',
              width: '44px',
              height: '44px',
              background: 'rgba(0,0,0,0.55)',
              borderRadius: '9999px',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 201,
              backdropFilter: 'blur(4px)',
            }}
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  )
}
