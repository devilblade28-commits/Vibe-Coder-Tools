/**
 * AI Provider — universal adapter layer.
 *
 * Supports:
 *   - Google Gemini (native SSE)
 *   - Anthropic Claude (native SSE)
 *   - OpenAI (native SSE)
 *   - Custom / OpenAI-compatible endpoint
 *
 * All providers go through:
 *   normalizeProviderRequest()  → builds the fetch config
 *   streamSSE() / parseSSE()    → extracts text deltas
 *   parseStructuredResponse()   → extracts file actions from final text
 *   buildDisplayText()          → strips JSON from user-visible output
 */

import type { AIProvider, AIFileAction, CustomProviderConfig } from '../types'
import type { ChatMessage, AIStructuredResponse } from '../types'

// ─── Updated built-in model presets ──────────────────────────────────────────

export const PROVIDER_MODELS: {
  provider: Exclude<AIProvider, 'custom'>
  label: string
  color: string
  models: { value: string; label: string; description?: string }[]
}[] = [
  {
    provider: 'gemini',
    label: 'Google Gemini',
    color: '#4285f4',
    models: [
      { value: 'gemini-2.5-flash',          label: 'Gemini 2.5 Flash',    description: 'recommended for coding fallback' },
      { value: 'gemini-2.5-pro',            label: 'Gemini 2.5 Pro',      description: 'stable fallback' },
      { value: 'gemini-3-flash-preview',    label: 'Gemini 3 Flash',      description: 'stable, fast' },
      { value: 'gemini-3.1-flash',          label: 'Gemini 3.1 Flash',    description: 'latest, fast, frontier-class' },
      { value: 'gemini-3.1-pro-preview',    label: 'Gemini 3.1 Pro',      description: 'latest, most powerful' },
    ],
  },
  {
    provider: 'claude',
    label: 'Anthropic Claude',
    color: '#d97706',
    models: [
      { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5',   description: 'fast and cheaper' },
      { value: 'claude-sonnet-4-6',         label: 'Claude Sonnet 4.6',  description: 'latest, balanced, strong for coding' },
      { value: 'claude-opus-4-6',           label: 'Claude Opus 4.6',    description: 'latest, most powerful' },
    ],
  },
  {
    provider: 'openai',
    label: 'OpenAI',
    color: '#22c55e',
    models: [
      { value: 'gpt-5.4-nano', label: 'GPT-5.4 Nano',  description: 'fastest / cheapest' },
      { value: 'gpt-5.4-mini', label: 'GPT-5.4 Mini',  description: 'faster / high-volume' },
      { value: 'gpt-5.4',      label: 'GPT-5.4',       description: 'latest flagship' },
      { value: 'gpt-5.4-pro',  label: 'GPT-5.4 Pro',   description: 'deeper reasoning' },
    ],
  },
]

export const DEFAULT_MODELS: Record<Exclude<AIProvider, 'custom'>, string> = {
  gemini: 'gemini-2.5-flash',
  claude: 'claude-sonnet-4-6',
  openai: 'gpt-5.4-mini',
}

// ─── API Key links ────────────────────────────────────────────────────────────

export const API_KEY_LINKS: Record<string, string> = {
  gemini: 'https://aistudio.google.com/app/apikey',
  claude:  'https://console.anthropic.com/settings/keys',
  openai:  'https://platform.openai.com/api-keys',
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SendMessageParams {
  provider: AIProvider
  model: string
  apiKey: string
  /** For custom provider: full base URL e.g. "https://openrouter.ai/api/v1" */
  endpoint?: string
  /** For custom provider: extra headers JSON string */
  extraHeaders?: string
  messages: ChatMessage[]
  systemPrompt: string
  onChunk: (chunk: string) => void
  signal?: AbortSignal
}

export interface AIResponse {
  rawText: string
  structured: AIStructuredResponse | null
  /** Display text with action JSON stripped */
  displayText: string
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function sendMessage(params: SendMessageParams): Promise<AIResponse> {
  switch (params.provider) {
    case 'gemini': return sendGemini(params)
    case 'claude': return sendClaude(params)
    case 'openai': return sendOpenAI(params)
    case 'custom': return sendCustom(params)
    default: throw new Error(`Unknown provider: ${params.provider}`)
  }
}

// ─── System prompt ────────────────────────────────────────────────────────────

export function buildSystemPrompt(customInstruction: string, projectContext: string): string {
  return `You are an expert AI coding assistant embedded in a mobile web builder app.

Your job is to help users create and modify web projects. You can create, update, and delete files.

## Output Format (REQUIRED)

When you need to create or modify files, you MUST respond with a JSON block like this:

\`\`\`json
{
  "actions": [
    {
      "action": "create_file",
      "file": "index.html",
      "content": "<!DOCTYPE html>\\n<html>...</html>"
    },
    {
      "action": "update_file",
      "file": "style.css",
      "content": "body { margin: 0; font-family: sans-serif; }"
    }
  ],
  "explanation": "I created index.html with a basic structure and style.css for styling."
}
\`\`\`

## Action Types

| Action | Required fields | Description |
|--------|----------------|-------------|
| create_file | action, file, content | Create a new file |
| update_file | action, file, content | Replace file content entirely |
| delete_file | action, file | Delete a file |
| create_folder | action, folder | Create a folder |
| rename_file | action, file, newName | Rename a file |

## Strict Rules
- ALWAYS output complete file content — NEVER truncate with "..." or "// rest of file"
- Put ALL file changes in a single JSON block with the "actions" array
- ALWAYS include an "explanation" field describing what you did
- Keep HTML/CSS/JS clean and standards-compliant
- Target modern browsers, use vanilla JS unless asked otherwise
- All files should be standalone (no build step required)
- If creating a multi-file project, link CSS via <link> and JS via <script src>
- Return VALID JSON only — no trailing commas, no comments inside JSON

## Current project files
${projectContext || 'No files yet — start fresh!'}

${customInstruction ? `## Custom instructions from user\n${customInstruction}` : ''}`
}

// ─── Gemini ───────────────────────────────────────────────────────────────────

async function sendGemini(params: SendMessageParams): Promise<AIResponse> {
  const { model, apiKey, messages, systemPrompt, onChunk, signal } = params

  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { temperature: 0.7 },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini error ${res.status}: ${err}`)
  }

  return streamSSE(res, onChunk, (data) => {
    try {
      const parsed = JSON.parse(data)
      return parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    } catch { return '' }
  })
}

// ─── Claude ───────────────────────────────────────────────────────────────────

async function sendClaude(params: SendMessageParams): Promise<AIResponse> {
  const { model, apiKey, messages, systemPrompt, onChunk, signal } = params

  const chatMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }))

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'messages-2023-12-15',
    },
    signal,
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      system: systemPrompt,
      messages: chatMessages,
      stream: true,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Claude error ${res.status}: ${err}`)
  }

  return streamSSE(res, onChunk, (data) => {
    try {
      const parsed = JSON.parse(data)
      if (parsed.type === 'content_block_delta') return parsed.delta?.text ?? ''
      return ''
    } catch { return '' }
  })
}

// ─── OpenAI ───────────────────────────────────────────────────────────────────

async function sendOpenAI(params: SendMessageParams): Promise<AIResponse> {
  const { model, apiKey, messages, systemPrompt, onChunk, signal } = params

  const chatMessages = [
    { role: 'system', content: systemPrompt },
    ...messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content })),
  ]

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    signal,
    body: JSON.stringify({ model, messages: chatMessages, stream: true, temperature: 0.7 }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI error ${res.status}: ${err}`)
  }

  return streamSSE(res, onChunk, (data) => {
    if (data === '[DONE]') return ''
    try {
      const parsed = JSON.parse(data)
      return parsed.choices?.[0]?.delta?.content ?? ''
    } catch { return '' }
  })
}

// ─── Custom / OpenAI-compatible endpoint ─────────────────────────────────────

async function sendCustom(params: SendMessageParams): Promise<AIResponse> {
  const { model, apiKey, messages, systemPrompt, onChunk, signal } = params
  const endpoint = (params.endpoint ?? 'https://api.openai.com/v1').replace(/\/$/, '')

  // Parse extra headers
  let extraHeaders: Record<string, string> = {}
  if (params.extraHeaders?.trim()) {
    try {
      extraHeaders = JSON.parse(params.extraHeaders)
    } catch {
      // ignore malformed headers
    }
  }

  const chatMessages = [
    { role: 'system', content: systemPrompt },
    ...messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content })),
  ]

  const res = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    signal,
    body: JSON.stringify({ model, messages: chatMessages, stream: true, temperature: 0.7 }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Custom provider error ${res.status}: ${err}`)
  }

  return streamSSE(res, onChunk, (data) => {
    if (data === '[DONE]') return ''
    try {
      const parsed = JSON.parse(data)
      return parsed.choices?.[0]?.delta?.content ?? ''
    } catch { return '' }
  })
}

// ─── SSE stream reader ────────────────────────────────────────────────────────

async function streamSSE(
  res: Response,
  onChunk: (chunk: string) => void,
  extractText: (data: string) => string
): Promise<AIResponse> {
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let rawText = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (!data || data === '[DONE]') continue
      const chunk = extractText(data)
      if (chunk) {
        rawText += chunk
        onChunk(chunk)
      }
    }
  }

  const structured = parseStructuredResponse(rawText)
  const displayText = buildDisplayText(rawText, structured)
  return { rawText, structured, displayText }
}

// ─── Response parser ──────────────────────────────────────────────────────────

/**
 * Parse a structured JSON response from the AI text.
 * Looks for a ```json { "actions": [...], "explanation": "..." } ``` block.
 * Also handles inline JSON without code fence.
 * Resilient: handles partial/malformed JSON gracefully.
 */
export function parseStructuredResponse(text: string): AIStructuredResponse | null {
  // Try fenced JSON block first
  const fencedRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/g
  let match: RegExpExecArray | null

  while ((match = fencedRegex.exec(text)) !== null) {
    try {
      const obj = JSON.parse(match[1])
      const result = extractStructuredResponse(obj)
      if (result) return result
    } catch { /* continue */ }
  }

  // Try bare JSON object with "actions" field
  const bareRegex = /\{[\s\S]*?"actions"\s*:\s*\[[\s\S]*?\][\s\S]*?\}/g
  while ((match = bareRegex.exec(text)) !== null) {
    try {
      const obj = JSON.parse(match[0])
      const result = extractStructuredResponse(obj)
      if (result) return result
    } catch { /* continue */ }
  }

  // Fallback: try to find individual action objects (legacy format)
  const legacyActions = parseLegacyActions(text)
  if (legacyActions.length > 0) {
    return { actions: legacyActions, explanation: '' }
  }

  return null
}

function extractStructuredResponse(obj: unknown): AIStructuredResponse | null {
  if (typeof obj !== 'object' || obj === null) return null
  const o = obj as Record<string, unknown>
  if (!Array.isArray(o.actions)) return null
  return {
    actions: o.actions as AIFileAction[],
    explanation: typeof o.explanation === 'string' ? o.explanation : '',
  }
}

/** Legacy parser: find individual ```json {"action":...} ``` blocks. */
function parseLegacyActions(text: string): AIFileAction[] {
  const actions: AIFileAction[] = []
  const regex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    try {
      const obj = JSON.parse(match[1]) as Record<string, unknown>
      if (typeof obj.action === 'string' && (typeof obj.file === 'string' || typeof obj.folder === 'string')) {
        actions.push(obj as unknown as AIFileAction)
      }
    } catch { /* skip */ }
  }

  return actions
}

/**
 * Build display text: the AI's human-readable message, stripped of JSON blocks.
 * Prefer the "explanation" field; fall back to stripping the JSON block.
 */
export function buildDisplayText(rawText: string, structured: AIStructuredResponse | null): string {
  if (structured?.explanation) {
    // Also include any text outside the JSON block
    const withoutJson = rawText
      .replace(/```(?:json)?\s*\{[\s\S]*?\}\s*```/g, '')
      .replace(/\{[\s\S]*?"actions"\s*:\s*\[[\s\S]*?\][\s\S]*?\}/g, '')
      .trim()

    // If there's meaningful text outside the JSON, show both
    if (withoutJson.length > 20 && withoutJson !== structured.explanation) {
      return `${withoutJson}\n\n${structured.explanation}`.trim()
    }
    return structured.explanation
  }

  // Strip JSON blocks from display text
  return rawText
    .replace(/```(?:json)?\s*\{[\s\S]*?\}\s*```/g, '')
    .replace(/\{[\s\S]*?"actions"\s*:\s*\[[\s\S]*?\][\s\S]*?\}/g, '')
    .trim()
}

// ─── Helper: build params for custom provider from config ─────────────────────

export function buildCustomProviderParams(
  config: CustomProviderConfig,
  base: Omit<SendMessageParams, 'provider' | 'model' | 'apiKey' | 'endpoint' | 'extraHeaders'>
): SendMessageParams {
  return {
    ...base,
    provider: 'custom',
    model: config.model,
    apiKey: config.apiKey,
    endpoint: config.endpoint,
    extraHeaders: config.extraHeaders,
  }
}
