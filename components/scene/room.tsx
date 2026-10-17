"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { audioBus } from "@/lib/audio-bus"
import { brickTexture, concreteTexture, textTexture } from "./textures"

export const ROOM = { width: 14, depth: 15, height: 4.4, front: 6, back: -9 }

const PIPE_COLOR = "#8a5a3c"

function Pipe({ from, to, radius = 0.06 }: { from: [number, number, number]; to: [number, number, number]; radius?: number }) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...from)
    const b = new THREE.Vector3(...to)
    const dir = b.clone().sub(a)
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
    return { position: a.add(b).multiplyScalar(0.5), quaternion: q, length: dir.length() }
  }, [from, to])
  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[radius, radius, length, 12]} />
      <meshStandardMaterial color={PIPE_COLOR} metalness={0.8} roughness={0.35} />
    </mesh>
  )
}

function NeonSign() {
  const material = useRef<THREE.MeshBasicMaterial>(null)
  const texture = useMemo(
    () =>
      textTexture({
        width: 1024,
        height: 256,
        glow: "#ff3d6e",
        lines: [
          { text: "GIANNLUCA'S BOILER", size: 104, weight: 800, color: "#ffd1dc", letterSpacing: 6 },
        ],
      }),
    [],
  )
  useFrame(() => {
    if (!material.current) return
    // Parpadea apenas con el bombo.
    const k = 1.6 + audioBus.kick * 1.2
    material.current.color.setRGB(k, k * 0.55, k * 0.7)
  })
  return (
    <mesh position={[0, 3.35, ROOM.back + 0.06]}>
      <planeGeometry args={[6, 1.5]} />
      <meshBasicMaterial ref={material} map={texture} transparent toneMapped={false} />
    </mesh>
  )
}

export function Room() {
  const { width, height, front, back } = ROOM
  const depth = front - back
  const backWall = useMemo(() => brickTexture(width / 2.2, height / 2.2), [width, height])
  const sideWall = useMemo(() => brickTexture(depth / 2.2, height / 2.2), [depth, height])
  const floor = useMemo(() => concreteTexture(6), [])

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, (front + back) / 2]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial map={floor} roughness={0.85} metalness={0.05} />
      </mesh>

      <mesh rotation-x={Math.PI / 2} position={[0, height, (front + back) / 2]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#0d0b0b" roughness={1} />
      </mesh>

      <mesh position={[0, height / 2, back]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial map={backWall} roughness={0.95} />
      </mesh>
      <mesh position={[-width / 2, height / 2, (front + back) / 2]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[depth, height]} />
        <meshStandardMaterial map={sideWall} roughness={0.95} />
      </mesh>
      <mesh position={[width / 2, height / 2, (front + back) / 2]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[depth, height]} />
        <meshStandardMaterial map={sideWall} roughness={0.95} />
      </mesh>

      <NeonSign />

      {/* Cañerías de caldera: el guiño al nombre */}
      <Pipe from={[-width / 2 + 0.2, 4.05, back + 0.25]} to={[width / 2 - 0.2, 4.05, back + 0.25]} radius={0.09} />
      <Pipe from={[-width / 2 + 0.2, 3.85, back + 0.45]} to={[width / 2 - 0.2, 3.85, back + 0.45]} />
      <Pipe from={[-width / 2 + 0.25, 4.05, back + 0.25]} to={[-width / 2 + 0.25, 0, back + 0.25]} radius={0.09} />
      <Pipe from={[width / 2 - 0.25, 3.85, back + 0.45]} to={[width / 2 - 0.25, 0, back + 0.45]} />
      <Pipe from={[-width / 2 + 0.25, 4.1, back + 0.3]} to={[-width / 2 + 0.25, 4.1, front - 0.5]} radius={0.08} />
      <Pipe from={[width / 2 - 0.25, 4.1, back + 0.3]} to={[width / 2 - 0.25, 4.1, front - 0.5]} radius={0.08} />
      <Pipe from={[-3, 4.25, back + 0.3]} to={[-3, 4.25, front - 0.5]} radius={0.05} />
      <Pipe from={[3, 4.25, back + 0.3]} to={[3, 4.25, front - 0.5]} radius={0.05} />
    </group>
  )
}
