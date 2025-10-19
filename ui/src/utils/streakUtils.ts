// Streak management utilities for Geonections

const STREAK_KEY = 'gnx_streak'
const LAST_SOLVED_KEY = 'gnx_last_solved_puzzle'

/**
 * Get the current puzzle number based on UTC date
 * This ensures global consistency for daily puzzles
 */
export function getCurrentPuzzleNumber(): number {
  // Use UTC date to ensure global consistency
  const now = new Date()
  const utcDate = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  
  // Calculate days since launch date (September 7, 2025)
  const launchDate = new Date('2025-09-07T00:00:00Z')
  const daysSinceLaunch = Math.floor((utcDate.getTime() - launchDate.getTime()) / (1000 * 60 * 60 * 24))
  
  // Return puzzle number (1-indexed)
  return Math.max(1, daysSinceLaunch + 1)
}

/**
 * Get the current streak count from localStorage
 */
export function getStreak(): number {
  try {
    return Number(localStorage.getItem(STREAK_KEY) || 0)
  } catch (error) {
    console.warn('Failed to get streak from localStorage:', error)
    return 0
  }
}

/**
 * Mark a puzzle as solved and update the streak
 * This function handles streak logic:
 * - Increments if yesterday's puzzle was solved (consecutive)
 * - Resets to 1 if streak was broken
 * - Guards against counting the same puzzle twice
 */
export function markPuzzleSolved(puzzleNumber: number): number {
  try {
    const lastSolved = Number(localStorage.getItem(LAST_SOLVED_KEY) || 0)
    let streak = getStreak()

    // If already counted for this puzzle, return current streak
    if (lastSolved === puzzleNumber) {
      return streak
    }

    // Update streak based on consecutive completion
    if (lastSolved === puzzleNumber - 1) {
      // Consecutive puzzle solved
      streak = streak + 1
    } else {
      // Streak broken or first solve
      streak = 1
    }

    // Save updated values
    localStorage.setItem(STREAK_KEY, String(streak))
    localStorage.setItem(LAST_SOLVED_KEY, String(puzzleNumber))
    
    return streak
  } catch (error) {
    console.warn('Failed to mark puzzle as solved:', error)
    return getStreak()
  }
}

/**
 * Initialize streak from localStorage on app start
 */
export function initializeStreak(): number {
  return getStreak()
}
