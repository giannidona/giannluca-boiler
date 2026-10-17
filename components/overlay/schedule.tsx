"use client"

import type { RadioState } from "@/lib/use-radio"
import { SETS, scheduleAt, upcomingSets } from "@/lib/sets"
import { formatAudioTime } from "@/lib/utils"
import { clockLabel, useTick } from "./shared"

export function Schedule({ radio, onClose }: { radio: RadioState; onClose: () => void }) {
  useTick(15000)
  const now = radio.now()
  const current = scheduleAt(now)
  const next = upcomingSets(now, SETS.length - 1)
  return (
    <aside className="pointer-events-auto absolute right-4 top-20 bottom-28 sm:bottom-4 flex w-[min(20rem,calc(100vw-2rem))] flex-col rounded-2xl border border-white/10 bg-black/70 p-4 backdrop-blur-md">
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
