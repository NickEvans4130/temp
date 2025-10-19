import React from 'react'
import { Link } from 'react-router-dom'

interface AboutPopupProps {
  isOpen: boolean
  onClose: () => void
  /**
   * When true, renders the content inline (no fullscreen overlay) and hides close controls
   */
  isInline?: boolean
  /**
   * When false, hides all close buttons (header X and footer Close)
   */
  showCloseButtons?: boolean
  /**
   * When true, shows "Okay" button that closes popup instead of "Start Playing" link
   */
  isHelpMode?: boolean
}

function AboutPopup({ isOpen, onClose, isInline = false, showCloseButtons = true, isHelpMode = false }: AboutPopupProps) {
  if (!isOpen) return null

  return (
    <div className={isInline ? '' : 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'}>
      <div className={`bg-card rounded-lg shadow-xl ${isInline ? 'max-w-3xl' : 'max-w-2xl'} w-full mx-4 ${isInline ? '' : 'max-h-[90vh] overflow-y-auto'}`}>
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h1 className="text-2xl font-bold text-text">🌍 Welcome to Geonections!</h1>
          {showCloseButtons && !isInline && (
            <button
              onClick={onClose}
              className="bg-bg border border-border text-muted rounded px-2 py-1 flex items-center justify-center text-sm font-medium transition-colors hover:bg-gray-800"
            >
              ×
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="prose prose-sm max-w-none">
            <p className="mb-4 text-sm font-semibold text-text">
              <strong>Make four groups of four</strong> — each group is from the same country.
            </p>
            
            <h3 className="text-lg font-semibold mb-3 text-text">How to play</h3>
            <ol className="list-decimal list-inside mb-4 space-y-1 text-xs text-muted">
              <li>Click a tile to select it (it gets a color tag). Click again to deselect.</li>
              <li>Select 4. Click submit.</li>
            </ol>
            
            <h3 className="text-lg font-semibold mb-3 text-text">Helpful controls</h3>
            <ul className="list-disc list-inside mb-4 space-y-1 text-xs text-muted">
              <li><strong>Double-click</strong> or press <strong>F</strong> to toggle fullscreen on the last clicked tile.</li>
              <li>Use the <strong>Keyboard arrow keys</strong> to flip through the tiles.</li>
            </ul>
            
            <p className="mb-4 text-xs text-muted">
              <strong>Easy Mode:</strong> Unlimited mistakes. Country guess is optional.
            </p>
            <p className="mb-4 text-xs text-muted">
              <strong>Expert Mode:</strong> Submit all 4 Groups at once. One Blind Tile.
            </p>
            
            <p className="mb-4 text-xs text-muted italic">
              <em>Note:</em><br> This game is designed for <strong>GeoGuessr</strong> players and is very hard—even for the best among them. Don't sweat a miss!<br>Puzzle difficulty will increase throughout the week, Monday being the easiest and Sunday being the hardest!
            </p>
            
            <p className="mb-6 text-xs text-muted italic">
              <em>Good luck!</em>
            </p>

            <p className="text-xs text-muted">
              For feedback or to submit your own puzzle, join our <a href="https://discord.gg/hGjtMhTTFc" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Discord</a>
            </p>
            
            <div className="mt-6 flex gap-3">
              {showCloseButtons && !isInline && (
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-border text-sm font-medium rounded-md text-text bg-bg hover:bg-border transition-colors duration-200"
                >
                  Close
                </button>
              )}
              {isHelpMode ? (
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white transition-colors duration-200 hover:opacity-90 bg-accent text-center"
                >
                  Okay
                </button>
              ) : (
                <Link
                  to="/"
                  onClick={!isInline ? onClose : undefined}
                  className={`flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white transition-colors duration-200 hover:opacity-90 bg-accent text-center ${isInline && !showCloseButtons ? '' : ''}`}
                >
                  Start Playing
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AboutPopup
