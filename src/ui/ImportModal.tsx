/**
 * ImportModal — lets users import files (images, code, ZIP) into the project.
 *
 * Supported types:
 *   Images:     .png, .jpg, .jpeg, .webp, .svg
 *   Code/Text:  .html, .css, .js, .json, .md
 *   Archives:   .zip (extracted via JSZip CDN)
 */

import { useRef, useState } from 'react'
import { X, Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export type ImportResult =
  | { kind: 'text'; name: string; content: string; mimeType: string }
  | { kind: 'asset'; name: string; blob: Blob; mimeType: string }

interface ImportModalProps {
  onClose: () => void
  onImport: (results: ImportResult[]) => Promise<void>
}

type FileStatus = 'pending' | 'processing' | 'done' | 'error'
interface FileEntry {
  name: string
  status: FileStatus
  error?: string
}

const TEXT_EXTS = new Set(['html', 'htm', 'css', 'js', 'json', 'md', 'txt', 'ts', 'jsx', 'tsx'])
const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'])
const MIME_MAP: Record<string, string> = {
  html: 'text/html', htm: 'text/html', css: 'text/css',
  js: 'text/javascript', ts: 'text/typescript', jsx: 'text/javascript', tsx: 'text/typescript',
  json: 'application/json', md: 'text/markdown', txt: 'text/plain',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml',
}

function getExt(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

function getMime(name: string): string {
  return MIME_MAP[getExt(name)] ?? 'application/octet-stream'
}

async function readAsText(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader()
    reader.onload = () => res(reader.result as string)
    reader.onerror = () => rej(reader.error)
    reader.readAsText(file)
  })
}

async function readAsBlob(file: File): Promise<Blob> {
  return file
}

/** Parse a ZIP using JSZip (loaded from CDN). Returns list of ImportResult. */
async function parseZip(file: File): Promise<ImportResult[]> {
  // Dynamically load JSZip from CDN if not already available
  if (!(window as unknown as Record<string, unknown>).JSZip) {
    await new Promise<void>((res, rej) => {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
      script.onload = () => res()
      script.onerror = () => rej(new Error('Failed to load JSZip'))
      document.head.appendChild(script)
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const JSZip = (window as unknown as Record<string, any>).JSZip
  const zip = await JSZip.loadAsync(file)
  const results: ImportResult[] = []

  const entries: Array<{ name: string; file: unknown }> = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  zip.forEach((relativePath: string, zipEntry: any) => {
    if (!zipEntry.dir) {
      entries.push({ name: relativePath, file: zipEntry })
    }
  })

  for (const { name, file: zipEntry } of entries) {
    const baseName = name.split('/').pop() ?? name
    if (!baseName || baseName.startsWith('.')) continue

    const ext = getExt(baseName)
    try {
      if (TEXT_EXTS.has(ext)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const content: string = await (zipEntry as any).async('text')
        results.push({ kind: 'text', name: baseName, content, mimeType: getMime(baseName) })
      } else if (IMAGE_EXTS.has(ext)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const arrayBuffer: ArrayBuffer = await (zipEntry as any).async('arraybuffer')
        const blob = new Blob([arrayBuffer], { type: getMime(baseName) })
        results.push({ kind: 'asset', name: baseName, blob, mimeType: getMime(baseName) })
      }
      // else: skip unsupported files in ZIP
    } catch {
      // skip bad entries
    }
  }

  return results
}

/** Process a native File object → one or more ImportResult entries */
async function processFile(file: File): Promise<ImportResult[]> {
  const ext = getExt(file.name)
  const name = file.name

  if (ext === 'zip') {
    return parseZip(file)
  }
  if (TEXT_EXTS.has(ext)) {
    const content = await readAsText(file)
    return [{ kind: 'text', name, content, mimeType: getMime(name) }]
  }
  if (IMAGE_EXTS.has(ext)) {
    const blob = await readAsBlob(file)
    return [{ kind: 'asset', name, blob, mimeType: getMime(name) }]
  }
  throw new Error(`Unsupported file type: .${ext}`)
}

const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB

export function ImportModal({ onClose, onImport }: ImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [doneCount, setDoneCount] = useState(0)

  const handleFiles = async (rawFiles: File[]) => {
    if (rawFiles.length === 0) return

    const entries: FileEntry[] = rawFiles.map((f) => ({ name: f.name, status: 'pending' as FileStatus }))
    setFileEntries(entries)
    setIsImporting(true)
    setDoneCount(0)

    const allResults: ImportResult[] = []
    let done = 0

    for (let i = 0; i < rawFiles.length; i++) {
      const file = rawFiles[i]

      setFileEntries((prev) =>
        prev.map((e, idx) => (idx === i ? { ...e, status: 'processing' } : e))
      )

      if (file.size > MAX_FILE_BYTES) {
        setFileEntries((prev) =>
          prev.map((e, idx) =>
            idx === i ? { ...e, status: 'error', error: `File too large (max 10 MB)` } : e
          )
        )
        done++
        setDoneCount(done)
        continue
      }

      try {
        const results = await processFile(file)
        allResults.push(...results)
        setFileEntries((prev) =>
          prev.map((e, idx) => (idx === i ? { ...e, status: 'done' } : e))
        )
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setFileEntries((prev) =>
          prev.map((e, idx) => (idx === i ? { ...e, status: 'error', error: msg } : e))
        )
      }

      done++
      setDoneCount(done)
    }

    if (allResults.length > 0) {
      await onImport(allResults)
    }

    setIsImporting(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) handleFiles(files)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) handleFiles(files)
  }

  const allDone = fileEntries.length > 0 && fileEntries.every((e) => e.status === 'done' || e.status === 'error')

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: '#18181b',
          borderRadius: '16px 16px 0 0',
          border: '1px solid #2a2a30',
          borderBottom: 'none',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          animation: 'slideUp 0.25s ease-out',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 16px 12px',
          borderBottom: '1px solid #2a2a30',
        }}>
          <span style={{ fontSize: '15px', fontWeight: 600, color: '#f0f0f2' }}>
            Import ke Project
          </span>
          <button
            onClick={onClose}
            style={{
              width: '32px', height: '32px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', borderRadius: '8px', color: '#6d6d7a',
              background: '#1c1c1f', border: '1px solid #2a2a30',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Drop zone */}
        <div style={{ padding: '16px' }}>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${isDragging ? '#a855f7' : '#2a2a30'}`,
              borderRadius: '12px',
              padding: '28px 16px',
              textAlign: 'center',
              background: isDragging ? 'rgba(168,85,247,0.06)' : '#141416',
              transition: 'border-color 0.15s, background 0.15s',
              cursor: 'pointer',
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: '#1c1c1f', border: '1px solid #2a2a30',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px',
            }}>
              <Upload size={20} style={{ color: '#a855f7' }} />
            </div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#f0f0f2', margin: '0 0 4px' }}>
              Pilih File dari Perangkat
            </p>
            <p style={{ fontSize: '12px', color: '#6d6d7a', margin: '0 0 16px', lineHeight: 1.5 }}>
              atau drag & drop file ke sini
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
              disabled={isImporting}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                height: '36px', padding: '0 16px',
                background: '#a855f7', borderRadius: '8px',
                color: 'white', fontSize: '13px', fontWeight: 600,
                opacity: isImporting ? 0.5 : 1,
              }}
            >
              <Upload size={13} />
              Pilih File
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".png,.jpg,.jpeg,.webp,.svg,.gif,.html,.htm,.css,.js,.ts,.jsx,.tsx,.json,.md,.txt,.zip"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          {/* Supported formats */}
          <div style={{ marginTop: '12px' }}>
            <p style={{ fontSize: '11px', color: '#4a4a54', margin: '0 0 6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Format yang didukung
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {['PNG JPG WebP SVG', 'HTML CSS JS JSON MD', 'ZIP'].map((group) => (
                <span key={group} style={{
                  fontSize: '11px', color: '#6d6d7a', padding: '3px 8px',
                  background: '#1c1c1f', border: '1px solid #2a2a30', borderRadius: '6px',
                  fontFamily: 'monospace',
                }}>
                  {group}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* File list / progress */}
        {fileEntries.length > 0 && (
          <div style={{ padding: '0 16px 16px' }}>
            <div style={{ borderTop: '1px solid #2a2a30', paddingTop: '12px' }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#6d6d7a', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
                {isImporting ? `Memproses ${doneCount}/${fileEntries.length}…` : allDone ? 'Selesai' : 'File'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                {fileEntries.map((entry, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 10px', background: '#141416',
                    border: `1px solid ${entry.status === 'error' ? '#ef4444' : entry.status === 'done' ? '#22c55e22' : '#2a2a30'}`,
                    borderRadius: '8px',
                  }}>
                    {entry.status === 'processing' && <Loader2 size={14} style={{ color: '#a855f7', flexShrink: 0, animation: 'spin 0.8s linear infinite' }} />}
                    {entry.status === 'done' && <CheckCircle size={14} style={{ color: '#22c55e', flexShrink: 0 }} />}
                    {entry.status === 'error' && <AlertCircle size={14} style={{ color: '#ef4444', flexShrink: 0 }} />}
                    {entry.status === 'pending' && <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #3d3d45', flexShrink: 0 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '12px', color: '#f0f0f2', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                        {entry.name}
                      </p>
                      {entry.error && (
                        <p style={{ fontSize: '11px', color: '#ef4444', margin: '2px 0 0', lineHeight: 1.3 }}>{entry.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {allDone && (
                <button
                  onClick={onClose}
                  style={{
                    width: '100%', height: '40px', marginTop: '12px',
                    background: '#22c55e', borderRadius: '10px',
                    color: 'white', fontSize: '13px', fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}
                >
                  <CheckCircle size={14} />
                  Selesai
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
