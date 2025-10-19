import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import AboutPopup from './AboutPopup'
import Header from './Header'
import NavigationBar from './NavigationBar'
import { useAboutPopup } from '../hooks/useAboutPopup'
import { getAvailablePuzzleNumbers } from '../utils/puzzleUtils'

function LandingPage() {
  const { isOpen, closePopup } = useAboutPopup()
  const [puzzleNumbers, setPuzzleNumbers] = useState<number[]>([])

  useEffect(() => {
    const numbers = getAvailablePuzzleNumbers()
    setPuzzleNumbers(numbers)
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      {/* Header */}
      <Header />
      
      {/* Navigation Bar */}
      <NavigationBar currentPage="puzzles" />

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-page">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-lg text-muted mb-6">Choose a puzzle</p>
          <div className="space-y-4">
            {puzzleNumbers.length > 0 ? (
              <div className="grid grid-cols-7 gap-3 justify-center max-w-fit mx-auto">
                {puzzleNumbers.map((num) => {
                  // Read localStorage directly
                  const stored = localStorage.getItem('geonections-puzzle-completion')
                  
                  let completed: number[] = []
                  let attempted: number[] = []
                  
                  if (stored) {
                    try {
                      const data = JSON.parse(stored)
                      completed = data.completed || []
                      attempted = data.attempted || []
                    } catch (e) {
                      console.warn('Failed to parse completion data:', e)
                    }
                  }
                  
                  const isCompleted = completed.includes(num)
                  const isAttempted = attempted.includes(num) && !isCompleted
                  
                  let buttonClass = "text-xl font-semibold w-16 h-16 flex items-center justify-center"
                  
                  // Apply different colors based on completion status
                  if (isCompleted) {
                    buttonClass = "completed-btn text-xl font-semibold w-16 h-16 flex items-center justify-center"
                  } else if (isAttempted) {
                    buttonClass = "attempted-btn text-xl font-semibold w-16 h-16 flex items-center justify-center"
                  } else {
                    buttonClass = "default-btn text-xl font-semibold w-16 h-16 flex items-center justify-center hover:bg-accent hover:border-accent transition-all duration-200"
                  }
                  
                  return (
                    <Link
                      key={num}
                      to={`/d/${num}`}
                      className={buttonClass}
                    >
                      {num}
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="text-muted">No puzzles available</div>
            )}
          </div>
        </div>
      </main>

      {/* About Popup */}
      <AboutPopup isOpen={isOpen} onClose={closePopup} />
    </div>
  )
}

export default LandingPage
