// Utility functions for puzzle number calculation
// Based on the logic from script.js

// Set this to the date when "Geonections #1" should go live (00:00 UTC that day).
// Months are 0-based (8 = September). Example below uses Sep 7, 2025.
const LAUNCH_UTC = Date.UTC(2025, 8, 7); // September 7, 2025

/**
 * Calculate the current day's puzzle number based on UTC
 * @returns The puzzle number for today (1-based)
 */
export function todayPuzzleNumberUTC(): number {
  const now = new Date();
  // Midnight UTC for "today"
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  // Days since launch, floor to whole days
  const days = Math.floor((todayUTC - LAUNCH_UTC) / 86400000);
  // Clamp to 1+
  return Math.max(1, days + 1);
}

/**
 * Resolve puzzle number from URL parameters or use today's puzzle
 * @param searchParams URL search parameters
 * @returns The puzzle number to use
 */
export function resolvePuzzleNumberFromURLOrUTC(searchParams: URLSearchParams): number {
  const p = searchParams.get("puzzle");
  const n = p ? parseInt(p, 10) : NaN;
  if (!Number.isNaN(n) && n > 0) return n; // explicit override
  return todayPuzzleNumberUTC(); // daily default at 00:00 UTC
}

/**
 * Check if a puzzle file exists by attempting to fetch it
 * @param puzzleNumber The puzzle number to check
 * @returns Promise that resolves to true if puzzle exists, false otherwise
 */
export async function puzzleExists(puzzleNumber: number): Promise<boolean> {
  try {
    const response = await fetch(`/puzzles/${puzzleNumber}.json`, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get all available puzzle numbers using Vite's import.meta.glob
 * @returns Array of puzzle numbers that exist AND have been unlocked based on the current date
 */
export function getAvailablePuzzleNumbers(): number[] {
  // Use Vite's import.meta.glob to get all puzzle files at build time
  const puzzleModules = import.meta.glob('/public/puzzles/*.json', { eager: false });
  
  // Extract puzzle numbers from filenames
  const puzzleNumbers: number[] = [];
  for (const path of Object.keys(puzzleModules)) {
    const match = path.match(/(\d+)\.json$/);
    if (match) {
      puzzleNumbers.push(parseInt(match[1], 10));
    }
  }
  
  // Get current day's puzzle number to determine what should be unlocked
  const currentPuzzleNumber = todayPuzzleNumberUTC();
  
  // Filter to only include puzzles that have been unlocked (puzzle number <= current day's puzzle)
  const unlockedPuzzles = puzzleNumbers.filter(num => num <= currentPuzzleNumber);
  
  // Sort and return
  return unlockedPuzzles.sort((a, b) => a - b);
}

/**
 * Get the total number of available puzzles
 * @returns The count of available puzzles
 */
export function getAvailablePuzzleCount(): number {
  return getAvailablePuzzleNumbers().length;
}

/**
 * Check if a specific puzzle number exists using the shared puzzle list
 * @param puzzleNumber The puzzle number to check
 * @returns True if the puzzle exists, false otherwise
 */
export function puzzleNumberExists(puzzleNumber: number): boolean {
  const availableNumbers = getAvailablePuzzleNumbers();
  return availableNumbers.includes(puzzleNumber);
}

/**
 * Find the nearest available puzzle number that is lower than the given number
 * @param currentPuzzleNumber The current puzzle number
 * @returns The nearest lower puzzle number, or null if none exists
 */
export function findPreviousAvailablePuzzle(currentPuzzleNumber: number): number | null {
  const availableNumbers = getAvailablePuzzleNumbers();
  const lowerNumbers = availableNumbers.filter(num => num < currentPuzzleNumber);
  return lowerNumbers.length > 0 ? Math.max(...lowerNumbers) : null;
}

/**
 * Find the nearest available puzzle number that is higher than the given number
 * Only returns puzzles that have been unlocked (based on current date)
 * @param currentPuzzleNumber The current puzzle number
 * @returns The nearest higher puzzle number, or null if none exists
 */
export function findNextAvailablePuzzle(currentPuzzleNumber: number): number | null {
  const availableNumbers = getAvailablePuzzleNumbers(); // Already filtered by date
  const higherNumbers = availableNumbers.filter(num => num > currentPuzzleNumber);
  return higherNumbers.length > 0 ? Math.min(...higherNumbers) : null;
}
