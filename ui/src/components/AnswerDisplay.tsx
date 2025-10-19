import React from 'react'
import { CODE_TO_NAME } from '../utils/countryUtils'

export interface AnswerDisplayProps {
  /** The group name (country name or theme name) */
  groupName: string
  /** The difficulty level */
  difficulty?: string
  /** Whether to show the group code in parentheses */
  showGroupCode?: boolean
  /** Whether to show only the group name, hiding difficulty */
  groupOnly?: boolean
  /** Custom styling for the container */
  className?: string
  /** Custom styling for the text */
  style?: React.CSSProperties
  /** Text color function for contrast */
  getContrastTextColor?: (backgroundColor: string) => string
  /** Background color for styling */
  backgroundColor?: string
}

/**
 * A reusable component for displaying answer information consistently.
 * Always shows group name first, followed by difficulty.
 */
export default function AnswerDisplay({
  groupName,
  difficulty,
  showGroupCode = false,
  groupOnly = false,
  className = '',
  style = {},
  getContrastTextColor,
  backgroundColor
}: AnswerDisplayProps) {
  // Convert country code to name if needed
  const displayName = CODE_TO_NAME.get(groupName) || groupName
  
  // Determine the group code to show in parentheses
  const groupCode = showGroupCode && CODE_TO_NAME.has(groupName) ? groupName : null
  
  let displayText: string
  
  if (groupOnly) {
    // Show only the group name
    displayText = groupCode 
      ? `${displayName} (${groupCode})`
      : displayName
  } else {
    // Always show group first, then difficulty
    if (difficulty) {
      displayText = groupCode 
        ? `${displayName} (${groupCode}) - ${difficulty}`
        : `${displayName} - ${difficulty}`
    } else {
      displayText = groupCode 
        ? `${displayName} (${groupCode})`
        : displayName
    }
  }
  
  // Apply styling
  const finalStyle: React.CSSProperties = {
    ...style,
    ...(backgroundColor && getContrastTextColor ? {
      backgroundColor,
      color: getContrastTextColor(backgroundColor)
    } : {})
  }
  
  return (
    <div className={className} style={finalStyle}>
      {displayText}
    </div>
  )
}
