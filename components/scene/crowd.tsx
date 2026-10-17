"use client"

import { useLayoutEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { audioBus } from "@/lib/audio-bus"
import { mulberry32 } from "./textures"
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

const SKINS = ["#f1c9a5", "#e0ac83", "#c68b63", "#a86d48", "#7b4b2e", "#5a3520"]
const HAIRS = ["#1a1310", "#2b1d14", "#4a3020", "#7a5634", "#c9a26b", "#0d0d0d", "#8c3b2a"]
const CAPS = ["#111111", "#f2f2f2", "#1f3a5f", "#7a1f2b", "#3d4a2a"]
const SHIRTS = [
  "#151515", "#1b1b1b", "#222226", "#f2f2f2", "#2d3a55", "#4a1f2a",
  "#5a5a5a", "#0f2a24", "#ff708c", "#e8d9b0", "#203048", "#3b2a4a", "#6b4a2a",
]
const PANTS = ["#141414", "#1f2433", "#2b2b2b", "#3a3226", "#2c3a4f", "#4b4f57"]
const SHOES = ["#f0f0f0", "#141414", "#3a2a1e", "#d9d2c3"]
const HAIR_STYLES: HairStyle[] = ["short", "long", "cap", "bun"]

/** Cómo baila cada uno. */
type Dance = "groove" | "handsUp" | "fistPump" | "phone" | "sway"

interface Person {
  x: number
  z: number
  yaw: number
  scale: number
  phase: number
  intensity: number
  dance: Dance
  hair: HairStyle
  longSleeves: boolean
  colors: { skin: THREE.Color; hair: THREE.Color; shirt: THREE.Color; pants: THREE.Color; shoes: THREE.Color }
}

function generateCrowd(target: number): Person[] {
  const rand = mulberry32(2024)
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)]
  const spots: { x: number; z: number }[] = []
  let attempts = 0
  while (spots.length < target && attempts < target * 60) {
    attempts++
    const behind = rand() < 0.72
    const x = behind ? -5.8 + rand() * 11.6 : (rand() < 0.5 ? -1 : 1) * (2.3 + rand() * 3.5)
    const z = behind ? -8.3 + rand() * 7.0 : -1.3 + rand() * 1.4
    // El hueco del DJ y la mesa
    if (Math.abs(x) < 1.35 && z > -1.35) continue
    if (spots.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 0.55 ** 2)) continue
    spots.push({ x, z })
  }

  return spots.map(({ x, z }) => {
    const roll = rand()
    const dance: Dance = roll < 0.08 ? "handsUp" : roll < 0.2 ? "fistPump" : roll < 0.28 ? "phone" : roll < 0.6 ? "sway" : "groove"
    const hair = pick(HAIR_STYLES)
    return {
      x,
      z,
      yaw: Math.atan2(-x, -0.7 - z) + (rand() - 0.5) * 0.6,
      scale: 0.9 + rand() * 0.14,
      phase: rand() * Math.PI * 2,
      intensity: 0.5 + rand() * 0.7,
      dance,
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
  })
}

/** Pose de baile de una persona en el instante t. */
function dancePose(pose: Pose, p: Person, t: number, beat: number, kick: number, energy: number) {
  const groove = Math.abs(Math.sin(beat * Math.PI + p.phase))
  const half = Math.sin(beat * Math.PI * 0.5 + p.phase)
  const pump = Math.sin(beat * Math.PI * 2 + p.phase) * 0.5 + 0.5
  const k = p.intensity

  // Piernas: rebote de rodillas; en "sway" se pasa el peso de un pie al otro.
  const bend = 0.08 + (groove * 0.14 + kick * 0.08) * k
  const shift = p.dance === "sway" ? half * 0.5 : 0
  pose.hipL.set(-bend * (1 + shift), 0, 0.06)
  pose.kneeL.set(bend * 2 * (1 + shift), 0, 0)
  pose.hipR.set(-bend * (1 - shift), 0, -0.06)
  pose.kneeR.set(bend * 2 * (1 - shift), 0, 0)

  pose.pelvis.set(0, Math.sin(t * 0.7 + p.phase) * 0.15, shift * 0.06)
  pose.spine.set(0.06 + groove * 0.08 * k, Math.sin(t * 0.9 + p.phase) * 0.1, half * 0.06 * k)
  pose.neck.set(0.05 + groove * 0.28 * k + kick * 0.12, Math.sin(t * 0.5 + p.phase) * 0.2, 0)

  // Brazos "de club": codos doblados, manos a la altura del pecho, al ritmo.
  const clubArm = (shoulder: THREE.Euler, elbow: THREE.Euler, side: 1 | -1, offset: number) => {
    const g = Math.abs(Math.sin(beat * Math.PI + p.phase + offset))
    // El giro en Y lleva los antebrazos hacia el centro del pecho.
    shoulder.set(-0.3 - g * 0.3 * k, -side * 0.55, side * (0.22 + g * 0.06))
    elbow.set(-1.6 + g * 0.5, 0, 0)
  }
  const armUp = (shoulder: THREE.Euler, elbow: THREE.Euler, side: 1 | -1) => {
    shoulder.set(0.1, 0, side * (2.65 + pump * 0.2 + energy * 0.15))
    elbow.set(0, 0, side * (0.25 - pump * 0.2))
  }

  switch (p.dance) {
    case "handsUp":
      armUp(pose.shoulderL, pose.elbowL, 1)
      armUp(pose.shoulderR, pose.elbowR, -1)
      break
    case "fistPump":
      clubArm(pose.shoulderL, pose.elbowL, 1, 0)
      pose.shoulderR.set(-2.55 - pump * 0.35, 0, -0.15)
      pose.elbowR.set(-0.25 - (1 - pump) * 0.6, 0, 0)
      break
    case "phone":
      // Filma al DJ con el celular
      pose.shoulderL.set(0.05, 0, 0.12)
      pose.elbowL.set(-0.2, 0, 0)
      pose.shoulderR.set(-1.25, 0, -0.1)
      pose.elbowR.set(-0.9, 0, 0)
      pose.neck.x *= 0.3
      break
    case "sway":
    case "groove":
      clubArm(pose.shoulderL, pose.elbowL, 1, 0)
      clubArm(pose.shoulderR, pose.elbowR, -1, Math.PI / 2)
      break
  }
}

type ColorKey = keyof Person["colors"]

/** Qué color lleva cada pieza del cuerpo. */
const PART_COLORS: { part: number; color: ColorKey | ((p: Person) => ColorKey) }[] = [
  { part: PART.pelvis, color: "pants" },
  { part: PART.torso, color: "shirt" },
  { part: PART.head, color: "skin" },
  { part: PART.upperArmL, color: "shirt" },
  { part: PART.forearmL, color: (p) => (p.longSleeves ? "shirt" : "skin") },
  { part: PART.handL, color: "skin" },
  { part: PART.upperArmR, color: "shirt" },
  { part: PART.forearmR, color: (p) => (p.longSleeves ? "shirt" : "skin") },
  { part: PART.handR, color: "skin" },
  { part: PART.thighL, color: "pants" },
  { part: PART.shinL, color: "pants" },
  { part: PART.shoeL, color: "shoes" },
  { part: PART.thighR, color: "pants" },
  { part: PART.shinR, color: "pants" },
  { part: PART.shoeR, color: "shoes" },
]

const PHONE_OFFSET = new THREE.Matrix4().makeTranslation(0, -0.09, 0.035)

export function Crowd({ count = 140 }: { count?: number }) {
  const people = useMemo(() => generateCrowd(count), [count])
  const n = people.length

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

  // Índice de cada persona dentro de su malla de pelo / de celulares
  const groups = useMemo(() => {
    const hair = Object.fromEntries(HAIR_STYLES.map((s) => [s, [] as number[]])) as Record<HairStyle, number[]>
    const phones: number[] = []
    people.forEach((p, i) => {
      hair[p.hair].push(i)
      if (p.dance === "phone") phones.push(i)
    })
    return { hair, phones }
  }, [people])

  const partMeshes = useRef<(THREE.InstancedMesh | null)[]>([])
  const hairMeshes = useRef<Partial<Record<HairStyle, THREE.InstancedMesh | null>>>({})
  const phoneMesh = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    for (const { part, color } of PART_COLORS) {
      const mesh = partMeshes.current[part]
      if (!mesh) continue
      people.forEach((p, i) => mesh.setColorAt(i, p.colors[typeof color === "function" ? color(p) : color]))
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
    for (const style of HAIR_STYLES) {
      const mesh = hairMeshes.current[style]
      if (!mesh) continue
      groups.hair[style].forEach((personIdx, slot) => mesh.setColorAt(slot, people[personIdx].colors.hair))
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
  }, [people, groups])

  const scratch = useMemo(
    () => ({
      pose: new Pose(),
      parts: Array.from({ length: n }, () => createPartMatrices()),
      body: new THREE.Matrix4(),
      tmp: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
      e: new THREE.Euler(),
      v: new THREE.Vector3(),
      s: new THREE.Vector3(),
    }),
    [n],
  )

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const { kick, energy } = audioBus
    const beat = (t * 122) / 60
    const { pose, parts, body, tmp, q, e, v, s } = scratch

    for (let i = 0; i < n; i++) {
      const p = people[i]
      dancePose(pose, p, t, beat, kick, energy)
      body.compose(v.set(p.x, 0, p.z), q.setFromEuler(e.set(0, p.yaw, 0)), s.setScalar(p.scale))
      solvePose(body, pose, parts[i])
    }

    for (let part = 0; part < PART_COUNT; part++) {
      const mesh = partMeshes.current[part]
      if (!mesh) continue
      for (let i = 0; i < n; i++) mesh.setMatrixAt(i, parts[i][part])
      mesh.instanceMatrix.needsUpdate = true
    }
    for (const style of HAIR_STYLES) {
      const mesh = hairMeshes.current[style]
      if (!mesh) continue
      groups.hair[style].forEach((personIdx, slot) => mesh.setMatrixAt(slot, parts[personIdx][PART.head]))
      mesh.instanceMatrix.needsUpdate = true
    }
    if (phoneMesh.current) {
      groups.phones.forEach((personIdx, slot) => {
        phoneMesh.current!.setMatrixAt(slot, tmp.multiplyMatrices(parts[personIdx][PART.handR], PHONE_OFFSET))
      })
      phoneMesh.current.instanceMatrix.needsUpdate = true
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
          args={[geometry, assets.materialFor[part], n]}
          frustumCulled={false}
        />
      ))}
      {HAIR_STYLES.map((style) => (
        <instancedMesh
          key={style}
          ref={(el) => {
            hairMeshes.current[style] = el
          }}
          args={[assets.hair[style], assets.hairMaterial, groups.hair[style].length]}
          frustumCulled={false}
        />
      ))}
      <instancedMesh ref={phoneMesh} args={[assets.phone, undefined, groups.phones.length]} frustumCulled={false}>
        <meshBasicMaterial color="#cfe3ff" toneMapped={false} />
      </instancedMesh>
    </group>
  )
}
