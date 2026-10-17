"use client"

import { useState } from "react"
import type { RadioState } from "@/lib/use-radio"
import { useRoster } from "@/lib/multiplayer"
import { EntryScreen } from "./entry-screen"
import { RadioCard, RadioPill } from "./radio-card"
import { Schedule } from "./schedule"
import { EmoteBar, Joystick } from "./controls"
import { LiveBadge, useCoarsePointer } from "./shared"

const chip =
  "pointer-events-auto whitespace-nowrap rounded-full border border-white/15 bg-black/50 px-3 py-1.5 text-xs backdrop-blur-md transition-colors hover:border-accent hover:text-accent"

export function Overlay({
  radio,
  joined,
  follow,
  onEnter,
  onListen,
  onToggleCamera,
}: {
  radio: RadioState
  joined: boolean
  follow: boolean
  onEnter: (name: string) => void
  onListen: () => void
  onToggleCamera: () => void
}) {
  const roster = useRoster()
  const touch = useCoarsePointer()
  const [showSchedule, setShowSchedule] = useState(false)
  const [radioOpen, setRadioOpen] = useState(false)

  return (
    <div className="pointer-events-none absolute inset-0 select-none text-white">
      <header className="flex items-start justify-between gap-3 p-4 sm:p-6">
        <div>
          <h1 className="whitespace-nowrap text-xs font-black uppercase tracking-[0.15em] sm:text-base sm:tracking-[0.2em]">Giannluca&apos;s Boiler</h1>
          <div className="mt-1.5 flex items-center gap-2">
            <LiveBadge />
            <span className="text-[10px] uppercase tracking-widest text-white/60">
              {roster.status === "online" ? `${roster.online} online` : roster.status === "connecting" ? "Conectando…" : "24/7 Radio"}
            </span>
          </div>
        </div>
        {radio.tunedIn && (
          <div className="flex gap-2">
            {joined && (
              <button onClick={onToggleCamera} className={chip}>
                {follow ? "Vista Boiler" : "Mi cámara"}
              </button>
            )}
            <button onClick={() => setShowSchedule((v) => !v)} className={chip}>
              Grilla
            </button>
          </div>
        )}
      </header>

      {roster.full && joined && (
        <p className="absolute left-1/2 top-20 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-xs text-white/80">
          El boiler está lleno: estás caminando, pero los demás no te ven.
        </p>
      )}

      {showSchedule && radio.tunedIn && <Schedule radio={radio} onClose={() => setShowSchedule(false)} />}

      {!radio.tunedIn ? (
        <EntryScreen setIndex={radio.index} roster={roster} onEnter={onEnter} onListen={onListen} />
      ) : touch && joined ? (
        // Celular caminando: radio compacta arriba, joystick y bailes abajo
        <>
          <div className="absolute inset-x-4 top-[4.75rem]">
            {radioOpen ? (
              <div className="relative">
                <RadioCard radio={radio} />
                <button
                  onClick={() => setRadioOpen(false)}
                  className="pointer-events-auto absolute right-3 top-3 text-xs text-white/60"
                  aria-label="Achicar radio"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <RadioPill radio={radio} onExpand={() => setRadioOpen(true)} />
            )}
          </div>
          <div className="absolute bottom-6 left-6">
            <Joystick />
          </div>
          <div className="absolute bottom-6 right-4">
            <EmoteBar vertical />
          </div>
        </>
      ) : (
        <>
          <div className="absolute inset-x-4 bottom-4 sm:inset-x-auto sm:bottom-6 sm:left-6 sm:w-96">
            <RadioCard radio={radio} />
          </div>
          <div className="absolute bottom-6 right-6 hidden flex-col items-end gap-3 md:flex">
            <p className="max-w-64 text-right text-[10px] uppercase leading-relaxed tracking-widest text-white/35">
              {joined && follow
                ? "WASD caminar · Shift correr · 1–5 bailar · arrastrá para mirar"
                : "Arrastrá para mirar · rueda para acercarte"}
            </p>
            {joined && <EmoteBar />}
          </div>
        </>
      )}
    </div>
  )
}
