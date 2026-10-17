"use client"

import { useEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { multiplayer, useRoster } from "@/lib/multiplayer"
import { localPlayer } from "@/lib/player"

const HEIGHT = 2.05
const LABEL_SIZE = 0.04

function nameTexture(name: string, own: boolean) {
  const c = document.createElement("canvas")
  const ctx = c.getContext("2d")!
  const font = `700 40px "Helvetica Neue", Arial, sans-serif`
  ctx.font = font
  const w = Math.ceil(ctx.measureText(name).width) + 40
  c.width = w
  c.height = 64
  ctx.fillStyle = own ? "rgba(255,112,140,0.9)" : "rgba(0,0,0,0.6)"
  ctx.beginPath()
  ctx.roundRect(0, 4, w, 56, 28)
  ctx.fill()
  ctx.font = font
  ctx.fillStyle = own ? "#0a0607" : "#ffffff"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(name, w / 2, 34)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return { tex, aspect: w / 64 }
}

function Nameplate({ name, own, getPosition }: { name: string; own: boolean; getPosition: () => { x: number; z: number } | null }) {
  const sprite = useRef<THREE.Sprite>(null)
  const { tex, aspect } = useMemo(() => nameTexture(name, own), [name, own])
  useEffect(() => () => tex.dispose(), [tex])

  useFrame(() => {
    const s = sprite.current
    if (!s) return
    const p = getPosition()
    s.visible = !!p
    if (p) s.position.set(p.x, HEIGHT, p.z)
  })

  return (
    // Tamaño fijo en pantalla: se lee igual de cerca que de lejos.
    <sprite ref={sprite} scale={[LABEL_SIZE * aspect, LABEL_SIZE, 1]} renderOrder={10}>
      <spriteMaterial map={tex} transparent depthTest={false} fog={false} toneMapped={false} sizeAttenuation={false} />
    </sprite>
  )
}

/** El nickname flotando sobre cada jugador (incluido el propio). */
export function Nameplates({ showOwn }: { showOwn: boolean }) {
  const roster = useRoster()
  return (
    <group>
      {showOwn && localPlayer.name && (
        <Nameplate name={localPlayer.name} own getPosition={() => (localPlayer.active ? localPlayer : null)} />
      )}
      {roster.players.map((p) => (
        <Nameplate
          key={p.id}
          name={p.name}
          own={false}
          getPosition={() => {
            const r = multiplayer.remotes.get(p.id)
            return r?.placed ? r : null
          }}
        />
      ))}
    </group>
  )
}
