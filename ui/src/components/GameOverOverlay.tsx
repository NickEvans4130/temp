import React from 'react'

interface GameOverOverlayProps {
  onTryAgain: () => void
}

export default function GameOverOverlay({ onTryAgain }: GameOverOverlayProps) {
  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center">
      <div className="bg-card border border-border rounded-lg p-8 max-w-md mx-4 text-center">
        <h2 className="text-2xl font-bold mb-4 text-text">Game Over!</h2>
        <p className="text-muted mb-6">You ran out of mistakes. Better luck next time!</p>
        <button
          onClick={onTryAgain}
          className="px-6 py-3 bg-accent text-white rounded hover:opacity-90 transition-opacity"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
