/**
 * AI Layer - AI chat, providers, and action execution.
 * 
 * This layer handles all AI-related functionality:
 * - Chat message management
 * - AI provider abstraction (Gemini, Claude, OpenAI, Custom)
 * - File action execution
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type {
  AIProvider,
  CustomProviderConfig,
  MessageRole,
  ChatMessage,
  AIActionType,
  AIFileAction,
  AIStructuredResponse,
  ValidationResult,
  ActionExecutionResult,
  AIState,
  AISettings,
} from './aiTypes'

// ─── Context ──────────────────────────────────────────────────────────────────

export { AIProvider as AIContextProvider, useAI, type SendContext } from './AIContext'

// ─── Services ─────────────────────────────────────────────────────────────────

export {
  sendMessage,
  buildSystemPrompt,
  parseStructuredResponse,
  buildDisplayText,
  buildCustomProviderParams,
  PROVIDER_MODELS,
  DEFAULT_MODELS,
  API_KEY_LINKS,
  type SendMessageParams,
  type AIResponse,
} from './providers'

export {
  executeActions,
  validateAction,
  buildActionSummary,
} from './executeActions'