"use client"

import { formatAudioTime } from "@/lib/utils"
import { EqBars } from "./eq-bars"

export interface Set {
  id: number
  name: string
  genre: string
  date: string
  duration: string
  src: string
}

interface SetlistProps {
  sets: Set[]
  currentIndex: number
  isPlaying: boolean
  activeDuration: number
  onSelectSet: (index: number) => void
}

export function Setlist({ sets, currentIndex, isPlaying, activeDuration, onSelectSet }: SetlistProps) {
  return (
    <div className="w-full max-w-md">
      <div className="border-t border-border pt-6 pb-2">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Sets</span>
      </div>
      
      <div className="space-y-1">
        {sets.map((set, index) => {
          const isActive = index === currentIndex
          
          return (
            <button
              key={set.id}
              onClick={() => onSelectSet(index)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors ${
                isActive ? "bg-secondary" : "hover:bg-secondary/50"
              }`}
            >
              <span className="w-5 flex justify-center shrink-0">
                {isActive && isPlaying ? (
                  <EqBars />
                ) : (
                  <span className="text-xs text-muted-foreground">{index + 1}</span>
                )}
              </span>
              
              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${isActive ? "text-foreground font-medium" : "text-foreground"}`}>
                  {set.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">{set.genre}</p>
              </div>
              
              <span className="text-xs text-muted-foreground shrink-0">
                {isActive && activeDuration > 0 && Number.isFinite(activeDuration)
                  ? formatAudioTime(activeDuration)
                  : set.duration || "—"}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
