/**
 * Mensajes entre el navegador y el servidor multijugador.
 * Lo importan los dos lados: solo tipos y constantes, nada de Node ni del DOM.
 */

export const MAX_PLAYERS = 60
export const NAME_MAX = 16
export const CHAT_MAX = 140
/** Cada cuánto el navegador avisa que sigue ahí (Render duerme el servidor sin tráfico entrante). */
export const HEARTBEAT_MS = 50_000
/** Frecuencia con la que el servidor reparte las posiciones de todos. */
export const TICK_HZ = 10

/** Qué está haciendo el avatar. */
export const ANIM = {
  groove: 0,
  walk: 1,
  run: 2,
  handsUp: 3,
  fistPump: 4,
  phone: 5,
  sway: 6,
} as const
export type Anim = (typeof ANIM)[keyof typeof ANIM]
export const ANIM_COUNT = 7

/** Límites del piso de la sala (metros). */
export const FLOOR = { minX: -6.7, maxX: 6.7, minZ: -8.7, maxZ: 5.7 }

/** Saca caracteres de control e invisibles, junta espacios y recorta. */
function cleanText(raw: unknown, max: number): string {
  if (typeof raw !== "string") return ""
  return raw
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
}

export function sanitizeName(raw: unknown): string | null {
  const name = cleanText(raw, NAME_MAX)
  return name.length >= 2 ? name : null
}

export function sanitizeChat(raw: unknown): string | null {
  const text = cleanText(raw, CHAT_MAX)
  return text.length > 0 ? text : null
}

// Navegador → servidor
export type ClientMessage =
  | { t: "join"; name: string }
  /** x, z, yaw, anim */
  | { t: "state"; s: [number, number, number, number] }
  | { t: "chat"; text: string }
  /** Solo para mantener viva la conexión */
  | { t: "ping" }

// Servidor → navegador
export type ServerMessage =
  /** Al conectarse: quiénes están caminando (aunque uno solo vaya a escuchar). */
  | { t: "roster"; players: { id: number; name: string }[] }
  | { t: "welcome"; id: number; players: { id: number; name: string }[] }
  | { t: "join"; id: number; name: string }
  | { t: "leave"; id: number }
  | { t: "full" }
  | { t: "chat"; id: number; name: string; text: string }
  /** n: conexiones abiertas; p: [id, x, z, yaw, anim] de cada jugador */
  | { t: "snap"; n: number; p: [number, number, number, number, number][] }
