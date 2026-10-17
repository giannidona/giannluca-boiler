import { createServer } from "node:http"
import { WebSocketServer, type WebSocket } from "ws"
import {
  ANIM_COUNT,
  FLOOR,
  MAX_PLAYERS,
  TICK_HZ,
  sanitizeChat,
  sanitizeName,
  type ClientMessage,
  type ServerMessage,
} from "./protocol.ts"

const PORT = Number(process.env.PORT ?? 3001)
/** Ej: "https://giannluca-boiler.vercel.app,http://localhost:3000". Vacío = acepta cualquiera. */
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean)
const MAX_MESSAGES_PER_SEC = 40
/** Mínimo entre dos mensajes de chat de la misma persona. */
const CHAT_COOLDOWN_MS = 700

interface Client {
  ws: WebSocket
  alive: boolean
  msgCount: number
  lastChatAt: number
  player: { id: number; name: string; x: number; z: number; yaw: number; anim: number } | null
}

const clients = new Set<Client>()
let nextId = 1

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const round2 = (v: number) => Math.round(v * 100) / 100

function send(client: Client, msg: ServerMessage) {
  if (client.ws.readyState === client.ws.OPEN) client.ws.send(JSON.stringify(msg))
}

function broadcast(msg: ServerMessage, except?: Client) {
  const data = JSON.stringify(msg)
  for (const c of clients) if (c !== except && c.ws.readyState === c.ws.OPEN) c.ws.send(data)
}

function playerCount() {
  let n = 0
  for (const c of clients) if (c.player) n++
  return n
}

function playerList() {
  return [...clients].filter((c) => c.player).map((c) => ({ id: c.player!.id, name: c.player!.name }))
}

function handle(client: Client, msg: ClientMessage) {
  if (msg.t === "join") {
    if (client.player) return
    const name = sanitizeName(msg.name)
    if (!name) return
    if (playerCount() >= MAX_PLAYERS) return send(client, { t: "full" })
    const id = nextId++
    // Aparece frente a la cabina, mirando al DJ.
    client.player = { id, name, x: (Math.random() - 0.5) * 4, z: 2 + Math.random() * 2, yaw: Math.PI, anim: 0 }
    send(client, { t: "welcome", id, players: playerList() })
    broadcast({ t: "join", id, name }, client)
    return
  }

  if (msg.t === "chat" && client.player) {
    const now = Date.now()
    if (now - client.lastChatAt < CHAT_COOLDOWN_MS) return
    const text = sanitizeChat(msg.text)
    if (!text) return
    client.lastChatAt = now
    broadcast({ t: "chat", id: client.player.id, name: client.player.name, text })
    return
  }

  if (msg.t === "state" && client.player && Array.isArray(msg.s) && msg.s.length === 4) {
    const [x, z, yaw, anim] = msg.s
    if (![x, z, yaw, anim].every((v) => typeof v === "number" && Number.isFinite(v))) return
    client.player.x = clamp(x, FLOOR.minX, FLOOR.maxX)
    client.player.z = clamp(z, FLOOR.minZ, FLOOR.maxZ)
    client.player.yaw = yaw % (Math.PI * 2)
    client.player.anim = Number.isInteger(anim) && anim >= 0 && anim < ANIM_COUNT ? anim : 0
  }
}

const http = createServer((req, res) => {
  // Health check para el hosting
  res.writeHead(200, { "Content-Type": "application/json" })
  res.end(JSON.stringify({ ok: true, online: clients.size, players: playerCount() }))
})

const wss = new WebSocketServer({ server: http, maxPayload: 1024 })

wss.on("connection", (ws, req) => {
  const origin = req.headers.origin ?? ""
  if (ALLOWED_ORIGINS.length && !ALLOWED_ORIGINS.includes(origin)) {
    ws.close(1008, "origin")
    return
  }

  const client: Client = { ws, alive: true, msgCount: 0, lastChatAt: 0, player: null }
  clients.add(client)
  send(client, { t: "roster", players: playerList() })

  ws.on("pong", () => {
    client.alive = true
  })
  ws.on("message", (data) => {
    if (++client.msgCount > MAX_MESSAGES_PER_SEC) {
      ws.close(1008, "rate")
      return
    }
    try {
      handle(client, JSON.parse(String(data)) as ClientMessage)
    } catch {
      /* mensaje inválido: se ignora */
    }
  })
  ws.on("close", () => {
    clients.delete(client)
    if (client.player) broadcast({ t: "leave", id: client.player.id })
  })
})

// Reparto de posiciones
setInterval(() => {
  const p: [number, number, number, number, number][] = []
  for (const c of clients) {
    if (c.player) p.push([c.player.id, round2(c.player.x), round2(c.player.z), round2(c.player.yaw), c.player.anim])
  }
  broadcast({ t: "snap", n: clients.size, p })
}, 1000 / TICK_HZ)

// Límite de mensajes por segundo
setInterval(() => {
  for (const c of clients) c.msgCount = 0
}, 1000)

// Corta conexiones muertas
setInterval(() => {
  for (const c of clients) {
    if (!c.alive) {
      c.ws.terminate()
      continue
    }
    c.alive = false
    c.ws.ping()
  }
}, 15000)

http.listen(PORT, () => {
  console.log(`Boiler multiplayer escuchando en :${PORT}`)
})
