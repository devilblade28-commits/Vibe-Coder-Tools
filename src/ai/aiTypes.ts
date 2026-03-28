/**
 * AI layer types - messages, responses, and provider config.
 * These types are pure data structures and do not import React.
 */

// ─── Provider Types ───────────────────────────────────────────────────────────

export type AIProvider = 'gemini' | 'claude' | 'openai' | 'custom'

/**
 * Configuration for the Custom provider mode
 */
export interface CustomProviderConfig {
  label: string       // e.g. "OpenRouter", "Groq", "Local Proxy"
  endpoint: string    // e.g. "https://api.openai.com/v1"
  model: string       // e.g. "claude-sonnet-4-6"
  apiKey: string
  extraHeaders: string // JSON string of extra headers (optional)
}

// ─── Chat Message Types ───────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: string
  isStreaming?: boolean
  error?: string
  actionResults?: ActionExecutionResult[]
}

// ─── AI Action Types ──────────────────────────────────────────────────────────

export type AIActionType = 'create_file' | 'update_file' | 'delete_file' | 'create_folder' | 'rename_file'

export interface AIFileAction {
  action: AIActionType
  file: string         // filename for file actions
  folder?: string      // folder name for create_folder
  content?: string     // for create_file / update_file
  newName?: string     // for rename_file
}

/**
 * Structured response from AI — parsed from JSON block in response
 */
export interface AIStructuredResponse {
  actions: AIFileAction[]
  explanation: string
}

// ─── Action Execution Types ───────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean
  error?: string
}

export interface ActionExecutionResult {
  action: AIFileAction
  success: boolean
  error?: string
}

// ─── AI State Types ───────────────────────────────────────────────────────────

export interface AIState {
  messages: ChatMessage[]
  isStreaming: boolean
  error: string | null
}

/**
 * Settings for AI provider configuration
 */
export interface AISettings {
  activeProvider: AIProvider
  activeModel: string
  apiKeys: Record<AIProvider, string>
  customInstruction: string
  customProvider: CustomProviderConfig
}