"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { VinylRecord } from "@/components/vinyl-record"
import { ThemeToggle } from "@/components/theme-toggle"
import { PlayerControls } from "@/components/player-controls"
import { Setlist, type Set } from "@/components/setlist"

const sets: Set[] = [
  { id: 1, name: "Boiler Room Warmup", genre: "Deep House", date: "Mar 2024", duration: "1:20:00", src: "/sets/set1.mp3" },
  { id: 2, name: "After Hours Vol. 3", genre: "Techno", date: "Jan 2024", duration: "2:00:00", src: "/sets/set2.mp3" },
  { id: 3, name: "Rooftop Session", genre: "Afrohouse", date: "Nov 2023", duration: "1:45:00", src: "/sets/set3.mp3" },
  { id: 4, name: "Sunset Grooves", genre: "Melodic House", date: "Sep 2023", duration: "1:30:00", src: "/sets/set4.mp3" },
  { id: 5, name: "Club Night Edit", genre: "Techno / Minimal", date: "Jul 2023", duration: "1:10:00", src: "/sets/set5.mp3" },
  { id: 6, name: "Deep Into the Night", genre: "Deep Techno", date: "May 2023", duration: "1:55:00", src: "/sets/set6.mp3" },
]

function parseDuration(duration: string): number {
  const parts = duration.split(":").map(Number)
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  return parts[0] * 60 + parts[1]
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }
  return `${m}:${s.toString().padStart(2, "0")}`
}

export default function RadioPage() {
  const [isDark, setIsDark] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const currentSet = sets[currentIndex]

  // Apply theme class to html element
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [isDark])

  const playNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % sets.length)
  }, [])

  const playPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + sets.length) % sets.length)
  }, [])

  // Handle track change
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.load()
    if (isPlaying) {
      audio.play().catch(() => {
        // Autoplay blocked, user needs to interact
        setIsPlaying(false)
      })
    }
  }, [currentIndex, isPlaying])

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleDurationChange = () => setDuration(audio.duration || parseDuration(currentSet.duration))
    const handleEnded = () => playNext()
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("durationchange", handleDurationChange)
    audio.addEventListener("ended", handleEnded)
    audio.addEventListener("play", handlePlay)
    audio.addEventListener("pause", handlePause)

    // Set initial duration from metadata
    setDuration(parseDuration(currentSet.duration))

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("durationchange", handleDurationChange)
      audio.removeEventListener("ended", handleEnded)
      audio.removeEventListener("play", handlePlay)
      audio.removeEventListener("pause", handlePause)
    }
  }, [currentSet.duration, playNext])

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play().catch(() => {
        // Handle autoplay restriction
      })
    }
  }

  const handleSelectSet = (index: number) => {
    setCurrentIndex(index)
    setIsPlaying(true)
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !duration) return

    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    audio.currentTime = percent * duration
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      {/* Audio element */}
      <audio ref={audioRef} preload="metadata">
        <source src={currentSet.src} type="audio/mpeg" />
      </audio>

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-base font-medium">Giannluca&apos;s Boiler</h1>
          <p className="text-[10px] uppercase tracking-widest text-accent">24/7 Radio</p>
        </div>
        <ThemeToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} />
      </header>

      {/* Main content */}
      <main className="flex flex-col items-center px-6 py-8">
        {/* Vinyl player */}
        <div className="flex flex-col items-center">
          <VinylRecord isPlaying={isPlaying} />

          {/* Track info */}
          <div className="mt-8 text-center">
            <h2 className="text-xl font-medium text-balance">{currentSet.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{currentSet.genre}</p>
            <p className="mt-1 text-xs text-accent">
              {currentSet.date} · {currentSet.duration}
            </p>
          </div>

          {/* Progress bar */}
          <div className="mt-6 w-full max-w-xs">
            <div
              className="relative h-1 bg-secondary rounded-full cursor-pointer overflow-hidden"
              onClick={handleProgressClick}
              role="slider"
              aria-label="Track progress"
              aria-valuenow={currentTime}
              aria-valuemin={0}
              aria-valuemax={duration}
              tabIndex={0}
            >
              <div
                className="absolute inset-y-0 left-0 bg-accent rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-6">
            <PlayerControls
              isPlaying={isPlaying}
              onPlayPause={togglePlayPause}
              onPrev={playPrev}
              onNext={playNext}
            />
          </div>
        </div>

        {/* Setlist */}
        <div className="mt-12 w-full flex justify-center">
          <Setlist
            sets={sets}
            currentIndex={currentIndex}
            isPlaying={isPlaying}
            onSelectSet={handleSelectSet}
          />
        </div>
      </main>
    </div>
  )
}
