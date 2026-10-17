"use client"

import { useEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { multiplayer, useRoster, type ChatMessage } from "@/lib/multiplayer"
import { localPlayer } from "@/lib/player"

const HEIGHT = 2.05
/** Alto de la etiqueta del nombre, en fracción de la pantalla. */
const LABEL_SIZE = 0.04
/** Cuánto tiempo queda visible el globito de chat. */
const BUBBLE_MS = 6000
const FONT = `"Helvetica Neue", Arial, sans-serif`

function finish(c: HTMLCanvasElement) {
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function nameTexture(name: string, own: boolean) {
  const c = document.createElement("canvas")
  const ctx = c.getContext("2d")!
  const font = `700 40px ${FONT}`
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
  return { tex: finish(c), aspect: w / 64 }
}

/** Globito blanco con el mensaje, en hasta 3 líneas. */
function bubbleTexture(text: string) {
  const c = document.createElement("canvas")
  const ctx = c.getContext("2d")!
  const font = `500 34px ${FONT}`
  const maxWidth = 460
  const lineHeight = 42
  ctx.font = font

  const lines: string[] = []
  let line = ""
  for (const word of text.split(" ")) {
    const attempt = line ? `${line} ${word}` : word
    if (ctx.measureText(attempt).width <= maxWidth || !line) line = attempt
    else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  if (lines.length > 3) {
    lines.length = 3
    lines[2] = `${lines[2].slice(0, -1)}…`
  }
  // Palabras larguísimas sin espacios
  for (let i = 0; i < lines.length; i++) {
    while (ctx.measureText(lines[i]).width > maxWidth && lines[i].length > 1) lines[i] = `${lines[i].slice(0, -2)}…`
  }

  const textWidth = Math.max(...lines.map((l) => ctx.measureText(l).width))
  const padX = 22
  const padY = 14
  const tail = 14
  const w = Math.ceil(textWidth + padX * 2)
  const boxH = lines.length * lineHeight + padY * 2
  c.width = w
  c.height = boxH + tail

  ctx.fillStyle = "rgba(255,255,255,0.95)"
  ctx.beginPath()
  ctx.roundRect(0, 0, w, boxH, 22)
  ctx.moveTo(w / 2 - 12, boxH)
  ctx.lineTo(w / 2, boxH + tail)
  ctx.lineTo(w / 2 + 12, boxH)
  ctx.fill()

  ctx.font = font
  ctx.fillStyle = "#111111"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  lines.forEach((l, i) => ctx.fillText(l, w / 2, padY + lineHeight * (i + 0.5) + 1))
  return { tex: finish(c), width: w, height: c.height }
}

function Bubble({ message, sprite }: { message: ChatMessage; sprite: React.RefObject<THREE.Sprite | null> }) {
  const { tex, width, height } = useMemo(() => bubbleTexture(message.text), [message.text])
  useEffect(() => () => tex.dispose(), [tex])
  // Mismo tamaño de letra que el nombre; se dibuja apoyado justo encima de la etiqueta.
  const h = LABEL_SIZE * (height / 64)
  const w = h * (width / height)
  const center = useMemo(() => new THREE.Vector2(0.5, -(LABEL_SIZE * 0.55) / h), [h])
  return (
    <sprite ref={sprite} scale={[w, h, 1]} center={center} renderOrder={11}>
      <spriteMaterial map={tex} transparent depthTest={false} fog={false} toneMapped={false} sizeAttenuation={false} />
    </sprite>
  )
}

function Nameplate({
  name,
  own,
  bubble,
  getPosition,
}: {
  name: string
  own: boolean
  bubble: ChatMessage | undefined
  getPosition: () => { x: number; z: number } | null
}) {
  const group = useRef<THREE.Group>(null)
  const bubbleSprite = useRef<THREE.Sprite>(null)
  const { tex, aspect } = useMemo(() => nameTexture(name, own), [name, own])
  useEffect(() => () => tex.dispose(), [tex])

  useFrame(() => {
    const g = group.current
    if (!g) return
    const p = getPosition()
    g.visible = !!p
    if (p) g.position.set(p.x, HEIGHT, p.z)
    if (bubbleSprite.current && bubble) bubbleSprite.current.visible = Date.now() - bubble.at < BUBBLE_MS
  })

  return (
    <group ref={group}>
      {/* Tamaño fijo en pantalla: se lee igual de cerca que de lejos. */}
      <sprite scale={[LABEL_SIZE * aspect, LABEL_SIZE, 1]} renderOrder={10}>
        <spriteMaterial map={tex} transparent depthTest={false} fog={false} toneMapped={false} sizeAttenuation={false} />
      </sprite>
      {bubble && <Bubble key={bubble.key} message={bubble} sprite={bubbleSprite} />}
    </group>
  )
}

/** El nickname flotando sobre cada jugador (incluido el propio), con su último mensaje de chat. */
export function Nameplates({ showOwn }: { showOwn: boolean }) {
  const roster = useRoster()
  const lastMessage = useMemo(() => {
    const byId = new Map<number, ChatMessage>()
    for (const m of roster.chat) byId.set(m.id, m)
    return byId
  }, [roster.chat])

  return (
    <group>
      {showOwn && localPlayer.name && (
        <Nameplate
          name={localPlayer.name}
          own
          bubble={roster.selfId !== null ? lastMessage.get(roster.selfId) : undefined}
          getPosition={() => (localPlayer.active ? localPlayer : null)}
        />
      )}
      {roster.players.map((p) => (
        <Nameplate
          key={p.id}
          name={p.name}
          own={false}
          bubble={lastMessage.get(p.id)}
          getPosition={() => {
            const r = multiplayer.remotes.get(p.id)
            return r?.placed ? r : null
          }}
        />
      ))}
    </group>
  )
}
