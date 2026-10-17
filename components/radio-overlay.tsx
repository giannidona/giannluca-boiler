"use client"

import { useEffect, useState } from "react"
import type { RadioState } from "@/lib/use-radio"
import { SETS, scheduleAt, upcomingSets } from "@/lib/sets"
import { formatAudioTime } from "@/lib/utils"

function clockLabel(ms: number) {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
}

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
      En vivo
    </span>
  )
}

function PowerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M12 3v9" />
      <path d="M6.3 7.3a8 8 0 1 0 11.4 0" />
    </svg>
  )
}

function VolumeIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H3v6h3l5 4z" />
      {muted ? <path d="m16 9 5 6m0-6-5 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />}
    </svg>
  )
}

/** Re-renderiza cada `ms` para que la grilla y los horarios se mantengan al día. */
function useTick(ms: number) {
  const [, setN] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setN((n) => n + 1), ms)
    return () => window.clearInterval(id)
  }, [ms])
}

function Schedule({ radio, onClose }: { radio: RadioState; onClose: () => void }) {
  useTick(15000)
  const now = radio.now()
  const current = scheduleAt(now)
  const next = upcomingSets(now, SETS.length - 1)
  return (
    <aside className="pointer-events-auto absolute right-4 top-20 bottom-[15.5rem] sm:bottom-4 flex w-[min(20rem,calc(100vw-2rem))] flex-col rounded-2xl border border-white/10 bg-black/70 p-4 backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-white/50">Grilla</span>
        <button onClick={onClose} className="text-xs text-white/60 hover:text-white" aria-label="Cerrar grilla">
          Cerrar
        </button>
      </div>
      <ol className="flex-1 space-y-1 overflow-y-auto pr-1">
        <li className="flex items-center gap-3 rounded-lg bg-white/10 px-3 py-2">
          <span className="w-11 shrink-0 text-[10px] font-semibold uppercase text-accent">Ahora</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{SETS[current.index].name}</p>
            <p className="truncate text-xs text-white/50">{SETS[current.index].genre}</p>
          </div>
        </li>
        {next.map(({ index, startsAt }) => (
          <li key={`${index}-${startsAt}`} className="flex items-center gap-3 px-3 py-2">
            <span className="w-11 shrink-0 text-xs tabular-nums text-white/50">{clockLabel(startsAt)}</span>
            <div className="min-w-0">
              <p className="truncate text-sm">{SETS[index].name}</p>
              <p className="truncate text-xs text-white/50">
                {SETS[index].genre} · {formatAudioTime(SETS[index].duration)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  )
}

export function RadioOverlay({ radio }: { radio: RadioState }) {
  const [showSchedule, setShowSchedule] = useState(false)
  useTick(30000)
  const set = SETS[radio.index]
  const progress = Math.min(100, (radio.position / set.duration) * 100)
  const [nextUp] = upcomingSets(radio.now(), 1)

  return (
    <div className="pointer-events-none absolute inset-0 text-white">
      <header className="flex items-start justify-between p-4 sm:p-6">
        <div>
          <h1 className="text-sm font-black uppercase tracking-[0.2em] sm:text-base">Giannluca&apos;s Boiler</h1>
          <div className="mt-1.5 flex items-center gap-2">
            <LiveBadge />
            <span className="text-[10px] uppercase tracking-widest text-white/60">24/7 Radio</span>
          </div>
        </div>
        {radio.tunedIn && (
          <button
            onClick={() => setShowSchedule((v) => !v)}
            className="pointer-events-auto rounded-full border border-white/15 bg-black/50 px-3 py-1.5 text-xs backdrop-blur-md transition-colors hover:border-accent hover:text-accent"
          >
            Grilla
          </button>
        )}
      </header>

      {showSchedule && radio.tunedIn && <Schedule radio={radio} onClose={() => setShowSchedule(false)} />}

      {radio.tunedIn ? (
        <div className="absolute inset-x-4 bottom-4 sm:inset-x-auto sm:left-6 sm:bottom-6 sm:w-96">
          <div className="pointer-events-auto rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <button
                onClick={radio.toggle}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  radio.on ? "border-accent bg-accent text-black" : "border-white/30 text-white/70 hover:border-accent hover:text-accent"
                }`}
                aria-label={radio.on ? "Apagar radio" : "Prender radio"}
              >
                <PowerIcon />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-widest text-white/50">
                  {!radio.on ? "Radio apagada" : radio.buffering ? "Sintonizando…" : "Ahora suena"}
                </p>
                <p className="truncate text-sm font-semibold">{set.name}</p>
                <p className="truncate text-xs text-white/50">{set.genre}</p>
              </div>
            </div>

            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-accent transition-[width] duration-1000 ease-linear" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] tabular-nums text-white/50">
              <span>{formatAudioTime(radio.position)}</span>
              <span>{formatAudioTime(set.duration)}</span>
            </div>

            <div className="mt-3 flex items-center gap-3 text-white/70">
              <button
                onClick={() => radio.setVolume(radio.volume > 0 ? 0 : 0.8)}
                className="hover:text-white"
                aria-label={radio.volume > 0 ? "Silenciar" : "Activar sonido"}
              >
                <VolumeIcon muted={radio.volume === 0} />
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={radio.volume}
                onChange={(e) => radio.setVolume(Number(e.target.value))}
                className="volume-slider flex-1"
                aria-label="Volumen"
              />
            </div>

            {nextUp && (
              <p className="mt-3 truncate border-t border-white/10 pt-3 text-xs text-white/50">
                Sigue <span className="text-white/80">{SETS[nextUp.index].name}</span> a las {clockLabel(nextUp.startsAt)}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/55 p-6 backdrop-blur-[2px]">
          <div className="max-w-sm text-center">
            <LiveBadge />
            <h2 className="mt-4 text-3xl font-black uppercase tracking-[0.15em] sm:text-4xl">Giannluca&apos;s Boiler</h2>
            <p className="mt-3 text-sm text-white/60">
              Ahora suena <span className="text-white">{set.name}</span>. Todos escuchan lo mismo, en el mismo momento.
            </p>
            <button
              onClick={radio.tuneIn}
              className="mt-8 rounded-full bg-accent px-8 py-3 text-sm font-bold uppercase tracking-widest text-black transition-transform hover:scale-105 active:scale-95"
            >
              Entrar
            </button>
          </div>
        </div>
      )}

      {radio.tunedIn && (
        <p className="absolute bottom-6 right-6 hidden text-[10px] uppercase tracking-widest text-white/35 sm:block">
          Arrastrá para mirar · rueda para acercarte
        </p>
      )}
    </div>
  )
}
