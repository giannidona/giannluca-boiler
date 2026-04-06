"use client"

interface VinylRecordProps {
  isPlaying: boolean
}

export function VinylRecord({ isPlaying }: VinylRecordProps) {
  return (
    <div className="relative w-56 h-56 sm:w-64 sm:h-64">
      <svg
        viewBox="0 0 200 200"
        className={`w-full h-full ${isPlaying ? "animate-spin" : ""}`}
        style={{ animationDuration: "3s" }}
      >
        {/* Outer disc */}
        <circle cx="100" cy="100" r="98" fill="#1a1a1a" />
        
        {/* Groove rings */}
        {[85, 75, 65, 55, 45].map((r, i) => (
          <circle
            key={i}
            cx="100"
            cy="100"
            r={r}
            fill="none"
            stroke="#2a2a2a"
            strokeWidth="0.5"
          />
        ))}
        
        {/* Center label */}
        <circle cx="100" cy="100" r="32" fill="#FF708C" />
        
        {/* Center hole */}
        <circle cx="100" cy="100" r="4" fill="#0a0a0a" />
        
        {/* Live text */}
        <text
          x="100"
          y="103"
          textAnchor="middle"
          fill="#0a0a0a"
          fontSize="10"
          fontWeight="600"
          className="uppercase tracking-wider"
        >
          Live
        </text>
      </svg>
    </div>
  )
}
