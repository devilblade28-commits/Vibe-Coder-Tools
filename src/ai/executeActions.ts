/**
 * AI file action executor with full validation.
 * Each action is validated before execution.
 * One action failing does NOT stop subsequent actions.
 */

import type { AIFileAction, AIActionType, ValidationResult, ActionExecutionResult } from './aiTypes'
import type { ProjectFile } from '../filesystem/filesystemTypes'
import * as projectService from '../workspace/projectService'

// ─── Validation ───────────────────────────────────────────────────────────────

const VALID_ACTIONS: AIActionType[] = ['create_file', 'update_file', 'delete_file', 'create_folder', 'rename_file']

export function validateAction(action: unknown): ValidationResult {
  if (typeof action !== 'object' || action === null) {
    return { valid: false, error: 'Action is not an object' }
  }

  const a = action as Record<string, unknown>

  if (!VALID_ACTIONS.includes(a.action as AIActionType)) {
    return { valid: false, error: `Unknown action type: "${a.action}"` }
  }

  const actionType = a.action as AIActionType

  // File-based actions need a valid filename
  if (['create_file', 'update_file', 'delete_file'].includes(actionType)) {
    if (!a.file || typeof a.file !== 'string' || a.file.trim().length === 0) {
      return { valid: false, error: 'Missing or invalid "file" field' }
    }
    if (!projectService.isValidFileName(a.file as string)) {
      return { valid: false, error: `Invalid file name: "${a.file}"` }
    }
  }

  // create_folder needs a folder name
  if (actionType === 'create_folder') {
    const name = a.folder ?? a.file
    if (!name || typeof name !== 'string' || (name as string).trim().length === 0) {
      return { valid: false, error: 'Missing or invalid folder name' }
    }
  }

  // create_file and update_file need content
  if (['create_file', 'update_file'].includes(actionType)) {
    if (typeof a.content !== 'string') {
      return { valid: false, error: `"content" must be a string for ${actionType}` }
    }
  }

  return { valid: true }
}

// ─── Execution ────────────────────────────────────────────────────────────────

export async function executeActions(
  projectId: string,
  actions: AIFileAction[]
): Promise<ActionExecutionResult[]> {
  const results: ActionExecutionResult[] = []

  for (const action of actions) {
    const validation = validateAction(action)

    if (!validation.valid) {
      results.push({ action, success: false, error: validation.error })
      continue
    }

    try {
      // For update_file, capture the old content first (for diff view)
      let enrichedAction = action
      if (action.action === 'update_file' && !action.oldContent) {
        try {
          const existingFiles = await projectService.getProjectFiles(projectId)
          const existingFile = existingFiles.find(
            (f) => f.name.toLowerCase() === action.file.toLowerCase()
          )
          if (existingFile?.content) {
            enrichedAction = { ...action, oldContent: existingFile.content }
          }
        } catch {
          // Non-critical — proceed without oldContent
        }
      }
      await executeAction(projectId, enrichedAction)
      results.push({ action: enrichedAction, success: true })
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err)
      results.push({ action, success: false, error })
    }
  }

  return results
}

async function executeAction(
  projectId: string,
  action: AIFileAction
): Promise<ProjectFile | undefined> {
  switch (action.action) {
    case 'create_file':
    case 'update_file': {
      return projectService.upsertFileByName(projectId, action.file, action.content ?? '')
    }

    case 'delete_file': {
      const files = await projectService.getProjectFiles(projectId)
      const file = files.find(
        (f) => f.name.toLowerCase() === action.file.toLowerCase()
      )
      if (!file) throw new Error(`File "${action.file}" not found in project`)
      await projectService.deleteFile(file.id)
      return undefined
    }

    case 'create_folder': {
      const name = action.folder ?? action.file
      await projectService.createFolder(projectId, name)
      return undefined
    }

    case 'rename_file': {
      if (!action.newName) throw new Error(`"newName" is required for rename_file`)
      const files = await projectService.getProjectFiles(projectId)
      const file = files.find((f) => f.name.toLowerCase() === action.file.toLowerCase())
      if (!file) throw new Error(`File "${action.file}" not found in project`)
      const updated = { ...file, name: action.newName, updatedAt: new Date().toISOString() }
      await import('../storage/indexedDBService').then((idb) => idb.putFile(updated))
      return updated
    }

    default: {
      const _exhaustive: never = action.action
      throw new Error(`Unhandled action: ${_exhaustive}`)
    }
  }
}

// ─── Result summary ───────────────────────────────────────────────────────────

/**
 * Build a human-readable summary of execution results for display in chat.
 */
export function buildActionSummary(results: ActionExecutionResult[]): string {
  if (results.length === 0) return ''

  const succeeded = results.filter((r) => r.success)
  const failed = results.filter((r) => !r.success)

  const lines: string[] = []

  if (succeeded.length > 0) {
    const labels: Record<string, string> = {
      create_file: 'Created',
      update_file: 'Updated',
      delete_file: 'Deleted',
      create_folder: 'Created folder',
    }
    for (const r of succeeded) {
      lines.push(`✓ ${labels[r.action.action] ?? r.action.action}: \`${r.action.file}\``)
    }
  }

  if (failed.length > 0) {
    for (const r of failed) {
      lines.push(`⚠️ Failed \`${r.action.file}\`: ${r.error}`)
    }
  }

  return lines.join('\n')
}
