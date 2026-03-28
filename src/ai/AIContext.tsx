/**
 * AI Context - React state management for AI chat operations.
 * 
 * Provides:
 * - Chat messages state
 * - Streaming state
 * - Error handling
 * - Send/stop/retry operations
 */

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react'
import { v4 as uuid } from 'uuid'
import type { 
  ChatMessage, 
  AIState, 
  AIProvider, 
  AISettings,
  AIFileAction,
  ActionExecutionResult 
} from './aiTypes'
import * as localStorageService from '../storage/localStorageService'
import { sendMessage, buildSystemPrompt, PROVIDER_MODELS } from './providers'
import { executeActions, buildActionSummary } from './executeActions'

// ─── Context Types ────────────────────────────────────────────────────────────

interface AIContextValue extends AIState {
  // Settings
  settings: AISettings
  
  // Actions
  send: (text: string, context: SendContext) => Promise<void>
  stop: () => void
  retry: (context: SendContext) => void
  clearMessages: () => void
  
  // Settings management
  updateProvider: (provider: AIProvider) => void
  updateModel: (provider: AIProvider, model: string) => void
  updateApiKey: (provider: AIProvider, key: string) => void
  updateCustomInstruction: (text: string) => void
  updateCustomProvider: (config: AISettings['customProvider']) => void
  
  // Helpers
  hasApiKey: boolean
}

/**
 * Context needed for sending a message (project files, execution callback, etc.)
 */
export interface SendContext {
  projectId: string
  projectContext: string
  onActionsExecuted?: (results: ActionExecutionResult[]) => void
}

const AIContext = createContext<AIContextValue | null>(null)

// ─── Provider Component ───────────────────────────────────────────────────────

interface AIProviderProps {
  children: ReactNode
}

export function AIProvider({ children }: AIProviderProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<AISettings>(() => localStorageService.getAISettings())

  const abortRef = useRef<AbortController | null>(null)
  const lastUserMsgRef = useRef<string>('')

  // ─── Send Message ───────────────────────────────────────────────────────────

  const send = useCallback(async (text: string, context: SendContext): Promise<void> => {
    if (isStreaming) return

    setError(null)
    lastUserMsgRef.current = text

    const userMsg: ChatMessage = {
      id: uuid(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }
    const assistantMsgId = uuid()
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true,
    }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setIsStreaming(true)
    abortRef.current = new AbortController()

    const provider = settings.activeProvider
    const isCustom = provider === 'custom'
    const apiKey = isCustom ? settings.customProvider.apiKey : (settings.apiKeys[provider] ?? '')

    if (!apiKey) {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsgId
            ? { ...m, content: `⚠️ No API key set for ${provider}. Go to Settings to add your key.`, isStreaming: false }
            : m
        )
      )
      setIsStreaming(false)
      return
    }

    let fullDisplayText = ''

    try {
      const systemPrompt = buildSystemPrompt(settings.customInstruction, context.projectContext)

      const isCustomProvider = provider === 'custom'
      const result = await sendMessage({
        provider,
        model: isCustomProvider ? settings.customProvider.model : settings.activeModel,
        apiKey,
        endpoint: isCustomProvider ? settings.customProvider.endpoint : undefined,
        extraHeaders: isCustomProvider ? settings.customProvider.extraHeaders : undefined,
        messages: messages.filter(m => m.role !== 'system'),
        systemPrompt,
        onChunk: (chunk) => {
          fullDisplayText += chunk
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsgId ? { ...m, content: fullDisplayText } : m
            )
          )
        },
        signal: abortRef.current.signal,
      })

      // Execute file actions automatically
      let actionResults: ActionExecutionResult[] | undefined
      let finalContent = result.displayText || result.rawText

      if (result.structured?.actions && result.structured.actions.length > 0) {
        actionResults = await executeActions(context.projectId, result.structured.actions)
        
        // Build action summary to append
        const summary = buildActionSummary(actionResults)
        if (summary) {
          finalContent = finalContent ? `${finalContent}\n\n${summary}` : summary
        }
        
        // Notify caller about executed actions
        context.onActionsExecuted?.(actionResults)
      }

      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsgId
            ? { ...m, content: finalContent, isStreaming: false, actionResults }
            : m
        )
      )
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      if (errorMessage.includes('abort') || errorMessage.toLowerCase().includes('aborterror')) {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMsgId
              ? { ...m, content: fullDisplayText || '(stopped)', isStreaming: false }
              : m
          )
        )
      } else {
        setError(errorMessage)
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMsgId
              ? { ...m, content: fullDisplayText || 'Something went wrong.', isStreaming: false, error: errorMessage }
              : m
          )
        )
      }
    } finally {
      setIsStreaming(false)
    }
  }, [isStreaming, messages, settings])

  // ─── Stop Streaming ─────────────────────────────────────────────────────────

  const stop = useCallback((): void => {
    abortRef.current?.abort()
  }, [])

  // ─── Retry Last Message ─────────────────────────────────────────────────────

  const retry = useCallback((context: SendContext): void => {
    if (!lastUserMsgRef.current) return
    // Remove the last user+assistant pair before retrying
    setMessages(prev => {
      const lastUserIdx = [...prev].reverse().findIndex(m => m.role === 'user')
      if (lastUserIdx < 0) return prev
      const cutAt = prev.length - 1 - lastUserIdx
      return prev.slice(0, cutAt)
    })
    send(lastUserMsgRef.current, context)
  }, [send])

  // ─── Clear Messages ─────────────────────────────────────────────────────────

  const clearMessages = useCallback((): void => {
    setMessages([])
    setError(null)
  }, [])

  // ─── Settings Management ────────────────────────────────────────────────────

  const updateProvider = useCallback((provider: AIProvider): void => {
    localStorageService.setActiveProvider(provider)
    // Auto-select first model for built-in providers
    if (provider !== 'custom') {
      const group = PROVIDER_MODELS.find((g) => g.provider === provider)
      if (group) localStorageService.setActiveModel(group.models[0].value)
    }
    setSettings(localStorageService.getAISettings())
  }, [])

  const updateModel = useCallback((_provider: AIProvider, model: string): void => {
    localStorageService.setActiveModel(model)
    setSettings(localStorageService.getAISettings())
  }, [])

  const updateApiKey = useCallback((provider: AIProvider, key: string): void => {
    localStorageService.setApiKey(provider, key)
    setSettings(localStorageService.getAISettings())
  }, [])

  const updateCustomInstruction = useCallback((text: string): void => {
    localStorageService.setCustomInstruction(text)
    setSettings(localStorageService.getAISettings())
  }, [])

  const updateCustomProvider = useCallback((config: AISettings['customProvider']): void => {
    localStorageService.setCustomProviderConfig(config)
    setSettings(localStorageService.getAISettings())
  }, [])

  // ─── Context Value ──────────────────────────────────────────────────────────

  const hasApiKey = Boolean(
    settings.activeProvider === 'custom' 
      ? settings.customProvider.apiKey 
      : settings.apiKeys[settings.activeProvider]
  )

  const value: AIContextValue = {
    // State
    messages,
    isStreaming,
    error,
    settings,
    
    // Actions
    send,
    stop,
    retry,
    clearMessages,
    
    // Settings management
    updateProvider,
    updateModel,
    updateApiKey,
    updateCustomInstruction,
    updateCustomProvider,
    
    // Helpers
    hasApiKey,
  }

  return (
    <AIContext.Provider value={value}>
      {children}
    </AIContext.Provider>
  )
}

// ─── Custom Hook ──────────────────────────────────────────────────────────────

/**
 * Hook to access the AI context.
 * Throws an error if used outside of AIProvider.
 */
export function useAI(): AIContextValue {
  const context = useContext(AIContext)
  if (!context) {
    throw new Error('useAI must be used within an AIProvider')
  }
  return context
}

// ─── Exports ───────────────────────────────────────────────────────────────────

export { AIContext }