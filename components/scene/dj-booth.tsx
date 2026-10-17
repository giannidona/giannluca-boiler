"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { RoundedBox } from "@react-three/drei"
import * as THREE from "three"
import { audioBus } from "@/lib/audio-bus"
import { textTexture } from "./textures"

export const TABLE = { width: 2.2, depth: 0.8, height: 0.95, z: 0 }

const METAL = "#1b1b1d"
const PLASTIC = "#0f0f10"

function Cdj({ position, speed }: { position: [number, number, number]; speed: number }) {
  const jog = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (jog.current) jog.current.rotation.y -= dt * speed
  })
  return (
    <group position={position}>
      <RoundedBox args={[0.34, 0.08, 0.44]} radius={0.012} position={[0, 0.04, 0]}>
        <meshStandardMaterial color={METAL} metalness={0.5} roughness={0.45} />
      </RoundedBox>
      {/* Pantalla */}
      <mesh position={[0, 0.082, -0.15]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.2, 0.08]} />
        <meshBasicMaterial color="#5fb6ff" toneMapped={false} />
      </mesh>
      {/* Jog wheel */}
      <group ref={jog} position={[0, 0.09, 0.04]}>
        <mesh>
          <cylinderGeometry args={[0.11, 0.11, 0.02, 40]} />
          <meshStandardMaterial color="#2a2a2e" metalness={0.8} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.011, 0]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.095, 0.105, 40]} />
          <meshBasicMaterial color="#ff708c" toneMapped={false} />
        </mesh>
        <mesh position={[0.07, 0.012, 0]}>
          <boxGeometry args={[0.03, 0.004, 0.008]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>
      {/* Play / cue */}
      <mesh position={[-0.12, 0.085, 0.17]}>
        <cylinderGeometry args={[0.02, 0.02, 0.01, 16]} />
        <meshBasicMaterial color="#3dff7a" toneMapped={false} />
      </mesh>
      <mesh position={[-0.12, 0.085, 0.12]}>
        <cylinderGeometry args={[0.02, 0.02, 0.01, 16]} />
        <meshBasicMaterial color="#ffb02e" toneMapped={false} />
      </mesh>
    </group>
  )
}

const LED_COUNT = 10

function Mixer({ position }: { position: [number, number, number] }) {
  const leds = useRef<THREE.MeshBasicMaterial[]>([])
  const ledColors = useMemo(
    () =>
      Array.from({ length: LED_COUNT }, (_, i) =>
        new THREE.Color(i < 6 ? "#3dff7a" : i < 8 ? "#ffd02e" : "#ff3b3b"),
      ),
    [],
  )
  const off = useMemo(() => new THREE.Color("#1a1a1a"), [])

  useFrame(() => {
    const level = Math.min(1, audioBus.energy * 1.6 + audioBus.kick * 0.35)
    const lit = Math.round(level * LED_COUNT)
    leds.current.forEach((m, k) => {
      const i = k % LED_COUNT
      if (m) m.color.copy(i < lit ? ledColors[i] : off)
    })
  })

  const knobs: [number, number][] = []
  for (let col = 0; col < 4; col++) for (let row = 0; row < 4; row++) knobs.push([col, row])

  return (
    <group position={position}>
      <RoundedBox args={[0.32, 0.09, 0.42]} radius={0.012} position={[0, 0.045, 0]}>
        <meshStandardMaterial color={PLASTIC} metalness={0.4} roughness={0.5} />
      </RoundedBox>
      {knobs.map(([col, row]) => (
        <mesh key={`${col}-${row}`} position={[-0.105 + col * 0.07, 0.1, -0.16 + row * 0.055]}>
          <cylinderGeometry args={[0.013, 0.015, 0.02, 12]} />
          <meshStandardMaterial color={row === 3 ? "#d6d6d6" : "#444"} roughness={0.4} />
        </mesh>
      ))}
      {/* Faders */}
      {[0, 1, 2, 3].map((col) => (
        <mesh key={col} position={[-0.105 + col * 0.07, 0.097, 0.12]}>
          <boxGeometry args={[0.022, 0.018, 0.03]} />
          <meshStandardMaterial color="#e8e8e8" />
        </mesh>
      ))}
      <mesh position={[0, 0.097, 0.185]}>
        <boxGeometry args={[0.035, 0.018, 0.022]} />
        <meshStandardMaterial color="#e8e8e8" />
      </mesh>
      {/* Vúmetros */}
      {[-0.025, 0.025].map((x, m) =>
        Array.from({ length: LED_COUNT }, (_, i) => (
          <mesh key={`${m}-${i}`} position={[x, 0.092, 0.06 - i * 0.012]}>
            <boxGeometry args={[0.012, 0.004, 0.008]} />
            <meshBasicMaterial
              ref={(el) => {
                if (el) leds.current[m * LED_COUNT + i] = el
              }}
              color="#1a1a1a"
              toneMapped={false}
            />
          </mesh>
        )),
      )}
    </group>
  )
}

function Laptop({ position, rotationY }: { position: [number, number, number]; rotationY: number }) {
  // Coordenadas locales: el usuario de la laptop está hacia +z.
  return (
    <group position={position} rotation-y={rotationY}>
      {/* Soporte */}
      <mesh position={[0, 0.05, -0.02]}>
        <boxGeometry args={[0.2, 0.1, 0.16]} />
        <meshStandardMaterial color="#8d8d93" metalness={0.9} roughness={0.25} />
      </mesh>
      <group position={[0, 0.11, 0]} rotation-x={0.18}>
        <mesh>
          <boxGeometry args={[0.32, 0.012, 0.22]} />
          <meshStandardMaterial color="#b9b9bf" metalness={0.9} roughness={0.3} />
        </mesh>
        {/* Tapa con bisagra en el borde trasero */}
        <group position={[0, 0.006, -0.11]} rotation-x={-0.32}>
          <mesh position={[0, 0.105, 0]}>
            <boxGeometry args={[0.32, 0.21, 0.008]} />
            <meshStandardMaterial color="#b9b9bf" metalness={0.9} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.105, 0.0045]}>
            <planeGeometry args={[0.29, 0.18]} />
            <meshBasicMaterial color="#2b4a8a" toneMapped={false} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

function FrontBanner() {
  const texture = useMemo(
    () =>
      textTexture({
        width: 1024,
        height: 320,
        background: "#f4f1ec",
        lines: [
          { text: "GIANNLUCA'S BOILER", size: 112, weight: 900, color: "#0b0b0b", letterSpacing: 4 },
          { text: "24/7 RADIO  ·  LIVE", size: 44, weight: 600, color: "#ff3d6e", letterSpacing: 10 },
        ],
      }),
    [],
  )
  return (
    <mesh position={[0, TABLE.height * 0.55, TABLE.depth / 2 + 0.006]}>
      <planeGeometry args={[TABLE.width * 0.82, TABLE.width * 0.82 * (320 / 1024)]} />
      <meshStandardMaterial map={texture} roughness={0.8} />
    </mesh>
  )
}

export function DjBooth() {
  const { width, depth, height, z } = TABLE
  return (
    <group position={[0, 0, z]}>
      {/* Mesa con mantel negro */}
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.95} />
      </mesh>
      <mesh position={[0, height + 0.01, 0]}>
        <boxGeometry args={[width + 0.02, 0.02, depth + 0.02]} />
        <meshStandardMaterial color="#141414" roughness={0.7} />
      </mesh>
      <FrontBanner />

      <group position={[0, height + 0.02, -0.08]}>
        <Cdj position={[-0.55, 0, 0]} speed={3.2} />
        <Mixer position={[0, 0, 0]} />
        <Cdj position={[0.55, 0, 0]} speed={3.4} />
        <Laptop position={[0.93, 0, 0.05]} rotationY={Math.PI + 0.4} />
      </group>

      {/* Monitores de piso a los costados */}
      {[-1.45, 1.45].map((x) => (
        <group key={x} position={[x, 0, 0.05]} rotation-y={x < 0 ? 0.35 : -0.35}>
          <RoundedBox args={[0.5, 1.1, 0.45]} radius={0.02} position={[0, 0.55, 0]}>
            <meshStandardMaterial color="#121212" roughness={0.8} />
          </RoundedBox>
          <mesh position={[0, 0.72, 0.226]}>
            <circleGeometry args={[0.16, 32]} />
            <meshStandardMaterial color="#050505" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.32, 0.226]}>
            <circleGeometry args={[0.08, 32]} />
            <meshStandardMaterial color="#050505" roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
