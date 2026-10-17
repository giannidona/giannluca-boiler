"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { SETS, scheduleAt } from "@/lib/sets"
import { audioBus } from "@/lib/audio-bus"

/** Si el audio se corre más que esto respecto a la grilla, se re-sincroniza. */
const MAX_DRIFT_SEC = 2
const SYNC_INTERVAL_MS = 4000
const VOLUME_KEY = "giannluca-boiler/volume"

/** Diferencia (ms) entre el reloj del servidor y el del dispositivo. */
async function measureClockOffset(): Promise<number> {
  let best: { rtt: number; offset: number } | null = null
  for (let i = 0; i < 3; i++) {
    try {
      const t0 = Date.now()
      const res = await fetch("/api/time", { cache: "no-store" })
      const { now } = (await res.json()) as { now: number }
      const t1 = Date.now()
      const rtt = t1 - t0
      const offset = now + rtt / 2 - t1
      if (!best || rtt < best.rtt) best = { rtt, offset }
    } catch {
      /* sin red: usamos el reloj local */
    }
  }
  return best?.offset ?? 0
}

export interface RadioState {
  /** El oyente ya tocó "Entrar" (requisito del navegador para reproducir audio). */
  tunedIn: boolean
  on: boolean
  buffering: boolean
  index: number
  position: number
  volume: number
  /** Ahora mismo según el reloj del servidor (ms). */
  now: () => number
  tuneIn: () => void
  toggle: () => void
  setVolume: (v: number) => void
}

export function useRadio(): RadioState {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const offsetRef = useRef(0)
  const onRef = useRef(false)
  const loadedIndexRef = useRef<number | null>(null)
  const waitTimerRef = useRef<number | undefined>(undefined)

  const [tunedIn, setTunedIn] = useState(false)
  const [on, setOn] = useState(false)
  const [buffering, setBuffering] = useState(false)
  const [index, setIndex] = useState(() => scheduleAt(Date.now()).index)
  const [position, setPosition] = useState(0)
  const [volume, setVolumeState] = useState(0.8)

  const now = useCallback(() => Date.now() + offsetRef.current, [])

  useEffect(() => {
    let cancelled = false
    void measureClockOffset().then((offset) => {
      if (!cancelled) offsetRef.current = offset
    })
    try {
      const v = Number(localStorage.getItem(VOLUME_KEY))
      if (localStorage.getItem(VOLUME_KEY) !== null && v >= 0 && v <= 1) setVolumeState(v)
    } catch {
      /* ignore */
    }
    return () => {
      cancelled = true
    }
  }, [])

  /** Lleva el <audio> al set y segundo que marca la grilla. */
  const sync = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !onRef.current) return
    window.clearTimeout(waitTimerRef.current)

    const slot = scheduleAt(now())
    setIndex(slot.index)

    if (loadedIndexRef.current !== slot.index) {
      loadedIndexRef.current = slot.index
      setBuffering(true)
      audio.src = SETS[slot.index].src
      audio.addEventListener(
        "loadedmetadata",
        () => {
          // Mientras cargaba pasó tiempo: recalculamos antes de saltar.
          const fresh = scheduleAt(now())
          if (fresh.index !== slot.index) return sync()
          seekTo(audio, fresh.position)
          if (onRef.current) void audio.play().catch(() => {})
        },
        { once: true },
      )
      audio.load()
      return
    }

    if (audio.seeking || audio.readyState < 2) return
    if (Math.abs(audio.currentTime - slot.position) > MAX_DRIFT_SEC) seekTo(audio, slot.position)
    if (audio.paused && !audio.ended) void audio.play().catch(() => {})
  }, [now])

  // Crea el <audio> una sola vez.
  useEffect(() => {
    const audio = new Audio()
    audio.preload = "auto"
    audio.crossOrigin = "anonymous"
    audioRef.current = audio

    const onTime = () => setPosition(audio.currentTime)
    const onWaiting = () => setBuffering(true)
    const onPlaying = () => setBuffering(false)
    const onEnded = () => {
      // El archivo puede terminar unos ms antes que la grilla: esperamos al próximo set.
      const slot = scheduleAt(now())
      if (slot.index === loadedIndexRef.current) {
        const remaining = SETS[slot.index].duration - slot.position
        waitTimerRef.current = window.setTimeout(sync, Math.max(0, remaining * 1000) + 50)
      } else {
        sync()
      }
    }

    audio.addEventListener("timeupdate", onTime)
    audio.addEventListener("waiting", onWaiting)
    audio.addEventListener("playing", onPlaying)
    audio.addEventListener("ended", onEnded)
    return () => {
      audio.pause()
      audio.removeAttribute("src")
      audio.load()
      audio.removeEventListener("timeupdate", onTime)
      audio.removeEventListener("waiting", onWaiting)
      audio.removeEventListener("playing", onPlaying)
      audio.removeEventListener("ended", onEnded)
      window.clearTimeout(waitTimerRef.current)
      audioRef.current = null
    }
  }, [now, sync])

  // Control periódico de deriva y cambio de set.
  useEffect(() => {
    if (!on) return
    const id = window.setInterval(sync, SYNC_INTERVAL_MS)
    const onVisible = () => {
      if (document.visibilityState === "visible") sync()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [on, sync])

  // Mientras la radio está apagada igual mostramos qué está sonando.
  useEffect(() => {
    if (on) return
    const tick = () => {
      const slot = scheduleAt(now())
      setIndex(slot.index)
      setPosition(slot.position)
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [on, now])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  const turnOn = useCallback(() => {
    onRef.current = true
    setOn(true)
    sync()
  }, [sync])

  const tuneIn = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    // El AudioContext tiene que nacer dentro de un gesto del usuario.
    try {
      const ctx = new AudioContext()
      const source = ctx.createMediaElementSource(audio)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      analyser.smoothingTimeConstant = 0.6
      source.connect(analyser)
      analyser.connect(ctx.destination)
      audioBus.connect(analyser)
      void ctx.resume()
    } catch {
      /* sin Web Audio la música suena igual, solo que la sala no reacciona */
    }
    setTunedIn(true)
    turnOn()
    // turnOn() ya asignó el src; play() dentro del mismo gesto desbloquea el autoplay en iOS/Safari.
    void audio.play().catch(() => {})
  }, [turnOn])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (onRef.current) {
      onRef.current = false
      setOn(false)
      setBuffering(false)
      window.clearTimeout(waitTimerRef.current)
      audio.pause()
    } else {
      turnOn()
    }
  }, [turnOn])

  const setVolume = useCallback((v: number) => {
    setVolumeState(v)
    try {
      localStorage.setItem(VOLUME_KEY, String(v))
    } catch {
      /* ignore */
    }
  }, [])

  return { tunedIn, on, buffering, index, position, volume, now, tuneIn, toggle, setVolume }
}

function seekTo(audio: HTMLAudioElement, position: number) {
  const max = Number.isFinite(audio.duration) ? Math.max(0, audio.duration - 0.25) : position
  audio.currentTime = Math.min(Math.max(0, position), max)
}
