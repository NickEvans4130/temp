import { TileData } from './types'
import { dispatchShakeForSelectedTiles } from './shakeEvents'
import { createGroupGuessEvent, AttemptEvent, createTileGuessEvent } from './shareUtils'
import { markPuzzleAttempted, markPuzzleCompleted } from './puzzleCompletion'
import { markPuzzleSolved } from './streakUtils'
import { logFailedAttempt, logGroupSolved, logPuzzleCompleted, logPuzzleFailed } from './analytics'

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'

export interface SolvedRow {
  tileIndexes: number[]
  difficulty: Difficulty
}

export interface SolutionState {
  solvedRows: SolvedRow[]
}

const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'hard', 'expert']

const difficultyFromBucketIndex = (index: number): Difficulty => DIFFICULTY_ORDER[index] ?? 'easy'

export const getSolvedDifficulties = (solutionState: SolutionState): Set<Difficulty> => {
  return new Set(solutionState.solvedRows.map(row => row.difficulty))
}

const buildExpertTileCombinationKey = (buckets: Array<Set<number>>): string => {
  const bucketKeys = buckets.map(bucket => {
    if (bucket.size === 0) return ''
    return Array.from(bucket).sort((a, b) => a - b).join(',')
  })
  return `tile-submission:expert:${bucketKeys.join('|')}`
}

const parsePuzzleNumber = (puzzleId: string | null): number => {
  const parsed = parseInt(puzzleId ?? '', 10)
  return Number.isNaN(parsed) ? 1 : parsed
}

// Helper function to create initial game state for a mode
export function createInitialGameState(mode: GameMode, visualTileOrder: number[], feedbackMessageId: number): Partial<GameState> {
  const newBuckets = [new Set<number>(), new Set<number>(), new Set<number>(), new Set<number>()]
  const initialSolutionState: SolutionState = { solvedRows: [] }
  const newCanSubmit = computeCanSubmit(newBuckets, initialSolutionState, mode)
  const rowsOfTileIds = computeRowsOfTileIds(visualTileOrder)
  
  return {
    gameMode: mode,
    mistakesLeft: mode === 'easy' ? Infinity : mode === 'expert' ? 2 : 4,
    mistakesMade: 0,
    gameOver: false,
    buckets: newBuckets,
    bucketIndex: new Map<number, number>(),
    solutionState: initialSolutionState,
    selectedTiles: new Set<number>(),
    guessHistory: new Set<string>(),
    feedbackMessage: '',
    feedbackMessageId: feedbackMessageId + 1,
    feedbackType: null,
    showCountryGuess: false,
    correctCountry: null,
    attemptEvents: [],
    visualTileOrder,
    rowsOfTileIds,
    // Reset hint system for new difficulty
    hintsLeft: 2,
    hintMode: false,
    revealedTiles: new Set<number>(),
    totalHintsUsed: 0
  }
}

// Helper function to convert Zustand state to GameState
export function createGameStateFromZustand(state: any): GameState {
  return {
    gameMode: state.gameMode,
    mistakesLeft: state.mistakesLeft,
    mistakesMade: state.mistakesMade,
    gameOver: state.gameOver,
    buckets: state.buckets,
    bucketIndex: state.bucketIndex,
    solutionState: state.solutionState,
    selectedTiles: state.selectedTiles,
    tileSelectionOrder: state.tileSelectionOrder,
    tileDataList: state.puzzleData.tileDataList,
    guessHistory: state.guessHistory,
    feedbackMessage: state.feedbackMessage,
    feedbackMessageId: state.feedbackMessageId,
    feedbackType: state.feedbackType,
    showCountryGuess: state.showCountryGuess,
    correctCountry: state.correctCountry,
    attemptEvents: state.attemptEvents,
    streak: state.streak,
    puzzleId: state.puzzleData.puzzleId,
    visualTileOrder: state.puzzleData.visualTileOrder,
    revealedTiles: state.revealedTiles,
    rowsOfTileIds: state.rowsOfTileIds,
    hintsLeft: state.hintsLeft,
    hintMode: state.hintMode,
    totalHintsUsed: state.totalHintsUsed
  }
}

// Helper function to apply GameStateUpdate to Zustand state
export function applyGameStateUpdate(state: any, update: GameStateUpdate): any {
  const mergedBuckets = update.buckets ?? state.buckets
  const mergedSolutionState = update.solutionState ?? state.solutionState
  
  const visualOrderFromUpdate = update.visualTileOrder ?? update.puzzleData?.visualTileOrder
  const nextVisualOrder = visualOrderFromUpdate ?? state.puzzleData.visualTileOrder
  const nextRowsOfTileIds = nextVisualOrder ? computeRowsOfTileIds(nextVisualOrder) : state.rowsOfTileIds
  
  const nextPuzzleData = (() => {
    if (update.puzzleData) {
      return {
        ...state.puzzleData,
        ...update.puzzleData,
        visualTileOrder: update.puzzleData.visualTileOrder ?? update.visualTileOrder ?? state.puzzleData.visualTileOrder
      }
    }
    
    if (update.visualTileOrder) {
      return {
        ...state.puzzleData,
        visualTileOrder: update.visualTileOrder
      }
    }
    
    return state.puzzleData
  })()
  
  return {
    ...state,
    ...update,
    puzzleData: nextPuzzleData,
    canSubmit: computeCanSubmit(mergedBuckets, mergedSolutionState, state.gameMode),
    rowsOfTileIds: nextRowsOfTileIds
  }
}

export type GameMode = 'easy' | 'normal' | 'expert'
export type GuessType = 'tile-submission' | 'country-guess'

export interface GameState {
  gameMode: GameMode
  mistakesLeft: number
  mistakesMade: number
  gameOver: boolean
  buckets: Array<Set<number>>
  bucketIndex: Map<number, number>
  solutionState: SolutionState
  selectedTiles: Set<number>
  tileSelectionOrder: number[]
  tileDataList: TileData[]
  guessHistory: Set<string>
  feedbackMessage: string
  feedbackMessageId: number
  feedbackType: 'success' | 'error' | 'info' | null
  showCountryGuess: boolean
  correctCountry: string | null
  attemptEvents: AttemptEvent[]
  streak: number
  puzzleId: string | null
  visualTileOrder: number[]
  revealedTiles: Set<number>
  rowsOfTileIds: number[][]
  hintsLeft: number
  hintMode: boolean
  totalHintsUsed: number
}

export interface GameStateUpdate {
  mistakesLeft?: number
  mistakesMade?: number
  gameOver?: boolean
  buckets?: Array<Set<number>>
  bucketIndex?: Map<number, number>
  solutionState?: SolutionState
  selectedTiles?: Set<number>
  guessHistory?: Set<string>
  feedbackMessage?: string
  feedbackMessageId?: number
  feedbackType?: 'success' | 'error' | 'info' | null
  showCountryGuess?: boolean
  correctCountry?: string | null
  attemptEvents?: AttemptEvent[]
  streak?: number
  visualTileOrder?: number[]
  puzzleData?: {
    puzzleId: string
    tileDataList: TileData[]
    visualTileOrder: number[]
  }
  rowsOfTileIds?: number[][]
  hintsLeft?: number
  hintMode?: boolean
  totalHintsUsed?: number
}

// Helper function to compute canSubmit based on state
export const computeCanSubmit = (buckets: Array<Set<number>>, solutionState: SolutionState, gameMode: GameMode): boolean => {
  const solvedDifficulties = getSolvedDifficulties(solutionState)
  
  if (gameMode === 'expert') {
    // Expert mode: all unsolved buckets must be full and we must have at least one filled bucket
    const unsolvedBuckets = buckets.filter((bucket, i) => {
      const difficulty = difficultyFromBucketIndex(i)
      return !solvedDifficulties.has(difficulty)
    })
    
    if (unsolvedBuckets.length === 0) return false
    
    return unsolvedBuckets.every(bucket => bucket.size === 4)
  } else {
    // Normal mode: at least one unsolved bucket must be full
    return buckets.some((bucket, i) => {
      const difficulty = difficultyFromBucketIndex(i)
      if (solvedDifficulties.has(difficulty)) {
        return false
      }
      return bucket.size === 4
    })
  }
}

// Helper function to compute rows of tile IDs
export const computeRowsOfTileIds = (visualTileOrder: number[]): number[][] => {
  const rows: number[][] = []
  for (let r = 0; r < 4; r++) {
    const startIndex = r * 4
    const endIndex = startIndex + 4
    const rowTileIds = visualTileOrder.slice(startIndex, endIndex)
    rows.push(rowTileIds)
  }
  return rows
}

// Pure function to detect guess type
export function detectGuessType(
  input: string | null,
  buckets: Array<Set<number>>,
  gameMode: GameMode
): GuessType {
  if (input === null) {
    return 'tile-submission'
  }
  
  if (input.includes('|')) {
    return 'country-guess'
  }
  
  // If we have a string input, it's a country guess
  return 'country-guess'
}

// Pure function to validate tile group
export function validateTileGroup(
  tileIds: number[],
  tileDataList: TileData[]
): { isValid: boolean; country: string | null; errorMessage?: string } {
  if (tileIds.length !== 4) {
    return { isValid: false, country: null, errorMessage: 'Group must have exactly 4 tiles' }
  }
  
  const selectedTileData = tileIds.map(tileId => tileDataList[tileId]).filter(Boolean)
  
  // Get country codes from selected tiles
  const countryCounts = new Map<string, number>()
  selectedTileData.forEach(tile => {
    if (tile.groupName) {
      countryCounts.set(tile.groupName, (countryCounts.get(tile.groupName) || 0) + 1)
    }
  })
  
  const uniqueCountries = Array.from(countryCounts.keys())
  
  if (uniqueCountries.length === 1) {
    return { isValid: true, country: uniqueCountries[0] }
  } else {
    return { isValid: false, country: null, errorMessage: 'Tiles must be from the same country' }
  }
}

// Pure function to get country distribution
export function getCountryDistribution(
  tileIds: number[],
  tileDataList: TileData[]
): Map<string, number> {
  const countryCounts = new Map<string, number>()
  const selectedTileData = tileIds.map(tileId => tileDataList[tileId]).filter(Boolean)
  
  selectedTileData.forEach(tile => {
    if (tile.groupName) {
      countryCounts.set(tile.groupName, (countryCounts.get(tile.groupName) || 0) + 1)
    }
  })
  
  return countryCounts
}

// Pure function to check if all tiles are from same country
export function isUniformGroup(
  tileIds: number[],
  tileDataList: TileData[]
): boolean {
  const countryCounts = getCountryDistribution(tileIds, tileDataList)
  return countryCounts.size === 1
}

// Pure function to get submission requirements
export function getSubmissionRequirements(
  gameMode: GameMode,
  buckets: Array<Set<number>>,
  solutionState: SolutionState
): { canSubmit: boolean; requiredBuckets: number[]; errorMessage?: string } {
  const solvedDifficulties = getSolvedDifficulties(solutionState)
  
  if (gameMode === 'expert') {
    const allFull = buckets.every((bucket, i) => {
      const difficulty = difficultyFromBucketIndex(i)
      if (solvedDifficulties.has(difficulty)) {
        return true
      }
      return bucket.size === 4
    })
    
    if (!allFull) {
      return {
        canSubmit: false,
        requiredBuckets: [],
        errorMessage: 'Expert: pick all 16 tiles (4 groups) before submitting.'
      }
    }
    
    return {
      canSubmit: true,
      requiredBuckets: [0, 1, 2, 3]
    }
  } else {
    const firstFullIdx = buckets.findIndex((bucket, i) => {
      const difficulty = difficultyFromBucketIndex(i)
      if (solvedDifficulties.has(difficulty)) {
        return false
      }
      return bucket.size === 4
    })
    
    if (firstFullIdx === -1) {
      return {
        canSubmit: false,
        requiredBuckets: [],
        errorMessage: 'Select 4 tiles to submit.'
      }
    }
    
    return {
      canSubmit: true,
      requiredBuckets: [firstFullIdx]
    }
  }
}

// Pure function to get mistake penalty
export function getMistakePenalty(gameMode: GameMode, guessType: GuessType): number {
  return 1 // All mistakes cost 1 life
}

// Generate error message based on country distribution
export function getCountryDistributionErrorMessage(
  tileIds: number[],
  tileDataList: TileData[],
  prefix: string = ''
): string {
  const countryCounts = getCountryDistribution(tileIds, tileDataList)
  const maxCount = Math.max(...Array.from(countryCounts.values()))
  
  const baseMessage = (() => {
    if (maxCount === 3) {
      return 'One away!'
    } else if (maxCount === 2) {
      return 'Two away!'
    } else {
      return "Those tiles aren't in a group!"
    }
  })()
  
  return prefix ? `${prefix}${baseMessage.toLowerCase()}` : baseMessage
}

// Pure function to get duplicate check key
export function getDuplicateKey(
  gameMode: GameMode,
  guessType: GuessType,
  input: string | null,
  tileIds?: number[]
): string {
  if (guessType === 'tile-submission') {
    if (gameMode === 'expert') {
      if (tileIds && tileIds.length > 0) {
        const sorted = [...tileIds].sort((a, b) => a - b)
        return `tile-submission:expert:${sorted.join(',')}`
      }
      return 'tile-submission:expert'
    } else {
      // For normal/easy, use the specific tile combination
      return `tile:${tileIds?.sort().join(',') || ''}`
    }
  } else {
    // Country guess
    if (gameMode === 'expert') {
      return `expert:${input}`
    } else {
      // For normal/easy, combine tiles with country guess
      return `${tileIds?.sort().join(',') || ''}:${input}`
    }
  }
}

// Pure function to create success state update
export function createSuccessUpdate(
  gameMode: GameMode,
  guessType: GuessType,
  correctGroups: number[],
  currentState: GameState,
  countryGuess?: string
): GameStateUpdate {
  const newBuckets = currentState.buckets.map((bucket, i) => 
    correctGroups.includes(i) ? new Set<number>() : bucket
  )
  
  const newBucketIndex = new Map([...currentState.bucketIndex].filter(([k]) => {
    return !correctGroups.some(groupIdx => currentState.buckets[groupIdx].has(k))
  }))
  
  // Move solved tiles to solved rows
  const currentVisualOrder = [...currentState.visualTileOrder]
  const solvedRowStart = currentState.solutionState.solvedRows.length * 4
  const newVisualOrder = [...currentVisualOrder]
  
  // Collect all tiles that need to be moved to solved rows
  const tilesToMove: number[] = []
  correctGroups.forEach(groupIdx => {
    const selectedTileIds = Array.from(currentState.buckets[groupIdx])
    tilesToMove.push(...selectedTileIds)
  })
  
  // Move tiles to solved rows
  tilesToMove.forEach((tileId, index) => {
    const targetPosition = solvedRowStart + index
    if (targetPosition < newVisualOrder.length) {
      // Find current position of this tile
      const currentPos = newVisualOrder.findIndex(id => id === tileId)
      if (currentPos !== -1) {
        // Swap with whatever is at the target position
        const tileAtTarget = newVisualOrder[targetPosition]
        newVisualOrder[targetPosition] = tileId
        newVisualOrder[currentPos] = tileAtTarget
      }
    }
  })
  
  const newRowsOfTileIds = computeRowsOfTileIds(newVisualOrder)
  const newSolutionRows = [...currentState.solutionState.solvedRows]
  const puzzleNumber = parsePuzzleNumber(currentState.puzzleId)
  const analyticsContext = { puzzleNumber, mode: currentState.gameMode }
  
  correctGroups.forEach(groupIdx => {
    const selectedTileIds = Array.from(currentState.buckets[groupIdx])
    const difficulty = difficultyFromBucketIndex(groupIdx)
    newSolutionRows.push({
      tileIndexes: selectedTileIds,
      difficulty
    })
    
    const firstTileId = selectedTileIds[0]
    const countryName = typeof firstTileId === 'number'
      ? currentState.tileDataList[firstTileId]?.groupName ?? undefined
      : undefined
    
    logGroupSolved(analyticsContext, countryName)
  })
  
  // Check if puzzle is completed
  const isPuzzleCompleted = newSolutionRows.length === 4
  
  if (isPuzzleCompleted) {
    markPuzzleCompleted(puzzleNumber)
    const newStreak = markPuzzleSolved(puzzleNumber)
    currentState.streak = newStreak
    
    if (currentState.solutionState.solvedRows.length < 4) {
      logPuzzleCompleted(analyticsContext)
    }
  }
  
  // Record successful group guess events BEFORE clearing buckets
  const newAttemptEvents = [...currentState.attemptEvents]
  const originalTileIds = correctGroups.map(groupIdx => Array.from(currentState.buckets[groupIdx]))
  correctGroups.forEach((groupIdx, i) => {
    const selectedTileIds = originalTileIds[i] // Use original buckets before clearing
    const named = guessType === 'country-guess'
    const groupGuessEvent = createGroupGuessEvent(
      selectedTileIds,
      currentState.tileDataList,
      true,
      currentState.revealedTiles,
      named
    )
    newAttemptEvents.push(groupGuessEvent)
  })
  
  // Create duplicate key for history
  const duplicateKey = getDuplicateKey(gameMode, guessType, countryGuess || null, correctGroups.length > 0 ? Array.from(currentState.buckets[correctGroups[0]]) : undefined)
  
  return {
    buckets: newBuckets,
    bucketIndex: newBucketIndex,
    selectedTiles: new Set<number>(),
    solutionState: { solvedRows: newSolutionRows },
    feedbackMessage: 'Correct!',
    feedbackMessageId: currentState.feedbackMessageId + 1,
    feedbackType: 'success',
    showCountryGuess: false,
    correctCountry: null,
    rowsOfTileIds: newRowsOfTileIds,
    attemptEvents: newAttemptEvents,
    streak: currentState.streak,
    visualTileOrder: newVisualOrder,
    guessHistory: new Set([...currentState.guessHistory, duplicateKey])
  }
}

// Pure function to create error state update
export function createErrorUpdate(
  gameMode: GameMode,
  guessType: GuessType,
  errorMessage: string,
  currentState: GameState,
  mistakePenalty: number,
  countryGuess?: string,
  addedAttemptEvents: AttemptEvent[] = [],
  duplicateKeyOverride?: string
): GameStateUpdate {
  const newMistakesLeft = currentState.mistakesLeft - mistakePenalty
  const isGameOver = newMistakesLeft <= 0
  
  // Dispatch shake event for selected tiles when mistakes occur
  if (currentState.selectedTiles.size > 0) {
    dispatchShakeForSelectedTiles(currentState.selectedTiles)
  }
  
  // Create duplicate key for history
  const duplicateKey = duplicateKeyOverride ?? getDuplicateKey(gameMode, guessType, countryGuess || null, Array.from(currentState.selectedTiles))
  
  const update: GameStateUpdate = {
    feedbackMessage: errorMessage,
    feedbackMessageId: currentState.feedbackMessageId + 1,
    feedbackType: 'error',
    mistakesLeft: newMistakesLeft,
    mistakesMade: currentState.mistakesMade + mistakePenalty,
    gameOver: isGameOver,
    guessHistory: new Set([...currentState.guessHistory, duplicateKey])
  }
  
  if (addedAttemptEvents.length > 0) {
    update.attemptEvents = [...currentState.attemptEvents, ...addedAttemptEvents]
  }
  
  if (guessType === 'tile-submission') {
    // Keep buckets and bucketIndex so tiles stay selected and can be resubmitted
    // This allows users to try different groupings with the same tiles
  } else {
    // Keep dropdown open for country guesses
    update.showCountryGuess = true
    update.correctCountry = null
  }

  const puzzleNumber = parsePuzzleNumber(currentState.puzzleId)
  const analyticsContext = { puzzleNumber, mode: currentState.gameMode }
  let analyticsNotes = errorMessage
  
  if (currentState.gameMode === 'expert') {
    analyticsNotes = guessType === 'tile-submission' ? 'expert_grouping_wrong' : 'expert_naming_wrong'
  }
  
  logFailedAttempt(analyticsContext, analyticsNotes)
  
  if (isGameOver && !currentState.gameOver) {
    logPuzzleFailed(analyticsContext, 'out_of_mistakes')
  }
  
  return update
}

// Pure function to create duplicate error
export function createDuplicateError(
  gameMode: GameMode,
  currentState: GameState
): GameStateUpdate {
  let feedbackMessage = 'Already tried this combination!'
  let showCountryGuess = false
  
  // For normal/easy mode tile submissions, add the "X away" info if tiles are selected
  if (gameMode !== 'expert' && currentState.selectedTiles.size === 4) {
    const selectedTileIds = Array.from(currentState.selectedTiles)
    const distanceMessage = getCountryDistributionErrorMessage(selectedTileIds, currentState.tileDataList, 'Already tried this combination — ')
    if (distanceMessage !== "Already tried this combination — those tiles aren't in a group!") {
      feedbackMessage = distanceMessage
      // Only show country guess dropdown if the tiles form a valid group
      const validation = validateTileGroup(selectedTileIds, currentState.tileDataList)
      showCountryGuess = gameMode === 'easy' && validation.isValid
    }
  }
  
  return {
    feedbackMessage,
    feedbackMessageId: currentState.feedbackMessageId + 1,
    feedbackType: 'error',
    showCountryGuess,
    correctCountry: null
  }
}

// Pure function to handle tile submission
export function handleTileSubmission(
  gameMode: GameMode,
  buckets: Array<Set<number>>,
  solutionState: SolutionState,
  tileDataList: TileData[],
  guessHistory: Set<string>,
  currentState: GameState
): GameStateUpdate {
  const requirements = getSubmissionRequirements(gameMode, buckets, solutionState)
  
  if (!requirements.canSubmit) {
    return {
      feedbackMessage: requirements.errorMessage || 'Cannot submit',
      feedbackMessageId: currentState.feedbackMessageId + 1,
      feedbackType: 'error'
    }
  }
  
  const tileGuessEvents: AttemptEvent[] = []
  
  if (gameMode === 'expert') {
    // Expert mode: validate all 4 buckets contain valid groups
    // Don't check for duplicate tile combinations - allow resubmission
    
    let validGroupsCount = 0
    const solvedDifficulties = getSolvedDifficulties(solutionState)
    
    for (let bucketIndex = 0; bucketIndex < 4; bucketIndex++) {
      const bucket = buckets[bucketIndex]
      const difficulty = difficultyFromBucketIndex(bucketIndex)
      
      // Skip already solved groups
      if (solvedDifficulties.has(difficulty)) {
        validGroupsCount++
        continue
      }
      
      if (bucket.size === 4) {
        tileGuessEvents.push(
          createTileGuessEvent(Array.from(bucket), tileDataList, currentState.revealedTiles, currentState.visualTileOrder, currentState.tileSelectionOrder)
        )
        const selectedTileIds = Array.from(bucket)
        const validation = validateTileGroup(selectedTileIds, tileDataList)
        
        if (validation.isValid) {
          validGroupsCount++
        }
      }
    }
    
    if (validGroupsCount < 4) {
      let errorMessage = ''
      if (validGroupsCount === 0) {
        errorMessage = '0 groups are correct.'
      } else if (validGroupsCount === 1) {
        errorMessage = 'Only 1 group is correct.'
      } else if (validGroupsCount === 2) {
        errorMessage = 'Only 2 groups are correct.'
      }
      
      const mistakePenalty = getMistakePenalty(gameMode, 'tile-submission')
      return createErrorUpdate(
        gameMode,
        'tile-submission',
        errorMessage,
        currentState,
        mistakePenalty,
        undefined,
        tileGuessEvents
      )
    }
    
    // All groups valid, show country guess dropdown
    // Don't add tile guess events yet - only add them when country guess is submitted
    // This prevents "already submitted" errors if user cancels the country guess
    return {
      showCountryGuess: true
    }
  } else {
    // Normal/Easy mode: validate single group
    const firstFullIdx = requirements.requiredBuckets[0]
    const selectedTileIds = Array.from(buckets[firstFullIdx])
    
    // Create a unique key for this tile guess
    const tileGuessKey = `tile:${selectedTileIds.sort().join(',')}`
    
    // Check if this exact tile combination has been tried before
    if (guessHistory.has(tileGuessKey)) {
      return createDuplicateError(gameMode, currentState)
    }
    
    // Use the selection order to preserve the exact visual arrangement
    const tileGuessEvent = createTileGuessEvent(selectedTileIds, tileDataList, currentState.revealedTiles, currentState.visualTileOrder, currentState.tileSelectionOrder)
    
    const validation = validateTileGroup(selectedTileIds, tileDataList)
    
    if (!validation.isValid) {
      // Create helpful error message based on country distribution
      const errorMessage = getCountryDistributionErrorMessage(selectedTileIds, tileDataList)
      
      const mistakePenalty = getMistakePenalty(gameMode, 'tile-submission')
      return createErrorUpdate(
        gameMode,
        'tile-submission',
        errorMessage,
        currentState,
        mistakePenalty,
        undefined,
        [tileGuessEvent]
      )
    }
    
    // Valid group, show country guess dropdown
    return {
      showCountryGuess: true,
      attemptEvents: [...currentState.attemptEvents, tileGuessEvent]
    }
  }
}

// Pure function to handle country guess
export function handleCountryGuess(
  gameMode: GameMode,
  input: string,
  buckets: Array<Set<number>>,
  solutionState: SolutionState,
  tileDataList: TileData[],
  guessHistory: Set<string>,
  currentState: GameState
): GameStateUpdate {
  const solvedDifficulties = getSolvedDifficulties(solutionState)
  
  if (gameMode === 'expert') {
    // Expert mode: validate all 4 groups at once
    if (!input.includes('|')) {
      return currentState // Invalid format
    }
    
    const countryCodes = input.split('|')
    if (countryCodes.length !== 4) {
      return currentState // Invalid format
    }
    
    // Check all 4 groups
    let allCorrect = true
    const correctGroups: number[] = []
    const bucketResults: Array<{ bucketIndex: number; tileIds: number[]; isCorrect: boolean }> = []
    
    for (let bucketIndex = 0; bucketIndex < 4; bucketIndex++) {
      const bucket = buckets[bucketIndex]
      const difficulty = difficultyFromBucketIndex(bucketIndex)
      if (bucket.size !== 4 || solvedDifficulties.has(difficulty)) {
        continue // Skip empty or already solved buckets
      }
      
      const selectedTileIds = Array.from(bucket)
      const validation = validateTileGroup(selectedTileIds, tileDataList)
      
      // Check if all 4 tiles are from the same country and it matches the guess
      const guessedCountry = countryCodes[bucketIndex]
      const isCorrect = validation.isValid && validation.country === guessedCountry
      bucketResults.push({ bucketIndex, tileIds: selectedTileIds, isCorrect })
      
      if (isCorrect) {
        correctGroups.push(bucketIndex)
      } else {
        allCorrect = false
      }
    }
    
    if (allCorrect) {
      return createSuccessUpdate(gameMode, 'country-guess', correctGroups, currentState, input)
    } else {
      // Check for duplicate guess first
      const expertGuessKey = `expert:${countryCodes.join('|')}`
      
      if (guessHistory.has(expertGuessKey)) {
        return createDuplicateError(gameMode, currentState)
      }
      
      const correctCount = correctGroups.length
      let errorMessage = ''
      if (correctCount === 0) {
        errorMessage = 'All country guesses are wrong! Try again.'
      } else if (correctCount === 1) {
        errorMessage = 'Only 1 group is correct. Try again.'
      } else if (correctCount === 2) {
        errorMessage = 'Only 2 groups are correct. Try again.'
      } else if (correctCount === 3) {
        errorMessage = 'Only 3 groups are correct. Try again.'
      }
      
      const mistakePenalty = getMistakePenalty(gameMode, 'country-guess')
      
      // Create tile_guess events for each bucket (these weren't added during tile submission)
      const tileGuessEvents: AttemptEvent[] = []
      for (let bucketIndex = 0; bucketIndex < 4; bucketIndex++) {
        const bucket = buckets[bucketIndex]
        const difficulty = difficultyFromBucketIndex(bucketIndex)
        if (bucket.size === 4 && !solvedDifficulties.has(difficulty)) {
          tileGuessEvents.push(
            createTileGuessEvent(Array.from(bucket), tileDataList, currentState.revealedTiles, currentState.visualTileOrder)
          )
        }
      }
      
      const groupGuessEvents = bucketResults.map(result =>
        createGroupGuessEvent(result.tileIds, tileDataList, result.isCorrect, currentState.revealedTiles)
      )
      
      // Combine tile_guess and group_guess events
      const allEvents = [...tileGuessEvents, ...groupGuessEvents]
      
      return createErrorUpdate(
        gameMode,
        'country-guess',
        errorMessage,
        currentState,
        mistakePenalty,
        input,
        allEvents
      )
    }
  } else {
    // Normal/Easy mode: handle single group submission
    const firstFullIdx = buckets.findIndex((bucket, i) => {
      const difficulty = difficultyFromBucketIndex(i)
      if (solvedDifficulties.has(difficulty)) {
        return false
      }
      return bucket.size === 4
    })
    
    if (firstFullIdx === -1) return currentState
    
    const selectedTileIds = Array.from(buckets[firstFullIdx])
    
    // Create a unique key for this tile+country combination
    const tileCountryKey = `${selectedTileIds.sort().join(',')}:${input}`
    
    // Check if this exact combination has been tried before
    if (guessHistory.has(tileCountryKey)) {
      return createDuplicateError(gameMode, currentState)
    }
    
    // !! Validate that the tiles form a valid group
    const validation = validateTileGroup(selectedTileIds, tileDataList)
    
    if (!validation.isValid) {
      // Prevent the bug where invalid tile combinations can be submitted as country guesses
      const errorMessage = getCountryDistributionErrorMessage(selectedTileIds, tileDataList)
      
      const mistakePenalty = getMistakePenalty(gameMode, 'tile-submission')
      const tileGuessEvent = createTileGuessEvent(selectedTileIds, tileDataList, currentState.revealedTiles, currentState.visualTileOrder)
      return createErrorUpdate(
        gameMode,
        'tile-submission',
        errorMessage,
        currentState,
        mistakePenalty,
        undefined,
        [tileGuessEvent]
      )
    }
    
    // Now check if the country guess is correct (tiles are guaranteed to be from same country at this point)
    const isCorrect = validation.country === input
    
    if (isCorrect) {
      return createSuccessUpdate(gameMode, 'country-guess', [firstFullIdx], currentState, input)
    } else {
      // Wrong country guess - tiles are from same country but user guessed wrong country
      const mistakePenalty = getMistakePenalty(gameMode, 'country-guess')
      const groupGuessEvent = createGroupGuessEvent(selectedTileIds, tileDataList, false, currentState.revealedTiles)
      return createErrorUpdate(
        gameMode,
        'country-guess',
        'Wrong country guess!',
        currentState,
        mistakePenalty,
        input,
        [groupGuessEvent]
      )
    }
  }
}

// Main entry point for guess handling
export function handleGuess(
  input: string | null,
  currentState: GameState
): GameStateUpdate {
  const guessType = detectGuessType(input, currentState.buckets, currentState.gameMode)
  
  // For expert mode, we don't check duplicates at the top level
  // Instead, let each handler decide what constitutes a duplicate
  if (currentState.gameMode !== 'expert') {
    // For normal/easy mode, use the standard duplicate checking
    const duplicateKey = getDuplicateKey(currentState.gameMode, guessType, input)
    if (currentState.guessHistory.has(duplicateKey)) {
      return createDuplicateError(currentState.gameMode, currentState)
    }
  }
  
  // Track puzzle attempt
  const puzzleNumber = parseInt(currentState.puzzleId || '1', 10)
  markPuzzleAttempted(puzzleNumber)
  
  // Route to appropriate handler
  switch (guessType) {
    case 'tile-submission':
      return handleTileSubmission(
        currentState.gameMode,
        currentState.buckets,
        currentState.solutionState,
        currentState.tileDataList,
        currentState.guessHistory,
        currentState
      )
      
    case 'country-guess':
      return handleCountryGuess(
        currentState.gameMode,
        input!,
        currentState.buckets,
        currentState.solutionState,
        currentState.tileDataList,
        currentState.guessHistory,
        currentState
      )
      
    default:
      return currentState
  }
}
