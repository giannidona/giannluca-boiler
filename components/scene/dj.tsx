"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { RoundedBox } from "@react-three/drei"
import * as THREE from "three"
import { audioBus } from "@/lib/audio-bus"
import { TABLE } from "./dj-booth"

/** Look del DJ. Cambiá estos valores para que se parezca más a vos. */
export const DJ_LOOK = {
  skin: "#d9a882",
  hair: "#2b1d14",
  shirt: "#111111",
  pants: "#1f2433",
  shoes: "#e9e9e9",
  headphones: "#1a1a1a",
  accent: "#ff708c",
}

const SHOULDER_Y = 1.43
const SHOULDER_X = 0.23
const UPPER_ARM = 0.29
const FOREARM = 0.27

function Limb({ length, radius, color }: { length: number; radius: number; color: string }) {
  return (
    <mesh position={[0, -length / 2, 0]}>
      <capsuleGeometry args={[radius, length - radius * 2, 6, 12]} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  )
}

function Headphones() {
  return (
    <group>
      <mesh rotation-z={Math.PI / 2} rotation-y={Math.PI / 2}>
        <torusGeometry args={[0.135, 0.014, 8, 24, Math.PI]} />
        <meshStandardMaterial color={DJ_LOOK.headphones} metalness={0.4} roughness={0.5} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.135, -0.01, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.055, 0.055, 0.04, 20]} />
          <meshStandardMaterial color={DJ_LOOK.headphones} metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

export function Dj() {
  const root = useRef<THREE.Group>(null)
  const torso = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const mixArm = useRef<THREE.Group>(null)
  const mixElbow = useRef<THREE.Group>(null)
  const cueArm = useRef<THREE.Group>(null)
  const cueElbow = useRef<THREE.Group>(null)

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const { kick, bass } = audioBus
    const groove = Math.sin(t * 2 * Math.PI * (122 / 60))

    if (root.current) {
      // Rebote de rodillas + leve balanceo de cadera
      root.current.position.y = -0.025 * kick - 0.012 * (groove + 1)
      root.current.rotation.y = Math.sin(t * 0.6) * 0.12
    }
    if (torso.current) {
      torso.current.rotation.x = 0.16 + kick * 0.05
      torso.current.rotation.z = Math.sin(t * 1.3) * 0.03
    }
    if (head.current) {
      head.current.rotation.x = 0.12 + kick * 0.28 + bass * 0.05
      head.current.rotation.y = Math.sin(t * 0.45) * 0.25
    }

    // Brazo que trabaja en la mesa: va y viene entre las bandejas y el mixer.
    const reach = Math.sin(t * 0.35) * 0.5 + Math.sin(t * 1.7) * 0.05
    if (mixArm.current) {
      mixArm.current.rotation.x = -1.05 + Math.sin(t * 3.1) * 0.04
      mixArm.current.rotation.z = -0.15 + reach * 0.45
    }
    if (mixElbow.current) {
      mixElbow.current.rotation.x = -0.75 + Math.sin(t * 5.3) * 0.08
    }

    // Brazo que sostiene un auricular contra la oreja; cada tanto lo suelta y vuelve a la mesa.
    const cueing = THREE.MathUtils.smoothstep(Math.sin(t * 0.22), -0.2, 0.2)
    if (cueArm.current) {
      cueArm.current.rotation.x = THREE.MathUtils.lerp(-1.05, -0.35, cueing)
      cueArm.current.rotation.z = THREE.MathUtils.lerp(0.2, 2.25, cueing)
    }
    if (cueElbow.current) {
      cueElbow.current.rotation.x = THREE.MathUtils.lerp(-0.7, 0, cueing)
      cueElbow.current.rotation.z = THREE.MathUtils.lerp(0, 2.2, cueing)
    }
  })

  return (
    <group position={[0, 0, TABLE.z - TABLE.depth / 2 - 0.32]}>
      <group ref={root}>
        {/* Piernas */}
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.1, 0.9, 0]}>
            <Limb length={0.86} radius={0.075} color={DJ_LOOK.pants} />
            <mesh position={[0, -0.86, 0.05]}>
              <boxGeometry args={[0.11, 0.07, 0.26]} />
              <meshStandardMaterial color={DJ_LOOK.shoes} roughness={0.6} />
            </mesh>
          </group>
        ))}

        <group ref={torso} position={[0, 0.92, 0]}>
          {/* Torso (las coordenadas internas son relativas a la cadera) */}
          <RoundedBox args={[0.44, 0.58, 0.24]} radius={0.08} position={[0, 0.29, 0]}>
            <meshStandardMaterial color={DJ_LOOK.shirt} roughness={0.9} />
          </RoundedBox>
          {/* Logo en la remera */}
          <mesh position={[0, 0.36, 0.121]}>
            <circleGeometry args={[0.05, 24]} />
            <meshBasicMaterial color={DJ_LOOK.accent} toneMapped={false} />
          </mesh>

          {/* Cuello y cabeza */}
          <mesh position={[0, 0.62, 0]}>
            <cylinderGeometry args={[0.05, 0.055, 0.1, 12]} />
            <meshStandardMaterial color={DJ_LOOK.skin} roughness={0.7} />
          </mesh>
          <group ref={head} position={[0, 0.68, 0]}>
            <mesh position={[0, 0.1, 0]} scale={[1, 1.12, 1.02]}>
              <sphereGeometry args={[0.115, 32, 24]} />
              <meshStandardMaterial color={DJ_LOOK.skin} roughness={0.65} />
            </mesh>
            {/* Pelo */}
            <mesh position={[0, 0.14, -0.012]} scale={[1.06, 1.0, 1.08]}>
              <sphereGeometry args={[0.118, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
              <meshStandardMaterial color={DJ_LOOK.hair} roughness={0.9} />
            </mesh>
            {/* Nariz y ojos para que se note hacia dónde mira */}
            <mesh position={[0, 0.08, 0.115]}>
              <sphereGeometry args={[0.018, 12, 8]} />
              <meshStandardMaterial color={DJ_LOOK.skin} roughness={0.7} />
            </mesh>
            {[-0.04, 0.04].map((x) => (
              <mesh key={x} position={[x, 0.12, 0.103]}>
                <sphereGeometry args={[0.012, 10, 8]} />
                <meshStandardMaterial color="#141010" roughness={0.3} />
              </mesh>
            ))}
            <group position={[0, 0.11, 0]}>
              <Headphones />
            </group>
          </group>

          {/* Brazo derecho del DJ (izquierda en cámara): en la mesa */}
          <group ref={mixArm} position={[-SHOULDER_X, SHOULDER_Y - 0.92, 0]}>
            <Limb length={UPPER_ARM} radius={0.055} color={DJ_LOOK.shirt} />
            <group ref={mixElbow} position={[0, -UPPER_ARM, 0]}>
              <Limb length={FOREARM} radius={0.045} color={DJ_LOOK.skin} />
              <mesh position={[0, -FOREARM - 0.03, 0]}>
                <sphereGeometry args={[0.045, 12, 10]} />
                <meshStandardMaterial color={DJ_LOOK.skin} roughness={0.7} />
              </mesh>
            </group>
          </group>

          {/* Brazo izquierdo del DJ: auricular en la oreja */}
          <group ref={cueArm} position={[SHOULDER_X, SHOULDER_Y - 0.92, 0]}>
            <Limb length={UPPER_ARM} radius={0.055} color={DJ_LOOK.shirt} />
            <group ref={cueElbow} position={[0, -UPPER_ARM, 0]}>
              <Limb length={FOREARM} radius={0.045} color={DJ_LOOK.skin} />
              <mesh position={[0, -FOREARM - 0.03, 0]}>
                <sphereGeometry args={[0.045, 12, 10]} />
                <meshStandardMaterial color={DJ_LOOK.skin} roughness={0.7} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}
