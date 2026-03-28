/**
 * Prettier formatting utility for code editor.
 * Uses dynamic imports to load Prettier and plugins only when needed.
 * Supports HTML, CSS, JavaScript, TypeScript, JSON, Markdown.
 */

export type ParserType = 'html' | 'css' | 'javascript' | 'typescript' | 'json' | 'markdown' | null

// Cache for loaded Prettier instance
let prettierInstance: typeof import('prettier') | null = null
let pluginsCache: Map<string, unknown[]> = new Map()

/**
 * Get the appropriate Prettier parser based on file extension.
 */
export function getParserForFile(filename: string): ParserType {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  
  switch (ext) {
    case 'html':
    case 'htm':
      return 'html'
    case 'css':
      return 'css'
    case 'js':
    case 'mjs':
    case 'cjs':
      return 'javascript'
    case 'ts':
    case 'tsx':
      return 'typescript'
    case 'jsx':
      return 'javascript'
    case 'json':
      return 'json'
    case 'md':
    case 'markdown':
      return 'markdown'
    default:
      return null
  }
}

/**
 * Dynamically load Prettier and its plugins.
 */
async function loadPrettier() {
  if (prettierInstance) return prettierInstance
  
  try {
    // Dynamic import for Prettier
    prettierInstance = await import('prettier')
    return prettierInstance
  } catch (error) {
    console.error('Failed to load Prettier:', error)
    throw new Error('Prettier is not installed. Run: npm install prettier')
  }
}

/**
 * Get the appropriate Prettier plugins for a parser.
 */
async function getPluginsForParser(parser: ParserType): Promise<unknown[]> {
  if (!parser) return []
  
  // Check cache first
  if (pluginsCache.has(parser)) {
    return pluginsCache.get(parser)!
  }
  
  const plugins: unknown[] = []
  
  try {
    // Import Prettier plugins dynamically
    // Note: In Vite, we need to use explicit imports for plugins
    switch (parser) {
      case 'html': {
        const htmlPlugin = await import('prettier/plugins/html')
        plugins.push(htmlPlugin.default || htmlPlugin)
        break
      }
      case 'css': {
        const cssPlugin = await import('prettier/plugins/postcss')
        plugins.push(cssPlugin.default || cssPlugin)
        break
      }
      case 'javascript':
      case 'json': {
        const babelPlugin = await import('prettier/plugins/babel')
        const estreePlugin = await import('prettier/plugins/estree')
        plugins.push(babelPlugin.default || babelPlugin)
        plugins.push(estreePlugin.default || estreePlugin)
        break
      }
      case 'typescript': {
        const typescriptPlugin = await import('prettier/plugins/typescript')
        const estreePlugin = await import('prettier/plugins/estree')
        plugins.push(typescriptPlugin.default || typescriptPlugin)
        plugins.push(estreePlugin.default || estreePlugin)
        break
      }
      case 'markdown': {
        const markdownPlugin = await import('prettier/plugins/markdown')
        plugins.push(markdownPlugin.default || markdownPlugin)
        break
      }
    }
    
    // Cache the plugins
    pluginsCache.set(parser, plugins)
    return plugins
  } catch (error) {
    console.warn('Failed to load Prettier plugins:', error)
    return []
  }
}

/**
 * Format code using Prettier.
 * Returns formatted code or original content if formatting fails.
 */
export async function formatCode(content: string, filename: string): Promise<string> {
  const parser = getParserForFile(filename)
  
  if (!parser) {
    // File type not supported for formatting
    return content
  }
  
  try {
    const prettier = await loadPrettier()
    const plugins = await getPluginsForParser(parser)
    
    const formatted = await prettier.format(content, {
      parser,
      plugins,
      printWidth: 100,
      tabWidth: 2,
      useTabs: false,
      semi: false,
      singleQuote: true,
      trailingComma: 'es5',
      bracketSpacing: true,
      arrowParens: 'avoid',
      endOfLine: 'lf',
      htmlWhitespaceSensitivity: 'css',
    })
    
    return formatted
  } catch (error) {
    console.warn('Prettier format failed:', error)
    // Return original content if formatting fails
    return content
  }
}