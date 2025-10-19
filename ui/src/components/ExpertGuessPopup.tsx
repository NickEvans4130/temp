import React, { useState, useEffect } from 'react'

interface GroupNameGuessPopupProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (guesses: { [difficulty: string]: string }) => void
  difficulties: string[]
  getDifficultyColor: (difficulty: string) => string
}

export default function GroupNameGuessPopup({
  isOpen,
  onClose,
  onSubmit,
  difficulties,
  getDifficultyColor
}: GroupNameGuessPopupProps) {
  const [guesses, setGuesses] = useState<{ [difficulty: string]: string }>({})
  const [focusedInput, setFocusedInput] = useState<string | null>(null)

  // Initialize guesses when popup opens
  useEffect(() => {
    if (isOpen) {
      const initialGuesses: { [difficulty: string]: string } = {}
      difficulties.forEach(difficulty => {
        initialGuesses[difficulty] = ''
      })
      setGuesses(initialGuesses)
      setFocusedInput(difficulties[0] || null)
      
      // Auto-focus the first input after a short delay
      setTimeout(() => {
        const firstInput = document.querySelector(`input[data-difficulty="${difficulties[0]}"]`) as HTMLInputElement
        if (firstInput) {
          firstInput.focus()
        }
      }, 100)
    }
  }, [isOpen, difficulties])

  const handleGuessChange = (difficulty: string, value: string) => {
    setGuesses(prev => ({
      ...prev,
      [difficulty]: value
    }))
  }

  const handleSubmit = () => {
    // Check if all guesses are filled
    const allFilled = difficulties.every(difficulty => guesses[difficulty]?.trim())
    if (!allFilled) return

    // Trim the guesses before submitting
    const trimmedGuesses: { [difficulty: string]: string } = {}
    difficulties.forEach(difficulty => {
      trimmedGuesses[difficulty] = guesses[difficulty]?.trim() || ''
    })

    onSubmit(trimmedGuesses)
    setGuesses({})
  }

  const handleKeyDown = (e: React.KeyboardEvent, difficulty: string) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const currentIndex = difficulties.indexOf(difficulty)
      const allFilled = difficulties.every(d => guesses[d]?.trim())
      
      if (allFilled) {
        // Submit if all are filled
        handleSubmit()
      } else if (currentIndex < difficulties.length - 1) {
        // Focus next input
        const nextDifficulty = difficulties[currentIndex + 1]
        setFocusedInput(nextDifficulty)
        const nextInput = document.querySelector(`input[data-difficulty="${nextDifficulty}"]`) as HTMLInputElement
        if (nextInput) {
          nextInput.focus()
        }
      }
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  const allFilled = difficulties.every(difficulty => guesses[difficulty]?.trim())

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleOverlayClick}
    >
      <div className="bg-card border border-border rounded-lg p-6 max-w-lg w-full mx-4 shadow-2xl">
        <h3 className="text-xl font-semibold text-text mb-6 text-center">
          Name your four groups
        </h3>
        
        <div className="space-y-4 mb-6">
          {difficulties.map((difficulty, index) => {
            const color = getDifficultyColor(difficulty)
            const isFocused = focusedInput === difficulty
            
            return (
              <div key={difficulty} className="flex items-center space-x-4">
                {/* Color swatch */}
                <div 
                  className="w-8 h-8 rounded-lg border-2 border-white shadow-lg flex-shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: color }}
                >
                  <span className="text-white text-xs font-bold">
                    {difficulty.charAt(0)}
                  </span>
                </div>
                
                {/* Label */}
                <label 
                  className="text-sm font-semibold min-w-[90px] transition-colors"
                  style={{ color: isFocused ? color : '#9CA3AF' }}
                >
                  {difficulty}:
                </label>
                
                {/* Input */}
                <input
                  type="text"
                  data-difficulty={difficulty}
                  value={guesses[difficulty] || ''}
                  onChange={(e) => handleGuessChange(difficulty, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, difficulty)}
                  onFocus={() => setFocusedInput(difficulty)}
                  placeholder="e.g., France or FR"
                  className="flex-1 px-4 py-3 border-2 rounded-lg bg-bg text-text placeholder-muted focus:outline-none transition-all duration-200"
                  style={{
                    borderColor: isFocused ? color : '#374151',
                    boxShadow: isFocused ? `0 0 0 3px ${color}20` : 'none'
                  }}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            )
          })}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-3 text-sm font-medium rounded-lg transition-colors hover:opacity-80 bg-muted text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!allFilled}
            className="submit-btn disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit all
          </button>
        </div>
      </div>
    </div>
  )
}
