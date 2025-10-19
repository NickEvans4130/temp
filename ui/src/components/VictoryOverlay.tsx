import React from 'react'
import { Link } from 'react-router-dom'

interface VictoryOverlayProps {
  onPlayAgain: () => void
}

export default function VictoryOverlay({ onPlayAgain }: VictoryOverlayProps) {
  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center">
      <div className="bg-card border border-border rounded-lg p-8 max-w-md mx-4 text-center">
        <h2 className="text-2xl font-bold mb-4 text-text">🎉 Congratulations!</h2>
        <p className="text-muted mb-6">You solved the puzzle! Well done!</p>
        <div className="flex space-x-4 justify-center">
          <button
            onClick={onPlayAgain}
            className="px-6 py-3 bg-accent text-white rounded hover:opacity-90 transition-opacity"
          >
            Play Again
          </button>
          <Link
            to="/"
            className="px-6 py-3 bg-muted text-white rounded hover:opacity-90 transition-opacity"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
