"use client"

import type { RadioState } from "@/lib/use-radio"
import { SETS, upcomingSets } from "@/lib/sets"
import { formatAudioTime } from "@/lib/utils"
import { PowerIcon, VolumeIcon, clockLabel, glass, useTick } from "./shared"

function PowerButton({ radio, small }: { radio: RadioState; small?: boolean }) {
  return (
    <button
      onClick={radio.toggle}
      className={`flex shrink-0 items-center justify-center rounded-full border transition-colors ${small ? "h-9 w-9" : "h-11 w-11"} ${
        radio.on ? "border-accent bg-accent text-black" : "border-white/30 text-white/70 hover:border-accent hover:text-accent"
      }`}
      aria-label={radio.on ? "Apagar radio" : "Prender radio"}
    >
      <PowerIcon />
    </button>
  )
}

function statusLabel(radio: RadioState) {
  return !radio.on ? "Radio apagada" : radio.buffering ? "Sintonizando…" : "Ahora suena"
}

/** Tarjeta completa: qué suena, progreso, volumen y qué sigue. */
export function RadioCard({ radio }: { radio: RadioState }) {
  useTick(30000)
  const set = SETS[radio.index]
  const progress = Math.min(100, (radio.position / set.duration) * 100)
  const [nextUp] = upcomingSets(radio.now(), 1)

  return (
    <div className={`pointer-events-auto p-4 ${glass}`}>
      <div className="flex items-center gap-4">
        <PowerButton radio={radio} />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-widest text-white/50">{statusLabel(radio)}</p>
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
  )
}

/** Versión compacta para celular mientras se camina; tocándola se despliega la tarjeta. */
export function RadioPill({ radio, onExpand }: { radio: RadioState; onExpand: () => void }) {
  const set = SETS[radio.index]
  return (
    <div className={`pointer-events-auto flex items-center gap-3 py-1.5 pl-1.5 pr-4 ${glass} rounded-full`}>
      <PowerButton radio={radio} small />
      <button onClick={onExpand} className="min-w-0 flex-1 text-left" aria-label="Ver radio">
        <p className="text-[9px] uppercase tracking-widest text-white/50">{statusLabel(radio)}</p>
        <p className="truncate text-xs font-semibold">{set.name}</p>
      </button>
    </div>
  )
}
