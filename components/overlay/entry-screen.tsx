"use client"

import { useEffect, useState } from "react"
import { NAME_MAX, sanitizeName } from "@/server/protocol"
import type { Roster } from "@/lib/multiplayer"
import { SETS } from "@/lib/sets"
import { LiveBadge } from "./shared"

const NICK_KEY = "giannluca-boiler/nickname"

export function EntryScreen({
  setIndex,
  roster,
  onEnter,
  onListen,
}: {
  setIndex: number
  roster: Roster
  onEnter: (name: string) => void
  onListen: () => void
}) {
  const [nick, setNick] = useState("")
  useEffect(() => {
    try {
      setNick(localStorage.getItem(NICK_KEY) ?? "")
    } catch {
      /* ignore */
    }
  }, [])

  const name = sanitizeName(nick)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return
    try {
      localStorage.setItem(NICK_KEY, name)
    } catch {
      /* ignore */
    }
    onEnter(name)
  }

  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/55 p-6 backdrop-blur-[2px]">
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center justify-center gap-2">
          <LiveBadge />
          {roster.status === "online" && (
            <span className="text-[10px] uppercase tracking-widest text-white/60">{roster.online} en el boiler</span>
          )}
        </div>
        <h2 className="mt-4 text-3xl font-black uppercase tracking-[0.15em] sm:text-4xl">Giannluca&apos;s Boiler</h2>
        <p className="mt-3 text-sm text-white/60">
          Ahora suena <span className="text-white">{SETS[setIndex].name}</span>. Todos escuchan lo mismo, en el mismo momento.
        </p>

        <form onSubmit={submit} className="mt-8 flex flex-col gap-3">
          <input
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            maxLength={NAME_MAX}
            placeholder="Tu nickname"
            autoComplete="nickname"
            aria-label="Nickname"
            className="w-full rounded-full border border-white/15 bg-black/50 px-5 py-3 text-center text-sm outline-none placeholder:text-white/35 focus:border-accent"
          />
          <button
            type="submit"
            disabled={!name}
            className="rounded-full bg-accent px-8 py-3 text-sm font-bold uppercase tracking-widest text-black transition-transform enabled:hover:scale-105 enabled:active:scale-95 disabled:opacity-40"
          >
            Entrar al boiler
          </button>
        </form>
        <button onClick={onListen} className="mt-4 text-xs text-white/50 underline-offset-4 hover:text-white hover:underline">
          Solo escuchar
        </button>
      </div>
    </div>
  )
}
