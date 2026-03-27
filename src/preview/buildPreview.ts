/**
 * Preview engine — assembles project files into a renderable srcdoc string.
 *
 * Strategy:
 * 1. Find index.html (or first .html file)
 * 2. Inline CSS files referenced via <link href="...">
 * 3. Inline JS files referenced via <script src="...">
 * 4. Auto-inject any unreferenced CSS/JS files that exist in the project
 * 5. Replace asset filename references with base64 data URLs or blob object URLs
 */

import type { ProjectFile, ProjectAsset } from '../types'

export interface PreviewBuildResult {
  html: string
  hasHtml: boolean
  error?: string
}

/** Object URLs that were allocated in the previous build — must be revoked. */
let previousObjectUrls: string[] = []

export function revokePreviewObjectUrls(): void {
  for (const url of previousObjectUrls) {
    try { URL.revokeObjectURL(url) } catch { /* ignore */ }
  }
  previousObjectUrls = []
}

/** Map of asset filename → object URL. Populated by caller. */
let _assetObjectUrls: Record<string, string> = {}

/** Update the asset URL map so the preview engine can resolve imported blobs. */
export function setAssetObjectUrls(urls: Record<string, string>): void {
  _assetObjectUrls = urls
}

export function buildPreviewDocument(files: ProjectFile[], assets?: ProjectAsset[]): PreviewBuildResult {
  // Revoke any object URLs from the previous build
  revokePreviewObjectUrls()

  const htmlFile =
    files.find((f) => f.name === 'index.html' || f.name === 'index.htm') ??
    files.find((f) => f.name.endsWith('.html') || f.name.endsWith('.htm'))

  if (!htmlFile) {
    return { html: '', hasHtml: false }
  }

  let html = htmlFile.content ?? ''

  const cssFiles = files.filter((f) => f.type === 'text' && f.name.endsWith('.css'))
  const jsFiles = files.filter(
    (f) => f.type === 'text' && f.name.endsWith('.js') && !f.name.endsWith('.min.js')
  )

  // ── 1. Inline CSS files that are referenced ──────────────────────────────
  const referencedCss = new Set<string>()
  for (const css of cssFiles) {
    const linkRegex = new RegExp(
      `<link[^>]*href=["']${escapeRegex(css.name)}["'][^>]*/?>`  ,
      'gi'
    )
    if (linkRegex.test(html)) {
      referencedCss.add(css.id)
      html = html.replace(linkRegex, `<style>/* ${css.name} */\n${css.content ?? ''}</style>`)
    }
  }

  // ── 2. Auto-inject unreferenced CSS before </head> ───────────────────────
  const unreferencedCss = cssFiles.filter((f) => !referencedCss.has(f.id))
  if (unreferencedCss.length > 0) {
    const injected = unreferencedCss
      .map((f) => `<style>/* ${f.name} (auto-injected) */\n${f.content ?? ''}</style>`)
      .join('\n')
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${injected}\n</head>`)
    } else {
      html = injected + '\n' + html
    }
  }

  // ── 3. Inline JS files that are referenced ───────────────────────────────
  const referencedJs = new Set<string>()
  for (const js of jsFiles) {
    const scriptRegex = new RegExp(
      `<script[^>]*src=["']${escapeRegex(js.name)}["'][^>]*>\\s*</script>`,
      'gi'
    )
    if (scriptRegex.test(html)) {
      referencedJs.add(js.id)
      html = html.replace(
        scriptRegex,
        `<script>/* ${js.name} */\n${js.content ?? ''}</script>`
      )
    }
  }

  // ── 4. Auto-inject unreferenced JS before </body> ────────────────────────
  const unreferencedJs = jsFiles.filter((f) => !referencedJs.has(f.id))
  if (unreferencedJs.length > 0) {
    const injected = unreferencedJs
      .map((f) => `<script>/* ${f.name} (auto-injected) */\n${f.content ?? ''}</script>`)
      .join('\n')
    if (html.includes('</body>')) {
      html = html.replace('</body>', `${injected}\n</body>`)
    } else {
      html = html + '\n' + injected
    }
  }

  // ── 5. Replace asset filename refs with data URLs / object URLs ──────────
  // 5a. Text-stored assets (base64 data URL in content field)
  const assetFiles = files.filter((f) => f.type === 'asset' && f.content)
  for (const asset of assetFiles) {
    const nameRegex = new RegExp(escapeRegex(asset.name), 'g')
    if (nameRegex.test(html)) {
      // content is expected to be a base64 data URL: "data:image/png;base64,..."
      html = html.replace(nameRegex, asset.content)
    }
  }

  // 5b. Blob-based imported assets — create/reuse object URLs
  const blobAssets = assets ?? []
  for (const asset of blobAssets) {
    const nameRegex = new RegExp(escapeRegex(asset.fileName), 'g')
    if (nameRegex.test(html)) {
      let objUrl = _assetObjectUrls[asset.fileName]
      if (!objUrl) {
        objUrl = URL.createObjectURL(asset.blob)
        _assetObjectUrls[asset.fileName] = objUrl
        previousObjectUrls.push(objUrl)
      }
      html = html.replace(nameRegex, objUrl)
    }
  }

  // ── 6. Inject error reporter into iframe ────────────────────────────────
  const errorReporter = `<script>
window.addEventListener('error', function(e) {
  window.parent.postMessage({ type: 'preview-error', message: e.message, line: e.lineno, col: e.colno }, '*');
});
window.addEventListener('unhandledrejection', function(e) {
  window.parent.postMessage({ type: 'preview-error', message: String(e.reason), line: 0, col: 0 }, '*');
});
</script>`

  if (html.includes('<head>')) {
    html = html.replace('<head>', `<head>\n${errorReporter}`)
  } else if (html.includes('<html>')) {
    html = html.replace('<html>', `<html>\n${errorReporter}`)
  } else {
    html = errorReporter + '\n' + html
  }

  return { html, hasHtml: true }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
