"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { audioBus } from "@/lib/audio-bus"
import { TABLE } from "./dj-booth"
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

/** Look del DJ. Cambiá estos valores para que se parezca más a vos. */
export const DJ_LOOK = {
  skin: "#d9a882",
  hair: "#2b1d14",
  hairStyle: "short" as HairStyle,
  shirt: "#111111",
  longSleeves: false,
  pants: "#1f2433",
  shoes: "#e9e9e9",
  headphones: "#1a1a1a",
  accent: "#ff708c",
}

function partColor(part: number): string {
  switch (part) {
    case PART.head:
    case PART.handL:
    case PART.handR:
      return DJ_LOOK.skin
    case PART.torso:
    case PART.upperArmL:
    case PART.upperArmR:
      return DJ_LOOK.shirt
    case PART.forearmL:
    case PART.forearmR:
      return DJ_LOOK.longSleeves ? DJ_LOOK.shirt : DJ_LOOK.skin
    case PART.shoeL:
    case PART.shoeR:
      return DJ_LOOK.shoes
    default:
      return DJ_LOOK.pants
  }
}

function Headphones() {
  return (
    <group position={[0, 0.215, -0.005]}>
      <mesh>
        <torusGeometry args={[0.128, 0.013, 4, 10, Math.PI]} />
        <meshStandardMaterial color={DJ_LOOK.headphones} flatShading roughness={0.5} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.12, -0.01, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.052, 0.052, 0.04, 8]} />
          <meshStandardMaterial color={DJ_LOOK.headphones} flatShading roughness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

export function Dj() {
  const parts = useRef<(THREE.Group | null)[]>([])
  const assets = useMemo(() => {
    const geo = createBodyGeometries()
    return {
      geometryFor: [
        geo.pelvis, geo.torso, geo.head,
        geo.upperArm, geo.forearm, geo.hand, geo.upperArm, geo.forearm, geo.hand,
        geo.thigh, geo.shin, geo.shoe, geo.thigh, geo.shin, geo.shoe,
      ],
      face: createFaceTexture(),
      shirt: createShirtTexture(),
      hair: createHairGeometry(DJ_LOOK.hairStyle),
    }
  }, [])
  const scratch = useMemo(() => ({ pose: new Pose(), out: createPartMatrices(), root: new THREE.Matrix4() }), [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const { kick, bass } = audioBus
    const beat = (t * 122) / 60
    const groove = Math.abs(Math.sin(beat * Math.PI))
    const { pose, out, root } = scratch

    // Rebote de rodillas, inclinado sobre los equipos
    const bend = 0.12 + groove * 0.1 + kick * 0.06
    pose.hipL.set(-bend - 0.1, 0, 0.07)
    pose.kneeL.set(bend * 2, 0, 0)
    pose.hipR.set(-bend - 0.1, 0, -0.07)
    pose.kneeR.set(bend * 2, 0, 0)
    pose.pelvis.set(0.1, Math.sin(t * 0.6) * 0.12, 0)
    pose.spine.set(0.18 + kick * 0.05, Math.sin(t * 0.6) * 0.06, Math.sin(t * 1.3) * 0.03)
    pose.neck.set(0.1 + kick * 0.3 + bass * 0.05 + groove * 0.12, Math.sin(t * 0.45) * 0.25, 0)

    // Brazo derecho (izquierda en cámara): va y viene entre las bandejas y el mixer.
    const reach = Math.sin(t * 0.35) * 0.5 + Math.sin(t * 1.7) * 0.05
    pose.shoulderR.set(-0.95 + Math.sin(t * 3.1) * 0.04, 0, -0.12 + reach * 0.45)
    pose.elbowR.set(-0.85 + Math.sin(t * 5.3) * 0.08, 0, 0)

    // Brazo izquierdo: auricular contra la oreja; cada tanto lo suelta y vuelve a la mesa.
    const cueing = THREE.MathUtils.smoothstep(Math.sin(t * 0.22), -0.2, 0.2)
    pose.shoulderL.set(THREE.MathUtils.lerp(-0.95, -0.35, cueing), 0, THREE.MathUtils.lerp(0.15, 2.25, cueing))
    pose.elbowL.set(THREE.MathUtils.lerp(-0.85, 0, cueing), 0, THREE.MathUtils.lerp(0, 2.2, cueing))

    solvePose(root, pose, out)
    for (let i = 0; i < PART_COUNT; i++) parts.current[i]?.matrix.copy(out[i])
  })

  return (
    <group position={[0, 0, TABLE.z - TABLE.depth / 2 - 0.36]}>
      {assets.geometryFor.map((geometry, part) => (
        <group
          key={part}
          matrixAutoUpdate={false}
          ref={(el) => {
            parts.current[part] = el
          }}
        >
          <mesh geometry={geometry}>
            <meshStandardMaterial
              color={partColor(part)}
              map={part === PART.head ? assets.face : part === PART.torso ? assets.shirt : null}
              flatShading
              roughness={0.8}
            />
          </mesh>
          {part === PART.head && (
            <>
              <mesh geometry={assets.hair}>
                <meshStandardMaterial color={DJ_LOOK.hair} flatShading roughness={0.9} />
              </mesh>
              <Headphones />
            </>
          )}
          {part === PART.torso && (
            // Logo en el pecho
            <mesh position={[0, 0.3, 0.118]}>
              <circleGeometry args={[0.045, 8]} />
              <meshBasicMaterial color={DJ_LOOK.accent} toneMapped={false} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  )
}
