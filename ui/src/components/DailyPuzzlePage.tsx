import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { GameMode } from '../stores/uiStore'
import { useImageUtils } from '../hooks/useImageUtils'
import { useAboutPopup } from '../hooks/useAboutPopup'
import { useUIStore } from '../stores/uiStore'
import { getCountryFromTags } from '../utils/countryUtils'
import { findPreviousAvailablePuzzle, findNextAvailablePuzzle, todayPuzzleNumberUTC } from '../utils/puzzleUtils'
import { getPuzzleAttribution } from '../utils/submitterUtils'
import GridRow from './GridRow'
import FullscreenTile from './FullscreenTile'
import SolutionPopup from './SolutionPopup'
import AboutPopup from './AboutPopup'
import Spinner from './Spinner'
import AnswerDisplay from './AnswerDisplay'
import Header from './Header'
import GameControlsBar from './GameControlsBar'


interface DailyPuzzlePageProps {
  puzzleNumber?: number
}

function DailyPuzzlePage({ puzzleNumber: propPuzzleNumber }: DailyPuzzlePageProps = {}) {
  const { number: urlNumber } = useParams<{ number: string }>()
  const number = propPuzzleNumber ? propPuzzleNumber.toString() : urlNumber
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [, setError] = useState<string | null>(null)
  const [showSolutionPopup, setShowSolutionPopup] = useState(false)
  const [shareButtonText, setShareButtonText] = useState('Share')
  
  // Use Zustand store for UI state
  const { 
    puzzleData,
    fullscreenTile, 
    fullscreenMode, 
    loadPuzzle,
    getTileData,
    openFullscreenForTile,
    closeFullscreen,
    toggleFullscreenOnLastTile
  } = useUIStore()
  
  // Use the about popup hook to check localStorage
  const { isOpen: showAboutPopup, closePopup: closeAboutPopup, openPopup: openAboutPopup } = useAboutPopup()
  
  // Game logic now handled by UI store
  const { 
    gameMode,
    mistakesLeft,
    gameOver,
    gaveUp,
    selectedTiles,
    solutionState,
    feedbackMessage,
    feedbackType,
    feedbackMessageId,
    showCountryGuess,
    setCorrectCountry,
    setShowCountryGuess,
    attemptEvents,
    streak,
    hintsLeft,
    hintMode,
    revealedTiles,
    totalHintsUsed,
    handleTileClick, 
    handleTileGroupSubmit,
    handleModeChange, 
    handleShuffle,
    handleCountryGuess,
    startHintMode,
    cancelHintMode,
    revealTile,
    getMoreHints,
    resetGame,
    addMistakes,
    getBucketIndex,
    canSubmit,
    hasSelectedValidGridGuess,
    rowsOfTileIds,
    getMistakesUsed,
    shareResults,
    handleCountryGuessSkip,
    handleGiveUp,
    hiddenTileIndex
  } = useUIStore()
  const solvedRowCount = solutionState.solvedRows.length
  
  const { getThumbnailUrl, getScreenshotUrl, getContrastTextColor, buildEmbedURLForTilePB, getDifficultyColor: getDifficultyColorFromTags } = useImageUtils()

  // Share functionality for game over state
  const handleShare = async () => {
    try {
      const success = await shareResults()
      if (success) {
        setShareButtonText('Copied!')
        setTimeout(() => {
          setShareButtonText('Share')
        }, 2000)
      } else {
        // Fallback: show text in console
        setShareButtonText('Check console')
        setTimeout(() => {
          setShareButtonText('Share')
        }, 2000)
      }
    } catch (err) {
      console.error('Failed to share:', err)
      setShareButtonText('Error')
      setTimeout(() => {
        setShareButtonText('Share')
      }, 2000)
    }
  }

  // Navigation state
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)
  const [previousPuzzleNum, setPreviousPuzzleNum] = useState<number | null>(null)
  const [nextPuzzleNum, setNextPuzzleNum] = useState<number | null>(null)

  // Navigation functions
  const currentPuzzleNum = parseInt(number || '1', 10)

  // Check puzzle existence for navigation
  useEffect(() => {
    const checkNavigationAvailability = () => {
      // Find the nearest previous puzzle
      const prevPuzzle = findPreviousAvailablePuzzle(currentPuzzleNum)
      setPreviousPuzzleNum(prevPuzzle)
      setCanGoBack(prevPuzzle !== null)

      // Find the nearest next puzzle
      const nextPuzzle = findNextAvailablePuzzle(currentPuzzleNum)
      setNextPuzzleNum(nextPuzzle)
      setCanGoForward(nextPuzzle !== null)
    }

    checkNavigationAvailability()
  }, [currentPuzzleNum])

  const handlePreviousPuzzle = () => {
    if (previousPuzzleNum !== null) {
      navigate(`/d/${previousPuzzleNum}`)
    }
  }

  const handleNextPuzzle = () => {
    if (nextPuzzleNum !== null) {
      navigate(`/d/${nextPuzzleNum}`)
    }
  }

  // Map a difficulty string to a color using image utils (expects tags array)
  const colorForDifficulty = useMemo(() => (difficulty: string | undefined) => {
    if (!difficulty) return undefined as unknown as string
    return getDifficultyColorFromTags([difficulty])
  }, [getDifficultyColorFromTags])

  useEffect(() => {
    const loadPuzzleData = async () => {
      try {
        setLoading(true)
        const puzzleId = number
        const puzzleNum = parseInt(puzzleId || '0', 10)
        
        // Check if puzzle is locked (future puzzle)
        const currentPuzzleNumber = todayPuzzleNumberUTC()
        
        // Allow access to future puzzles if ?preview=true is in URL
        const urlParams = new URLSearchParams(window.location.search)
        const isPreviewMode = urlParams.get('preview') === 'true'
        
        if (puzzleNum > currentPuzzleNumber && !isPreviewMode) {
          // Redirect to home page if trying to access a future puzzle
          navigate('/d/', { replace: true })
          return
        }
        
        const response = await fetch(`/puzzles/${puzzleId}.json`)
        
        if (!response.ok) {
          // If puzzle doesn't exist, redirect to home page instead of showing error
          navigate('/d/', { replace: true })
          return
        }
        
        const data = await response.json()
        
        // Convert puzzle data to tile data list
        const tileDataList = data.customCoordinates.map((item: any) => {
          // Extract country code and difficulty from tags
          const tags = item.extra?.tags || []
          const groupName = getCountryFromTags(tags)
          const difficultyTags = ['Easy', 'Medium', 'Hard', 'Expert']
          const difficulty = tags.find((tag: string) => 
            difficultyTags.some(diff => diff.toLowerCase() === tag.toLowerCase())
          ) as 'Easy' | 'Medium' | 'Hard' | 'Expert' | undefined
          
          return {
            panoId: String(item.panoId || item.extra?.panoId || ''),
            lat: item.lat,
            lng: item.lng,
            heading: item.heading,
            pitch: item.pitch,
            zoom: item.zoom,
            groupName,
            stateCode: item.stateCode ?? null,
            difficulty,
            extra: {
              tags: tags,
              panoDate: item.extra?.panoDate
            }
          }
        })
        
        // Load puzzle data into UI store with shuffling
        loadPuzzle(puzzleId || '1', tileDataList)
        setError(null)
        } catch {
          // On any error, redirect to home page instead of showing error
          navigate('/d/', { replace: true })
        } finally {
        setLoading(false)
      }
    }

    if (number) {
      loadPuzzleData()
    }
  }, [number, navigate, loadPuzzle])






  const handleKeyDown = (e: KeyboardEvent) => {
    // Don't handle shortcuts when typing in input fields
    if (document.activeElement && /^(input|textarea)$/i.test(document.activeElement.tagName)) {
      return;
    }
    
    if (e.key === 'Escape' && fullscreenTile) {
      closeFullscreen()
    } else if (e.key === 'f' || e.key === 'F') {
      // Toggle fullscreen on the most recently interacted tile
      toggleFullscreenOnLastTile()
    } else if (e.key === 'Enter') {
      // Check if we have a valid grid guess and submit if so
      if (hasSelectedValidGridGuess()) {
        handleTileGroupSubmit()
      }
    }
  }

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [fullscreenTile, puzzleData.visualTileOrder, getTileData, getThumbnailUrl, toggleFullscreenOnLastTile, hasSelectedValidGridGuess, handleTileGroupSubmit])

  // Show solution popup when game ends
  useEffect(() => {
    const isVictory = solvedRowCount === 4
    const isGameOver = gameOver
    
    if (isVictory || isGameOver) {
      setShowSolutionPopup(true)
    }
  }, [solvedRowCount, gameOver])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg">
        <div className="text-center">
          <Spinner size={48} className="text-accent mx-auto mb-4" />
          <p className="text-muted">Loading puzzle...</p>
        </div>
      </div>
    )
  }

  if (!puzzleData) {
    // This should not render since we redirect on error, but keeping as safety
    return null
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      {/* Header */}
      <Header puzzleNumber={number ? parseInt(number, 10) : undefined} />

      {/* Top Controls Bar */}
      <div className="border-b flex-shrink-0 bg-bg border-border">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <button 
                  onClick={handlePreviousPuzzle}
                  disabled={!canGoBack}
                  className="bg-accent/10 hover:bg-accent/20 text-accent hover:text-accent border border-accent/30 hover:border-accent/50 rounded-lg p-2 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-accent/10 disabled:hover:text-accent disabled:hover:border-accent/30 flex items-center justify-center"
                  title="Previous puzzle"
                >
                  <FontAwesomeIcon icon={faChevronLeft} className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleNextPuzzle}
                  disabled={!canGoForward}
                  className="bg-accent/10 hover:bg-accent/20 text-accent hover:text-accent border border-accent/30 hover:border-accent/50 rounded-lg p-2 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-accent/10 disabled:hover:text-accent disabled:hover:border-accent/30 flex items-center justify-center"
                  title="Next puzzle"
                >
                  <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted">
                  #{number}
                </span>
                <span className="text-sm text-muted italic">
                  {getPuzzleAttribution(parseInt(number || '1', 10))}
                </span>
                {/* Show preview mode indicator if accessing future puzzle */}
                {parseInt(number || '0', 10) > todayPuzzleNumberUTC() && new URLSearchParams(window.location.search).get('preview') === 'true' && (
                  <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded border border-orange-500/30">
                    PREVIEW MODE
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4 max-w-sm overflow-hidden">
              <div className="flex items-center space-x-2 whitespace-nowrap">
                <label className="flex items-center space-x-2 text-sm">
                  <span className="text-muted">Difficulty:</span>
                  <select
                    value={gameMode}
                    onChange={(e) => handleModeChange(e.target.value as GameMode)}
                    // disabled
                    className="px-2 py-1 text-sm rounded bg-bg border border-border text-text focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
                  >
                    <option value="easy">Easy</option>
                    <option value="normal">Normal</option>
                    <option value="expert">Expert</option>
                  </select>
                </label>
                <button 
                  onClick={openAboutPopup}
                  className="bg-bg border border-border text-muted rounded px-3 py-1 flex items-center justify-center text-sm font-medium transition-colors hover:bg-gray-800"
                  title="Help"
                >
                  ?
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Game Area Container - exactly 100dvh */}
      <div className="h-[100dvh] flex flex-col">
        {/* Game Controls Bar */}
        <GameControlsBar
          mistakesLeft={mistakesLeft}
          canSubmit={canSubmit}
          gameOver={gameOver}
          isVictory={solvedRowCount === 4 && !gaveUp}
          feedbackMessage={feedbackMessage}
          feedbackType={feedbackType}
          feedbackMessageId={feedbackMessageId}
          hintsLeft={hintsLeft}
          hintMode={hintMode}
          showCountryGuess={showCountryGuess}
          totalHintsUsed={totalHintsUsed}
          gameMode={gameMode}
          onShuffle={handleShuffle}
          onSubmit={() => {
            handleTileGroupSubmit()
          }}
          onStartHint={startHintMode}
          onCancelHint={cancelHintMode}
          onGetMoreHints={getMoreHints}
          onCountryGuess={(groupName) => {
            handleCountryGuess(groupName)
          }}
          onCancelCountryGuess={() => {
            setShowCountryGuess(false)
            setCorrectCountry(null)
          }}
          onCountryGuessSkip={gameMode === 'easy' ? handleCountryGuessSkip : undefined}
          onGiveUp={gameMode === 'easy' ? handleGiveUp : undefined}
          onShare={handleShare}
          onReset={resetGame}
          onKeepTrying={() => addMistakes(2)}
          shareButtonText={shareButtonText}
        />

        {/* 4x4 Grid */}
        <main className="flex-1 min-h-0 flex items-center justify-center p-page">
          <div className="w-full h-full grid grid-rows-4 grid-cols-1 gap-2">
            {[0, 1, 2, 3].map(rowIndex => {
              const rowTileIds = rowsOfTileIds[rowIndex]
              const isSolvedRow = rowIndex < solvedRowCount
              
              // Get group name and difficulty from the first tile in the solved row
              let solvedGroupName: string | undefined
              let solvedDifficulty: string | undefined
              if (isSolvedRow && rowTileIds.length > 0) {
                const firstTileData = getTileData(rowTileIds[0])
                if (firstTileData) {
                  solvedGroupName = firstTileData.groupName || undefined
                  solvedDifficulty = firstTileData.difficulty || undefined
                }
              }
              
              const rowBackgroundColor = isSolvedRow && solvedDifficulty ? colorForDifficulty(solvedDifficulty) : undefined
              
              return (
                <div 
                  key={rowIndex} 
                  className={`flex flex-col h-full rounded-lg ${isSolvedRow ? 'p-4 pt-2' : ''}`}
                  style={{ backgroundColor: isSolvedRow ? rowBackgroundColor : undefined }}
                >
                  {isSolvedRow && solvedGroupName && (
                    <AnswerDisplay
                      groupName={solvedGroupName}
                      difficulty={solvedDifficulty}
                      showGroupCode={true}
                      className="flex items-center justify-center h-6 rounded-md mb-1 px-3 text-sm font-semibold"
                      backgroundColor={rowBackgroundColor}
                      getContrastTextColor={getContrastTextColor}
                    />
                  )}
                  <div className="flex-1">
                    <GridRow 
                      tileIds={rowTileIds}
                      getTileData={getTileData}
                      startIndex={rowIndex * 4} 
                      onTileClick={handleTileClick}
                      selectedTiles={selectedTiles}
                      getThumbnailUrl={getThumbnailUrl}
                      getDifficultyColor={colorForDifficulty as unknown as (difficulty: string) => string}
                      getContrastTextColor={getContrastTextColor}
                      isSolvedRow={isSolvedRow}
                      getBucketIndex={getBucketIndex}
                      hintMode={hintMode}
                      revealedTiles={revealedTiles}
                      onRevealTile={revealTile}
                      hiddenTileIndex={gameMode === 'expert' ? hiddenTileIndex : null}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </main>
      </div>

      {/* Solution Popup */}
      <SolutionPopup
        isOpen={showSolutionPopup}
        onClose={() => setShowSolutionPopup(false)}
        onPlayAgain={() => {
          resetGame()
          setShowSolutionPopup(false)
        }}
        onKeepTrying={() => {
          addMistakes(2)
          setShowSolutionPopup(false)
        }}
        onGiveUp={gameMode !== 'easy' ? () => {
          handleGiveUp()
          setShowSolutionPopup(false)
        } : undefined}
        gameMode={gameMode}
        puzzleNumber={parseInt(number || '1', 10)}
        mistakesUsed={getMistakesUsed()}
        shareAttempts={attemptEvents}
        streak={streak}
        isVictory={solvedRowCount === 4 && !gaveUp}
      />

      {/* Fullscreen Tile */}
      {fullscreenTile !== null && (() => {
        const tileData = getTileData(fullscreenTile)
        if (!tileData) return null
        
        // Get all solved tile IDs
        const solvedTileIds = new Set(solutionState.solvedRows.flatMap(row => row.tileIndexes))
        
        return (
          <FullscreenTile 
            tileData={tileData}
            startRect={{ top: 0, left: 0, width: window.innerWidth, height: window.innerHeight }}
            thumbnailUrl={getThumbnailUrl(tileData)}
            screenshotUrl={getScreenshotUrl(tileData)}
            fullscreenMode={fullscreenMode}
            buildEmbedURLForTilePB={buildEmbedURLForTilePB}
            currentIndex={fullscreenTile}
            maxIndex={puzzleData.tileDataList.length - 1}
            visualTileOrder={puzzleData.visualTileOrder}
            onNavigate={(nextIndex) => {
              if (nextIndex < 0 || nextIndex > puzzleData.tileDataList.length - 1) return
              openFullscreenForTile(nextIndex)
            }}
            isHidden={gameMode === 'expert' && hiddenTileIndex === fullscreenTile}
            solvedTileIds={solvedTileIds}
          />
        )
      })()}

      {/* About Popup */}
      <AboutPopup
        isOpen={showAboutPopup}
        onClose={closeAboutPopup}
        isHelpMode={true}
      />
    </div>
  )
}

export default DailyPuzzlePage
