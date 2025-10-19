import { create } from 'zustand'
import { dispatchShakeForSelectedTiles } from '../utils/shakeEvents'
import { markPuzzleCompleted, markPuzzleAttempted } from '../utils/puzzleCompletion'
import { getCurrentPuzzleNumber, getStreak, markPuzzleSolved, initializeStreak } from '../utils/streakUtils'
import { createHintUseEvent, buildShareText, copyToClipboard, type AttemptEvent } from '../utils/shareUtils'
import { handleGuess, computeCanSubmit, computeRowsOfTileIds, GameState, createGameStateFromZustand, applyGameStateUpdate, createInitialGameState, SolutionState, getSolvedDifficulties, createSuccessUpdate } from '../utils/guessHandlers'
import { logPuzzleStarted, logHintUsed } from '../utils/analytics'

interface TileData {
  panoId: string
  lat: number
  lng: number
  heading: number
  pitch: number
  zoom: number
  groupName: string | null // Changed from countryCode to groupName for theme mode support
  stateCode: string | null
  difficulty?: 'Easy' | 'Medium' | 'Hard' | 'Expert'
  extra: {
    tags: string[]
    panoDate?: string
  }
}

export type GameMode = 'easy' | 'normal' | 'expert'

interface UIState {
  // Puzzle data
  puzzleData: {
    puzzleId: string | null
    tileDataList: TileData[] // Ordered list, never changes
    visualTileOrder: number[] // Shuffled order for rendering [3, 1, 2, 4, 0, ...]
  }
  
  // Fullscreen state
  fullscreenTile: number | null // Tile index ID or null
  fullscreenMode: 'screenshot' | 'embed'
  
  // Click tracking
  lastClickedTileIndex: number | null
  lastClickTimestamp: number | null
  
  // Game state
  gameMode: GameMode
  mistakesLeft: number
  mistakesMade: number
  gameOver: boolean
  gaveUp: boolean
  selectedTiles: Set<number> // Now using tile IDs (indices) instead of panoIds
  buckets: Array<Set<number>> // Now using tile IDs instead of panoIds
  bucketIndex: Map<number, number> // tileId -> bucketIndex
  tileSelectionOrder: number[] // Track the order tiles were selected in
  solutionState: SolutionState
  feedbackMessage: string
  feedbackType: 'success' | 'error' | 'info' | null
  feedbackMessageId: number
  showCountryGuess: boolean
  showTileGuess: boolean
  correctCountry: string | null
  hiddenTileIndex: number | null // Index of tile to hide in expert mode
  attemptEvents: AttemptEvent[]
  streak: number
  puzzleNumber: number
  guessHistory: Set<string>
  
  // Hint system
  hintsLeft: number
  hintMode: boolean
  revealedTiles: Set<number>
  totalHintsUsed: number // Secret tracking of actual hints used (hard cap at 10)
  
  // Actions
  setPuzzleData: (puzzleId: string, tileDataList: TileData[]) => void
  loadPuzzle: (puzzleId: string, tileDataList: TileData[]) => void
  setVisualTileOrder: (order: number[]) => void
  setFullscreenTile: (tileIndex: number | null) => void
  setFullscreenMode: (mode: 'screenshot' | 'embed') => void
  recordTileClick: (index: number) => void
  
  // Game actions
  setGameMode: (mode: GameMode) => void
  setMistakesLeft: (mistakes: number) => void
  setGameOver: (gameOver: boolean) => void
  setSelectedTiles: (tiles: Set<number>) => void
  setBuckets: (buckets: Array<Set<number>>) => void
  setBucketIndex: (index: Map<number, number>) => void
  setFeedbackMessage: (message: string) => void
  setFeedbackType: (type: 'success' | 'error' | 'info' | null) => void
  setShowCountryGuess: (show: boolean) => void
  setShowTileGuess: (show: boolean) => void
  setCorrectCountry: (country: string | null) => void
  setAttemptEvents: (events: AttemptEvent[]) => void
  setStreak: (streak: number) => void
  setPuzzleNumber: (number: number) => void
  setGuessHistory: (history: Set<string>) => void
  
  // Utility functions
  getTileData: (tileIndex: number) => TileData | null
  getVisualTileIndex: (visualIndex: number) => number // Get tile ID from visual position
  getBucketIndex: (tileId: number) => number
  
  // Convenience actions
  openFullscreenForTile: (tileIndex: number) => void
  closeFullscreen: () => void
  toggleFullscreenOnLastTile: () => void
  
  // Game convenience actions
  resetGame: () => void
  addMistakes: (count: number) => void
  handleTileClick: (tileId: number) => void
  handleTileGroupSubmit: () => void
  handleModeChange: (mode: GameMode) => void
  handleShuffle: () => void
  handleCountryGuess: (groupName: string) => void
  startHintMode: () => void
  cancelHintMode: () => void
  revealTile: (tileId: number) => void
  getMoreHints: () => void
  canSubmit: boolean
  rowsOfTileIds: number[][]
  getShareText: () => string
  getMistakesUsed: () => number
  hasSelectedValidGridGuess: () => boolean
  shareResults: () => Promise<boolean>
  handleCountryGuessSkip: () => void
  handleGiveUp: () => void
  
  // Puzzle completion tracking
  trackPuzzleCompletion: () => void
  trackPuzzleAttempt: () => void
}

// Helper function to shuffle an array (Fisher-Yates algorithm)
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export const useUIStore = create<UIState>((set, get) => ({
  // Initial state
  puzzleData: {
    puzzleId: null,
    tileDataList: [],
    visualTileOrder: []
  },
  fullscreenTile: null,
  fullscreenMode: 'screenshot',
  lastClickedTileIndex: null,
  lastClickTimestamp: null,
  
  // Game state
  gameMode: 'normal',
  mistakesLeft: 4,
  mistakesMade: 0,
  gameOver: false,
  gaveUp: false,
  selectedTiles: new Set<number>(),
  buckets: [new Set<number>(), new Set<number>(), new Set<number>(), new Set<number>()],
  bucketIndex: new Map<number, number>(),
  tileSelectionOrder: [],
  solutionState: { solvedRows: [] },
  feedbackMessage: '',
  feedbackType: null,
  feedbackMessageId: 0,
  showCountryGuess: false,
  showTileGuess: false,
  correctCountry: null,
  hiddenTileIndex: null,
  attemptEvents: [],
  streak: initializeStreak(),
  puzzleNumber: getCurrentPuzzleNumber(),
  guessHistory: new Set(),
  canSubmit: false,
  rowsOfTileIds: [[], [], [], []],
  
  // Hint system initial state
  hintsLeft: 2,
  hintMode: false,
  revealedTiles: new Set<number>(),
  totalHintsUsed: 0,
  
  
  // Actions
  setPuzzleData: (puzzleId, tileDataList) => {
    const visualTileOrder = Array.from({ length: tileDataList.length }, (_, i) => i)
    set({ 
      puzzleData: { 
        puzzleId, 
        tileDataList, 
        visualTileOrder 
      } 
    })
  },
  
  loadPuzzle: (puzzleId, tileDataList) => {
    // Create shuffled visual order - this is the ONLY source of truth for tile positions
    const visualTileOrder = shuffleArray(Array.from({ length: tileDataList.length }, (_, i) => i))
    const rowsOfTileIds = computeRowsOfTileIds(visualTileOrder)
    
    // Initialize all game state
    const newBuckets = [new Set<number>(), new Set<number>(), new Set<number>(), new Set<number>()]
    const newSolutionState: SolutionState = { solvedRows: [] }
    const newCanSubmit = computeCanSubmit(newBuckets, newSolutionState, 'normal')
    
    // Get current puzzle number and streak
    const currentPuzzleNumber = getCurrentPuzzleNumber()
    const currentStreak = getStreak()
    
    // Calculate hidden tile index for expert mode (always hide first tile - index 0)
    const hiddenTileIndex = 0
    
    set({
      puzzleData: { 
        puzzleId, 
        tileDataList, 
        visualTileOrder 
      },
      // Reset all game state
      gameMode: 'normal',
      mistakesLeft: 4,
      mistakesMade: 0,
      gameOver: false,
      gaveUp: false,
      selectedTiles: new Set<number>(),
      buckets: newBuckets,
      tileSelectionOrder: [],
      bucketIndex: new Map<number, number>(),
      solutionState: newSolutionState,
      feedbackMessage: '',
      feedbackMessageId: 0,
      feedbackType: null,
      showCountryGuess: false,
      correctCountry: null,
      hiddenTileIndex,
      attemptEvents: [],
      guessHistory: new Set(),
      canSubmit: newCanSubmit,
      rowsOfTileIds,
      puzzleNumber: currentPuzzleNumber,
      streak: currentStreak,
      // Reset hint system
      hintsLeft: 2,
      hintMode: false,
      revealedTiles: new Set<number>(),
      totalHintsUsed: 0
    })
    
    logPuzzleStarted({ puzzleNumber: currentPuzzleNumber, mode: 'normal' })
  },
  
  setVisualTileOrder: (order) => {
    const rowsOfTileIds = computeRowsOfTileIds(order)
    set(state => ({
      puzzleData: {
        ...state.puzzleData,
        visualTileOrder: order
      },
      rowsOfTileIds
    }))
  },
  
  setFullscreenTile: (tileIndex) => set({ fullscreenTile: tileIndex }),
  
  setFullscreenMode: (mode) => set({ fullscreenMode: mode }),
  
  recordTileClick: (index) => {
    const now = Date.now()
    set({ 
      lastClickedTileIndex: index, 
      lastClickTimestamp: now 
    })
  },
  
  // Utility functions
  getTileData: (tileIndex) => {
    const state = get()
    return state.puzzleData.tileDataList[tileIndex] || null
  },
  
  getVisualTileIndex: (visualIndex) => {
    const state = get()
    return state.puzzleData.visualTileOrder[visualIndex] || -1
  },
  
  getBucketIndex: (tileId) => {
    const state = get()
    return state.bucketIndex.has(tileId) ? state.bucketIndex.get(tileId)! : -1
  },
  
  // Convenience actions
  openFullscreenForTile: (tileIndex) => set({ 
    fullscreenTile: tileIndex,
    showCountryGuess: false // Close country guess dropdown when opening fullscreen
  }),
  
  closeFullscreen: () => set({ fullscreenTile: null }),
  
  toggleFullscreenOnLastTile: () => {
    const state = get()
    const { fullscreenTile, lastClickedTileIndex } = state
    
    if (fullscreenTile !== null) {
      // If already in fullscreen, close it
      set({ fullscreenTile: null })
    } else if (lastClickedTileIndex !== null) {
      // Open fullscreen for the last clicked tile
      set({ fullscreenTile: lastClickedTileIndex })
    }
  },
  
  // Game actions
  setGameMode: (mode) => set({ gameMode: mode }),
  setMistakesLeft: (mistakes) => set({ mistakesLeft: mistakes }),
  setGameOver: (gameOver) => set({ gameOver }),
  setSelectedTiles: (tiles) => set({ selectedTiles: tiles }),
  setBuckets: (buckets) => set({ buckets }),
  setBucketIndex: (index) => set({ bucketIndex: index }),
  setFeedbackMessage: (message) => set((state) => ({ 
    feedbackMessage: message, 
    feedbackMessageId: state.feedbackMessageId + 1 
  })),
  setFeedbackType: (type) => set({ feedbackType: type }),
  setShowCountryGuess: (show) => set({ showCountryGuess: show }),
  setShowTileGuess: (show) => set({ showTileGuess: show }),
  setCorrectCountry: (country) => set({ correctCountry: country }),
  setAttemptEvents: (events) => set({ attemptEvents: events }),
  setStreak: (streak) => set({ streak }),
  setPuzzleNumber: (number) => set({ puzzleNumber: number }),
  setGuessHistory: (history) => set({ guessHistory: history }),
  
  // Game convenience actions
  resetGame: () => {
    const state = get()
    const newBuckets = [new Set<number>(), new Set<number>(), new Set<number>(), new Set<number>()]
    const newSolutionState: SolutionState = { solvedRows: [] }
    const newCanSubmit = computeCanSubmit(newBuckets, newSolutionState, state.gameMode)
    
    set({
      mistakesLeft: state.gameMode === 'easy' ? Infinity : state.gameMode === 'expert' ? 2 : 4,
      mistakesMade: 0,
      selectedTiles: new Set<number>(),
      buckets: newBuckets,
      bucketIndex: new Map<number, number>(),
      tileSelectionOrder: [],
      solutionState: newSolutionState,
      gameOver: false,
      gaveUp: false,
      showCountryGuess: false,
      correctCountry: null,
      feedbackMessage: '',
      feedbackMessageId: state.feedbackMessageId + 1,
      feedbackType: null,
      attemptEvents: [],
      guessHistory: new Set(),
      canSubmit: newCanSubmit,
      // Reset hint system
      hintsLeft: 2,
      hintMode: false,
      revealedTiles: new Set<number>(),
      totalHintsUsed: 0
    })
    
    logPuzzleStarted({ puzzleNumber: state.puzzleNumber, mode: state.gameMode })
  },

  addMistakes: (count) => {
    set((state) => {
      const newMistakesLeft = state.mistakesLeft + count
      return {
        mistakesLeft: newMistakesLeft,
        gameOver: false, // Remove game over state
        feedbackMessage: `Added ${count} more mistake${count === 1 ? '' : 's'}! Keep trying!`,
        feedbackMessageId: state.feedbackMessageId + 1,
        feedbackType: 'success' as const
      }
    })
  },

  handleTileClick: (tileId) => {
    set((state) => {
      if (state.gameOver) return state
      
      const buckets = state.buckets.map(s => new Set(s))
      const bucketIndex = new Map(state.bucketIndex)
      const solvedDifficulties = getSolvedDifficulties(state.solutionState)
      const bucketDifficulties: Array<'easy' | 'medium' | 'hard' | 'expert'> = ['easy', 'medium', 'hard', 'expert']
      
      // Check if tile is already selected
      const currentBucket = bucketIndex.get(tileId)
      if (currentBucket !== undefined) {
        // Deselect tile
        buckets[currentBucket].delete(tileId)
        bucketIndex.delete(tileId)
        // Remove from selection order
        const newSelectionOrder = state.tileSelectionOrder.filter(id => id !== tileId)
        return {
          ...state,
          buckets,
          bucketIndex,
          selectedTiles: new Set(bucketIndex.keys()),
          tileSelectionOrder: newSelectionOrder,
          canSubmit: computeCanSubmit(buckets, state.solutionState, state.gameMode)
        }
      } else {
        // Select tile
        const isExpert = state.gameMode === 'expert'
        const totalSelected = bucketIndex.size
        
        if (!isExpert && totalSelected >= 4) return state // Normal mode: max 4 tiles
        
        // Find first available bucket
        const targetBucket = [0, 1, 2, 3].find(i => 
          !solvedDifficulties.has(bucketDifficulties[i]) && buckets[i].size < 4
        )
        
        if (targetBucket === undefined) return state
        
        buckets[targetBucket].add(tileId)
        bucketIndex.set(tileId, targetBucket)
        // Add to selection order
        const newSelectionOrder = [...state.tileSelectionOrder, tileId]
        return {
          ...state,
          buckets,
          bucketIndex,
          selectedTiles: new Set(bucketIndex.keys()),
          tileSelectionOrder: newSelectionOrder,
          canSubmit: computeCanSubmit(buckets, state.solutionState, state.gameMode)
        }
      }
    })
  },
  
  handleTileGroupSubmit: () => {
    set((state) => {
      // Convert state to GameState format for pure function
      const gameState = createGameStateFromZustand(state)
      
      // Call pure function with null input (tile submission)
      const update = handleGuess(null, gameState)
      
      // Apply the update to state
      return applyGameStateUpdate(state, update)
    })
  },
  
  handleModeChange: (mode) => {
    const state = get()
    
    // Reshuffle tiles when difficulty changes
    const newVisualTileOrder = shuffleArray([...state.puzzleData.visualTileOrder])
    
    // Create initial game state for the new mode
    const initialState = createInitialGameState(mode, newVisualTileOrder, state.feedbackMessageId)
    
    set({
      puzzleData: {
        ...state.puzzleData,
        visualTileOrder: newVisualTileOrder
      },
      ...initialState
    })
    
    logPuzzleStarted({ puzzleNumber: state.puzzleNumber, mode })
  },
  
  handleShuffle: () => {
    const state = get()
    
    const solvedTileIds = state.solutionState.solvedRows.flatMap(row => row.tileIndexes)
    const lockedTileSet = new Set(solvedTileIds)
    
    // Shuffle only the unsolved tiles while keeping solved rows locked at the top
    const unsolvedTiles = state.puzzleData.visualTileOrder.filter(tileId => !lockedTileSet.has(tileId))
    const shuffledUnlocked = shuffleArray(unsolvedTiles)
    const finalOrder = [...solvedTileIds, ...shuffledUnlocked]
    
    const newBuckets = [new Set<number>(), new Set<number>(), new Set<number>(), new Set<number>()]
    const newCanSubmit = computeCanSubmit(newBuckets, state.solutionState, state.gameMode)
    const rowsOfTileIds = computeRowsOfTileIds(finalOrder)
    
    set({
      puzzleData: {
        ...state.puzzleData,
        visualTileOrder: finalOrder
      },
      selectedTiles: new Set<number>(),
      buckets: newBuckets,
      bucketIndex: new Map<number, number>(),
      tileSelectionOrder: [],
      attemptEvents: [],
      canSubmit: newCanSubmit,
      rowsOfTileIds
      // Note: guessHistory is NOT reset on shuffle - we want to preserve previous guesses
    })
  },
  
  handleCountryGuess: (groupName) => {
    set((state) => {
      // Convert state to GameState format for pure function
      const gameState = createGameStateFromZustand(state)
      
      // Call pure function with country guess input
      const update = handleGuess(groupName, gameState)
      
      // Apply the update to state
      return applyGameStateUpdate(state, update)
    })
  },
  
  getShareText: () => {
    const state = get()
    return buildShareText(
      state.puzzleNumber,
      state.gameMode,
      state.streak,
      state.attemptEvents
    )
  },
  
  getMistakesUsed: () => {
    const state = get()
    return state.mistakesMade
  },
  
  // Comprehensive share functionality
  shareResults: async () => {
    const state = get()
    
    const shareText = buildShareText(
      state.puzzleNumber,
      state.gameMode,
      state.streak,
      state.attemptEvents
    )
    
    const clipboardResult = await copyToClipboard(shareText)
    
    return clipboardResult
  },
  
  // Skip handler for easy mode - solves the group without requiring correct country name
  handleCountryGuessSkip: () => {
    set((state) => {
      const bucketDifficulties: Array<'easy' | 'medium' | 'hard' | 'expert'> = ['easy', 'medium', 'hard', 'expert']
      const solvedDifficulties = getSolvedDifficulties(state.solutionState)
      
      // Find the first bucket with 4 tiles that are actually from the same country/difficulty
      let validBucketIdx = -1
      let actualDifficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert' | null = null
      
      for (let i = 0; i < state.buckets.length; i++) {
        const bucket = state.buckets[i]
        if (bucket.size === 4) {
          // Validate that all 4 tiles in this bucket are actually from the same country AND difficulty
          const tileIds = Array.from(bucket)
          const tiles = tileIds.map(id => state.puzzleData.tileDataList[id])
          
          // Check if all tiles have the same groupName (country) and difficulty
          const groupNames = tiles.map(tile => tile.groupName).filter(Boolean)
          const difficulties = tiles.map(tile => tile.difficulty).filter(Boolean)
          
          if (groupNames.length === 4 && new Set(groupNames).size === 1 &&
              difficulties.length === 4 && new Set(difficulties).size === 1) {
            // All tiles are from the same country and difficulty
            const tileDifficulty = difficulties[0] as 'Easy' | 'Medium' | 'Hard' | 'Expert'
            const tileDifficultyLower = tileDifficulty.toLowerCase() as 'easy' | 'medium' | 'hard' | 'expert'
            
            // Check if this difficulty hasn't been solved yet
            if (!solvedDifficulties.has(tileDifficultyLower)) {
              validBucketIdx = i
              actualDifficulty = tileDifficulty
              break
            }
          }
        }
      }
      
      if (validBucketIdx === -1 || !actualDifficulty) return state
      
      // Move tiles to the correct bucket based on their actual difficulty
      const correctBucketIdx = bucketDifficulties.indexOf(actualDifficulty.toLowerCase() as 'easy' | 'medium' | 'hard' | 'expert')
      const tileIds = Array.from(state.buckets[validBucketIdx])
      
      // Create new buckets with tiles in the correct position
      const newBuckets = state.buckets.map((bucket, i) => new Set(bucket))
      const newBucketIndex = new Map(state.bucketIndex)
      
      // Remove tiles from current bucket and add to correct bucket
      newBuckets[validBucketIdx] = new Set<number>()
      newBuckets[correctBucketIdx] = new Set(tileIds)
      
      // Update bucket index
      tileIds.forEach(tileId => {
        newBucketIndex.set(tileId, correctBucketIdx)
      })
      
      // Create temporary state with corrected buckets
      const tempState = {
        ...state,
        buckets: newBuckets,
        bucketIndex: newBucketIndex
      }
      
      const gameState = createGameStateFromZustand(tempState)
      const successUpdate = createSuccessUpdate(state.gameMode, 'tile-submission', [correctBucketIdx], gameState)
      successUpdate.feedbackMessage = 'Group solved.'
      
      return applyGameStateUpdate(state, successUpdate)
    })
  },

  // Give up handler - reveals all tiles and ends game
  handleGiveUp: () => {
    set((state) => {

      if (!state.puzzleData.tileDataList || state.puzzleData.tileDataList.length === 0) {
        return state
      }

      // COMPLETELY REBUILD from original puzzle data, ignoring any corrupted state
      const bucketDifficulties: Array<'easy' | 'medium' | 'hard' | 'expert'> = ['easy', 'medium', 'hard', 'expert']
      
      // Group tiles by their ACTUAL difficulty from the original data
      const tilesByDifficulty = new Map<string, number[]>()
      state.puzzleData.tileDataList.forEach((tile, index) => {
        if (tile.difficulty) {
          const difficulty = tile.difficulty.toLowerCase()
          if (!tilesByDifficulty.has(difficulty)) {
            tilesByDifficulty.set(difficulty, [])
          }
          tilesByDifficulty.get(difficulty)!.push(index)
        }
      })

      // Create completely fresh solved rows from original data
      const allSolvedRows: Array<{tileIndexes: number[], difficulty: 'easy' | 'medium' | 'hard' | 'expert'}> = []
      
      bucketDifficulties.forEach(difficulty => {
        const tiles = tilesByDifficulty.get(difficulty) || []
        if (tiles.length === 4) {
          allSolvedRows.push({
            tileIndexes: tiles,
            difficulty: difficulty as 'easy' | 'medium' | 'hard' | 'expert'
          })
        }
      })

      // Create a new visual order with all tiles grouped by difficulty
      const newVisualOrder: number[] = []
      allSolvedRows.forEach(solvedRow => {
        newVisualOrder.push(...solvedRow.tileIndexes)
      })
      
      // Add any remaining tiles (shouldn't be any, but just in case)
      const allSolvedTileIds = new Set(allSolvedRows.flatMap(row => row.tileIndexes))
      state.puzzleData.visualTileOrder.forEach(tileId => {
        if (!allSolvedTileIds.has(tileId)) {
          newVisualOrder.push(tileId)
        }
      })

      // Compute new rows of tile IDs
      const newRowsOfTileIds = computeRowsOfTileIds(newVisualOrder)

      // Create final solution state
      const newSolutionState = {
        solvedRows: allSolvedRows
      }

      return {
        ...state,
        puzzleData: {
          ...state.puzzleData,
          visualTileOrder: newVisualOrder
        },
        rowsOfTileIds: newRowsOfTileIds,
        solutionState: newSolutionState,
        gameOver: false, // Don't trigger game over popup, just reveal tiles
        gaveUp: true, // Track that we gave up, so popup knows not to show victory
        feedbackMessage: 'All groups revealed.',
        feedbackMessageId: state.feedbackMessageId + 1,
        feedbackType: 'info' as const,
        // Clear all selection state
        selectedTiles: new Set<number>(),
        buckets: [new Set<number>(), new Set<number>(), new Set<number>(), new Set<number>()],
        bucketIndex: new Map<number, number>(),
        tileSelectionOrder: [],
        showCountryGuess: false,
        correctCountry: null
      }
    })
  },
  
  hasSelectedValidGridGuess: () => {
    const state = get()
    
    if (state.gameMode === 'expert') {
      // Expert mode: all 4 buckets must be full (16 tiles total)
      return state.buckets.every(bucket => bucket.size === 4)
    } else {
      // Normal mode: exactly 4 tiles selected (one in each bucket)
      return state.selectedTiles.size === 4
    }
  },
  
  // Hint system actions
  startHintMode: () => {
    set((state) => ({
      hintMode: true,
      feedbackMessage: 'Click a tile to reveal the country',
      feedbackType: 'info',
      feedbackMessageId: state.feedbackMessageId + 1
    }))
  },
  
  cancelHintMode: () => {
    set((state) => ({
      hintMode: false,
      feedbackMessage: '',
      feedbackType: null,
      feedbackMessageId: state.feedbackMessageId + 1
    }))
  },
  
  revealTile: (tileId) => {
    set((state) => {
      // Check hard cap first - if we've used 10 hints total, don't allow more
      if (state.totalHintsUsed >= 10) {
        return {
          ...state,
          hintMode: false,
          feedbackMessage: 'You\'ve used all available hints for this puzzle!',
          feedbackType: 'error',
          feedbackMessageId: state.feedbackMessageId + 1
        }
      }
      
      if (!state.hintMode || state.hintsLeft <= 0 || state.revealedTiles.has(tileId)) {
        return state
      }
      
      const newRevealedTiles = new Set(state.revealedTiles)
      newRevealedTiles.add(tileId)
      
      // Record hint use event
      const hintUseEvent = createHintUseEvent(tileId)
      const newAttemptEvents = [...state.attemptEvents, hintUseEvent]
      
      logHintUsed({ puzzleNumber: state.puzzleNumber, mode: state.gameMode })
      
      return {
        hintMode: false,
        hintsLeft: state.hintsLeft - 1,
        totalHintsUsed: state.totalHintsUsed + 1,
        revealedTiles: newRevealedTiles,
        feedbackMessage: '',
        feedbackType: null,
        feedbackMessageId: state.feedbackMessageId + 1,
        attemptEvents: newAttemptEvents
      }
    })
  },
  
  getMoreHints: () => {
    set((state) => {
      // Check if we've hit the hard cap
      if (state.totalHintsUsed >= 10) {
        return {
          ...state,
          feedbackMessage: 'You\'ve reached the maximum number of hints for this puzzle!',
          feedbackType: 'error',
          feedbackMessageId: state.feedbackMessageId + 1
        }
      }
      
      // Calculate how many hints we can actually give
      const hintsRemaining = 10 - state.totalHintsUsed
      const hintsToGive = Math.min(2, hintsRemaining)
      
      if (hintsToGive === 0) {
        return {
          ...state,
          feedbackMessage: 'No more hints available!',
          feedbackType: 'error',
          feedbackMessageId: state.feedbackMessageId + 1
        }
      }
      
      return {
        ...state,
        hintsLeft: state.hintsLeft + hintsToGive,
        feedbackMessage: `Added ${hintsToGive} more hint${hintsToGive > 1 ? 's' : ''}!`,
        feedbackType: 'success',
        feedbackMessageId: state.feedbackMessageId + 1
      }
    })
  },
  
  // Puzzle completion tracking
  trackPuzzleCompletion: () => {
    const state = get()
    const puzzleNumber = parseInt(state.puzzleData.puzzleId || '1', 10)
    markPuzzleCompleted(puzzleNumber)
  },
  
  trackPuzzleAttempt: () => {
    const state = get()
    const puzzleNumber = parseInt(state.puzzleData.puzzleId || '1', 10)
    markPuzzleAttempted(puzzleNumber)
  }
}))
