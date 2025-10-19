import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { todayPuzzleNumberUTC, puzzleNumberExists } from '../utils/puzzleUtils'
import DailyPuzzlePage from './DailyPuzzlePage'
import Spinner from './Spinner'

/**
 * Component that shows the current day's puzzle
 * If the current day puzzle doesn't exist, redirects to /d/ (landing page)
 */
function CurrentDayPuzzle() {
  const [puzzleNumber, setPuzzleNumber] = useState<number | null>(null)
  const [isChecking, setIsChecking] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const checkCurrentDayPuzzle = () => {
      try {
        const currentPuzzleNumber = todayPuzzleNumberUTC()
        const exists = puzzleNumberExists(currentPuzzleNumber)
        
        if (exists) {
          setPuzzleNumber(currentPuzzleNumber)
        } else {
          // Current day puzzle doesn't exist, redirect to landing page
          navigate('/d/', { replace: true })
        }
      } catch (error) {
        console.error('Error checking current day puzzle:', error)
        // On error, redirect to landing page
        navigate('/d/', { replace: true })
      } finally {
        setIsChecking(false)
      }
    }

    checkCurrentDayPuzzle()
  }, [navigate])

  // Show loading while checking if puzzle exists
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-center">
          <Spinner size={48} className="text-text mx-auto mb-4" />
          <p className="text-muted">Loading today's puzzle...</p>
        </div>
      </div>
    )
  }

  // If puzzle number is set, render the DailyPuzzlePage with that number
  if (puzzleNumber) {
    // We need to simulate the useParams behavior for DailyPuzzlePage
    // by passing the puzzle number as a prop
    return <DailyPuzzlePage puzzleNumber={puzzleNumber} />
  }

  // This shouldn't render if everything works correctly
  return null
}

export default CurrentDayPuzzle
