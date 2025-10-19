import React from "react"

interface SpinnerProps {
  size?: number
  strokeWidth?: number
  color?: string
  className?: string
}

const Spinner: React.FC<SpinnerProps> = ({
  size = 40,
  strokeWidth = 4,
  color = "currentColor",
  className,
}) => {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  return (
    <svg
      className={`animate-spin ${className ?? ""}`}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * 0.75} // show only part of the circle
      />
    </svg>
  )
}

export default Spinner


