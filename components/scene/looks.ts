import * as THREE from "three"
import type { HairStyle } from "./humanoid"
import { mulberry32 } from "./textures"

const SKINS = ["#f1c9a5", "#e0ac83", "#c68b63", "#a86d48", "#7b4b2e", "#5a3520"]
const HAIRS = ["#1a1310", "#2b1d14", "#4a3020", "#7a5634", "#c9a26b", "#0d0d0d", "#8c3b2a"]
const CAPS = ["#111111", "#f2f2f2", "#1f3a5f", "#7a1f2b", "#3d4a2a"]
const SHIRTS = [
  "#151515", "#1b1b1b", "#222226", "#f2f2f2", "#2d3a55", "#4a1f2a",
  "#5a5a5a", "#0f2a24", "#ff708c", "#e8d9b0", "#203048", "#3b2a4a", "#6b4a2a",
]
const PANTS = ["#141414", "#1f2433", "#2b2b2b", "#3a3226", "#2c3a4f", "#4b4f57"]
const SHOES = ["#f0f0f0", "#141414", "#3a2a1e", "#d9d2c3"]
export const HAIR_STYLES: HairStyle[] = ["short", "long", "cap", "bun"]

export interface Look {
  scale: number
  hair: HairStyle
  longSleeves: boolean
  colors: { skin: THREE.Color; hair: THREE.Color; shirt: THREE.Color; pants: THREE.Color; shoes: THREE.Color }
}

export function lookFromRandom(rand: () => number): Look {
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)]
  const hair = pick(HAIR_STYLES)
  return {
    scale: 0.9 + rand() * 0.14,
    hair,
    longSleeves: rand() < 0.3,
    colors: {
      skin: new THREE.Color(pick(SKINS)),
      hair: new THREE.Color(hair === "cap" ? pick(CAPS) : pick(HAIRS)),
      shirt: new THREE.Color(pick(SHIRTS)),
      pants: new THREE.Color(pick(PANTS)),
      shoes: new THREE.Color(pick(SHOES)),
    },
  }
}

/** El mismo nickname siempre tiene el mismo look, en todas las pantallas. */
export function lookFromName(name: string): Look {
  let h = 2166136261
  for (const ch of name.toLowerCase()) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619)
  const look = lookFromRandom(mulberry32(h))
  look.scale = 0.97 + (look.scale - 0.9) * 0.4
  return look
}
