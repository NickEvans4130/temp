import React from 'react'
import { Link } from 'react-router-dom'

interface NavigationBarProps {
  currentPage?: 'home' | 'puzzles' | 'about'
}

function NavigationBar({ currentPage }: NavigationBarProps) {
  return (
    <nav className="shadow-sm border-b flex-shrink-0 bg-bg border-border">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-start items-center h-12">
          <div className="flex space-x-8">
            <Link 
              to="/" 
              className={`text-sm hover:opacity-80 transition-opacity ${
                currentPage === 'home' ? 'text-accent' : 'text-text'
              }`}
            >
              Today's Puzzle
            </Link>
            <Link 
              to="/d/" 
              className={`text-sm hover:opacity-80 transition-opacity ${
                currentPage === 'puzzles' ? 'text-accent' : 'text-text'
              }`}
            >
              All Puzzles
            </Link>
            <Link 
              to="/about" 
              className={`text-sm hover:opacity-80 transition-opacity ${
                currentPage === 'about' ? 'text-accent' : 'text-muted'
              }`}
            >
              About
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default NavigationBar
