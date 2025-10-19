import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { useUIStore } from '../stores/uiStore'

// Heuristic tuning constants
const LOAD_REVEAL_MULTIPLIER = 1 // e.g., 1 means reveal after 1x onLoad duration
const MIN_REVEAL_DELAY_MS = 400
const MAX_REVEAL_DELAY_MS = 3000

interface FullscreenTileProps {
  tileData: any
  startRect: { top: number; left: number; width: number; height: number }
  thumbnailUrl: string
  screenshotUrl: string
  fullscreenMode: 'screenshot' | 'embed'
  buildEmbedURLForTilePB: (tile: any) => string
  currentIndex: number
  maxIndex: number
  visualTileOrder: number[]
  onNavigate: (nextIndex: number) => void
  isHidden?: boolean
  solvedTileIds?: Set<number>
}

export default function FullscreenTile({ tileData, startRect, thumbnailUrl, screenshotUrl, fullscreenMode, buildEmbedURLForTilePB, currentIndex, maxIndex, visualTileOrder, onNavigate, isHidden = false, solvedTileIds = new Set() }: FullscreenTileProps) {
  const { closeFullscreen } = useUIStore()
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [streetViewReady, setStreetViewReady] = useState(false)
  const [screenshotLoaded, setScreenshotLoaded] = useState(false)
  const [animDone, setAnimDone] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const loadStartRef = useRef<number | null>(null)
  const revealTimeoutRef = useRef<number | null>(null)

  // Helper functions to navigate in visual order
  const getCurrentVisualPosition = () => {
    return visualTileOrder.findIndex(tileId => tileId === currentIndex)
  }

  const getNextTileInVisualOrder = () => {
    const currentPos = getCurrentVisualPosition()
    if (currentPos === -1) return currentIndex // fallback to current if not found
    
    // Find next unsolved tile
    let attempts = 0
    let nextPos = currentPos
    do {
      nextPos = (nextPos + 1) % visualTileOrder.length
      attempts++
      // If we've checked all tiles, just return current (shouldn't happen)
      if (attempts >= visualTileOrder.length) return currentIndex
    } while (solvedTileIds.has(visualTileOrder[nextPos]))
    
    return visualTileOrder[nextPos]
  }

  const getPreviousTileInVisualOrder = () => {
    const currentPos = getCurrentVisualPosition()
    if (currentPos === -1) return currentIndex // fallback to current if not found
    
    // Find previous unsolved tile
    let attempts = 0
    let prevPos = currentPos
    do {
      prevPos = prevPos === 0 ? visualTileOrder.length - 1 : prevPos - 1
      attempts++
      // If we've checked all tiles, just return current (shouldn't happen)
      if (attempts >= visualTileOrder.length) return currentIndex
    } while (solvedTileIds.has(visualTileOrder[prevPos]))
    
    return visualTileOrder[prevPos]
  }

  // Reset loading states when location changes (for left/right navigation)
  useEffect(() => {
    setIframeLoaded(false)
    setStreetViewReady(false)
    setScreenshotLoaded(false)
    // Don't reset animDone - we want it to stay true for in-fullscreen navigation
  }, [tileData])

  const targetStyle = useMemo(() => ({ top: 0, left: 0, width: '100%', height: '100%' }), [])

  const shouldAnimateFromThumb = useMemo(() => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    return !(startRect.top === 0 && startRect.left === 0 && Math.round(startRect.width) === vw && Math.round(startRect.height) === vh)
  }, [startRect.top, startRect.left, startRect.width, startRect.height])

  useLayoutEffect(() => {
    if (!shouldAnimateFromThumb) {
      // For in-fullscreen navigation, immediately snap to fullscreen
      setAnimDone(true)
      return
    }
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        setAnimDone(true)
      })
      ;(window as any).__raf2 = raf2
    })
    return () => {
      cancelAnimationFrame(raf1)
      if ((window as any).__raf2) cancelAnimationFrame((window as any).__raf2)
    }
  }, [shouldAnimateFromThumb])

  // Handle loading for both screenshot and embed modes
  useEffect(() => {
    if (fullscreenMode === 'screenshot') {
      // For screenshot mode, we just need to wait for the screenshot to load
      // No complex iframe logic needed
      return
    }

    // For embed mode, listen for Street View ready message from iframe and use timeout fallback
    const handleMessage = (event: MessageEvent) => {
      // Check if message is from our iframe and indicates Street View is ready
      if (event.data && typeof event.data === 'object' && event.data.type === 'streetview_ready') {
        setStreetViewReady(true)
      }
    }

    // Record when we begin loading the iframe
    loadStartRef.current = performance.now()

    window.addEventListener('message', handleMessage)
    
    return () => {
      window.removeEventListener('message', handleMessage)
      if (revealTimeoutRef.current) {
        clearTimeout(revealTimeoutRef.current)
        revealTimeoutRef.current = null
      }
    }
  }, [fullscreenMode])

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        const prevIndex = getPreviousTileInVisualOrder()
        onNavigate(prevIndex)
      } else if (e.key === 'ArrowRight') {
        const nextIndex = getNextTileInVisualOrder()
        onNavigate(nextIndex)
      } else if (e.key === 'Escape') {
        closeFullscreen()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [currentIndex, visualTileOrder, onNavigate, closeFullscreen, solvedTileIds])

  const iframeUrl = buildEmbedURLForTilePB(tileData)
  const isReady = isHidden ? animDone : (fullscreenMode === 'screenshot' ? screenshotLoaded : streetViewReady)

  const handleContainerDoubleClick = (e: React.MouseEvent) => {
    // Close fullscreen on double-click, but let arrow buttons prevent propagation
    closeFullscreen()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black" onDoubleClick={handleContainerDoubleClick}>
      <div className="absolute inset-0">
        {/* Animated thumbnail (shown until content is ready) */}
        {!isHidden && (
          <img
            src={thumbnailUrl}
            className="absolute"
            style={{
              top: shouldAnimateFromThumb ? (animDone ? targetStyle.top : startRect.top) : targetStyle.top,
              left: shouldAnimateFromThumb ? (animDone ? targetStyle.left : startRect.left) : targetStyle.left,
              width: shouldAnimateFromThumb ? (animDone ? targetStyle.width : startRect.width) : targetStyle.width,
              height: shouldAnimateFromThumb ? (animDone ? targetStyle.height : startRect.height) : targetStyle.height,
              zIndex: 15, // Above content
              opacity: isReady ? 0 : 1,
              objectFit: 'fill',
              transition: shouldAnimateFromThumb && animDone ? 'all 0.4s ease-out' : 'none',
              transitionProperty: shouldAnimateFromThumb && animDone ? 'top, left, width, height, opacity' : 'none'
            }}
            alt="Fullscreen preview"
            draggable={false}
          />
        )}

        {/* Screenshot mode - show fullscreen screenshot */}
        {fullscreenMode === 'screenshot' && !isHidden && (
          <img
            src={screenshotUrl}
            className="absolute inset-0 w-full h-full"
            style={{ 
              zIndex: 10, // Always above background, below overlay
              opacity: screenshotLoaded ? 1 : 0,
              objectFit: 'fill'
            }}
            alt="Fullscreen screenshot"
            draggable={false}
            onLoad={() => {
              setScreenshotLoaded(true)
            }}
          />
        )}

        {/* Embed mode - show iframe */}
        {fullscreenMode === 'embed' && !isHidden && (
          <iframe
            key="streetview-iframe"
            src={iframeUrl}
            className="absolute inset-0 w-full h-full border-0"
            style={{ 
              zIndex: 10, // Always above background, below overlay
              opacity: streetViewReady ? 1 : 0
            }}
            allowFullScreen
            loading="eager"
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={() => {
              const now = performance.now()
              const start = loadStartRef.current ?? now
              const base = Math.max(0, now - start)
              // Heuristic: wait base * multiplier, clamped between MIN and MAX
              const extra = Math.min(MAX_REVEAL_DELAY_MS, Math.max(MIN_REVEAL_DELAY_MS, base * LOAD_REVEAL_MULTIPLIER))
              setIframeLoaded(true)
              if (revealTimeoutRef.current) {
                clearTimeout(revealTimeoutRef.current)
              }
              revealTimeoutRef.current = window.setTimeout(() => {
                setStreetViewReady(true)
                revealTimeoutRef.current = null
              }, extra)
            }}
          />
        )}

        {/* Hidden tile - show question mark */}
        {isHidden && (
          <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center" style={{ zIndex: 10 }}>
            <span className="text-red-500 text-9xl font-bold">?</span>
          </div>
        )}

        {/* Interaction shield blocks everything until ready */}
        <div
          className="absolute inset-0"
          style={{ zIndex: 20, pointerEvents: isReady ? 'none' : 'auto' }}
        />


        {/* UI overlay (click-through by default). Children opt-in with pointer-events-auto */}
        <div 
          className="absolute inset-0 pointer-events-none" 
          style={{ zIndex: 25 }} 
          ref={containerRef}
        >
          {/* Logo - only show in embed mode */}
          {fullscreenMode === 'embed' && (
            <div className="absolute top-0 left-0 p-4 bg-bg rounded-br-lg pointer-events-auto">
              <div className="flex items-center space-x-3 pr-[90px]">
                <img src="/geonections-logo.svg" alt="Geonections" className="w-9 h-9" />
                <span className="text-text font-semibold text-2xl">Geonections</span>
              </div>
            </div>
          )}
          
          {/* Close button - different styles for screenshot vs embed mode */}
          <div className="absolute top-0 right-0 p-2 pointer-events-auto">
            <button
              onClick={closeFullscreen}
              className={
                fullscreenMode === 'screenshot' 
                  ? "bg-black/20 backdrop-blur-sm hover:bg-black/40 text-white transition-all duration-200 rounded w-8 h-8 flex items-center justify-center select-none"
                  : "bg-bg border border-border text-muted rounded px-4 py-2 flex items-center justify-center text-lg font-medium transition-colors hover:bg-gray-800"
              }
            >
              {fullscreenMode === 'screenshot' ? (
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              ) : (
                '×'
              )}
            </button>
          </div>
          {/* Left/Right navigation buttons */}
          <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none" style={{ zIndex: 26 }}>
            <button
              className="ml-2 bg-bg border border-border text-muted rounded px-3 py-2 text-lg font-medium transition-colors hover:bg-gray-800 pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation()
                const prevIndex = getPreviousTileInVisualOrder()
                onNavigate(prevIndex)
              }}
              onDoubleClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
              }}
            >
              ←
            </button>
          </div>
          <div className="absolute inset-y-0 right-0 flex items-center pointer-events-none" style={{ zIndex: 26 }}>
            <button
              className="mr-2 bg-bg border border-border text-muted rounded px-3 py-2 text-lg font-medium transition-colors hover:bg-gray-800 pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation()
                const nextIndex = getNextTileInVisualOrder()
                onNavigate(nextIndex)
              }}
              onDoubleClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
              }}
            >
              →
            </button>
          </div>
          <div className="absolute bottom-0 right-0 flex items-center justify-center px-4 cursor-not-allowed pointer-events-auto" style={{ height: 'calc((2.25rem + 2rem) * 3)', width: 'calc(2.25rem + 2rem)'}}>
          </div>
        </div>
      </div>
    </div>
  )
}
