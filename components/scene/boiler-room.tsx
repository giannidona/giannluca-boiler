"use client"

import { useEffect, useRef } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing"
import * as THREE from "three"
import { audioBus } from "@/lib/audio-bus"
import { Room } from "./room"
import { DjBooth } from "./dj-booth"
import { Dj } from "./dj"
import { People } from "./people"
import { PlayerController } from "./player-controller"
import { Nameplates } from "./nameplates"

const BG = "#0a0607"
const DJ_TARGET: [number, number, number] = [0, 1.25, -0.6]
const BOILER_CAM: [number, number, number] = [0, 1.85, 4.6]

/** Una sola lectura del analizador por frame; el resto de la escena lee `audioBus`. */
function AudioDriver() {
  useFrame(({ clock }, dt) => audioBus.update(Math.min(dt, 0.1), clock.elapsedTime))
  return null
}

function StageLights() {
  const key = useRef<THREE.SpotLight>(null)
  const pink = useRef<THREE.SpotLight>(null)
  const blue = useRef<THREE.SpotLight>(null)
  const strobe = useRef<THREE.PointLight>(null)
  const { scene } = useThree()

  useEffect(() => {
    // Todos los spots apuntan al DJ.
    const target = new THREE.Object3D()
    target.position.set(...DJ_TARGET)
    scene.add(target)
    for (const l of [key.current, pink.current, blue.current]) if (l) l.target = target
    return () => {
      scene.remove(target)
    }
  }, [scene])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const { kick, bass } = audioBus
    if (pink.current) {
      pink.current.intensity = 30 + kick * 60
      pink.current.position.x = -3.5 + Math.sin(t * 0.4) * 1.2
    }
    if (blue.current) {
      blue.current.intensity = 25 + bass * 45
      blue.current.position.x = 3.5 + Math.cos(t * 0.33) * 1.2
    }
    if (strobe.current) strobe.current.intensity = kick > 0.85 ? 6 : 0.4 + bass * 2
  })

  return (
    <>
      <ambientLight intensity={0.25} color="#ffd9c7" />
      <hemisphereLight args={["#ff9fb2", "#0b0607", 0.35]} />
      {/* Luz principal de cámara: cálida y frontal, como la del celular/cámara de un Boiler */}
      <spotLight ref={key} position={[0.5, 3.4, 3.6]} angle={0.45} penumbra={0.8} intensity={45} color="#ffe4cc" distance={12} decay={1.6} />
      <spotLight ref={pink} position={[-3.5, 4, -4]} angle={0.6} penumbra={0.6} color="#ff4d7d" distance={14} decay={1.4} />
      <spotLight ref={blue} position={[3.5, 4, -4]} angle={0.6} penumbra={0.6} color="#4d7dff" distance={14} decay={1.4} />
      <pointLight ref={strobe} position={[0, 3.8, -4.5]} color="#ffffff" distance={10} decay={1.5} />
      <pointLight position={[-5, 2.5, -7]} color="#ff2f5f" intensity={6} distance={8} decay={1.5} />
      <pointLight position={[5, 2.5, -7]} color="#7a3dff" intensity={6} distance={8} decay={1.5} />
    </>
  )
}

/** Al volver a la vista Boiler, la cámara regresa a su lugar clásico frente a la cabina. */
function BoilerCamReset() {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.set(...BOILER_CAM)
    camera.lookAt(...DJ_TARGET)
  }, [camera])
  return null
}

/** Ajusta el encuadre en pantallas verticales para que el DJ no quede cortado. */
function ResponsiveCamera() {
  const { camera, size } = useThree()
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    const portrait = size.width < size.height
    cam.fov = portrait ? 62 : 42
    cam.updateProjectionMatrix()
  }, [camera, size])
  return null
}

export default function BoilerRoom({ follow, joined }: { follow: boolean; joined: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: BOILER_CAM, fov: 42, near: 0.1, far: 40 }}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.1
      }}
    >
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 7, 17]} />

      <AudioDriver />
      <ResponsiveCamera />
      <StageLights />
      <Room />
      <DjBooth />
      <Dj />
      <People />
      <Nameplates showOwn={joined} />
      <PlayerController follow={follow} />

      {!follow && <BoilerCamReset />}
      {!follow && (
        <OrbitControls
          makeDefault
          target={DJ_TARGET}
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          minDistance={2.2}
          maxDistance={6}
          minPolarAngle={Math.PI * 0.3}
          maxPolarAngle={Math.PI * 0.53}
          minAzimuthAngle={-Math.PI * 0.22}
          maxAzimuthAngle={Math.PI * 0.22}
          rotateSpeed={0.6}
        />
      )}

      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur luminanceThreshold={0.85} luminanceSmoothing={0.2} intensity={0.9} />
        <Noise opacity={0.06} />
        <Vignette offset={0.25} darkness={0.75} />
      </EffectComposer>
    </Canvas>
  )
}
