import { useCallback } from 'react'

// Base URL for panorama images - can be changed to test different sources
// MUST include trailing slash for proper URL construction
// Examples: 'http://localhost:8000/', 'https://geonections.com/pano/img/'
const IMAGE_BASE_URL = 'https://pub-0261180402ef4342ae0515829ad312bb.r2.dev/img/'

export function useImageUtils() {
  const getThumbnailUrl = useCallback((location: any) => {
    // Construct the filename using the data from the location object
    const { panoId, heading, pitch, zoom, extra } = location
    const panoDate = extra?.panoDate || '2024-01' // Default to 2024-01 if panoDate is missing
    
    // Use panoId from extra metadata if main panoId is null
    const actualPanoId = panoId || extra?.panoId
    
    // Format: {panoId}~d{date}~h{heading}~p{pitch}~z0~thumb.jpg
    // The actual image files always have z0, not the actual zoom values
    // Use parseFloat to remove trailing zeros and match the actual filename format
    const formatNumber = (num: number) => {
      const formatted = parseFloat(num.toFixed(2))
      return formatted.toString()
    }
    
    const filename = `${actualPanoId}~d${panoDate}~h${formatNumber(heading)}~p${formatNumber(pitch)}~z0~thumb.jpg`
    return `${IMAGE_BASE_URL}${filename}`
  }, [])

  const getScreenshotUrl = useCallback((location: any) => {
    // Construct the filename using the data from the location object
    const { panoId, heading, pitch, zoom, extra } = location
    const panoDate = extra?.panoDate || '2024-01' // Default to 2024-01 if panoDate is missing
    
    // Use panoId from extra metadata if main panoId is null
    const actualPanoId = panoId || extra?.panoId
    
    // Format: {panoId}~d{date}~h{heading}~p{pitch}~z0.jpg (no _thumb)
    // The actual image files always have z0, not the actual zoom values
    // Use parseFloat to remove trailing zeros and match the actual filename format
    const formatNumber = (num: number) => {
      const formatted = parseFloat(num.toFixed(2))
      return formatted.toString()
    }
    
    const filename = `${actualPanoId}~d${panoDate}~h${formatNumber(heading)}~p${formatNumber(pitch)}~z0.jpg`
    return `${IMAGE_BASE_URL}${filename}`
  }, [])

  const getDifficultyColor = useCallback((tags: string[]) => {
    const difficultyTags = ['Easy', 'Medium', 'Hard', 'Expert']
    const difficulty = tags.find(tag => 
      difficultyTags.some(diff => diff.toLowerCase() === tag.toLowerCase())
    )
    if (difficulty) {
      const lowerDifficulty = difficulty.toLowerCase()
      switch (lowerDifficulty) {
        case 'easy': return 'var(--easy)'
        case 'medium': return 'var(--medium)'
        case 'hard': return 'var(--hard)'
        case 'expert': return 'var(--expert)'
        default: return 'var(--muted)'
      }
    }
    return 'var(--muted)'
  }, [])

  const getContrastTextColor = useCallback((backgroundColor: string) => {
    // Convert CSS variable to actual color value
    const colorMap: { [key: string]: string } = {
      'var(--easy)': '#FACC15',
      'var(--medium)': '#14B8A6', 
      'var(--hard)': '#A855F7',
      'var(--expert)': '#EF4444',
      'var(--muted)': '#9aa3b2'
    }
    
    const actualColor = colorMap[backgroundColor] || backgroundColor
    
    // Convert hex to RGB
    const hex = actualColor.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    
    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    
    // Return white for dark backgrounds, black for light backgrounds
    return luminance > 0.5 ? '#000000' : '#ffffff'
  }, [])

  const buildEmbedURLForTilePB = useCallback((tile: any) => {
    const lat = Number(tile.lat ?? tile.extra?.lat ?? 0)
    const lng = Number(tile.lng ?? tile.extra?.lng ?? 0)
    const heading = Math.round(Number(tile.heading ?? 0) * 100) / 100
    const pitch = Math.round(Number(tile.pitch ?? 0) * 100) / 100
    const panoId = tile.panoId || tile.extra?.panoId

    return panoId
      ? `https://www.google.com/maps/embed?pb=!1m0!3m2!1sen!2sus!5m2!1sen!2sus!6m8!1m7!1s${encodeURIComponent(panoId)}!2m2!1d${lat}!2d${lng}!3f${heading}!4f${pitch}!5f0.7820865974627469`
      : `https://www.google.com/maps/embed?pb=!1m0!3m2!1sen!2sus!5m2!1sen!2sus!6m8!1m7!1s${lat},${lng}!2m2!1d${lat}!2d${lng}!3f${heading}!4f${pitch}!5f0.7820865974627469`
  }, [])

  const buildAPIEmbedURLForTilePB = useCallback((tile: any, key: string) => {
    const lat = Number(tile.lat ?? tile.extra?.lat ?? 0)
    const lng = Number(tile.lng ?? tile.extra?.lng ?? 0)
    const heading = Math.round(Number(tile.heading ?? 0) * 100) / 100
    const pitch = Math.round(Number(tile.pitch ?? 0) * 100) / 100
    const panoId = tile.panoId || tile.extra?.panoId

    // Use Google Maps Embed API with API key
    return `https://www.google.com/maps/embed/v1/streetview?key=${key}&location=${lat},${lng}&heading=${heading}&pitch=${pitch}&fov=90`
  }, [])

  return {
    getThumbnailUrl,
    getScreenshotUrl,
    getDifficultyColor,
    getContrastTextColor,
    buildEmbedURLForTilePB,
    buildAPIEmbedURLForTilePB
  }
}
