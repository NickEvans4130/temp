import { useState, useEffect } from 'react'

const ABOUT_POPUP_KEY = 'geonections-about-popup-closed'

export function useAboutPopup() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Check if popup was previously closed
    const wasClosed = localStorage.getItem(ABOUT_POPUP_KEY)
    if (!wasClosed) {
      setIsOpen(true)
    }
  }, [])

  const closePopup = () => {
    setIsOpen(false)
    localStorage.setItem(ABOUT_POPUP_KEY, 'true')
  }

  const openPopup = () => {
    setIsOpen(true)
  }

  return {
    isOpen,
    closePopup,
    openPopup
  }
}
