"use client"

import { Play, Pause, SkipBack, SkipForward } from "lucide-react"

interface PlayerControlsProps {
  isPlaying: boolean
  onPlayPause: () => void
  onPrev: () => void
  onNext: () => void
}

export function PlayerControls({ isPlaying, onPlayPause, onPrev, onNext }: PlayerControlsProps) {
  return (
    <div className="flex items-center gap-6">
      <button
        onClick={onPrev}
        className="p-2 text-foreground/60 hover:text-foreground transition-colors"
        aria-label="Previous track"
      >
        <SkipBack className="w-5 h-5" />
      </button>
      
      <button
        onClick={onPlayPause}
        className="p-3 rounded-full border border-border hover:border-accent hover:text-accent transition-colors"
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <Pause className="w-6 h-6" />
        ) : (
          <Play className="w-6 h-6 ml-0.5" />
        )}
      </button>
      
      <button
        onClick={onNext}
        className="p-2 text-foreground/60 hover:text-foreground transition-colors"
        aria-label="Next track"
      >
        <SkipForward className="w-5 h-5" />
      </button>
    </div>
  )
}
