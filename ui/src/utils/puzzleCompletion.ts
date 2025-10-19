// Utility functions for tracking puzzle completion and attempts

export interface PuzzleCompletionState {
  completed: Set<number>
  attempted: Set<number>
}

const STORAGE_KEY = 'geonections-puzzle-completion'

/**
 * Load puzzle completion state from localStorage
 * @returns The current completion state
 */
export function loadPuzzleCompletionState(): PuzzleCompletionState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      return {
        completed: new Set(data.completed || []),
        attempted: new Set(data.attempted || [])
      }
    }
  } catch (error) {
    console.warn('Failed to load puzzle completion state:', error)
  }
  
  return {
    completed: new Set<number>(),
    attempted: new Set<number>()
  }
}

/**
 * Save puzzle completion state to localStorage
 * @param state The completion state to save
 */
export function savePuzzleCompletionState(state: PuzzleCompletionState): void {
  try {
    const data = {
      completed: Array.from(state.completed),
      attempted: Array.from(state.attempted)
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    
    // Dispatch custom event to notify components of the change
    window.dispatchEvent(new CustomEvent('puzzleCompletionChanged'))
  } catch (error) {
    console.warn('Failed to save puzzle completion state:', error)
  }
}

/**
 * Mark a puzzle as completed
 * @param puzzleNumber The puzzle number to mark as completed
 */
export function markPuzzleCompleted(puzzleNumber: number): void {
  const state = loadPuzzleCompletionState()
  state.completed.add(puzzleNumber)
  // Remove from attempted if it was there (completed overrides attempted)
  state.attempted.delete(puzzleNumber)
  savePuzzleCompletionState(state)
}

/**
 * Mark a puzzle as attempted (but not completed)
 * @param puzzleNumber The puzzle number to mark as attempted
 */
export function markPuzzleAttempted(puzzleNumber: number): void {
  const state = loadPuzzleCompletionState()
  // Only mark as attempted if not already completed
  if (!state.completed.has(puzzleNumber)) {
    state.attempted.add(puzzleNumber)
    savePuzzleCompletionState(state)
  }
}

/**
 * Check if a puzzle is completed
 * @param puzzleNumber The puzzle number to check
 * @returns True if the puzzle is completed
 */
export function isPuzzleCompleted(puzzleNumber: number): boolean {
  const state = loadPuzzleCompletionState()
  return state.completed.has(puzzleNumber)
}

/**
 * Check if a puzzle is attempted (but not completed)
 * @param puzzleNumber The puzzle number to check
 * @returns True if the puzzle is attempted but not completed
 */
export function isPuzzleAttempted(puzzleNumber: number): boolean {
  const state = loadPuzzleCompletionState()
  return state.attempted.has(puzzleNumber) && !state.completed.has(puzzleNumber)
}

/**
 * Get the completion status of a puzzle
 * @param puzzleNumber The puzzle number to check
 * @returns 'completed', 'attempted', or 'not-started'
 */
export function getPuzzleStatus(puzzleNumber: number): 'completed' | 'attempted' | 'not-started' {
  if (isPuzzleCompleted(puzzleNumber)) {
    return 'completed'
  } else if (isPuzzleAttempted(puzzleNumber)) {
    return 'attempted'
  } else {
    return 'not-started'
  }
}

/**
 * Clear all completion data (useful for testing or reset)
 */
export function clearPuzzleCompletionData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.warn('Failed to clear puzzle completion data:', error)
  }
}
