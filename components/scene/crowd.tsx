"use client"

import { useLayoutEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { audioBus } from "@/lib/audio-bus"
import { mulberry32 } from "./textures"

const SKINS = ["#f1c9a5", "#e0ac83", "#c68b63", "#a86d48", "#7b4b2e", "#5a3520"]
const HAIRS = ["#1a1310", "#2b1d14", "#4a3020", "#7a5634", "#c9a26b", "#0d0d0d", "#8c3b2a"]
const SHIRTS = [
  "#111111", "#151515", "#1b1b1b", "#222226", "#f2f2f2", "#2d3a55", "#4a1f2a",
  "#5a5a5a", "#0f2a24", "#ff708c", "#e8d9b0", "#203048", "#3b2a4a",
]
const PANTS = ["#141414", "#1f2433", "#2b2b2b", "#3a3226", "#2c3a4f"]

interface Person {
  x: number
  z: number
  yaw: number
  scale: number
  phase: number
  intensity: number
  /** 0: brazos abajo, 1: un brazo arriba, 2: los dos arriba */
  hands: 0 | 1 | 2
  shirt: THREE.Color
  pants: THREE.Color
  skin: THREE.Color
  hair: THREE.Color
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
    if (spots.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 0.52 ** 2)) continue
    spots.push({ x, z })
  }

  return spots.map(({ x, z }) => {
    const handsRoll = rand()
    return {
      x,
      z,
      yaw: Math.atan2(-x, -0.7 - z) + (rand() - 0.5) * 0.6,
      scale: 0.9 + rand() * 0.2,
      phase: rand() * Math.PI * 2,
      intensity: 0.5 + rand() * 0.7,
      hands: handsRoll < 0.08 ? 2 : handsRoll < 0.22 ? 1 : 0,
      shirt: new THREE.Color(pick(SHIRTS)),
      pants: new THREE.Color(pick(PANTS)),
      skin: new THREE.Color(pick(SKINS)),
      hair: new THREE.Color(pick(HAIRS)),
    }
  })
}

const LEG_LEN = 0.82
const UPPER = 0.62

export function Crowd({ count = 140 }: { count?: number }) {
  const people = useMemo(() => generateCrowd(count), [count])
  const n = people.length

  const legs = useRef<THREE.InstancedMesh>(null)
  const torsos = useRef<THREE.InstancedMesh>(null)
  const heads = useRef<THREE.InstancedMesh>(null)
  const hairs = useRef<THREE.InstancedMesh>(null)
  const arms = useRef<THREE.InstancedMesh>(null)

  const geometries = useMemo(() => {
    const leg = new THREE.CapsuleGeometry(0.075, LEG_LEN - 0.15, 4, 8)
    leg.translate(0, -LEG_LEN / 2, 0)
    const torso = new THREE.CapsuleGeometry(0.17, 0.34, 4, 12)
    torso.scale(1, 1, 0.65)
    const head = new THREE.SphereGeometry(0.105, 16, 12)
    const hair = new THREE.SphereGeometry(0.11, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5)
    const arm = new THREE.CapsuleGeometry(0.042, 0.46, 4, 8)
    arm.translate(0, -0.25, 0)
    return { leg, torso, head, hair, arm }
  }, [])

  useLayoutEffect(() => {
    people.forEach((p, i) => {
      legs.current?.setColorAt(i * 2, p.pants)
      legs.current?.setColorAt(i * 2 + 1, p.pants)
      torsos.current?.setColorAt(i, p.shirt)
      heads.current?.setColorAt(i, p.skin)
      hairs.current?.setColorAt(i, p.hair)
      // Brazo: manga corta → color de piel en la mayoría
      const armColor = p.shirt.getHex() === 0xf2f2f2 || i % 3 ? p.skin : p.shirt
      arms.current?.setColorAt(i * 2, armColor)
      arms.current?.setColorAt(i * 2 + 1, armColor)
    })
    for (const m of [legs, torsos, heads, hairs, arms]) {
      if (m.current?.instanceColor) m.current.instanceColor.needsUpdate = true
    }
  }, [people])

  const tmp = useMemo(
    () => ({
      body: new THREE.Matrix4(),
      part: new THREE.Matrix4(),
      out: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
      e: new THREE.Euler(),
      v: new THREE.Vector3(),
      s: new THREE.Vector3(),
    }),
    [],
  )

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const { kick, bass, energy } = audioBus
    const beat = (t * 122) / 60
    const { body, part, out, q, e, v, s } = tmp

    const setPart = (mesh: THREE.InstancedMesh | null, idx: number, pos: THREE.Vector3, rot: THREE.Euler, scl = 1) => {
      if (!mesh) return
      part.compose(pos, q.setFromEuler(rot), s.setScalar(scl))
      out.multiplyMatrices(body, part)
      mesh.setMatrixAt(idx, out)
    }

    for (let i = 0; i < n; i++) {
      const p = people[i]
      const groove = Math.abs(Math.sin(beat * Math.PI + p.phase))
      const bounce = (groove * 0.035 + kick * 0.03 + bass * 0.015) * p.intensity

      // Cuerpo completo: posición, mirada al DJ y escala
      body.compose(
        v.set(p.x, -bounce * 0.4, p.z),
        q.setFromEuler(e.set(0, p.yaw + Math.sin(t * 0.7 + p.phase) * 0.15, 0)),
        s.setScalar(p.scale),
      )

      // Piernas: se flexionan con el rebote
      const knee = bounce * 1.2
      setPart(legs.current, i * 2, v.set(-0.085, LEG_LEN, 0), e.set(knee * 0.3, 0, 0.02))
      setPart(legs.current, i * 2 + 1, v.set(0.085, LEG_LEN, 0), e.set(knee * 0.3, 0, -0.02))

      // Torso con balanceo lateral
      const sway = Math.sin(beat * Math.PI * 0.5 + p.phase) * 0.06 * p.intensity
      const upperY = LEG_LEN + UPPER / 2 - bounce
      body.multiply(part.compose(v.set(0, upperY, 0), q.setFromEuler(e.set(0.05 + bounce, 0, sway)), s.setScalar(1)))

      setPart(torsos.current, i, v.set(0, 0, 0), e.set(0, 0, 0))
      const nod = groove * 0.25 * p.intensity + kick * 0.15
      setPart(heads.current, i, v.set(0, 0.47, 0.01), e.set(nod, 0, 0))
      setPart(hairs.current, i, v.set(0, 0.49, -0.005), e.set(nod - 0.15, 0, 0))

      // Brazos
      const pump = Math.sin(beat * Math.PI * 2 + p.phase) * 0.25 + kick * 0.3
      for (const side of [-1, 1] as const) {
        const up = p.hands === 2 || (p.hands === 1 && side === 1)
        const rz = up ? side * (2.75 + pump * 0.25 + energy * 0.2) : side * (0.1 + groove * 0.06)
        const rx = up ? 0.1 : -0.25 - groove * 0.35 * p.intensity
        setPart(arms.current, i * 2 + (side === 1 ? 1 : 0), v.set(side * 0.2, 0.25, 0), e.set(rx, 0, rz))
      }
    }

    for (const m of [legs, torsos, heads, hairs, arms]) {
      if (m.current) m.current.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <group>
      <instancedMesh ref={legs} args={[geometries.leg, undefined, n * 2]} frustumCulled={false}>
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={torsos} args={[geometries.torso, undefined, n]} frustumCulled={false}>
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[geometries.head, undefined, n]} frustumCulled={false}>
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={hairs} args={[geometries.hair, undefined, n]} frustumCulled={false}>
        <meshStandardMaterial roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={arms} args={[geometries.arm, undefined, n * 2]} frustumCulled={false}>
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
    </group>
  )
}
