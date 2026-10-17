"use client"

import { useEffect, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { multiplayer } from "@/lib/multiplayer"
import { input, localPlayer } from "@/lib/player"
import { ANIM } from "@/server/protocol"
import { ROOM } from "./room"
import { resolvePosition } from "./world"

const WALK_SPEED = 1.7
const RUN_SPEED = 3.2
const EYE_HEIGHT = 1.5

function lerpAngle(a: number, b: number, t: number) {
  let d = (b - a) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return a + d * t
}

/** Mueve el avatar propio y, en modo "follow", lleva la cámara en tercera persona. */
export function PlayerController({ follow }: { follow: boolean }) {
  const { camera, gl } = useThree()
  const orbit = useRef({ yaw: 0, pitch: 0.28, dist: 3.2 })
  const scratch = useRef({ fwd: new THREE.Vector3(), target: new THREE.Vector3(), desired: new THREE.Vector3() })

  // Arrastrar sobre la escena gira la cámara; la rueda acerca/aleja.
  useEffect(() => {
    if (!follow) return
    const el = gl.domElement
    el.style.touchAction = "none"
    let dragging: { id: number; x: number; y: number } | null = null
    const down = (e: PointerEvent) => {
      dragging = { id: e.pointerId, x: e.clientX, y: e.clientY }
      el.setPointerCapture(e.pointerId)
    }
    const move = (e: PointerEvent) => {
      if (!dragging || dragging.id !== e.pointerId) return
      orbit.current.yaw -= (e.clientX - dragging.x) * 0.006
      orbit.current.pitch = THREE.MathUtils.clamp(orbit.current.pitch + (e.clientY - dragging.y) * 0.004, -0.15, 0.95)
      dragging.x = e.clientX
      dragging.y = e.clientY
    }
    const up = (e: PointerEvent) => {
      if (dragging?.id === e.pointerId) dragging = null
    }
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      orbit.current.dist = THREE.MathUtils.clamp(orbit.current.dist * (1 + e.deltaY * 0.001), 1.6, 6)
    }
    el.addEventListener("pointerdown", down)
    el.addEventListener("pointermove", move)
    el.addEventListener("pointerup", up)
    el.addEventListener("pointercancel", up)
    el.addEventListener("wheel", wheel, { passive: false })
    return () => {
      el.removeEventListener("pointerdown", down)
      el.removeEventListener("pointermove", move)
      el.removeEventListener("pointerup", up)
      el.removeEventListener("pointercancel", up)
      el.removeEventListener("wheel", wheel)
    }
  }, [follow, gl])

  // Al entrar, la cámara arranca detrás del avatar.
  useEffect(() => {
    if (follow) orbit.current.yaw = localPlayer.yaw + Math.PI
  }, [follow])

  useFrame((_, rawDt) => {
    if (!localPlayer.active) return
    const dt = Math.min(rawDt, 0.1)
    const { fwd, target, desired } = scratch.current
    const k = input.keys

    // Dirección pedida, relativa a la cámara
    let ix = (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) - (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0)
    let iz = (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) - (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0)
    ix += input.joystick.x
    iz -= input.joystick.y
    const len = Math.hypot(ix, iz)
    if (len > 1) {
      ix /= len
      iz /= len
    }
    const moving = len > 0.15
    const joystickPush = Math.hypot(input.joystick.x, input.joystick.y)
    const running = moving && (k.has("ShiftLeft") || k.has("ShiftRight") || joystickPush > 0.92)

    if (moving) {
      camera.getWorldDirection(fwd)
      fwd.y = 0
      fwd.normalize()
      const mx = -fwd.z * ix + fwd.x * iz
      const mz = fwd.x * ix + fwd.z * iz
      const speed = (running ? RUN_SPEED : WALK_SPEED) * Math.min(1, len)
      const next = resolvePosition(localPlayer.x + mx * speed * dt, localPlayer.z + mz * speed * dt)
      const moved = Math.hypot(next.x - localPlayer.x, next.z - localPlayer.z)
      localPlayer.walkPhase += (moved / (running ? 1.8 : 1.3)) * Math.PI * 2
      localPlayer.x = next.x
      localPlayer.z = next.z
      localPlayer.yaw = lerpAngle(localPlayer.yaw, Math.atan2(mx, mz), 1 - Math.exp(-dt * 12))
    }
    localPlayer.anim = moving ? (running ? ANIM.run : ANIM.walk) : localPlayer.emote
    multiplayer.sendState(localPlayer.x, localPlayer.z, localPlayer.yaw, localPlayer.anim)

    if (!follow) return
    const o = orbit.current
    target.set(localPlayer.x, EYE_HEIGHT, localPlayer.z)
    desired.set(
      target.x + Math.sin(o.yaw) * Math.cos(o.pitch) * o.dist,
      target.y + Math.sin(o.pitch) * o.dist,
      target.z + Math.cos(o.yaw) * Math.cos(o.pitch) * o.dist,
    )
    // Que la cámara no atraviese paredes, piso ni techo
    desired.x = THREE.MathUtils.clamp(desired.x, -ROOM.width / 2 + 0.25, ROOM.width / 2 - 0.25)
    desired.z = THREE.MathUtils.clamp(desired.z, ROOM.back + 0.25, ROOM.front - 0.25)
    desired.y = THREE.MathUtils.clamp(desired.y, 0.35, ROOM.height - 0.3)
    camera.position.lerp(desired, 1 - Math.exp(-dt * 10))
    camera.lookAt(target)
  })

  return null
}
