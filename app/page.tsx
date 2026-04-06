"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { VinylRecord } from "@/components/vinyl-record"
import { ThemeToggle } from "@/components/theme-toggle"
import { PlayerControls } from "@/components/player-controls"
import { Setlist, type Set } from "@/components/setlist"
import { formatAudioTime, parseDurationLabel } from "@/lib/utils"

const RADIO_STORAGE_KEY = "giannluca-boiler-radio/v1"

/** Segundos por tema si aún no conocemos la duración (sets largos ~1h). */
const FALLBACK_TRACK_DURATION_SEC = 55 * 60

const SET_FILENAMES = [
  "Eternal Dreams - Episode 1 - Giannluca.mp3",
  "Eternal Dreams - Episode 2 - Giannluca.mp3",
  "Eternal Dreams - Episode 3 - Giannluca.mp3",
  "Eternal Dreams - Episode 4 - Giannluca.mp3",
  "Eternal Dreams - Episode 5 - Giannluca.mp3",
  "Eternal Dreams - Episode 6 - Giannluca.mp3",
  "Eternal Dreams - Episode 7 - Giannluca.mp3",
  "Mini set - Giannluca.mp3",
  "Organic House Set - Giannluca.mp3",
  "Sunset Time - Episode 1 - Giannluca.mp3",
  "Sunset Time - Episode 2 - Giannluca.mp3",
  "Sunset Time - Episode 3 - Giannluca.mp3",
] as const

function genreForFilename(filename: string): string {
  if (filename.includes("Organic House")) return "Organic House"
  if (filename.includes("Sunset Time")) return "Sunset Time"
  if (filename.includes("Eternal Dreams")) return "Eternal Dreams"
  if (filename.includes("Mini set")) return "Mini Set"
  return "DJ Set"
}

function displayNameFromFilename(filename: string): string {
  return filename.replace(/\s*-\s*Giannluca\.mp3$/i, "").replace(/\.mp3$/i, "")
}

const sets: Set[] = SET_FILENAMES.map((filename, index) => ({
  id: index + 1,
  name: displayNameFromFilename(filename),
  genre: genreForFilename(filename),
  date: "",
  duration: "",
  src: `/sets/${encodeURIComponent(filename)}`,
}))

type PendingSeek = { index: number; time: number }

type StoredRadioV2 = {
  v: 2
  savedAt: number
  index: number
  positionInTrack: number
  durationsSec: (number | null)[]
}

function normalizeDurations(raw: unknown, trackCount: number): (number | null)[] {
  const out: (number | null)[] = Array.from({ length: trackCount }, () => null)
  if (!Array.isArray(raw)) return out
  for (let i = 0; i < trackCount; i++) {
    const x = raw[i]
    if (typeof x === "number" && Number.isFinite(x) && x > 0) out[i] = x
  }
  return out
}

function durationForTrack(i: number, durations: (number | null)[]): number {
  const d = durations[i]
  if (d != null && d > 0) return d
  return FALLBACK_TRACK_DURATION_SEC
}

function totalPlaylistDuration(trackCount: number, durations: (number | null)[]): number {
  let s = 0
  for (let i = 0; i < trackCount; i++) s += durationForTrack(i, durations)
  return s
}

/** Offset en segundos desde el inicio del tema 0 hasta (index, posEnTema). */
function offsetFromPlaylistStart(
  index: number,
  posInTrack: number,
  trackCount: number,
  durations: (number | null)[],
): number {
  let off = 0
  const i0 = ((index % trackCount) + trackCount) % trackCount
  for (let j = 0; j < i0; j++) off += durationForTrack(j, durations)
  return off + Math.max(0, posInTrack)
}

/** Avanza como si la radio hubiera seguido en 1x desde el ancla (playlist en bucle). */
function advanceLivePosition(
  startIndex: number,
  startPos: number,
  elapsedSec: number,
  trackCount: number,
  durations: (number | null)[],
): { index: number; position: number } {
  if (trackCount <= 0) return { index: 0, position: 0 }
  const total = totalPlaylistDuration(trackCount, durations)
  if (total <= 0) return { index: startIndex, position: Math.max(0, startPos) }

  let off =
    offsetFromPlaylistStart(startIndex, startPos, trackCount, durations) +
    Math.max(0, elapsedSec)
  off = ((off % total) + total) % total

  let acc = 0
  for (let i = 0; i < trackCount; i++) {
    const dur = durationForTrack(i, durations)
    if (off < acc + dur) {
      return { index: i, position: off - acc }
    }
    acc += dur
  }
  return { index: trackCount - 1, position: 0 }
}

export default function RadioPage() {
  const [radioHydrated, setRadioHydrated] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)
  const prevIndexRef = useRef<number | null>(null)
  const pendingSeekRef = useRef<PendingSeek | null>(null)
  const persistRef = useRef({ index: 0, playing: true })
  /** true = usuario quiere radio encendida (sigue true si autoplay falla hasta que pause a propósito) */
  const wantsPlaybackRef = useRef(true)
  const trackDurationsRef = useRef<(number | null)[]>(
    Array.from({ length: sets.length }, () => null),
  )

  const currentSet = sets[currentIndex]
  persistRef.current = { index: currentIndex, playing: isPlaying }

  const flushRadioState = useCallback(() => {
    const audio = audioRef.current
    const { index } = persistRef.current
    const positionInTrack =
      audio && Number.isFinite(audio.currentTime) ? audio.currentTime : 0
    const durationsSec = [...trackDurationsRef.current]
    if (audio && Number.isFinite(audio.duration) && audio.duration > 0) {
      durationsSec[index] = audio.duration
      trackDurationsRef.current = durationsSec
    }
    try {
      const payload: StoredRadioV2 = {
        v: 2,
        savedAt: Date.now(),
        index,
        positionInTrack,
        durationsSec,
      }
      localStorage.setItem(RADIO_STORAGE_KEY, JSON.stringify(payload))
    } catch {
      /* ignore quota / private mode */
    }
  }, [])

  // Restore desde localStorage: tiempo real transcurrido avanza la “radio en vivo”
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RADIO_STORAGE_KEY)
      if (raw) {
        const data = JSON.parse(raw) as StoredRadioV2 & {
          v?: number
          index?: number
          time?: number
          positionInTrack?: number
          savedAt?: number
          durationsSec?: unknown
        }

        if (data.v === 2 && typeof data.index === "number") {
          const idx =
            data.index >= 0 && data.index < sets.length ? data.index : 0
          const durations = normalizeDurations(data.durationsSec, sets.length)
          trackDurationsRef.current = durations
          const savedAt =
            typeof data.savedAt === "number" && Number.isFinite(data.savedAt)
              ? data.savedAt
              : Date.now()
          const elapsedSec = Math.max(0, (Date.now() - savedAt) / 1000)
          const startPos =
            typeof data.positionInTrack === "number" && data.positionInTrack >= 0
              ? data.positionInTrack
              : 0
          const { index, position } = advanceLivePosition(
            idx,
            startPos,
            elapsedSec,
            sets.length,
            durations,
          )
          pendingSeekRef.current = { index, time: position }
          setCurrentIndex(index)
          setCurrentTime(position)
        } else if (
          typeof data.index === "number" &&
          data.index >= 0 &&
          data.index < sets.length
        ) {
          // v1 u otro legado: sin salto de tiempo esta vez; próximo guardado pasa a v2
          trackDurationsRef.current = normalizeDurations(null, sets.length)
          const t = Math.max(0, data.time ?? 0)
          pendingSeekRef.current = { index: data.index, time: t }
          setCurrentIndex(data.index)
          setCurrentTime(t)
        }
      }
    } catch {
      /* ignore */
    }
    setIsPlaying(true)
    setRadioHydrated(true)
  }, [])

  // Persist while listening + when tab hides or leaving the page
  useEffect(() => {
    if (!radioHydrated) return
    const id = window.setInterval(flushRadioState, 2500)
    const onHidden = () => {
      if (document.visibilityState === "hidden") flushRadioState()
    }
    window.addEventListener("pagehide", flushRadioState)
    document.addEventListener("visibilitychange", onHidden)
    return () => {
      clearInterval(id)
      window.removeEventListener("pagehide", flushRadioState)
      document.removeEventListener("visibilitychange", onHidden)
      flushRadioState()
    }
  }, [radioHydrated, flushRadioState])

  // Primer toque/tecla: muchos despliegues bloquean autoplay sin gesto del usuario
  useEffect(() => {
    if (!radioHydrated) return
    const tryPlayAfterGesture = () => {
      if (!wantsPlaybackRef.current) return
      const audio = audioRef.current
      if (!audio?.paused) return
      void audio.play().then(() => setIsPlaying(true)).catch(() => {})
    }
    document.addEventListener("pointerdown", tryPlayAfterGesture, { capture: true })
    document.addEventListener("keydown", tryPlayAfterGesture, { capture: true })
    return () => {
      document.removeEventListener("pointerdown", tryPlayAfterGesture, { capture: true })
      document.removeEventListener("keydown", tryPlayAfterGesture, { capture: true })
    }
  }, [radioHydrated])

  const playNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % sets.length)
  }, [])

  const playPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + sets.length) % sets.length)
  }, [])

  // Load new source when the track changes; only play/pause when isPlaying toggles (no reload on pause)
  useEffect(() => {
    if (!radioHydrated) return
    const audio = audioRef.current
    if (!audio) return

    const applyPlayPause = () => {
      if (isPlaying) {
        void audio.play().then(() => setIsPlaying(true)).catch(() => {
          setIsPlaying(false)
        })
      } else {
        audio.pause()
      }
    }

    const shouldReload = prevIndexRef.current !== currentIndex
    if (shouldReload) {
      prevIndexRef.current = currentIndex
      const pending = pendingSeekRef.current
      const needSeek = pending !== null && pending.index === currentIndex

      audio.load()

      // Tras load(), play() inmediato suele fallar (elemento aún sin datos), no es solo autoplay policy
      let started = false
      let fallbackTimer: number | undefined
      const afterSourceReady = () => {
        if (started) return
        started = true
        if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer)

        if (needSeek && pending) {
          const t = pending.time
          if (Number.isFinite(audio.duration) && audio.duration > 0) {
            audio.currentTime = Math.min(
              Math.max(0, t),
              Math.max(0, audio.duration - 0.25),
            )
          } else if (t > 0) {
            audio.currentTime = t
          }
        }
        pendingSeekRef.current = null
        applyPlayPause()
      }

      audio.addEventListener("loadedmetadata", afterSourceReady)
      audio.addEventListener("canplay", afterSourceReady)
      fallbackTimer = window.setTimeout(afterSourceReady, 2500)

      return () => {
        if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer)
        audio.removeEventListener("loadedmetadata", afterSourceReady)
        audio.removeEventListener("canplay", afterSourceReady)
      }
    }

    applyPlayPause()
    return undefined
  }, [radioHydrated, currentIndex, isPlaying])

  // Audio event listeners
  useEffect(() => {
    if (!radioHydrated) return
    const audio = audioRef.current
    if (!audio) return

    const set = sets[currentIndex]

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleDurationChange = () => {
      const d = Number.isFinite(audio.duration)
        ? audio.duration
        : parseDurationLabel(set.duration)
      setDuration(d)
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        const arr = [...trackDurationsRef.current]
        arr[currentIndex] = audio.duration
        trackDurationsRef.current = arr
      }
    }
    const handleEnded = () => playNext()
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("durationchange", handleDurationChange)
    audio.addEventListener("ended", handleEnded)
    audio.addEventListener("play", handlePlay)
    audio.addEventListener("pause", handlePause)

    setDuration(parseDurationLabel(set.duration))

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("durationchange", handleDurationChange)
      audio.removeEventListener("ended", handleEnded)
      audio.removeEventListener("play", handlePlay)
      audio.removeEventListener("pause", handlePause)
    }
  }, [radioHydrated, currentIndex, playNext])

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      wantsPlaybackRef.current = false
      audio.pause()
    } else {
      wantsPlaybackRef.current = true
      void audio.play().catch(() => {
        /* autoplay / decode error */
      })
    }
  }

  const handleSelectSet = (index: number) => {
    wantsPlaybackRef.current = true
    pendingSeekRef.current = null
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

  if (!radioHydrated) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <header className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-base font-medium">Giannluca&apos;s Boiler</h1>
            <p className="text-[10px] uppercase tracking-widest text-accent">24/7 Radio</p>
          </div>
          <ThemeToggle />
        </header>
        <div className="flex flex-1 items-center justify-center px-6">
          <p className="text-sm text-muted-foreground">Sintonizando…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <audio ref={audioRef} preload="auto" playsInline>
        <source src={currentSet.src} type="audio/mpeg" />
      </audio>

      <header className="flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-base font-medium">Giannluca&apos;s Boiler</h1>
          <p className="text-[10px] uppercase tracking-widest text-accent">24/7 Radio</p>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex flex-col items-center px-6 py-8">
        <div className="flex flex-col items-center">
          <VinylRecord isPlaying={isPlaying} />

          <div className="mt-8 text-center">
            <h2 className="text-xl font-medium text-balance">{currentSet.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{currentSet.genre}</p>
            <p className="mt-1 text-xs text-accent">
              {[currentSet.date, duration > 0 && Number.isFinite(duration) ? formatAudioTime(duration) : null]
                .filter(Boolean)
                .join(" · ") || "…"}
            </p>
          </div>

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
              <span>{formatAudioTime(currentTime)}</span>
              <span>{formatAudioTime(duration)}</span>
            </div>
          </div>

          <div className="mt-6">
            <PlayerControls
              isPlaying={isPlaying}
              onPlayPause={togglePlayPause}
              onPrev={playPrev}
              onNext={playNext}
            />
          </div>
        </div>

        <div className="mt-12 w-full flex justify-center">
          <Setlist
            sets={sets}
            currentIndex={currentIndex}
            isPlaying={isPlaying}
            activeDuration={duration}
            onSelectSet={handleSelectSet}
          />
        </div>
      </main>
    </div>
  )
}
