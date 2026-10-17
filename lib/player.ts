import { ANIM } from "@/server/protocol"
import type { Look } from "@/components/scene/looks"

/** El avatar propio. Lo mueve PlayerController y lo dibuja People. */
export const localPlayer = {
  active: false,
  name: "",
  look: null as Look | null,
  x: 0,
  z: 3,
  yaw: Math.PI,
  anim: ANIM.groove as number,
  /** Baile elegido para cuando está quieto. */
  emote: ANIM.groove as number,
  walkPhase: 0,
  phase: 0,
}

/** Entrada del usuario: teclado + joystick táctil. */
export const input = {
  keys: new Set<string>(),
  joystick: { x: 0, y: 0 },
}

if (typeof window !== "undefined") {
  const typing = (e: KeyboardEvent) => {
    const el = e.target as HTMLElement | null
    return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)
  }
  window.addEventListener("keydown", (e) => {
    if (typing(e)) return
    input.keys.add(e.code)
    if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault()
  })
  window.addEventListener("keyup", (e) => input.keys.delete(e.code))
  window.addEventListener("blur", () => input.keys.clear())
}
