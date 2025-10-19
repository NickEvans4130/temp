import React from 'react'
import Tile from './Tile'

interface GridRowProps {
  tileIds: number[]
  getTileData: (tileIndex: number) => any | null
  startIndex: number
  onTileClick: (tileId: number) => void
  selectedTiles: Set<number>
  getThumbnailUrl: (tileData: any) => string
  getDifficultyColor: (difficulty: string) => string
  getContrastTextColor: (backgroundColor: string) => string
  isSolvedRow?: boolean
  getBucketIndex?: (tileId: number) => number
  // Hint system
  hintMode?: boolean
  revealedTiles?: Set<number>
  onRevealTile?: (tileId: number) => void
  // Hidden tile for expert mode
  hiddenTileIndex?: number | null
}

export default function GridRow({
  tileIds,
  getTileData,
  startIndex,
  onTileClick,
  selectedTiles,
  getThumbnailUrl,
  getDifficultyColor,
  getContrastTextColor,
  isSolvedRow = false,
  getBucketIndex,
  hintMode = false,
  revealedTiles = new Set(),
  onRevealTile,
  hiddenTileIndex = null
}: GridRowProps) {
  
  return (
    <div className="flex gap-2 rounded-lg h-full">
      {tileIds.map((tileId, index) => {
        const _visualIndex = startIndex + index
        const tileData = getTileData(tileId)
        const isSelected = selectedTiles.has(tileId)
        const isSolved = isSolvedRow
        const bucketIndex = typeof getBucketIndex === 'function' ? getBucketIndex(tileId) : -1
        const isRevealed = revealedTiles.has(tileId)
        const isHidden = hiddenTileIndex === tileId
        
        if (!tileData) return null
        
        return (
          <Tile
            key={tileId}
            tileData={tileData}
            index={tileId} // tileId is the actual tile data index
            isSelected={isSelected}
            bucketIndex={bucketIndex >= 0 ? bucketIndex : undefined}
            onTileClick={onTileClick}
            getThumbnailUrl={getThumbnailUrl}
            getDifficultyColor={getDifficultyColor}
            getContrastTextColor={getContrastTextColor}
            isSolved={isSolved}
            hintMode={hintMode}
            isRevealed={isRevealed}
            isHidden={isHidden}
            onRevealTile={onRevealTile}
          />
        )
      })}
    </div>
  )
}