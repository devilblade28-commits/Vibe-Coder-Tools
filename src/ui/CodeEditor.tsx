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
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, dropCursor } from '@codemirror/view'
import { EditorState, Extension, Prec } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentOnInput } from '@codemirror/language'
import { javascript } from '@codemirror/lang-javascript'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { search, highlightSelectionMatches, openSearchPanel, findNext, findPrevious, replaceNext, replaceAll, closeSearchPanel, SearchQuery } from '@codemirror/search'
import { X, ChevronUp, ChevronDown, Replace } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────

interface CodeEditorProps {
  value: string
  filename: string
  onChange: (content: string) => void
  onSave?: () => void
}

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
}, { dark: true })

// ─── Language Detection ────────────────────────────────────────────────────

function getLanguageExtension(filename: string): Extension[] {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  switch (ext) {
    case 'js':
    case 'mjs':
      return [javascript()]
    case 'ts':
    case 'tsx':
      return [javascript({ typescript: true })]
    case 'jsx':
      return [javascript({ jsx: true })]
    case 'html':
    case 'htm':
      return [html()]
    case 'css':
      return [css()]
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

export function CodeEditor({ value, filename, onChange, onSave }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    replace: '',
    matchCount: 0,
  })

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

    const extensions: Extension[] = [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      history(),
      dropCursor(),
      drawSelection(),
      indentOnInput(),
      bracketMatching(),
      highlightSelectionMatches(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        indentWithTab,
      ]),
      search({ top: false }),
      darkTheme,
      updateListener,
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
      const searchQuery = new SearchQuery({ search: query })
      openSearchPanel(view, searchQuery)
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
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
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: 'auto',
          background: '#0d0d0f',
        }}
      />
    </div>
  )
}

export default CodeEditor