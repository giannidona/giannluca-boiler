"use client"

import { useEffect, useRef, useState } from "react"
import { ANIM } from "@/server/protocol"
import { input, localPlayer } from "@/lib/player"
import { glass } from "./shared"

export const EMOTES = [
  { anim: ANIM.groove, label: "Groove", icon: "🕺", key: "Digit1" },
  { anim: ANIM.handsUp, label: "Manos arriba", icon: "🙌", key: "Digit2" },
  { anim: ANIM.fistPump, label: "Puño", icon: "✊", key: "Digit3" },
  { anim: ANIM.sway, label: "Vaivén", icon: "〰️", key: "Digit4" },
  { anim: ANIM.phone, label: "Filmar", icon: "📱", key: "Digit5" },
]

/** Botones de baile (y atajos 1–5 en el teclado). */
export function EmoteBar({ vertical }: { vertical?: boolean }) {
  const [current, setCurrent] = useState(localPlayer.emote)
  const choose = (anim: number) => {
    localPlayer.emote = anim
    setCurrent(anim)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el?.tagName === "INPUT") return
      const emote = EMOTES.find((m) => m.key === e.code)
      if (emote) choose(emote.anim)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <div className={`pointer-events-auto flex gap-1 p-1 ${glass} ${vertical ? "flex-col rounded-3xl" : "rounded-full"}`}>
      {EMOTES.map((m, i) => (
        <button
          key={m.anim}
          onClick={() => choose(m.anim)}
          title={`${m.label} (${i + 1})`}
          aria-label={m.label}
          aria-pressed={current === m.anim}
          className={`flex h-10 items-center justify-center gap-1.5 rounded-full text-base transition-colors ${
            vertical ? "w-10" : "px-3"
          } ${current === m.anim ? "bg-accent/90 text-black" : "hover:bg-white/10"}`}
        >
          <span aria-hidden>{m.icon}</span>
          {!vertical && <span className="hidden text-[11px] font-medium lg:inline">{m.label}</span>}
        </button>
      ))}
    </div>
  )
}

const RADIUS = 48

/** Joystick táctil para caminar en el celular. */
export function Joystick() {
  const base = useRef<HTMLDivElement>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const pointer = useRef<number | null>(null)

  const update = (clientX: number, clientY: number) => {
    const rect = base.current!.getBoundingClientRect()
    let dx = clientX - (rect.left + rect.width / 2)
    let dy = clientY - (rect.top + rect.height / 2)
    const len = Math.hypot(dx, dy)
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS
      dy = (dy / len) * RADIUS
    }
    setKnob({ x: dx, y: dy })
    input.joystick.x = dx / RADIUS
    input.joystick.y = dy / RADIUS
  }
  const release = () => {
    pointer.current = null
    setKnob({ x: 0, y: 0 })
    input.joystick.x = 0
    input.joystick.y = 0
  }

  return (
    <div
      ref={base}
      className="pointer-events-auto relative h-32 w-32 touch-none rounded-full border border-white/15 bg-black/35 backdrop-blur-sm"
      onPointerDown={(e) => {
        pointer.current = e.pointerId
        e.currentTarget.setPointerCapture(e.pointerId)
        update(e.clientX, e.clientY)
      }}
      onPointerMove={(e) => {
        if (pointer.current === e.pointerId) update(e.clientX, e.clientY)
      }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <div
        className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full bg-white/80 shadow-lg"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
    </div>
  )
}
