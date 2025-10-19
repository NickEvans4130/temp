import React, { useState, useEffect, useRef } from 'react'
import { getCountryOptions, isValidCountryInput, CountryOption } from '../utils/countryUtils'

interface CountryGuessDropdownProps {
  isOpen: boolean
  onSubmit: (groupName: string) => void
  onCancel: () => void
  onSkip?: () => void
  gameMode?: 'easy' | 'normal' | 'expert'
  resetTrigger?: number // Increment this to reset the input
  difficulties?: string[] // For expert mode - the difficulties of groups to guess
}

export default function CountryGuessDropdown({ isOpen, onSubmit, onCancel, onSkip, gameMode = 'normal', resetTrigger, difficulties = [] }: CountryGuessDropdownProps) {
  // Bucket colors that match the game
  const bucketColors = ['#FACC15', '#14B8A6', '#A855F7', '#EF4444'] // Yellow, Teal, Purple, Red
  
  // For single group mode (easy/normal)
  const [input, setInput] = useState('')
  const [options, setOptions] = useState<CountryOption[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [showOptions, setShowOptions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const optionsRef = useRef<HTMLDivElement>(null)
  const selectedOptionRef = useRef<HTMLButtonElement>(null)

  // For expert mode (multiple groups)
  const [expertInputs, setExpertInputs] = useState<{ [difficulty: string]: string }>({})
  const [expertOptions, setExpertOptions] = useState<{ [difficulty: string]: CountryOption[] }>({})
  const [expertSelectedIndices, setExpertSelectedIndices] = useState<{ [difficulty: string]: number }>({})
  const [expertShowOptions, setExpertShowOptions] = useState<{ [difficulty: string]: boolean }>({})
  const [focusedDifficulty, setFocusedDifficulty] = useState<string | null>(null)

  const isExpertMode = gameMode === 'expert'

  // Reset state when dropdown opens/closes
  useEffect(() => {
    if (isOpen) {
      if (isExpertMode) {
        // Initialize expert mode state
        const initialInputs: { [difficulty: string]: string } = {}
        const initialOptions: { [difficulty: string]: CountryOption[] } = {}
        const initialIndices: { [difficulty: string]: number } = {}
        const initialShowOptions: { [difficulty: string]: boolean } = {}
        
        difficulties.forEach(difficulty => {
          initialInputs[difficulty] = ''
          initialOptions[difficulty] = []
          initialIndices[difficulty] = 0
          initialShowOptions[difficulty] = false
        })
        
        setExpertInputs(initialInputs)
        setExpertOptions(initialOptions)
        setExpertSelectedIndices(initialIndices)
        setExpertShowOptions(initialShowOptions)
        setFocusedDifficulty(difficulties[0] || null)
        
        // Focus first input after a short delay
        setTimeout(() => {
          const firstInput = document.querySelector(`input[data-difficulty="${difficulties[0]}"]`) as HTMLInputElement
          if (firstInput) {
            firstInput.focus()
          }
        }, 100)
      } else {
        // Initialize single group mode state
        setInput('')
        setOptions([])
        setSelectedIndex(0)
        setShowOptions(false)
        // Focus input after a short delay
        setTimeout(() => {
          inputRef.current?.focus()
        }, 100)
      }
    }
  }, [isOpen, isExpertMode, difficulties])

  // Reset input when resetTrigger changes (e.g., after wrong guess)
  useEffect(() => {
    if (resetTrigger !== undefined && resetTrigger > 0) {
      if (isExpertMode) {
        const resetInputs: { [difficulty: string]: string } = {}
        const resetOptions: { [difficulty: string]: CountryOption[] } = {}
        const resetIndices: { [difficulty: string]: number } = {}
        const resetShowOptions: { [difficulty: string]: boolean } = {}
        
        difficulties.forEach(difficulty => {
          resetInputs[difficulty] = ''
          resetOptions[difficulty] = []
          resetIndices[difficulty] = 0
          resetShowOptions[difficulty] = false
        })
        
        setExpertInputs(resetInputs)
        setExpertOptions(resetOptions)
        setExpertSelectedIndices(resetIndices)
        setExpertShowOptions(resetShowOptions)
        
        // Focus first input after a short delay
        setTimeout(() => {
          const firstInput = document.querySelector(`input[data-difficulty="${difficulties[0]}"]`) as HTMLInputElement
          if (firstInput) {
            firstInput.focus()
          }
        }, 100)
      } else {
        setInput('')
        setOptions([])
        setSelectedIndex(0)
        setShowOptions(false)
        // Focus input after a short delay
        setTimeout(() => {
          inputRef.current?.focus()
        }, 100)
      }
    }
  }, [resetTrigger, isExpertMode, difficulties])

  // Update options when input changes (single group mode)
  useEffect(() => {
    if (!isExpertMode && input.trim()) {
      const newOptions = getCountryOptions(input)
      setOptions(newOptions)
      setShowOptions(newOptions.length > 0)
      setSelectedIndex(0)
    } else if (!isExpertMode) {
      setOptions([])
      setShowOptions(false)
    }
  }, [input, isExpertMode])

  // Update options when expert inputs change
  useEffect(() => {
    if (isExpertMode) {
      const newOptions: { [difficulty: string]: CountryOption[] } = {}
      
      difficulties.forEach(difficulty => {
        const inputValue = expertInputs[difficulty] || ''
        if (inputValue.trim()) {
          newOptions[difficulty] = getCountryOptions(inputValue)
        } else {
          newOptions[difficulty] = []
        }
      })
      
      setExpertOptions(newOptions)
      
      // Reset selected indices
      const newIndices: { [difficulty: string]: number } = {}
      difficulties.forEach(difficulty => {
        newIndices[difficulty] = 0
      })
      setExpertSelectedIndices(newIndices)
    }
  }, [expertInputs, isExpertMode, difficulties])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isExpertMode) {
      const difficulty = e.target.dataset.difficulty
      if (difficulty) {
        setExpertInputs(prev => ({
          ...prev,
          [difficulty]: e.target.value
        }))
        setFocusedDifficulty(difficulty)
        
        // Close all other dropdowns, only keep the current one open if it has options
        const newShowOptions: { [difficulty: string]: boolean } = {}
        difficulties.forEach(diff => {
          if (diff === difficulty) {
            // Only show dropdown for current input if it has options
            const inputValue = e.target.value
            if (inputValue.trim()) {
              const options = getCountryOptions(inputValue)
              newShowOptions[diff] = options.length > 0
            } else {
              newShowOptions[diff] = false
            }
          } else {
            newShowOptions[diff] = false
          }
        })
        setExpertShowOptions(newShowOptions)
      }
    } else {
      setInput(e.target.value)
    }
  }

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (isExpertMode) {
      const difficulty = e.target.dataset.difficulty
      if (difficulty) {
        setFocusedDifficulty(difficulty)
        
        // Close all other dropdowns when focusing on an input
        const newShowOptions: { [difficulty: string]: boolean } = {}
        difficulties.forEach(diff => {
          newShowOptions[diff] = false
        })
        setExpertShowOptions(newShowOptions)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isExpertMode) {
      const difficulty = (e.target as HTMLInputElement).dataset.difficulty
      if (!difficulty) return
      
      const showOptionsForDifficulty = expertShowOptions[difficulty]
      const optionsForDifficulty = expertOptions[difficulty] || []
      const selectedIndexForDifficulty = expertSelectedIndices[difficulty] || 0
      
      // In expert mode, Enter behavior depends on dropdown visibility
      if (e.key === 'Enter') {
        e.preventDefault()
        if (showOptionsForDifficulty && optionsForDifficulty.length > 0) {
          // Dropdown is visible - select the highlighted option
          if (optionsForDifficulty[selectedIndexForDifficulty]) {
            handleExpertOptionSelect(difficulty, optionsForDifficulty[selectedIndexForDifficulty])
          }
        } else {
          // No dropdown visible - move to next input with current value
          handleExpertSubmit(difficulty)
        }
        return
      }
      
      if (!showOptionsForDifficulty) {
        if (e.key === 'Escape') {
          onCancel()
        } else if (e.key === 'Tab') {
          // Handle tab navigation between inputs
          e.preventDefault()
          const currentIndex = difficulties.indexOf(difficulty)
          const nextIndex = e.shiftKey ? currentIndex - 1 : currentIndex + 1
          if (nextIndex >= 0 && nextIndex < difficulties.length) {
            const nextDifficulty = difficulties[nextIndex]
            setFocusedDifficulty(nextDifficulty)
            const nextInput = document.querySelector(`input[data-difficulty="${nextDifficulty}"]`) as HTMLInputElement
            if (nextInput) {
              nextInput.focus()
            }
          }
        }
        return
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setExpertSelectedIndices(prev => ({
            ...prev,
            [difficulty]: Math.min(selectedIndexForDifficulty + 1, optionsForDifficulty.length - 1)
          }))
          break
        case 'ArrowUp':
          e.preventDefault()
          setExpertSelectedIndices(prev => ({
            ...prev,
            [difficulty]: Math.max(selectedIndexForDifficulty - 1, 0)
          }))
          break
        case 'Escape':
          setExpertShowOptions(prev => ({
            ...prev,
            [difficulty]: false
          }))
          break
      }
    } else {
      // Single group mode key handling
      if (!showOptions) {
        if (e.key === 'Enter') {
          e.preventDefault()
          handleSubmit()
        } else if (e.key === 'Escape') {
          onCancel()
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
  }

  const handleOptionSelect = (option: CountryOption) => {
    setInput(option.name)
    setShowOptions(false)
    onSubmit(option.code)
  }

  const handleExpertOptionSelect = (difficulty: string, option: CountryOption) => {
    setExpertInputs(prev => ({
      ...prev,
      [difficulty]: option.name
    }))
    
    // Close all dropdowns
    const newShowOptions: { [difficulty: string]: boolean } = {}
    difficulties.forEach(diff => {
      newShowOptions[diff] = false
    })
    setExpertShowOptions(newShowOptions)
    
    // Move to next input instead of submitting
    const currentIndex = difficulties.indexOf(difficulty)
    const nextIndex = currentIndex + 1
    
    if (nextIndex < difficulties.length) {
      // Move to next input
      const nextDifficulty = difficulties[nextIndex]
      setFocusedDifficulty(nextDifficulty)
      const nextInput = document.querySelector(`input[data-difficulty="${nextDifficulty}"]`) as HTMLInputElement
      if (nextInput) {
        nextInput.focus()
      }
    } else {
      // All inputs filled, now submit all
      handleExpertSubmitAll()
    }
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

  const handleExpertSubmit = (difficulty: string) => {
    const inputValue = expertInputs[difficulty] || ''
    if (!inputValue.trim()) return
    
    // Check if input is valid
    if (!isValidCountryInput(inputValue)) return
    
    // Close all dropdowns
    const newShowOptions: { [difficulty: string]: boolean } = {}
    difficulties.forEach(diff => {
      newShowOptions[diff] = false
    })
    setExpertShowOptions(newShowOptions)
    
    // Move to next input instead of submitting
    const currentIndex = difficulties.indexOf(difficulty)
    const nextIndex = currentIndex + 1
    
    if (nextIndex < difficulties.length) {
      // Move to next input
      const nextDifficulty = difficulties[nextIndex]
      setFocusedDifficulty(nextDifficulty)
      const nextInput = document.querySelector(`input[data-difficulty="${nextDifficulty}"]`) as HTMLInputElement
      if (nextInput) {
        nextInput.focus()
      }
    } else {
      // All inputs filled, now submit all
      handleExpertSubmitAll()
    }
  }

  const handleExpertSubmitAll = () => {
    // Check if all inputs are filled and valid
    const allFilled = difficulties.every(difficulty => {
      const inputValue = expertInputs[difficulty] || ''
      return inputValue.trim() && isValidCountryInput(inputValue)
    })
    
    if (!allFilled) return
    
    // Submit all countries as a single expert mode submission
    // We'll pass all the country codes as a special format
    const allCountries = difficulties.map(difficulty => {
      const inputValue = expertInputs[difficulty] || ''
      const options = getCountryOptions(inputValue)
      return options.length > 0 ? options[0].code : ''
    }).join('|') // Use pipe separator to indicate expert mode
    
    onSubmit(allCountries)
  }

  const handleClickOutside = (e: MouseEvent) => {
    if (isExpertMode) {
      // For expert mode, close all option dropdowns
      const target = e.target as Node
      const isInput = target && (target as Element).tagName === 'INPUT'
      const isOption = target && (target as Element).closest('[data-options-container]')
      const isDropdownContainer = target && (target as Element).closest('[data-expert-dropdown]')
      const isTile = target && (target as Element).closest('[data-tile]')
      
      // If clicking on a tile, don't close the dropdown - let the tile handler manage it
      if (isTile) {
        return
      }
      
      if (!isInput && !isOption && !isDropdownContainer) {
        // Clicked outside the entire dropdown - close it completely
        onCancel()
      } else if (!isInput && !isOption) {
        // Clicked outside input/options but still in dropdown - just close options
        const newShowOptions: { [difficulty: string]: boolean } = {}
        difficulties.forEach(difficulty => {
          newShowOptions[difficulty] = false
        })
        setExpertShowOptions(newShowOptions)
      }
    } else {
      // Single group mode
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node) && 
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowOptions(false)
      }
    }
  }

  useEffect(() => {
    if (isExpertMode) {
      const hasOpenOptions = Object.values(expertShowOptions).some(show => show)
      if (hasOpenOptions) {
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
      }
    } else if (showOptions) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showOptions, expertShowOptions, isExpertMode])

  if (!isOpen) return null

  if (isExpertMode) {
    // Expert mode: show multiple input fields
    const allFilled = difficulties.every(difficulty => {
      const inputValue = expertInputs[difficulty] || ''
      return inputValue.trim() && isValidCountryInput(inputValue)
    })

    return (
      <div className="absolute top-full left-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-50 min-w-96" data-expert-dropdown>
        <div className="p-4">
          <h3 className="text-sm font-semibold text-text mb-4 text-center">
            Name your four groups
          </h3>
          
          <div className="space-y-3 mb-4">
            {difficulties.map((difficulty, index) => {
              const inputValue = expertInputs[difficulty] || ''
              const optionsForDifficulty = expertOptions[difficulty] || []
              const selectedIndexForDifficulty = expertSelectedIndices[difficulty] || 0
              const showOptionsForDifficulty = expertShowOptions[difficulty] || false
              const isFocused = focusedDifficulty === difficulty
              
              return (
                <div key={difficulty} className="flex items-center space-x-3">
                  {/* Difficulty label */}
                  {/* Color indicator */}
                  <div className="flex items-center">
                    <div 
                      className="w-4 h-4 rounded border border-gray-300"
                      style={{ backgroundColor: bucketColors[index] }}
                    />
                  </div>
                  
                  {/* Input field */}
                  <div className="relative flex-1">
                    <input
                      type="text"
                      data-difficulty={difficulty}
                      value={inputValue}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      onFocus={handleInputFocus}
                      placeholder="e.g., France or FR"
                      className="w-full px-3 py-1 border border-border rounded-md bg-bg text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    
                    {/* Autocomplete dropdown */}
                    {showOptionsForDifficulty && optionsForDifficulty.length > 0 && (
                      <div
                        data-options-container
                        className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg max-h-32 overflow-y-auto z-10 scrollbar-thin"
                      >
                        {optionsForDifficulty.map((option, optionIndex) => (
                          <button
                            key={option.code}
                            onClick={() => handleExpertOptionSelect(difficulty, option)}
                            className={`w-full px-3 py-1 text-left text-sm hover:bg-muted transition-colors ${
                              optionIndex === selectedIndexForDifficulty ? 'bg-muted' : ''
                            }`}
                          >
                            <div className="font-medium text-text">{option.name}</div>
                            <div className="text-xs text-text">{option.code}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium rounded-md transition-colors hover:opacity-80 bg-muted text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleExpertSubmitAll}
              disabled={!allFilled}
              className="submit-btn disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit all
            </button>
          </div>

          {/* Validation message */}
          {difficulties.some(difficulty => {
            const inputValue = expertInputs[difficulty] || ''
            return inputValue.trim() && !isValidCountryInput(inputValue)
          }) && (
            <div className="mt-2 text-sm text-red-500">
              Some countries not found
            </div>
          )}
        </div>
      </div>
    )
  } else {
    // Single group mode (easy/normal)
    return (
      <div className="absolute top-full left-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-50 min-w-80">
        <div className="p-4">
          <h3 className="text-sm font-semibold text-text mb-3">
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
                className="w-full px-3 py-1 border border-border rounded-md bg-bg text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                autoComplete="off"
                spellCheck={false}
              />
              
              {/* Autocomplete dropdown */}
              {showOptions && options.length > 0 && (
                <div
                  ref={optionsRef}
                  className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto z-10 scrollbar-thin"
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
              {gameMode === 'easy' && onSkip && (
                <button
                  onClick={onSkip}
                  className="px-3 py-1 text-sm font-medium rounded-md transition-colors hover:opacity-80 bg-gray-600 text-white whitespace-nowrap"
                >
                  Skip
                </button>
              )}
              <button
                onClick={onCancel}
                className="default-btn text-red-500 border-red-500 whitespace-nowrap"
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
}
