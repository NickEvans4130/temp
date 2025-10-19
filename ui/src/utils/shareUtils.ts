// Share functionality utilities for Geonections

export interface TileGuessEvent {
  type: 'tile_guess'
  emojiRow: string
  tileIds: number[]
  timestamp: number
}

export interface GroupGuessEvent {
  type: 'group_guess'
  emojiRow: string
  tileIds: number[]
  isCorrect: boolean
  named: boolean
  timestamp: number
}

export interface HintUseEvent {
  type: 'hint_use'
  tileId: number
  timestamp: number
}

export type AttemptEvent = TileGuessEvent | GroupGuessEvent | HintUseEvent

// Difficulty to emoji mapping
export const DIFFICULTY_TO_EMOJI = {
  Easy: '🟨',
  Medium: '🟦', 
  Hard: '🟪',
  Expert: '🟥'
} as const

// Difficulty to circle emoji mapping (for hinted tiles)
export const DIFFICULTY_TO_CIRCLE_EMOJI = {
  Easy: '🟡',
  Medium: '🔵', 
  Hard: '🟣',
  Expert: '🔴'
} as const

/**
 * Create a tile guess event
 */
export function createTileGuessEvent(
  tileIds: number[], 
  tileDataList: any[],
  revealedTiles?: Set<number>,
  visualTileOrder?: number[],
  selectionOrder?: number[]
): TileGuessEvent {
  // Use selection order if available, otherwise keep tiles in the order they were selected
  // This preserves the exact visual arrangement the user saw when they submitted
  let orderedTileIds = tileIds
  if (selectionOrder) {
    // Filter selection order to only include the tiles that are being submitted
    orderedTileIds = selectionOrder.filter(id => tileIds.includes(id))
  }
  
  const emojiRow = orderedTileIds.map(id => {
    const tile = tileDataList[id]
    const difficulty = tile?.difficulty as keyof typeof DIFFICULTY_TO_EMOJI
    
    // Use circle emoji if tile was revealed (hinted)
    if (revealedTiles?.has(id)) {
      return DIFFICULTY_TO_CIRCLE_EMOJI[difficulty] || '⚪'
    }
    
    return DIFFICULTY_TO_EMOJI[difficulty] || '⬜'
  }).join('')

  return { 
    type: 'tile_guess',
    emojiRow,
    tileIds: orderedTileIds,
    timestamp: Date.now()
  }
}

/**
 * Create a group guess event
 */
export function createGroupGuessEvent(
  tileIds: number[], 
  tileDataList: any[], 
  isCorrect: boolean,
  revealedTiles?: Set<number>,
  named = true
): GroupGuessEvent {
  const emojiRow = tileIds.map(id => {
    const tile = tileDataList[id]
    const difficulty = tile?.difficulty as keyof typeof DIFFICULTY_TO_EMOJI
    
    // Use circle emoji if tile was revealed (hinted)
    if (revealedTiles?.has(id)) {
      return DIFFICULTY_TO_CIRCLE_EMOJI[difficulty] || '⚪'
    }
    
    return DIFFICULTY_TO_EMOJI[difficulty] || '⬜'
  }).join('')

  return { 
    type: 'group_guess',
    emojiRow,
    tileIds,
    isCorrect,
    named,
    timestamp: Date.now()
  }
}

/**
 * Create a hint use event
 */
export function createHintUseEvent(tileId: number): HintUseEvent {
  return {
    type: 'hint_use',
    tileId,
    timestamp: Date.now()
  }
}


/**
 * Helper function to check if two arrays contain the same elements
 */
function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((val, i) => val === sortedB[i])
}

/**
 * Build comprehensive share text from attempt events
 */
export function buildShareText(
  puzzleNumber: number,
  gameMode: 'normal' | 'expert' | 'easy',
  streak: number,
  attemptEvents: AttemptEvent[]
): string {
  const link = 'https://geonections.com'
  const isEasy = gameMode === 'easy'

  // Sort events by timestamp to maintain chronological order
  const sortedEvents = [...attemptEvents].sort((a, b) => a.timestamp - b.timestamp)

  // Build rows based on event types
  const rows: string[] = []
  let correctGroupGuesses = 0

  // Process all events chronologically to show all attempts
  for (const event of sortedEvents) {
    if (event.type === 'group_guess') {
      const groupGuessEvent = event as GroupGuessEvent
      
      // Show every group_guess attempt (including multiple attempts for same group)
      const rowText = groupGuessEvent.emojiRow + (groupGuessEvent.isCorrect ? '✅' : '⭕️')
      rows.push(rowText)
      
      if (groupGuessEvent.isCorrect && groupGuessEvent.named !== false) {
        correctGroupGuesses++
      }
    } else if (event.type === 'tile_guess') {
      const tileGuessEvent = event as TileGuessEvent
      
      // Only show tile_guess events if there's no subsequent group_guess for the same tiles
      // This prevents showing both tile_guess (⭕️) and group_guess (✅) for the same group
      const hasSubsequentGroupGuess = sortedEvents.some(e => 
        e.type === 'group_guess' && 
        e.timestamp > tileGuessEvent.timestamp &&
        arraysEqual((e as GroupGuessEvent).tileIds, tileGuessEvent.tileIds)
      )
      
      if (!hasSubsequentGroupGuess) {
        // Show tile_guess events as incorrect attempts (since they didn't make it to country guess)
        const rowText = tileGuessEvent.emojiRow + '⭕️'
        rows.push(rowText)
      }
    }
  }

  // If no attempts were recorded, show a message indicating no attempts
  if (rows.length === 0) {
    if (isEasy) {
      return `Geonections #${puzzleNumber} (Easy)\nStreak: ${streak}\nNamed: 0/4\nNo attempts recorded\n${link}`
    }
    const modeLabel = gameMode === 'expert' ? ' (Expert)' : ''
    return `Geonections #${puzzleNumber}${modeLabel}\nStreak: ${streak}\nNo attempts recorded\n${link}`
  }

  // Mode-specific formatting
  if (isEasy) {
    return `Geonections #${puzzleNumber} (Easy)\nStreak: ${streak}\nNamed: ${correctGroupGuesses}/4\n${rows.join('\n')}\n${link}`
  }

  const modeLabel = gameMode === 'expert' ? ' (Expert)' : ''
  return `Geonections #${puzzleNumber}${modeLabel}\nStreak: ${streak}\n${rows.join('\n')}\n${link}`
}

/**
 * Generate fallback rows from current board state
 * This creates the canonical 4x4 emoji grid when no attempts are recorded
 */
function generateFallbackRows(tileDataList: any[]): string[] {
  // Group tiles by difficulty
  const byDifficulty: { [key: string]: any[] } = { Easy: [], Medium: [], Hard: [], Expert: [] }
  
  tileDataList.forEach(tile => {
    if (tile?.difficulty && byDifficulty[tile.difficulty]) {
      byDifficulty[tile.difficulty].push(tile)
    }
  })

  // Create rows in canonical order: Easy, Medium, Hard, Expert
  const rows: string[] = []
  const difficulties = ['Easy', 'Medium', 'Hard', 'Expert'] as const
  
  difficulties.forEach(difficulty => {
    const tiles = byDifficulty[difficulty].slice(0, 4) // Take first 4 tiles
    const row = tiles.map(() => DIFFICULTY_TO_EMOJI[difficulty]).join('')
    rows.push(row)
  })

  return rows
}

/**
 * Copy text to clipboard with fallback methods
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Try modern clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch (error) {
    // Modern clipboard API failed, continue to fallback
  }

  // Fallback: temporary textarea method
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    
    const success = document.execCommand('copy')
    document.body.removeChild(textarea)
    
    if (success) {
      return true
    }
  } catch (error) {
    // Fallback clipboard method failed, continue to last resort
  }

  // Last resort: return false to indicate failure
  return false
}
