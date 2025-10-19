import React, { useState } from 'react'
import { getChallengeForPuzzle, type Challenge } from '../utils/dailyChallenge'
import { buildShareText, copyToClipboard, type AttemptEvent } from '../utils/shareUtils'
import { getPuzzleAttribution } from '../utils/submitterUtils'

interface SolutionPopupProps {
  isOpen: boolean
  onClose: () => void
  onPlayAgain: () => void
  onKeepTrying?: () => void
  onGiveUp?: () => void
  gameMode: 'normal' | 'expert' | 'easy'
  puzzleNumber: number
  mistakesUsed: number
  shareAttempts: AttemptEvent[]
  streak: number
  isVictory: boolean
}

export default function SolutionPopup({
  isOpen,
  onClose,
  onPlayAgain,
  onKeepTrying,
  onGiveUp,
  gameMode,
  puzzleNumber,
  mistakesUsed,
  shareAttempts,
  streak,
  isVictory
}: SolutionPopupProps) {
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [puzzleChallenge] = useState<Challenge>(getChallengeForPuzzle(puzzleNumber))

  const handleShare = async () => {
    const shareText = buildShareText(puzzleNumber, gameMode, streak, shareAttempts)
    
    try {
      const success = await copyToClipboard(shareText)
      if (success) {
        setCopyFeedback(true)
        setTimeout(() => setCopyFeedback(false), 3000)
      } else {
        // Fallback: show text in console
        setCopyFeedback(true)
        setTimeout(() => setCopyFeedback(false), 3000)
      }
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
      // Show the text in console as fallback
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl max-w-lg w-full mx-auto shadow-2xl">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center justify-center mb-4">
            <div className="text-4xl mb-2">
              {isVictory ? '🎉' : '💪'}
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-center text-text mb-2">
            {isVictory ? 'Congratulations!' : 'Game Over'}
          </h2>
          
          <p className="text-center text-muted mb-4">
            {isVictory 
              ? `You solved the puzzle in ${mistakesUsed} mistake${mistakesUsed === 1 ? '' : 's'}!`
              : 'You ran out of mistakes. Better luck next time!'
            }
          </p>

          {/* Stats */}
          <div className="flex justify-center space-x-6 text-sm text-muted mb-6">
            <div className="text-center">
              <div className="font-semibold text-text">Puzzle #{puzzleNumber}</div>
              <div className="text-xs italic text-muted">{getPuzzleAttribution(puzzleNumber)}</div>
              <div>Current Puzzle</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-text">{gameMode}</div>
              <div>Mode</div>
            </div>
          </div>
        </div>

        {/* Share Section */}
        <div className="px-6 pb-4">
          <div className="bg-muted/20 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-semibold text-text mb-2">Share Your Results</h3>
            <p className="text-xs text-muted mb-3">
              Copy your results to share with friends and compare your performance!
            </p>
            <button
              onClick={handleShare}
              className="w-full bg-accent hover:bg-accent/90 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
              <span>Copy Results</span>
            </button>
            
            {copyFeedback && (
              <div className="mt-2 text-center text-sm text-green-500 flex items-center justify-center space-x-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Copied to clipboard!</span>
              </div>
            )}
          </div>

          {/* JSON Download */}
          <div className="bg-muted/20 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-semibold text-text mb-2">Download Puzzle JSON</h3>
            <a
              href={`/puzzles/${puzzleNumber}.json`}
              download={`puzzle-${puzzleNumber}.json`}
              className="w-full inline-flex items-center justify-center space-x-2 bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v12m0 0l4-4m-4 4l-4-4M21 12v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6" />
              </svg>
              <span>⬇️ Download JSON</span>
            </a>
          </div>

          {/* Daily Challenge */}
          <div className="bg-gradient-to-r from-green-500/10 to-green-600/10 rounded-lg p-4 mb-4 border border-green-500/20">
            <h3 className="text-sm font-semibold text-text mb-2">Today's GeoGuessr Challenge</h3>
            <p className="text-xs text-muted mb-3">
              Play the daily challenge to see how you stack up against other Geonections players!
            </p>
            <a
              href={puzzleChallenge.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg border-2 border-green-500 transition-all duration-200"
            >
              <span>Daily Challenge: {puzzleChallenge.name}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6">
          <div className="flex space-x-3">
            {isVictory ? (
              <button
                onClick={onPlayAgain}
                className="flex-1 bg-accent hover:bg-accent/90 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Play Again
              </button>
            ) : onGiveUp ? (
              <button
                onClick={onGiveUp}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Give Up
              </button>
            ) : (
              <button
                onClick={onPlayAgain}
                className="flex-1 bg-accent hover:bg-accent/90 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Restart
              </button>
            )}
            {!isVictory && onKeepTrying && (
              <button
                onClick={onKeepTrying}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Keep Trying
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 bg-muted hover:bg-muted/80 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
