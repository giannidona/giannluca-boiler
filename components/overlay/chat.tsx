"use client"

import { useEffect, useRef, useState } from "react"
import { CHAT_MAX } from "@/server/protocol"
import { multiplayer, type Roster } from "@/lib/multiplayer"
import { input } from "@/lib/player"
import { glass } from "./shared"

/**
 * Chat del boiler. Cerrado muestra los últimos mensajes, que se desvanecen solos;
 * abierto (Enter o el botón) muestra el historial y un campo para escribir.
 */
export function Chat({
  roster,
  canWrite,
  open,
  onOpenChange,
}: {
  roster: Roster
  canWrite: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [text, setText] = useState("")
  const field = useRef<HTMLInputElement>(null)
  const log = useRef<HTMLOListElement>(null)

  // Enter abre el chat (si no se está escribiendo en otro lado)
  useEffect(() => {
    if (!canWrite) return
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (e.code !== "Enter" || open || el?.tagName === "INPUT" || el?.tagName === "TEXTAREA") return
      e.preventDefault()
      onOpenChange(true)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [canWrite, open, onOpenChange])

  useEffect(() => {
    if (!open) return
    // Que no siga caminando con una tecla que quedó apretada
    input.keys.clear()
    field.current?.focus()
  }, [open])

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight })
  }, [roster.chat, open])

  const messages = open ? roster.chat : roster.chat.slice(-6)
  const online = roster.status === "online" && roster.selfId !== null

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (multiplayer.sendChat(text)) setText("")
    onOpenChange(false)
  }

  return (
    <div className={`flex flex-col gap-2 ${open ? `pointer-events-auto p-3 ${glass}` : ""}`}>
      {messages.length > 0 && (
        <ol ref={log} className={`flex flex-col gap-1 overflow-y-auto ${open ? "max-h-56 pr-1" : ""}`} aria-live="polite">
          {messages.map((m) => (
            <li
              key={m.key}
              className={`w-fit max-w-full break-words rounded-lg px-2.5 py-1 text-[13px] leading-snug ${
                open ? "" : "chat-fade bg-black/55 backdrop-blur-sm"
              }`}
            >
              <span className={`font-semibold ${m.id === roster.selfId ? "text-accent" : "text-white/70"}`}>{m.name}</span>{" "}
              <span className="select-text">{m.text}</span>
            </li>
          ))}
        </ol>
      )}

      {open && (
        <form onSubmit={submit} className="flex gap-2">
          <input
            ref={field}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onOpenChange(false)
            }}
            maxLength={CHAT_MAX}
            placeholder={online ? "Escribí algo…" : "Sin conexión al boiler"}
            disabled={!online}
            aria-label="Mensaje de chat"
            enterKeyHint="send"
            className="min-w-0 flex-1 rounded-full border border-white/15 bg-black/50 px-4 py-2 text-sm outline-none placeholder:text-white/35 focus:border-accent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!online || !text.trim()}
            className="rounded-full bg-accent px-4 text-xs font-bold uppercase tracking-widest text-black disabled:opacity-40"
          >
            Enviar
          </button>
        </form>
      )}
    </div>
  )
}
