import React, { useState, useEffect, useRef } from 'react'
import { getCountryOptions, isValidCountryInput, CountryOption } from '../utils/countryUtils'

interface CountryGuessPopupProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (groupName: string) => void
}

export default function CountryGuessPopup({ isOpen, onClose, onSubmit }: CountryGuessPopupProps) {
  const [input, setInput] = useState('')
  const [options, setOptions] = useState<CountryOption[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [showOptions, setShowOptions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const optionsRef = useRef<HTMLDivElement>(null)
  const selectedOptionRef = useRef<HTMLButtonElement>(null)

  // Reset state when popup opens/closes
  useEffect(() => {
    if (isOpen) {
      setInput('')
      setOptions([])
      setSelectedIndex(0)
      setShowOptions(false)
      // Focus input after a short delay
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // Update options when input changes
  useEffect(() => {
    if (!input.trim()) {
      setOptions([])
      setShowOptions(false)
      return
    }

    const newOptions = getCountryOptions(input)
    setOptions(newOptions)
    setShowOptions(newOptions.length > 0)
    setSelectedIndex(0)
  }, [input])

  // Scroll selected option into view
  useEffect(() => {
    if (selectedOptionRef.current && optionsRef.current) {
      selectedOptionRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      })
    }
  }, [selectedIndex])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showOptions) {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      } else if (e.key === 'Escape') {
        onClose()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, options.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (options[selectedIndex]) {
          handleOptionSelect(options[selectedIndex])
        }
        break
      case 'Escape':
        setShowOptions(false)
        break
    }
  }

  const handleOptionSelect = (option: CountryOption) => {
    setInput(option.name) // Use just the name, not displayText
    setShowOptions(false)
    onSubmit(option.code)
  }

  const handleSubmit = () => {
    if (!input.trim()) return
    
    // Check if input is valid
    if (!isValidCountryInput(input)) return
    
    // Find the country code
    const options = getCountryOptions(input)
    if (options.length > 0) {
      onSubmit(options[0].code)
    }
  }

  const handleClickOutside = (e: MouseEvent) => {
    if (optionsRef.current && !optionsRef.current.contains(e.target as Node) && 
        inputRef.current && !inputRef.current.contains(e.target as Node)) {
      setShowOptions(false)
    }
  }

  useEffect(() => {
    if (showOptions) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showOptions])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-text mb-4">
          Enter the country name or 2-letter code
        </h3>
        
        <div className="flex items-start gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="e.g., France or FR"
              className="w-full px-3 py-1 border border-border rounded-md bg-bg text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent"
              autoComplete="off"
              spellCheck={false}
            />
            
            {/* Autocomplete dropdown */}
            {showOptions && options.length > 0 && (
              <div
                ref={optionsRef}
                className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto z-10 scrollbar-thin"
              >
                {options.map((option, index) => (
                  <button
                    key={option.code}
                    ref={index === selectedIndex ? selectedOptionRef : null}
                    onClick={() => handleOptionSelect(option)}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors ${
                      index === selectedIndex ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="font-medium text-text">{option.name}</div>
                    <div className="text-xs text-text">{option.code}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || !isValidCountryInput(input)}
              className="submit-btn disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Submit
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded transition-colors hover:opacity-80 bg-muted text-white whitespace-nowrap"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Validation message */}
        {input.trim() && !isValidCountryInput(input) && (
          <div className="mt-2 text-sm text-red-500">
            No matching country found
          </div>
        )}
      </div>
    </div>
  )
}
