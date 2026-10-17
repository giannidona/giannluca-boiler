"use client"

import { useSyncExternalStore } from "react"
import { ANIM, TICK_HZ, type ClientMessage, type ServerMessage } from "@/server/protocol"
import { lookFromName, type Look } from "@/components/scene/looks"

/** Otro jugador, tal como lo vemos nosotros (interpolado entre los paquetes del servidor). */
export interface RemotePlayer {
  id: number
  name: string
  look: Look
  x: number
  z: number
  yaw: number
  target: { x: number; z: number; yaw: number }
  anim: number
  walkPhase: number
  phase: number
  /** Si todavía no recibimos su posición, no se dibuja. */
  placed: boolean
}

export interface Roster {
  status: "offline" | "connecting" | "online"
  /** Personas conectadas (caminando o solo escuchando). */
  online: number
  selfId: number | null
  full: boolean
  players: { id: number; name: string }[]
}

function serverUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_MULTIPLAYER_URL
  if (configured) return configured
  if (process.env.NODE_ENV === "development") return `ws://${window.location.hostname}:3001`
  return null
}

class Multiplayer {
  readonly remotes = new Map<number, RemotePlayer>()
  private ws: WebSocket | null = null
  private name: string | null = null
  private retry = 0
  private retryTimer: number | undefined
  private lastSent = 0
  private lastState = ""
  private listeners = new Set<() => void>()
  private roster: Roster = { status: "offline", online: 0, selfId: null, full: false, players: [] }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  getRoster = () => this.roster
  private static readonly SERVER_ROSTER: Roster = { status: "offline", online: 0, selfId: null, full: false, players: [] }
  getServerRoster = () => Multiplayer.SERVER_ROSTER

  private update(patch: Partial<Roster>) {
    this.roster = { ...this.roster, ...patch }
    this.listeners.forEach((fn) => fn())
  }

  private syncPlayers() {
    const players = [...this.remotes.values()].map((r) => ({ id: r.id, name: r.name }))
    this.update({ players })
  }

  connect() {
    if (this.ws || typeof window === "undefined") return
    const url = serverUrl()
    if (!url) return
    this.update({ status: "connecting" })
    const ws = new WebSocket(url)
    this.ws = ws

    ws.onopen = () => {
      this.retry = 0
      this.update({ status: "online" })
      if (this.name) this.send({ t: "join", name: this.name })
    }
    ws.onmessage = (e) => {
      try {
        this.handle(JSON.parse(String(e.data)) as ServerMessage)
      } catch {
        /* ignore */
      }
    }
    ws.onclose = () => {
      this.ws = null
      this.remotes.clear()
      this.update({ status: "offline", online: 0, selfId: null, players: [] })
      // Reintenta con espera creciente (1s, 2s, 4s… hasta 15s)
      const delay = Math.min(15000, 1000 * 2 ** this.retry++)
      this.retryTimer = window.setTimeout(() => this.connect(), delay)
    }
  }

  disconnect() {
    window.clearTimeout(this.retryTimer)
    if (this.ws) {
      this.ws.onclose = null
      this.ws.close()
      this.ws = null
    }
  }

  join(name: string) {
    this.name = name
    if (this.ws?.readyState === WebSocket.OPEN) this.send({ t: "join", name })
  }

  /** Lo llama el jugador local cada frame; se envía como mucho TICK_HZ veces por segundo. */
  sendState(x: number, z: number, yaw: number, anim: number) {
    if (this.roster.selfId === null) return
    const now = performance.now()
    if (now - this.lastSent < 1000 / TICK_HZ) return
    const s: [number, number, number, number] = [
      Math.round(x * 100) / 100,
      Math.round(z * 100) / 100,
      Math.round(yaw * 100) / 100,
      anim,
    ]
    const key = s.join(",")
    if (key === this.lastState) return
    this.lastSent = now
    this.lastState = key
    this.send({ t: "state", s })
  }

  private send(msg: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg))
  }

  private addRemote(id: number, name: string) {
    if (id === this.roster.selfId || this.remotes.has(id)) return
    this.remotes.set(id, {
      id,
      name,
      look: lookFromName(name),
      x: 0,
      z: 0,
      yaw: 0,
      target: { x: 0, z: 0, yaw: 0 },
      anim: ANIM.groove,
      walkPhase: 0,
      phase: Math.random() * Math.PI * 2,
      placed: false,
    })
  }

  private handle(msg: ServerMessage) {
    switch (msg.t) {
      case "roster":
        for (const p of msg.players) this.addRemote(p.id, p.name)
        this.syncPlayers()
        break
      case "welcome":
        this.lastState = ""
        this.update({ selfId: msg.id, full: false })
        for (const p of msg.players) this.addRemote(p.id, p.name)
        this.syncPlayers()
        break
      case "join":
        this.addRemote(msg.id, msg.name)
        this.syncPlayers()
        break
      case "leave":
        this.remotes.delete(msg.id)
        this.syncPlayers()
        break
      case "full":
        this.update({ full: true })
        break
      case "snap": {
        if (msg.n !== this.roster.online) this.update({ online: msg.n })
        for (const [id, x, z, yaw, anim] of msg.p) {
          const r = this.remotes.get(id)
          if (!r) continue
          r.target.x = x
          r.target.z = z
          r.target.yaw = yaw
          r.anim = anim
          if (!r.placed) {
            r.x = x
            r.z = z
            r.yaw = yaw
            r.placed = true
          }
        }
        break
      }
    }
  }
}

export const multiplayer = new Multiplayer()

export function useRoster(): Roster {
  return useSyncExternalStore(multiplayer.subscribe, multiplayer.getRoster, multiplayer.getServerRoster)
}
