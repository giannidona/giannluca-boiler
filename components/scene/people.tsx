"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { audioBus } from "@/lib/audio-bus"
import { multiplayer } from "@/lib/multiplayer"
import { localPlayer } from "@/lib/player"
import { ANIM, MAX_PLAYERS } from "@/server/protocol"
import { applyMotion, type Beat, type MotionInput } from "./dance"
import { HAIR_STYLES, type Look } from "./looks"
import { NPCS } from "./world"
import {
  PART,
  PART_COUNT,
  Pose,
  createBodyGeometries,
  createFaceTexture,
  createHairGeometry,
  createPartMatrices,
  createShirtTexture,
  solvePose,
  type HairStyle,
} from "./humanoid"

type ColorKey = keyof Look["colors"]

/** Qué color lleva cada pieza del cuerpo. */
const PART_COLORS: { part: number; color: ColorKey | ((l: Look) => ColorKey) }[] = [
  { part: PART.pelvis, color: "pants" },
  { part: PART.torso, color: "shirt" },
  { part: PART.head, color: "skin" },
  { part: PART.upperArmL, color: "shirt" },
  { part: PART.forearmL, color: (l) => (l.longSleeves ? "shirt" : "skin") },
  { part: PART.handL, color: "skin" },
  { part: PART.upperArmR, color: "shirt" },
  { part: PART.forearmR, color: (l) => (l.longSleeves ? "shirt" : "skin") },
  { part: PART.handR, color: "skin" },
  { part: PART.thighL, color: "pants" },
  { part: PART.shinL, color: "pants" },
  { part: PART.shoeL, color: "shoes" },
  { part: PART.thighR, color: "pants" },
  { part: PART.shinR, color: "pants" },
  { part: PART.shoeR, color: "shoes" },
]

const CAPACITY = NPCS.length + MAX_PLAYERS + 1
const PHONE_OFFSET = new THREE.Matrix4().makeTranslation(0, -0.09, 0.035)
const STRIDE = 1.3

interface Agent {
  look: Look
  x: number
  z: number
  yaw: number
  motion: MotionInput
}

function lerpAngle(a: number, b: number, t: number) {
  let d = (b - a) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return a + d * t
}

/** Mueve a los demás jugadores hacia su última posición conocida. */
function interpolateRemotes(dt: number) {
  const a = 1 - Math.exp(-dt * 10)
  for (const r of multiplayer.remotes.values()) {
    if (!r.placed) continue
    const nx = r.x + (r.target.x - r.x) * a
    const nz = r.z + (r.target.z - r.z) * a
    r.walkPhase += (Math.hypot(nx - r.x, nz - r.z) / STRIDE) * Math.PI * 2
    r.x = nx
    r.z = nz
    r.yaw = lerpAngle(r.yaw, r.target.yaw, a)
  }
}

/** Todas las personas de la sala (público de relleno + jugadores) en un solo set de mallas instanciadas. */
export function People() {
  const assets = useMemo(() => {
    const geo = createBodyGeometries()
    const face = createFaceTexture()
    const shirt = createShirtTexture()
    const mat = (map?: THREE.Texture) => new THREE.MeshStandardMaterial({ map, flatShading: true, roughness: 0.85 })
    const geometryFor = [
      geo.pelvis, geo.torso, geo.head,
      geo.upperArm, geo.forearm, geo.hand, geo.upperArm, geo.forearm, geo.hand,
      geo.thigh, geo.shin, geo.shoe, geo.thigh, geo.shin, geo.shoe,
    ]
    const materialFor = geometryFor.map((_, part) =>
      part === PART.head ? mat(face) : part === PART.torso ? mat(shirt) : mat(),
    )
    const hair = Object.fromEntries(HAIR_STYLES.map((s) => [s, createHairGeometry(s)])) as Record<HairStyle, THREE.BufferGeometry>
    return { geometryFor, materialFor, hair, hairMaterial: mat(), phone: new THREE.BoxGeometry(0.045, 0.085, 0.01) }
  }, [])

  const partMeshes = useRef<(THREE.InstancedMesh | null)[]>([])
  const hairMeshes = useRef<Partial<Record<HairStyle, THREE.InstancedMesh | null>>>({})
  const phoneMesh = useRef<THREE.InstancedMesh>(null)

  const scratch = useMemo(
    () => ({
      pose: new Pose(),
      parts: Array.from({ length: CAPACITY }, () => createPartMatrices()),
      agents: [] as Agent[],
      npcAgents: NPCS.map<Agent>((n) => ({
        look: n.look,
        x: n.x,
        z: n.z,
        yaw: n.yaw,
        motion: { anim: n.anim, phase: n.phase, intensity: n.intensity, walkPhase: 0 },
      })),
      localAgent: { look: null as unknown as Look, x: 0, z: 0, yaw: 0, motion: { anim: 0, phase: 0, intensity: 0.9, walkPhase: 0 } } as Agent,
      identity: "",
      hairSlots: Object.fromEntries(HAIR_STYLES.map((s) => [s, [] as number[]])) as Record<HairStyle, number[]>,
      body: new THREE.Matrix4(),
      tmp: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
      e: new THREE.Euler(),
      v: new THREE.Vector3(),
      s: new THREE.Vector3(),
      beat: { t: 0, beat: 0, kick: 0, energy: 0 } as Beat,
    }),
    [],
  )

  /** Cuando entra o sale alguien, se reasignan colores y peinados de cada lugar. */
  function recolor(agents: Agent[]) {
    for (const { part, color } of PART_COLORS) {
      const mesh = partMeshes.current[part]
      if (!mesh) continue
      agents.forEach((a, i) => mesh.setColorAt(i, a.look.colors[typeof color === "function" ? color(a.look) : color]))
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
    for (const style of HAIR_STYLES) scratch.hairSlots[style].length = 0
    agents.forEach((a, i) => scratch.hairSlots[a.look.hair].push(i))
    for (const style of HAIR_STYLES) {
      const mesh = hairMeshes.current[style]
      if (!mesh) continue
      scratch.hairSlots[style].forEach((agentIdx, slot) => mesh.setColorAt(slot, agents[agentIdx].look.colors.hair))
      mesh.count = scratch.hairSlots[style].length
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
  }

  useFrame(({ clock }, dt) => {
    interpolateRemotes(Math.min(dt, 0.1))

    const { pose, parts, body, tmp, q, e, v, s, agents, beat } = scratch
    const t = clock.elapsedTime
    beat.t = t
    beat.beat = (t * 122) / 60
    beat.kick = audioBus.kick
    beat.energy = audioBus.energy

    // Lista de personas de este frame
    agents.length = 0
    agents.push(...scratch.npcAgents)
    let identity = ""
    if (localPlayer.active && localPlayer.look) {
      const a = scratch.localAgent
      a.look = localPlayer.look
      a.x = localPlayer.x
      a.z = localPlayer.z
      a.yaw = localPlayer.yaw
      a.motion.anim = localPlayer.anim
      a.motion.walkPhase = localPlayer.walkPhase
      agents.push(a)
      identity += `me:${localPlayer.name}|`
    }
    for (const r of multiplayer.remotes.values()) {
      if (!r.placed || agents.length >= CAPACITY) continue
      agents.push({ look: r.look, x: r.x, z: r.z, yaw: r.yaw, motion: { anim: r.anim, phase: r.phase, intensity: 0.9, walkPhase: r.walkPhase } })
      identity += `${r.id}|`
    }
    if (identity !== scratch.identity || !partMeshes.current[0]?.instanceColor) {
      scratch.identity = identity
      recolor(agents)
    }

    const n = agents.length
    for (let i = 0; i < n; i++) {
      const a = agents[i]
      applyMotion(pose, a.motion, beat)
      body.compose(v.set(a.x, 0, a.z), q.setFromEuler(e.set(0, a.yaw, 0)), s.setScalar(a.look.scale))
      solvePose(body, pose, parts[i])
    }

    for (let part = 0; part < PART_COUNT; part++) {
      const mesh = partMeshes.current[part]
      if (!mesh) continue
      for (let i = 0; i < n; i++) mesh.setMatrixAt(i, parts[i][part])
      mesh.count = n
      mesh.instanceMatrix.needsUpdate = true
    }
    for (const style of HAIR_STYLES) {
      const mesh = hairMeshes.current[style]
      if (!mesh) continue
      scratch.hairSlots[style].forEach((agentIdx, slot) => mesh.setMatrixAt(slot, parts[agentIdx][PART.head]))
      mesh.instanceMatrix.needsUpdate = true
    }
    const phones = phoneMesh.current
    if (phones) {
      let count = 0
      for (let i = 0; i < n; i++) {
        if (agents[i].motion.anim !== ANIM.phone) continue
        phones.setMatrixAt(count++, tmp.multiplyMatrices(parts[i][PART.handR], PHONE_OFFSET))
      }
      phones.count = count
      phones.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <group>
      {assets.geometryFor.map((geometry, part) => (
        <instancedMesh
          key={part}
          ref={(el) => {
            partMeshes.current[part] = el
          }}
          args={[geometry, assets.materialFor[part], CAPACITY]}
          frustumCulled={false}
        />
      ))}
      {HAIR_STYLES.map((style) => (
        <instancedMesh
          key={style}
          ref={(el) => {
            hairMeshes.current[style] = el
          }}
          args={[assets.hair[style], assets.hairMaterial, CAPACITY]}
          frustumCulled={false}
        />
      ))}
      <instancedMesh ref={phoneMesh} args={[assets.phone, undefined, CAPACITY]} frustumCulled={false}>
        <meshBasicMaterial color="#cfe3ff" toneMapped={false} />
      </instancedMesh>
    </group>
  )
}
