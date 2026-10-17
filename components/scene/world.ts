import { ANIM, FLOOR, type Anim } from "@/server/protocol"
import { TABLE } from "./dj-booth"
import { lookFromRandom, type Look } from "./looks"
import { mulberry32 } from "./textures"

/** Gente de relleno que baila en la sala (igual para todos). */
export interface Npc {
  x: number
  z: number
  yaw: number
  phase: number
  intensity: number
  anim: Anim
  look: Look
}

const DJ_POSITION = { x: 0, z: -0.76 }

function generateNpcs(target: number): Npc[] {
  const rand = mulberry32(2024)
  const spots: { x: number; z: number }[] = []
  let attempts = 0
  while (spots.length < target && attempts < target * 80) {
    attempts++
    const behind = rand() < 0.72
    const x = behind ? -5.8 + rand() * 11.6 : (rand() < 0.5 ? -1 : 1) * (2.3 + rand() * 3.5)
    const z = behind ? -8.3 + rand() * 7.0 : -1.3 + rand() * 1.4
    if (Math.abs(x) < 1.35 && z > -1.35) continue
    // Separación suficiente para que se pueda caminar entre la gente
    if (spots.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 0.85 ** 2)) continue
    spots.push({ x, z })
  }

  return spots.map(({ x, z }) => {
    const roll = rand()
    const anim =
      roll < 0.08 ? ANIM.handsUp : roll < 0.2 ? ANIM.fistPump : roll < 0.28 ? ANIM.phone : roll < 0.6 ? ANIM.sway : ANIM.groove
    return {
      x,
      z,
      yaw: Math.atan2(DJ_POSITION.x - x, DJ_POSITION.z - z) + (rand() - 0.5) * 0.6,
      phase: rand() * Math.PI * 2,
      intensity: 0.5 + rand() * 0.7,
      anim,
      look: lookFromRandom(rand),
    }
  })
}

export const NPCS = generateNpcs(100)

// ---------------------------------------------------------------------------
// Colisiones del jugador

export const PLAYER_RADIUS = 0.2

const circles: { x: number; z: number; r: number }[] = [
  ...NPCS.map((n) => ({ x: n.x, z: n.z, r: 0.2 })),
  { x: DJ_POSITION.x, z: DJ_POSITION.z, r: 0.35 },
  { x: -1.45, z: 0.05, r: 0.33 },
  { x: 1.45, z: 0.05, r: 0.33 },
]

const table = {
  minX: -TABLE.width / 2,
  maxX: TABLE.width / 2,
  minZ: TABLE.z - TABLE.depth / 2,
  maxZ: TABLE.z + TABLE.depth / 2,
}

/** Devuelve una posición válida lo más cerca posible de (x, z). */
export function resolvePosition(x: number, z: number): { x: number; z: number } {
  for (let iter = 0; iter < 3; iter++) {
    for (const c of circles) {
      const dx = x - c.x
      const dz = z - c.z
      const min = c.r + PLAYER_RADIUS
      const d2 = dx * dx + dz * dz
      if (d2 < min * min) {
        const d = Math.sqrt(d2) || 0.0001
        x = c.x + (dx / d) * min
        z = c.z + (dz / d) * min
      }
    }
    // Mesa: se empuja hacia el borde más cercano
    const minX = table.minX - PLAYER_RADIUS
    const maxX = table.maxX + PLAYER_RADIUS
    const minZ = table.minZ - PLAYER_RADIUS
    const maxZ = table.maxZ + PLAYER_RADIUS
    if (x > minX && x < maxX && z > minZ && z < maxZ) {
      const push = [x - minX, maxX - x, z - minZ, maxZ - z]
      const i = push.indexOf(Math.min(...push))
      if (i === 0) x = minX
      else if (i === 1) x = maxX
      else if (i === 2) z = minZ
      else z = maxZ
    }
    x = Math.min(FLOOR.maxX, Math.max(FLOOR.minX, x))
    z = Math.min(FLOOR.maxZ, Math.max(FLOOR.minZ, z))
  }
  return { x, z }
}
