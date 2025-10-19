import React from 'react'
import CountryGuessDropdown from './CountryGuessDropdown'

interface GameControlsBarProps {
  mistakesLeft: number
  canSubmit: boolean
  gameOver: boolean
  isVictory: boolean
  feedbackMessage: string | null
  feedbackType: 'success' | 'error' | 'info' | null
  feedbackMessageId: number
  hintsLeft: number
  hintMode: boolean
  showCountryGuess: boolean
  totalHintsUsed: number // Secret tracking for hard cap
  gameMode?: 'easy' | 'normal' | 'expert'
  onSubmit: () => void
  onStartHint: () => void
  onCancelHint: () => void
  onGetMoreHints: () => void
  onCountryGuess: (groupName: string) => void
  onCancelCountryGuess: () => void
  onCountryGuessSkip?: () => void
  onGiveUp?: () => void
  onShare?: () => void
  onKeepTrying?: () => void
  shareButtonText?: string
}

export default function GameControlsBar({
  mistakesLeft,
  canSubmit,
  gameOver,
  isVictory,
  feedbackMessage,
  feedbackType,
  feedbackMessageId,
  hintsLeft,
  hintMode,
  showCountryGuess,
  totalHintsUsed,
  gameMode = 'normal',
  onSubmit,
  onStartHint,
  onCancelHint,
  onGetMoreHints,
  onCountryGuess,
  onCancelCountryGuess,
  onCountryGuessSkip,
  onGiveUp,
  onShare,
  onKeepTrying,
  shareButtonText = 'Share'
}: GameControlsBarProps) {
  // Create misleading hint display - show "hints left" even when we're at the hard cap
  const getMisleadingHintDisplay = () => {
    if (totalHintsUsed >= 10) {
      // When at hard cap, show 0 so button displays "Get More Hints"
      return 0
    }
    // Otherwise show the actual hints left
    return hintsLeft
  }
  
  const misleadingHintsLeft = getMisleadingHintDisplay()
  
  return (
    <div className="flex-shrink-0 bg-bg border-b border-border">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="relative">
          <div className="flex items-center gap-4 py-2">
          {gameOver ? (
            <>
              {/* Game Over Message */}
              <div className="text-lg font-semibold text-red-500">
                Game Over
              </div>
              
              {/* Share Button */}
              {onShare && (
                <button 
                  onClick={onShare}
                  className="default-btn h-full flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                  <span>{shareButtonText}</span>
                </button>
              )}
              
              {/* Keep Trying Button */}
              {onKeepTrying && (
                <button 
                  onClick={onKeepTrying}
                  className="default-btn h-full flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Keep Trying</span>
                </button>
              )}
            
            </>
          ) : isVictory ? (
            <>
              {/* Victory Message */}
              <div className="text-lg font-semibold text-green-500">
                🎉 You Won!
              </div>
              
              {/* Share Button */}
              {onShare && (
                <button 
                  onClick={onShare}
                  className="default-btn h-full flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                  <span>{shareButtonText}</span>
                </button>
              )}
            
            </>
          ) : (
            <>
              {/* Submit Button */}
              <button 
                onClick={onSubmit}
                disabled={!canSubmit || gameOver || isVictory || showCountryGuess}
                className="submit-btn disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit
              </button>
              
              {/* Hint Button */}
              {misleadingHintsLeft > 0 ? (
                <button 
                  onClick={hintMode ? onCancelHint : onStartHint}
                  className={`default-btn h-full flex items-center justify-center whitespace-nowrap ${
                    hintMode 
                      ? 'border-red-500 text-red-500' 
                      : ''
                  }`}
                >
                  {hintMode ? 'Cancel Hint' : `Hint (${misleadingHintsLeft})`}
                </button>
              ) : (
                <button 
                  onClick={onGetMoreHints}
                  className="default-btn h-full flex items-center justify-center whitespace-nowrap"
                >
                  {totalHintsUsed >= 10 ? 'Out of Hints' : 'Get More Hints'}
                </button>
              )}

              {/* Give Up Button - Only show in easy mode */}
              {gameMode === 'easy' && onGiveUp && (
                <button 
                  onClick={onGiveUp}
                  className="default-btn h-full flex items-center justify-center whitespace-nowrap border-red-500 text-red-500 hover:bg-red-500/10"
                >
                  Give Up
                </button>
              )}
              
              {/* Health/Mistakes Counter */}
              <div className="flex items-center space-x-1">
                {mistakesLeft === Infinity ? (
                  <>
                    <span className="text-sm text-muted">∞</span>
                    <span className="text-sm text-muted">♥</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-muted">{mistakesLeft}</span>
                    <span className="text-sm text-muted">♥</span>
                  </>
                )}
              </div>
              
              {/* Feedback Message */}
              {feedbackMessage && (
                <div 
                  key={feedbackMessageId}
                  className={`text-sm whitespace-nowrap animate-pulse ${
                    feedbackType === 'success' ? 'text-green-500' :
                    feedbackType === 'error' ? 'text-red-500' :
                    'text-blue-500'
                  }`}
                  style={{
                    animation: 'messageScale 0.3s ease-out'
                  }}
                >
                  {feedbackMessage}
                </div>
              )}
            </>
          )}
          </div>
          
          {/* Country Guess Dropdown */}
          <CountryGuessDropdown
            isOpen={showCountryGuess}
            onSubmit={onCountryGuess}
            onCancel={onCancelCountryGuess}
            onSkip={onCountryGuessSkip}
            gameMode={gameMode}
            difficulties={gameMode === 'expert' ? ['Easy', 'Medium', 'Hard', 'Expert'] : []}
          />
        </div>
      </div>
    </div>
  )
}
