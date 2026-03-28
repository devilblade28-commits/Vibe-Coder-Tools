/**
 * Diff utility - LCS-based diff algorithm for comparing text.
 * Used for showing git-style diff views in the editor.
 */

export interface DiffLine {
  type: 'add' | 'remove' | 'context'
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

export interface DiffResult {
  lines: DiffLine[]
  additions: number
  deletions: number
}

/**
 * Compute the Longest Common Subsequence (LCS) between two arrays.
 */
function lcs<T>(a: T[], b: T[], equals: (x: T, y: T) => boolean = (x, y) => x === y): [number, number][] {
  const m = a.length
  const n = b.length
  
  // Create DP table
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  
  // Fill DP table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (equals(a[i - 1], b[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }
  
  // Backtrack to find the actual sequence
  const result: [number, number][] = []
  let i = m, j = n
  while (i > 0 && j > 0) {
    if (equals(a[i - 1], b[j - 1])) {
      result.unshift([i - 1, j - 1])
      i--
      j--
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }
  
  return result
}

/**
 * Compute diff between two strings.
 * Returns an array of diff lines with type markers.
 */
export function computeDiff(oldText: string, newText: string): DiffResult {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  
  // Find LCS of line indices
  const lcsResult = lcs(oldLines, newLines)
  
  const lines: DiffLine[] = []
  let additions = 0
  let deletions = 0
  
  let oldIdx = 0
  let newIdx = 0
  let lcsIdx = 0
  
  let oldLineNumber = 1
  let newLineNumber = 1
  
  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    // Check if we're at an LCS match
    if (lcsIdx < lcsResult.length) {
      const [lcsOld, lcsNew] = lcsResult[lcsIdx]
      
      // Process removed lines before this LCS point
      while (oldIdx < lcsOld) {
        lines.push({
          type: 'remove',
          content: oldLines[oldIdx],
          oldLineNumber: oldLineNumber,
        })
        deletions++
        oldIdx++
        oldLineNumber++
      }
      
      // Process added lines before this LCS point
      while (newIdx < lcsNew) {
        lines.push({
          type: 'add',
          content: newLines[newIdx],
          newLineNumber: newLineNumber,
        })
        additions++
        newIdx++
        newLineNumber++
      }
      
      // Process the matching line (context)
      lines.push({
        type: 'context',
        content: oldLines[oldIdx],
        oldLineNumber: oldLineNumber,
        newLineNumber: newLineNumber,
      })
      oldIdx++
      newIdx++
      oldLineNumber++
      newLineNumber++
      lcsIdx++
    } else {
      // Process remaining lines after LCS
      while (oldIdx < oldLines.length) {
        lines.push({
          type: 'remove',
          content: oldLines[oldIdx],
          oldLineNumber: oldLineNumber,
        })
        deletions++
        oldIdx++
        oldLineNumber++
      }
      while (newIdx < newLines.length) {
        lines.push({
          type: 'add',
          content: newLines[newIdx],
          newLineNumber: newLineNumber,
        })
        additions++
        newIdx++
        newLineNumber++
      }
    }
  }
  
  return { lines, additions, deletions }
}

/**
 * Format diff result as a unified diff string.
 */
export function formatUnifiedDiff(oldText: string, newText: string, filename: string): string {
  const { lines, additions, deletions } = computeDiff(oldText, newText)
  
  const output: string[] = []
  output.push(`--- a/${filename}`)
  output.push(`+++ b/${filename}`)
  
  // Find hunks
  let hunkStart = 0
  while (hunkStart < lines.length) {
    // Find the start of a hunk (skip context lines at the beginning)
    let hunkEnd = hunkStart
    let contextBefore = 0
    let contextAfter = 0
    
    // Count context lines before the first change
    while (hunkEnd < lines.length && lines[hunkEnd].type === 'context') {
      contextBefore++
      hunkEnd++
    }
    
    // Find the end of changes
    let hasChanges = false
    while (hunkEnd < lines.length) {
      if (lines[hunkEnd].type !== 'context') {
        hasChanges = true
        contextAfter = 0
      } else {
        contextAfter++
        // Stop after 3 context lines following a change
        if (contextAfter >= 3 && hasChanges) break
      }
      hunkEnd++
    }
    
    // Only output if there are changes
    if (hasChanges) {
      const hunkLines = lines.slice(hunkStart, hunkEnd)
      const oldStart = hunkLines[0].oldLineNumber ?? 1
      const newStart = hunkLines[0].newLineNumber ?? 1
      const oldCount = hunkLines.filter(l => l.type !== 'add').length
      const newCount = hunkLines.filter(l => l.type !== 'remove').length
      
      output.push(`@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`)
      
      for (const line of hunkLines) {
        const prefix = line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '
        output.push(`${prefix}${line.content}`)
      }
    }
    
    hunkStart = hunkEnd
  }
  
  output.push('')
  output.push(`${additions} addition${additions !== 1 ? 's' : ''}, ${deletions} deletion${deletions !== 1 ? 's' : ''}`)
  
  return output.join('\n')
}