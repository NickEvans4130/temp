import React, { useRef, useEffect, useState } from 'react'
import { useUIStore } from '../stores/uiStore'
import AnswerDisplay from './AnswerDisplay'
import { ShakeEvent } from '../utils/shakeEvents'

interface TileProps {
  tileData: any
  index: number
  isSelected: boolean
  bucketIndex?: number
  selectedTiles?: Set<string>
  getThumbnailUrl: (tileData: any) => string
  getDifficultyColor: (difficulty: string) => string
  getContrastTextColor: (backgroundColor: string) => string
  isSolved?: boolean
  // Hint system
  hintMode?: boolean
  isRevealed?: boolean
  // Hidden tile for expert mode
  isHidden?: boolean
  // Game logic functions
  onTileClick: (tileId: number) => void
  onRevealTile?: (tileId: number) => void
}

export default function Tile({
  tileData,
  index,
  isSelected,
  bucketIndex,
  selectedTiles: _selectedTiles = new Set(),
  getThumbnailUrl,
  getDifficultyColor: _getDifficultyColor,
  getContrastTextColor,
  isSolved = false,
  hintMode = false,
  isRevealed = false,
  isHidden = false,
  onTileClick,
  onRevealTile
}: TileProps) {
  const thumbnailUrl = getThumbnailUrl(tileData)
  const containerRef = useRef<HTMLDivElement>(null)
  const { recordTileClick, lastClickedTileIndex, lastClickTimestamp, openFullscreenForTile } = useUIStore()
  const [isShaking, setIsShaking] = useState(false)
  
  // Listen for shake events
  useEffect(() => {
    const handleShakeEvent = (event: Event) => {
      const shakeEvent = event as ShakeEvent
      const tileIds = shakeEvent.detail.tileIds
      
      // Only shake if this tile is in the list of tiles to shake
      if (tileIds.includes(index)) {
        setIsShaking(true)
        const timer = setTimeout(() => {
          setIsShaking(false)
        }, 300) // Match the CSS animation duration
        return () => clearTimeout(timer)
      }
    }
    
    document.addEventListener('shake', handleShakeEvent)
    return () => document.removeEventListener('shake', handleShakeEvent)
  }, [index])
  
  // Selection ring should reflect the bucket color, not the tile's actual difficulty
  const bucketRingColors = ['#FACC15', '#14B8A6', '#A855F7', '#EF4444']
  const ringColor = typeof bucketIndex === 'number' && bucketIndex >= 0 ? bucketRingColors[bucketIndex % 4] : undefined

  const handleClick = () => {
    const now = Date.now()
    const isDoubleClick = lastClickedTileIndex === index && lastClickTimestamp && (now - lastClickTimestamp) < 500
    
    // Always record the click
    recordTileClick(index)
    
    if (isDoubleClick) {
      // This is a double-click - toggle fullscreen (works even when solved)
      openFullscreenForTile(index)
    } else if (hintMode && onRevealTile) {
      // This is hint mode - reveal the tile
      onRevealTile(index)
    } else if (!isSolved) {
      // This is a single click - handle game logic (only when not solved)
      onTileClick(index)
    }
  }

  return (
    <div
      className={`tile flex-1 transition-[box-shadow,border-color,transform] duration-200 overflow-hidden group relative bg-card border-2 ${
        isSelected ? 'selected' : ''
      } ${
        isSolved ? 'cursor-default border-border' : 'cursor-pointer hover:border-blue-400 border-border'
      } ${isShaking ? 'tile-shake' : ''}`}
      onClick={handleClick}
      ref={containerRef}
      data-tile
      style={ringColor ? ({ ['--ring-color' as any]: ringColor } as React.CSSProperties) : undefined}
    >
      {isHidden ? (
        <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center">
          <span className="text-red-500 text-6xl font-bold">?</span>
        </div>
      ) : (
        <img
          src={thumbnailUrl}
          alt={`Tile ${index + 1}`}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
          draggable={false}
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = '/placeholder-thumbnail.svg'
          }}
        />
      )}
      
      <div className="absolute top-0 right-0 p-2 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation()
            openFullscreenForTile(index)
            // Remove focus to prevent ugly outline
            e.currentTarget.blur()
          }}
          className="bg-black/20 backdrop-blur-sm hover:bg-black/40 text-white transition-all duration-200 rounded px-2 py-1 select-none"
        >
          ⛶
        </button>
      </div>
      
      {/* Show answers when tile is revealed as hint */}
      {isRevealed && (
        <div className="absolute bottom-4 left-4 right-4 z-20">
          <AnswerDisplay
            groupName={tileData.groupName || ''}
            difficulty={tileData.difficulty}
            groupOnly={true}
            className="text-sm px-2 py-1 text-center"
            getContrastTextColor={getContrastTextColor}
            style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.8)', 
              color: 'white'
            }}
          />
        </div>
      )}
    </div>
  )
}