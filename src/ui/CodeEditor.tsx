/**
 * CodeEditor - CodeMirror 6-based code editor with syntax highlighting and find/replace.
 *
 * Features:
 * - Syntax highlighting for web languages (HTML, CSS, JS, TS, JSON, MD)
 * - Dark theme matching app's UI (#0d0d0f background, #d4d4d8 text)
 * - Line numbers
 * - Tab key indentation
 * - Find & Replace panel (Cmd/Ctrl+F)
 * - Debounced onChange (300ms)
 * - Code folding (fold/unfold code blocks)
 * - Auto-close brackets
 * - Symbol toolbar for mobile
 * - Format code with Prettier
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { useAI } from '../ai/AIContext'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, dropCursor, ViewPlugin, Decoration, WidgetType } from '@codemirror/view'
import { EditorState, Extension, Prec, RangeSetBuilder } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab, undo, redo } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentOnInput, foldGutter, foldKeymap, codeFolding } from '@codemirror/language'
import { javascript } from '@codemirror/lang-javascript'
import { html, htmlCompletionSource } from '@codemirror/lang-html'
import { css, cssCompletionSource } from '@codemirror/lang-css'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { search, highlightSelectionMatches, openSearchPanel, findNext, findPrevious, replaceNext, replaceAll, closeSearchPanel, SearchQuery } from '@codemirror/search'
import { autocompletion, completeFromList, Completion, CompletionContext } from '@codemirror/autocomplete'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { X, ChevronUp, ChevronDown, Replace, Sparkles, Check, Loader2 } from 'lucide-react'
import { formatCode, getParserForFile } from '../utils/prettier'

// ─── AI Autocomplete Helper (direct fetch, no Blink SDK) ─────────────────

async function fetchAICompletion({
  provider,
  model,
  apiKey,
  endpoint,
  extraHeaders,
  lang,
  before,
  after,
}: {
  provider: string
  model: string
  apiKey: string
  endpoint?: string
  extraHeaders?: string
  lang: string
  before: string
  after: string
}): Promise<string | null> {
  const prompt = `You are a code autocomplete engine. Complete the ${lang} code at the cursor position.
Return ONLY the completion text — no explanation, no markdown, no code block fences.
Keep the completion short (max 80 characters, preferably a single line).

Code before cursor:
${before}

Code after cursor:
${after}

Completion:`

  try {
    if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 80 },
        }),
      })
      if (!res.ok) return null
      const data = await res.json()
      return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null
    }

    if (provider === 'claude') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 80,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (!res.ok) return null
      const data = await res.json()
      return data?.content?.[0]?.text?.trim() ?? null
    }

    // openai or custom (OpenAI-compatible)
    const baseUrl = provider === 'custom'
      ? (endpoint ?? 'https://api.openai.com/v1').replace(/\/$/, '')
      : 'https://api.openai.com/v1'

    let extra: Record<string, string> = {}
    if (provider === 'custom' && extraHeaders?.trim()) {
      try { extra = JSON.parse(extraHeaders) } catch { /* ignore */ }
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...extra,
      },
      body: JSON.stringify({
        model,
        max_tokens: 80,
        temperature: 0.2,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.choices?.[0]?.message?.content?.trim() ?? null
  } catch {
    return null
  }
}

// ─── Types ────────────────────────────────────────────────────────────────

interface CodeEditorProps {
  value: string
  filename: string
  onChange: (content: string) => void
  onSave?: () => void
  showSymbolToolbar?: boolean
}

// Symbol groups for quick insert (mobile-friendly)
const SYMBOL_GROUPS = [
  { label: 'Brackets', symbols: ['()', '{}', '[]'] },
  { label: 'Quotes', symbols: ['""', "''", '``'] },
  { label: 'Tags', symbols: ['<>', '</>', '/>'] },
  { label: 'JS', symbols: ['=>', '===', '!==', '&&', '||', '?.', '?.'] },
  { label: 'CSS', symbols: ['#', '.', ':', ';', '{ }', '@media'] },
  { label: 'HTML', symbols: ['<div>', '<span>', '<p>', '<a>', '<img>', '<input>'] },
]

interface SearchState {
  query: string
  replace: string
  matchCount: number
}

// ─── Dark Theme ────────────────────────────────────────────────────────────

const darkTheme = EditorView.theme({
  '&': {
    backgroundColor: '#0d0d0f',
    color: '#d4d4d8',
    height: '100%',
  },
  '.cm-content': {
    caretColor: '#d4d4d8',
    fontFamily: "'Geist Mono', 'JetBrains Mono', 'Courier New', monospace",
    fontSize: '13px',
    lineHeight: '1.65',
    padding: '16px 0',
  },
  '.cm-cursor': {
    borderLeftColor: '#a855f7',
  },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: 'rgba(168, 85, 247, 0.25)',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
  },
  '.cm-gutters': {
    backgroundColor: '#0d0d0f',
    color: '#4a4a54',
    border: 'none',
    paddingRight: '8px',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 12px 0 16px',
    minWidth: '40px',
  },
  '.cm-searchMatches': {
    backgroundColor: 'rgba(250, 204, 21, 0.25)',
  },
  '.cm-searchMatch.selected': {
    backgroundColor: 'rgba(250, 204, 21, 0.5)',
  },
  // Autocomplete tooltip styling
  '.cm-tooltip': {
    backgroundColor: '#1c1c1f',
    border: '1px solid #2a2a30',
    borderRadius: '8px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
  },
  '.cm-tooltip-autocomplete': {
    '& > ul': {
      fontFamily: "'Geist Mono', 'JetBrains Mono', 'Courier New', monospace",
      fontSize: '13px',
      maxHeight: '300px',
    },
    '& > ul > li': {
      padding: '6px 12px',
      color: '#d4d4d8',
      cursor: 'pointer',
    },
    '& > ul > li[aria-selected]': {
      backgroundColor: 'rgba(168, 85, 247, 0.25)',
      color: '#f0f0f2',
    },
    '& > ul > li:hover': {
      backgroundColor: 'rgba(168, 85, 247, 0.15)',
    },
  },
  '.cm-completionLabel': {
    color: '#d4d4d8',
  },
  '.cm-completionDetail': {
    color: '#8b8b96',
    fontStyle: 'italic',
    marginLeft: '8px',
  },
  '.cm-completionIcon': {
    marginRight: '6px',
    opacity: '0.7',
  },
  '.cm-completionIcon-function, .cm-completionIcon-method': {
    color: '#a855f7',
  },
  '.cm-completionIcon-class': {
    color: '#22c55e',
  },
  '.cm-completionIcon-variable, .cm-completionIcon-property': {
    color: '#3b82f6',
  },
  '.cm-completionIcon-keyword': {
    color: '#f59e0b',
  },
}, { dark: true })

// ─── Color Preview Extension ──────────────────────────────────────────────────

// Regex to match CSS color values
const COLOR_REGEX = /#[0-9a-fA-F]{3,8}\b|rgb\([^)]*\)|rgba\([^)]*\)|hsl\([^)]*\)|hsla\([^)]*\)/g

// Widget for color preview dot
class ColorDotWidget extends WidgetType {
  constructor(readonly color: string) {
    super()
  }

  toDOM() {
    const span = document.createElement('span')
    span.style.cssText = `
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 3px;
      background: ${this.color};
      margin-left: 4px;
      vertical-align: middle;
      border: 1px solid rgba(255,255,255,0.2);
      cursor: pointer;
    `
    span.title = this.color
    // Click to copy color
    span.onclick = () => {
      navigator.clipboard.writeText(this.color)
    }
    return span
  }
}

// ViewPlugin to add color dots after color values
const colorPreviewPlugin = ViewPlugin.fromClass(class {
  decorations: any

  constructor(view: EditorView) {
    this.decorations = this.buildDecorations(view)
  }

  update(update: any) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = this.buildDecorations(update.view)
    }
  }

  buildDecorations(view: EditorView) {
    const builder = new RangeSetBuilder<any>()
    const doc = view.state.doc

    for (const { from, to } of view.visibleRanges) {
      const text = doc.sliceString(from, to)
      let match
      while ((match = COLOR_REGEX.exec(text)) !== null) {
        const start = from + match.index
        const end = start + match[0].length
        // Add widget after the color value
        builder.add(end, end, Decoration.widget({ widget: new ColorDotWidget(match[0]) }))
      }
    }

    return builder.finish()
  }
}, {
  decorations: v => v.decorations,
})

// Color preview extension (only for CSS-like files)
function getColorPreviewExtension(filename: string): Extension[] {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  if (['css', 'scss', 'less', 'html', 'htm', 'js', 'ts', 'jsx', 'tsx'].includes(ext)) {
    return [colorPreviewPlugin]
  }
  return []
}

// ─── Minimap Extension ────────────────────────────────────────────────────────

// Simple minimap showing a scaled-down version of the document
const minimapTheme = EditorView.theme({
  '.cm-minimap': {
    position: 'absolute',
    right: '0',
    top: '0',
    bottom: '0',
    width: '80px',
    background: '#0d0d0f',
    borderLeft: '1px solid #1f1f23',
    overflow: 'hidden',
    fontSize: '2px',
    lineHeight: '3px',
    fontFamily: 'monospace',
    whiteSpace: 'pre',
    padding: '4px',
    color: '#6d6d7a',
  },
})

// Check if screen is wide enough for minimap (>600px)
function shouldShowMinimap(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth > 600
}

// ─── JavaScript Completions ────────────────────────────────────────────────────

const jsKeywords: Completion[] = [
  // Keywords
  'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue',
  'debugger', 'default', 'delete', 'do', 'else', 'export', 'extends', 'false',
  'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'let',
  'new', 'null', 'return', 'static', 'super', 'switch', 'this', 'throw',
  'true', 'try', 'typeof', 'undefined', 'var', 'void', 'while', 'with', 'yield',
].map(k => ({ label: k, type: 'keyword', boost: 10 }))

const jsBuiltins: Completion[] = [
  // Built-in objects
  'Array', 'Boolean', 'Date', 'Error', 'Function', 'JSON', 'Map', 'Math',
  'Number', 'Object', 'Promise', 'Proxy', 'RegExp', 'Set', 'String', 'Symbol',
  'WeakMap', 'WeakSet', 'BigInt', 'Intl', 'Reflect',
].map(k => ({ label: k, type: 'class', boost: 8 }))

const jsGlobalFunctions: Completion[] = [
  // Global functions
  'console', 'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent',
  'eval', 'fetch', 'isFinite', 'isNaN', 'parseFloat', 'parseInt', 'setTimeout',
  'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame',
  'cancelAnimationFrame', 'alert', 'confirm', 'prompt',
].map(k => ({ label: k, type: 'function', boost: 7 }))

const jsDomApis: Completion[] = [
  // DOM APIs
  'document', 'window', 'navigator', 'location', 'history', 'localStorage',
  'sessionStorage', 'fetch', 'XMLHttpRequest', 'addEventListener', 'removeEventListener',
  'querySelector', 'querySelectorAll', 'getElementById', 'getElementsByClassName',
  'getElementsByTagName', 'createElement', 'appendChild', 'removeChild', 'insertBefore',
  'classList', 'style', 'setAttribute', 'getAttribute', 'textContent', 'innerHTML',
  'outerHTML', 'parentNode', 'childNodes', 'children', 'firstChild', 'lastChild',
  'nextSibling', 'previousSibling', 'event', 'Event', 'CustomEvent', 'MutationObserver',
  'IntersectionObserver', 'ResizeObserver', 'requestAnimationFrame',
].map(k => ({ label: k, type: 'variable', boost: 6 }))

const jsConsoleMethods: Completion[] = [
  // console methods
  'console.log', 'console.error', 'console.warn', 'console.info', 'console.debug',
  'console.table', 'console.dir', 'console.time', 'console.timeEnd', 'console.trace',
  'console.group', 'console.groupEnd', 'console.clear',
].map(k => ({ label: k, type: 'function', boost: 5 }))

const jsMathMethods: Completion[] = [
  // Math methods
  'Math.abs', 'Math.ceil', 'Math.floor', 'Math.round', 'Math.max', 'Math.min',
  'Math.random', 'Math.sqrt', 'Math.pow', 'Math.sin', 'Math.cos', 'Math.tan',
  'Math.log', 'Math.exp', 'Math.PI', 'Math.E',
].map(k => ({ label: k, type: 'function', boost: 5 }))

const jsArrayMethods: Completion[] = [
  // Array methods
  'Array.from', 'Array.isArray', 'Array.of',
].map(k => ({ label: k, type: 'function', boost: 5 }))

const jsPromiseMethods: Completion[] = [
  // Promise methods
  'Promise.all', 'Promise.race', 'Promise.allSettled', 'Promise.any',
  'Promise.resolve', 'Promise.reject',
].map(k => ({ label: k, type: 'function', boost: 5 }))

const jsObjectMethods: Completion[] = [
  // Object methods
  'Object.keys', 'Object.values', 'Object.entries', 'Object.assign',
  'Object.freeze', 'Object.seal', 'Object.create', 'Object.defineProperty',
  'Object.getOwnPropertyNames', 'Object.getPrototypeOf', 'Object.setPrototypeOf',
].map(k => ({ label: k, type: 'function', boost: 5 }))

const jsStringMethods: Completion[] = [
  // String methods (commonly used)
  '.charAt', '.charCodeAt', '.concat', '.endsWith', '.includes', '.indexOf',
  '.lastIndexOf', '.match', '.matchAll', '.padEnd', '.padStart', '.repeat',
  '.replace', '.replaceAll', '.search', '.slice', '.split', '.startsWith',
  '.substring', '.toLowerCase', '.toUpperCase', '.trim', '.trimStart', '.trimEnd',
  '.toString', '.valueOf',
].map(k => ({ label: k, type: 'method', boost: 4 }))

const jsArrayPrototypeMethods: Completion[] = [
  // Array prototype methods
  '.push', '.pop', '.shift', '.unshift', '.slice', '.splice', '.concat',
  '.join', '.reverse', '.sort', '.indexOf', '.lastIndexOf', '.includes',
  '.forEach', '.map', '.filter', '.reduce', '.reduceRight', '.some', '.every',
  '.find', '.findIndex', '.findLast', '.findLastIndex', '.flat', '.flatMap',
  '.fill', '.copyWithin', '.entries', '.keys', '.values', '.at',
].map(k => ({ label: k, type: 'method', boost: 4 }))

function createJavaScriptCompletions(context: CompletionContext) {
  const allJsCompletions = [
    ...jsKeywords,
    ...jsBuiltins,
    ...jsGlobalFunctions,
    ...jsDomApis,
    ...jsConsoleMethods,
    ...jsMathMethods,
    ...jsArrayMethods,
    ...jsPromiseMethods,
    ...jsObjectMethods,
    ...jsStringMethods,
    ...jsArrayPrototypeMethods,
  ]
  return completeFromList(allJsCompletions)(context)
}

// ─── HTML Tag Completions ──────────────────────────────────────────────────────

const htmlTags: Completion[] = [
  // Structural elements
  '!DOCTYPE', 'html', 'head', 'body', 'title', 'meta', 'link', 'style', 'script',
  // Semantic elements
  'header', 'footer', 'nav', 'main', 'section', 'article', 'aside', 'details',
  'summary', 'figure', 'figcaption', 'address', 'hgroup',
  // Headings
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  // Text elements
  'p', 'span', 'a', 'strong', 'em', 'b', 'i', 'u', 's', 'strike', 'del', 'ins',
  'mark', 'small', 'big', 'sub', 'sup', 'abbr', 'cite', 'code', 'kbd', 'samp',
  'var', 'dfn', 'time', 'q', 'blockquote', 'pre', 'br', 'wbr',
  // Lists
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  // Tables
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  // Forms
  'form', 'input', 'textarea', 'select', 'option', 'optgroup', 'button', 'label',
  'fieldset', 'legend', 'datalist', 'output', 'progress', 'meter',
  // Media
  'img', 'picture', 'source', 'video', 'audio', 'track', 'iframe', 'embed',
  'object', 'param', 'canvas', 'svg', 'math',
  // Interactive
  'details', 'summary', 'dialog', 'menu',
  // Deprecated/legacy (still useful)
  'center', 'font', 'hr', 'div',
].map(tag => ({ label: tag, type: 'property', boost: 10 }))

const htmlAttributes: Completion[] = [
  // Global attributes
  'id', 'class', 'style', 'title', 'lang', 'dir', 'tabindex', 'accesskey',
  'hidden', 'contenteditable', 'draggable', 'spellcheck', 'translate',
  'data-', 'role', 'aria-label', 'aria-labelledby', 'aria-describedby',
  'aria-hidden', 'aria-live', 'aria-expanded', 'aria-controls', 'aria-checked',
  // Event handlers
  'onclick', 'ondblclick', 'onmousedown', 'onmouseup', 'onmouseover',
  'onmouseout', 'onmousemove', 'onmouseenter', 'onmouseleave',
  'onkeydown', 'onkeyup', 'onkeypress', 'onfocus', 'onblur', 'onchange',
  'oninput', 'onsubmit', 'onreset', 'onselect', 'onload', 'onunload',
  'onerror', 'onresize', 'onscroll',
  // Link/form attributes
  'href', 'target', 'rel', 'download', 'hreflang', 'type', 'name', 'value',
  'placeholder', 'required', 'disabled', 'readonly', 'checked', 'selected',
  'multiple', 'accept', 'autocomplete', 'autofocus', 'form', 'formaction',
  'formenctype', 'formmethod', 'formnovalidate', 'formtarget', 'list',
  'max', 'min', 'step', 'pattern', 'maxlength', 'minlength', 'size',
  // Media attributes
  'src', 'alt', 'width', 'height', 'srcset', 'sizes', 'loading', 'decoding',
  'controls', 'autoplay', 'loop', 'muted', 'preload', 'poster', 'playsinline',
  // Meta attributes
  'charset', 'content', 'http-equiv', 'property',
  // Table attributes
  'colspan', 'rowspan', 'headers', 'scope',
].map(attr => ({ label: attr, type: 'property', boost: 9 }))

function createHtmlCompletions(context: CompletionContext) {
  // First try the built-in HTML completion source
  const builtIn = htmlCompletionSource(context)
  if (builtIn) return builtIn

  // Fall back to our custom completions
  return completeFromList([...htmlTags, ...htmlAttributes])(context)
}

// ─── CSS Completions ────────────────────────────────────────────────────────

const cssProperties: Completion[] = [
  // Layout
  'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index',
  'float', 'clear', 'visibility', 'overflow', 'overflow-x', 'overflow-y',
  'clip', 'clip-path',
  // Flexbox
  'flex', 'flex-direction', 'flex-wrap', 'flex-flow', 'justify-content',
  'align-items', 'align-content', 'align-self', 'order', 'flex-grow',
  'flex-shrink', 'flex-basis', 'gap', 'row-gap', 'column-gap',
  // Grid
  'grid', 'grid-template', 'grid-template-rows', 'grid-template-columns',
  'grid-template-areas', 'grid-row', 'grid-column', 'grid-area',
  'grid-auto-rows', 'grid-auto-columns', 'grid-auto-flow', 'place-items',
  'place-content', 'place-self',
  // Box model
  'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border', 'border-width', 'border-style', 'border-color',
  'border-top', 'border-right', 'border-bottom', 'border-left',
  'border-radius', 'border-top-left-radius', 'border-top-right-radius',
  'border-bottom-left-radius', 'border-bottom-right-radius',
  'box-sizing', 'box-shadow', 'outline', 'outline-width', 'outline-style',
  'outline-color', 'outline-offset',
  // Typography
  'font', 'font-family', 'font-size', 'font-weight', 'font-style',
  'font-variant', 'font-stretch', 'line-height', 'letter-spacing',
  'word-spacing', 'text-align', 'text-decoration', 'text-transform',
  'text-indent', 'text-shadow', 'text-overflow', 'white-space',
  'word-break', 'word-wrap', 'overflow-wrap', 'hyphens',
  'vertical-align', 'color',
  // Background
  'background', 'background-color', 'background-image', 'background-position',
  'background-size', 'background-repeat', 'background-origin',
  'background-clip', 'background-attachment',
  // Effects
  'opacity', 'filter', 'backdrop-filter', 'mix-blend-mode', 'isolation',
  'transform', 'transform-origin', 'transform-style', 'perspective',
  'perspective-origin', 'scale', 'rotate', 'translate', 'will-change',
  // Transitions & Animations
  'transition', 'transition-property', 'transition-duration',
  'transition-timing-function', 'transition-delay',
  'animation', 'animation-name', 'animation-duration', 'animation-timing-function',
  'animation-delay', 'animation-iteration-count', 'animation-direction',
  'animation-fill-mode', 'animation-play-state',
  // Other
  'cursor', 'pointer-events', 'user-select', 'resize', 'appearance',
  'content', 'quotes', 'counter-reset', 'counter-increment',
  'list-style', 'list-style-type', 'list-style-position', 'list-style-image',
  'object-fit', 'object-position', 'aspect-ratio', 'scroll-behavior',
  'scroll-snap-type', 'scroll-snap-align',
].map(prop => ({ label: prop, type: 'property', boost: 10 }))

const cssValues: Completion[] = [
  // Common values
  'inherit', 'initial', 'unset', 'revert', 'auto', 'none', 'normal',
  // Display values
  'block', 'inline', 'inline-block', 'flex', 'grid', 'inline-flex', 'inline-grid',
  'table', 'table-row', 'table-cell', 'list-item', 'contents', 'flow-root',
  // Position values
  'static', 'relative', 'absolute', 'fixed', 'sticky',
  // Flex values
  'row', 'row-reverse', 'column', 'column-reverse', 'nowrap', 'wrap', 'wrap-reverse',
  'flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly',
  'stretch', 'baseline',
  // Common sizes
  '100%', '50%', '25%', '75%', '100vh', '100vw', '100dvh', '100svh',
  'fit-content', 'max-content', 'min-content', 'fill-available',
  // Colors
  'transparent', 'currentColor', 'black', 'white', 'red', 'green', 'blue',
  'yellow', 'orange', 'purple', 'pink', 'gray', 'grey', 'silver',
  // Common colors (tailwind-ish)
  'primary', 'secondary', 'accent', 'muted', 'destructive',
  // Border style
  'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset',
  // Text alignment
  'left', 'right', 'center', 'justify', 'start', 'end',
  // Font
  'bold', 'bolder', 'lighter', 'italic', 'oblique', 'normal',
  'small-caps', 'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy',
  // Overflow
  'hidden', 'visible', 'scroll', 'auto',
  // Cursor
  'pointer', 'default', 'text', 'move', 'not-allowed', 'wait', 'crosshair',
  'grab', 'grabbing', 'zoom-in', 'zoom-out',
  // Transitions
  'ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear', 'step-start', 'step-end',
  // Animation direction
  'normal', 'reverse', 'alternate', 'alternate-reverse',
  // Object fit
  'cover', 'contain', 'fill', 'scale-down',
  // Other
  'both', 'forwards', 'backwards', 'infinite', 'paused', 'running',
].map(val => ({ label: val, type: 'variable', boost: 8 }))

const cssUnits: Completion[] = [
  // Length units (these are often typed directly after numbers, but included for reference)
  'px', 'em', 'rem', 'vh', 'vw', 'vmin', 'vmax', '%', 'ch', 'ex', 'lh',
  'cm', 'mm', 'in', 'pt', 'pc', 'fr', 'deg', 'rad', 'grad', 'turn',
  's', 'ms', 'Hz', 'kHz',
].map(unit => ({ label: unit, type: 'unit', boost: 7 }))

function createCssCompletions(context: CompletionContext) {
  // First try the built-in CSS completion source
  const builtIn = cssCompletionSource(context)
  if (builtIn) return builtIn

  // Fall back to our custom completions
  return completeFromList([...cssProperties, ...cssValues, ...cssUnits])(context)
}

// ─── Language Detection ────────────────────────────────────────────────────

function getLanguageExtension(filename: string): Extension[] {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  switch (ext) {
    case 'js':
    case 'mjs':
      return [
        javascript(),
        autocompletion({
          override: [createJavaScriptCompletions],
          activateOnTyping: true,
          maxRenderedOptions: 50,
        }),
        ...getColorPreviewExtension(filename)
      ]
    case 'ts':
    case 'tsx':
      return [
        javascript({ typescript: true }),
        autocompletion({
          override: [createJavaScriptCompletions],
          activateOnTyping: true,
          maxRenderedOptions: 50,
        }),
        ...getColorPreviewExtension(filename)
      ]
    case 'jsx':
      return [
        javascript({ jsx: true }),
        autocompletion({
          override: [createJavaScriptCompletions, createHtmlCompletions],
          activateOnTyping: true,
          maxRenderedOptions: 50,
        }),
        ...getColorPreviewExtension(filename)
      ]
    case 'html':
    case 'htm':
      return [
        html(),
        autocompletion({
          override: [createHtmlCompletions],
          activateOnTyping: true,
          maxRenderedOptions: 50,
        }),
        ...getColorPreviewExtension(filename)
      ]
    case 'css':
      return [
        css(),
        autocompletion({
          override: [createCssCompletions],
          activateOnTyping: true,
          maxRenderedOptions: 50,
        }),
        ...getColorPreviewExtension(filename)
      ]
    case 'json':
      return [json()]
    case 'md':
    case 'markdown':
      return [markdown()]
    default:
      return []
  }
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function CodeEditor({ value, filename, onChange, onSave, showSymbolToolbar = true }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [isFormatting, setIsFormatting] = useState(false)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    replace: '',
    matchCount: 0,
  })
  const parser = getParserForFile(filename)

  // Inline AI Autocomplete state
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [isFetchingSuggestion, setIsFetchingSuggestion] = useState(false)
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced onChange (300ms)
  const debouncedOnChange = useCallback((content: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      onChange(content)
    }, 300)
  }, [onChange])

  // Create editor instance
  useEffect(() => {
    if (!containerRef.current) return

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        debouncedOnChange(update.state.doc.toString())
      }
    })

    const saveKeymap = Prec.highest(keymap.of([{
      key: 'Mod-s',
      run: (view) => {
        onSave?.()
        return true
      },
    }]))

    // Cmd/Ctrl+F handler
    const searchKeymapHandler = Prec.highest(keymap.of([{
      key: 'Mod-f',
      run: (view) => {
        setShowSearch(true)
        return true
      },
    }]))

    // Escape handler
    const escapeKeymap = Prec.highest(keymap.of([{
      key: 'Escape',
      run: (view) => {
        if (showSearch) {
          setShowSearch(false)
          closeSearchPanel(view)
          return true
        }
        return false
      },
    }]))

    // Update undo/redo state
    const updateUndoRedoState = EditorView.updateListener.of((update) => {
      if (update.transactions.some(t => t.docChanged)) {
        // Check if undo/redo is available via the history extension
        // We use a simpler approach: track if there are any changes to undo/redo
        try {
          const state = update.state
          // Try to find history state through any available method
          const historyData = (state as any).history$undo
          if (historyData) {
            setCanUndo((historyData as any).done?.length > 0)
            setCanRedo((historyData as any).undone?.length > 0)
          }
        } catch {
          // Fallback: just assume undo is available after any change
          setCanUndo(true)
        }
      }
    })

    const extensions: Extension[] = [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      history(),
      dropCursor(),
      drawSelection(),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      highlightSelectionMatches(),
      codeFolding(),
      foldGutter({
        openText: '▾',
        closedText: '▸',
        markerDOM: (open) => {
          const span = document.createElement('span')
          span.textContent = open ? '▾' : '▸'
          span.style.cursor = 'pointer'
          span.style.opacity = '0.5'
          return span
        }
      }),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...closeBracketsKeymap,
        ...foldKeymap,
        indentWithTab,
      ]),
      search({ top: false }),
      darkTheme,
      ...getColorPreviewExtension(filename),
      shouldShowMinimap() ? minimapTheme : [],
      updateListener,
      updateUndoRedoState,
      saveKeymap,
      searchKeymapHandler,
      escapeKeymap,
      ...getLanguageExtension(filename),
    ]

    const state = EditorState.create({
      doc: value,
      extensions,
    })

    const view = new EditorView({
      state,
      parent: containerRef.current,
    })

    viewRef.current = view

    // Expose CodeMirror commands globally for SymbolToolbar
    if (typeof window !== 'undefined') {
      window.__CM = {
        undo: () => undo(view),
        redo: () => redo(view),
        cursorLineUp: () => cursorLineUp(view),
        cursorLineDown: () => cursorLineDown(view),
      }
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      view.destroy()
      viewRef.current = null
    }
  }, [filename]) // Re-create on filename change only

  // Update document when value changes externally
  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    const currentValue = view.state.doc.toString()
    if (value !== currentValue) {
      view.dispatch({
        changes: { from: 0, to: currentValue.length, insert: value },
      })
    }
  }, [value])

  // Event listeners for SymbolToolbar custom events
  useEffect(() => {
    const handleInsert = (e: Event) => {
      const sym = (e as CustomEvent).detail as string
      if (!viewRef.current) return
      const state = viewRef.current.state
      const cursor = state.selection.main.head
      viewRef.current.dispatch({
        changes: { from: cursor, insert: sym },
        selection: { anchor: cursor + sym.length },
      })
      viewRef.current.focus()
    }

    const handleMoveUp = () => {
      if (!viewRef.current) return
      const CM = (window as any).__CM
      if (CM?.cursorLineUp) CM.cursorLineUp(viewRef.current)
    }

    const handleMoveDown = () => {
      if (!viewRef.current) return
      const CM = (window as any).__CM
      if (CM?.cursorLineDown) CM.cursorLineDown(viewRef.current)
    }

    const handleUndo = () => {
      if (!viewRef.current) return
      const CM = (window as any).__CM
      if (CM?.undo) CM.undo(viewRef.current)
    }

    const handleRedo = () => {
      if (!viewRef.current) return
      const CM = (window as any).__CM
      if (CM?.redo) CM.redo(viewRef.current)
    }

    document.addEventListener('cm-insert', handleInsert)
    document.addEventListener('cm-move-up', handleMoveUp)
    document.addEventListener('cm-move-down', handleMoveDown)
    document.addEventListener('cm-undo', handleUndo)
    document.addEventListener('cm-redo', handleRedo)

    return () => {
      document.removeEventListener('cm-insert', handleInsert)
      document.removeEventListener('cm-move-up', handleMoveUp)
      document.removeEventListener('cm-move-down', handleMoveDown)
      document.removeEventListener('cm-undo', handleUndo)
      document.removeEventListener('cm-redo', handleRedo)
    }
  }, [])

  // Search panel handlers
  const handleFindNext = useCallback(() => {
    const view = viewRef.current
    if (!view || !searchState.query) return
    findNext(view)
  }, [searchState.query])

  const handleFindPrevious = useCallback(() => {
    const view = viewRef.current
    if (!view || !searchState.query) return
    findPrevious(view)
  }, [searchState.query])

  const handleReplace = useCallback(() => {
    const view = viewRef.current
    if (!view || !searchState.query) return
    replaceNext(view)
  }, [searchState.query])

  const handleReplaceAll = useCallback(() => {
    const view = viewRef.current
    if (!view || !searchState.query) return
    replaceAll(view)
  }, [searchState.query])

  const handleSearchChange = useCallback((query: string) => {
    const view = viewRef.current
    if (!view) return

    setSearchState(prev => ({ ...prev, query }))

    if (query) {
      // Open search panel - the panel handles the query internally
      openSearchPanel(view)
    } else {
      closeSearchPanel(view)
    }
  }, [])

  const handleReplaceChange = useCallback((replace: string) => {
    setSearchState(prev => ({ ...prev, replace }))
  }, [])

  const handleCloseSearch = useCallback(() => {
    setShowSearch(false)
    const view = viewRef.current
    if (view) {
      closeSearchPanel(view)
    }
  }, [])

  // Handle format with Prettier
  const handleFormat = useCallback(async () => {
    if (isFormatting || !parser) return

    setIsFormatting(true)
    try {
      const formatted = await formatCode(value, filename)
      if (formatted !== value) {
        onChange(formatted)
      }
    } finally {
      setIsFormatting(false)
    }
  }, [value, filename, parser, isFormatting, onChange])

  // Handle undo/redo
  const handleUndo = useCallback(() => {
    const view = viewRef.current
    if (!view) return
    undo(view)
  }, [])

  const handleRedo = useCallback(() => {
    const view = viewRef.current
    if (!view) return
    redo(view)
  }, [])

  // Insert symbol at cursor position
  const handleInsertSymbol = useCallback((symbol: string) => {
    const view = viewRef.current
    if (!view) return

    // Handle paired symbols (cursor goes in middle)
    const paired: Record<string, string> = {
      '()': '()',
      '{}': '{}',
      '[]': '[]',
      '""': '""',
      "''": "''",
      '``': '``',
      '<>': '<>',
    }

    const isPaired = paired[symbol]

    if (isPaired) {
      // Insert both characters and place cursor in middle
      const { from, to } = view.state.selection.main
      view.dispatch({
        changes: { from, to, insert: symbol },
        selection: { anchor: from + symbol.length / 2 }
      })
    } else {
      // Insert single symbol
      const { from, to } = view.state.selection.main
      view.dispatch({
        changes: { from, to, insert: symbol },
        selection: { anchor: from + symbol.length }
      })
    }
    view.focus()
  }, [])

  const { settings } = useAI()

  // Fetch AI suggestion for inline autocomplete — direct fetch to user's provider, no Blink SDK
  const fetchSuggestion = useCallback(async (currentCode: string, cursorPosition: number) => {
    // Only fetch for supported file types
    if (!parser || !['html', 'css', 'javascript', 'typescript'].includes(parser)) return

    const provider = settings.activeProvider
    const isCustom = provider === 'custom'
    const apiKey = isCustom ? settings.customProvider.apiKey : (settings.apiKeys[provider] ?? '')

    // Skip if user has no API key configured
    if (!apiKey) return

    // Pick a fast/cheap model for autocomplete
    let model = isCustom ? settings.customProvider.model : settings.activeModel
    // Override to cheaper model if on openai to save credits
    if (provider === 'openai' && !isCustom) model = 'gpt-4o-mini'
    // Use flash for Gemini
    if (provider === 'gemini' && !isCustom) model = 'gemini-2.0-flash'

    // Get context: 300 chars before cursor, 100 after
    const before = currentCode.substring(Math.max(0, cursorPosition - 300), cursorPosition)
    const after = currentCode.substring(cursorPosition, cursorPosition + 100)

    // Skip if not enough context
    if (before.trim().length < 10) return

    setIsFetchingSuggestion(true)

    try {
      const text = await fetchAICompletion({
        provider,
        model,
        apiKey,
        endpoint: isCustom ? settings.customProvider.endpoint : undefined,
        extraHeaders: isCustom ? settings.customProvider.extraHeaders : undefined,
        lang: parser,
        before,
        after,
      })

      if (text && text.length > 0 && text.length < 200) {
        // Strip any accidental markdown fences
        const clean = text.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim()
        if (clean) setSuggestion(clean)
        else setSuggestion(null)
      } else {
        setSuggestion(null)
      }
    } catch {
      // Silent fail — autocomplete is non-critical
      setSuggestion(null)
    } finally {
      setIsFetchingSuggestion(false)
    }
  }, [parser, settings])

  // Accept suggestion
  const handleAcceptSuggestion = useCallback(() => {
    if (!suggestion || !viewRef.current) return

    const view = viewRef.current
    const { from } = view.state.selection.main

    view.dispatch({
      changes: { from, to: from, insert: suggestion },
      selection: { anchor: from + suggestion.length },
    })

    setSuggestion(null)
    view.focus()
  }, [suggestion])

  // Dismiss suggestion
  const handleDismissSuggestion = useCallback(() => {
    setSuggestion(null)
  }, [])

  // Check if symbol toolbar should be shown (only for web files)
  const showSymbols = showSymbolToolbar && parser && ['html', 'css', 'javascript', 'typescript'].includes(parser)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Symbol Toolbar - Mobile friendly quick insert */}
      {showSymbols && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '6px 8px',
          background: '#0d0d0f',
          borderBottom: '1px solid #1f1f23',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          flexShrink: 0,
        }}>
          {SYMBOL_GROUPS.map((group) => (
            <div key={group.label} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <span style={{
                fontSize: '9px',
                color: '#4a4a54',
                padding: '0 4px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {group.label}
              </span>
              {group.symbols.map((symbol) => (
                <button
                  key={symbol}
                  onClick={() => handleInsertSymbol(symbol)}
                  title={`Insert ${symbol}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '28px',
                    height: '26px',
                    padding: '0 6px',
                    background: '#1c1c1f',
                    border: '1px solid #2a2a30',
                    borderRadius: '4px',
                    color: '#8b8b96',
                    fontSize: '11px',
                    fontFamily: "'Geist Mono', monospace",
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {symbol}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Editor Toolbar - Format, Undo/Redo */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 10px',
        background: '#141416',
        borderBottom: '1px solid #1f1f23',
        flexShrink: 0,
      }}>
        {/* Undo/Redo buttons */}
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          title="Undo (Cmd/Ctrl+Z)"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            padding: 0,
            background: 'transparent',
            border: '1px solid #2a2a30',
            borderRadius: '6px',
            color: canUndo ? '#8b8b96' : '#3d3d45',
            cursor: canUndo ? 'pointer' : 'not-allowed',
            opacity: canUndo ? 1 : 0.5,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
          </svg>
        </button>
        <button
          onClick={handleRedo}
          disabled={!canRedo}
          title="Redo (Cmd/Ctrl+Shift+Z)"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            padding: 0,
            background: 'transparent',
            border: '1px solid #2a2a30',
            borderRadius: '6px',
            color: canRedo ? '#8b8b96' : '#3d3d45',
            cursor: canRedo ? 'pointer' : 'not-allowed',
            opacity: canRedo ? 1 : 0.5,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 7v6h-6" />
            <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
          </svg>
        </button>

        <div style={{ width: '1px', height: '20px', background: '#2a2a30', margin: '0 4px' }} />

        {/* Find/Replace toggle */}
        <button
          onClick={() => setShowSearch(!showSearch)}
          title="Find & Replace (Cmd/Ctrl+F)"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '28px',
            padding: '0 10px',
            background: showSearch ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
            border: '1px solid #2a2a30',
            borderRadius: '6px',
            color: showSearch ? '#a855f7' : '#8b8b96',
            fontSize: '11px',
            fontWeight: 500,
            cursor: 'pointer',
            gap: '4px',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          Find
        </button>

        {/* Format button - only show for supported files */}
        {parser && (
          <button
            onClick={handleFormat}
            disabled={isFormatting}
            title="Format code with Prettier"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              height: '28px',
              padding: '0 10px',
              background: 'transparent',
              border: '1px solid #2a2a30',
              borderRadius: '6px',
              color: isFormatting ? '#4a4a54' : '#8b8b96',
              fontSize: '11px',
              fontWeight: 500,
              cursor: isFormatting ? 'not-allowed' : 'pointer',
              opacity: isFormatting ? 0.6 : 1,
            }}
          >
            {isFormatting ? (
              <>
                <div style={{
                  width: '10px',
                  height: '10px',
                  border: '1.5px solid #4a4a54',
                  borderTopColor: '#a855f7',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                Formatting…
              </>
            ) : (
              <>
                <Sparkles size={12} />
                Format
              </>
            )}
          </button>
        )}
      </div>

      {/* Search Panel */}
      {showSearch && (
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          background: '#1c1c1f',
          border: '1px solid #2a2a30',
          borderRadius: '8px',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 100,
          marginRight: '16px',
          marginTop: '8px',
        }}>
          <input
            type="text"
            placeholder="Find"
            value={searchState.query}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{
              width: '140px',
              background: '#0d0d0f',
              border: '1px solid #2a2a30',
              borderRadius: '6px',
              padding: '6px 10px',
              color: '#f0f0f2',
              fontSize: '12px',
              outline: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Replace"
            value={searchState.replace}
            onChange={(e) => handleReplaceChange(e.target.value)}
            style={{
              width: '140px',
              background: '#0d0d0f',
              border: '1px solid #2a2a30',
              borderRadius: '6px',
              padding: '6px 10px',
              color: '#f0f0f2',
              fontSize: '12px',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={handleFindPrevious}
              title="Find Previous"
              style={{
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#242428',
                border: '1px solid #2a2a30',
                borderRadius: '6px',
                color: '#8b8b96',
                cursor: 'pointer',
              }}
            >
              <ChevronUp size={14} />
            </button>
            <button
              onClick={handleFindNext}
              title="Find Next"
              style={{
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#242428',
                border: '1px solid #2a2a30',
                borderRadius: '6px',
                color: '#8b8b96',
                cursor: 'pointer',
              }}
            >
              <ChevronDown size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={handleReplace}
              title="Replace"
              style={{
                height: '28px',
                padding: '0 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                background: '#242428',
                border: '1px solid #2a2a30',
                borderRadius: '6px',
                color: '#8b8b96',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              <Replace size={12} />
              Replace
            </button>
            <button
              onClick={handleReplaceAll}
              title="Replace All"
              style={{
                height: '28px',
                padding: '0 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#242428',
                border: '1px solid #2a2a30',
                borderRadius: '6px',
                color: '#8b8b96',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              All
            </button>
          </div>
          <button
            onClick={handleCloseSearch}
            title="Close (Escape)"
            style={{
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: '#6d6d7a',
              cursor: 'pointer',
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Editor Container */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        <div
          ref={containerRef}
          style={{
            flex: 1,
            overflow: 'auto',
            background: '#0d0d0f',
          }}
        />

        {/* Ghost text suggestion overlay */}
        {suggestion && (
          <div style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            background: '#1c1c1f',
            border: '1px solid #a855f7',
            borderRadius: '8px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            maxWidth: '300px',
            zIndex: 100,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}>
            {isFetchingSuggestion ? (
              <Loader2 size={14} style={{ color: '#a855f7', animation: 'spin 0.8s linear infinite' }} />
            ) : (
              <Sparkles size={14} style={{ color: '#a855f7' }} />
            )}
            <span style={{
              fontFamily: "'Geist Mono', monospace",
              fontSize: '12px',
              color: '#8b8b96',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {suggestion}
            </span>
            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
              <button
                onClick={handleAcceptSuggestion}
                title="Accept (Tab)"
                style={{
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#a855f7',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                <Check size={12} />
              </button>
              <button
                onClick={handleDismissSuggestion}
                title="Dismiss (Escape)"
                style={{
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  border: '1px solid #2a2a30',
                  borderRadius: '4px',
                  color: '#6d6d7a',
                  cursor: 'pointer',
                }}
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Minimap for wider screens */}
        {shouldShowMinimap() && (
          <div style={{
            width: '80px',
            background: '#0d0d0f',
            borderLeft: '1px solid #1f1f23',
            overflow: 'hidden',
            fontSize: '2px',
            lineHeight: '3px',
            fontFamily: 'monospace',
            whiteSpace: 'pre',
            padding: '4px',
            color: '#4a4a54',
            userSelect: 'none',
            cursor: 'pointer',
          }}>
            {value.split('\n').slice(0, 100).map((line, i) => (
              <div key={i} style={{ overflow: 'hidden', textOverflow: 'clip' }}>
                {line.slice(0, 40) || ' '}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default CodeEditor
