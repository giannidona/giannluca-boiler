import * as THREE from "three"
import { ANIM } from "@/server/protocol"
import type { Pose } from "./humanoid"

export interface MotionInput {
  anim: number
  /** Desfase propio para que no se muevan todos sincronizados. */
  phase: number
  /** Qué tanto se suelta bailando (0.5–1.2). */
  intensity: number
  /** Fase del ciclo de pasos al caminar. */
  walkPhase: number
}

export interface Beat {
  t: number
  beat: number
  kick: number
  energy: number
}

/** Escribe en `pose` la postura de esta persona en este frame. */
export function applyMotion(pose: Pose, m: MotionInput, b: Beat) {
  if (m.anim === ANIM.walk || m.anim === ANIM.run) return walkPose(pose, m, b)
  return dancePose(pose, m, b)
}

function walkPose(pose: Pose, m: MotionInput, b: Beat) {
  const running = m.anim === ANIM.run
  const amp = running ? 0.75 : 0.5
  const s = Math.sin(m.walkPhase)
  const c = Math.cos(m.walkPhase)

  pose.hipL.set(-s * amp, 0, 0.04)
  pose.hipR.set(s * amp, 0, -0.04)
  // La rodilla se dobla mientras la pierna vuelve hacia adelante
  pose.kneeL.set(0.1 + Math.max(0, c) * (running ? 1.3 : 0.75), 0, 0)
  pose.kneeR.set(0.1 + Math.max(0, -c) * (running ? 1.3 : 0.75), 0, 0)

  pose.pelvis.set(0, s * 0.08, 0)
  pose.spine.set(running ? 0.18 : 0.06, -s * 0.1, 0)
  pose.neck.set(0.02 + b.kick * 0.08, 0, 0)

  pose.shoulderL.set(s * amp * 0.9, 0, 0.1)
  pose.elbowL.set(running ? -1.4 : -0.35, 0, 0)
  pose.shoulderR.set(-s * amp * 0.9, 0, -0.1)
  pose.elbowR.set(running ? -1.4 : -0.35, 0, 0)
}

function dancePose(pose: Pose, m: MotionInput, b: Beat) {
  const { t, beat, kick, energy } = b
  const groove = Math.abs(Math.sin(beat * Math.PI + m.phase))
  const half = Math.sin(beat * Math.PI * 0.5 + m.phase)
  const pump = Math.sin(beat * Math.PI * 2 + m.phase) * 0.5 + 0.5
  const k = m.intensity

  // Piernas: rebote de rodillas; en "sway" se pasa el peso de un pie al otro.
  const bend = 0.08 + (groove * 0.14 + kick * 0.08) * k
  const shift = m.anim === ANIM.sway ? half * 0.5 : 0
  pose.hipL.set(-bend * (1 + shift), 0, 0.06)
  pose.kneeL.set(bend * 2 * (1 + shift), 0, 0)
  pose.hipR.set(-bend * (1 - shift), 0, -0.06)
  pose.kneeR.set(bend * 2 * (1 - shift), 0, 0)

  pose.pelvis.set(0, Math.sin(t * 0.7 + m.phase) * 0.15, shift * 0.06)
  pose.spine.set(0.06 + groove * 0.08 * k, Math.sin(t * 0.9 + m.phase) * 0.1, half * 0.06 * k)
  pose.neck.set(0.05 + groove * 0.28 * k + kick * 0.12, Math.sin(t * 0.5 + m.phase) * 0.2, 0)

  // Brazos "de club": codos doblados, manos frente al pecho, al ritmo.
  const clubArm = (shoulder: THREE.Euler, elbow: THREE.Euler, side: 1 | -1, offset: number) => {
    const g = Math.abs(Math.sin(beat * Math.PI + m.phase + offset))
    // El giro en Y lleva los antebrazos hacia el centro del pecho.
    shoulder.set(-0.3 - g * 0.3 * k, -side * 0.55, side * (0.22 + g * 0.06))
    elbow.set(-1.6 + g * 0.5, 0, 0)
  }
  const armUp = (shoulder: THREE.Euler, elbow: THREE.Euler, side: 1 | -1) => {
    shoulder.set(0.1, 0, side * (2.65 + pump * 0.2 + energy * 0.15))
    elbow.set(0, 0, side * (0.25 - pump * 0.2))
  }

  switch (m.anim) {
    case ANIM.handsUp:
      armUp(pose.shoulderL, pose.elbowL, 1)
      armUp(pose.shoulderR, pose.elbowR, -1)
      break
    case ANIM.fistPump:
      clubArm(pose.shoulderL, pose.elbowL, 1, 0)
      pose.shoulderR.set(-2.55 - pump * 0.35, 0, -0.15)
      pose.elbowR.set(-0.25 - (1 - pump) * 0.6, 0, 0)
      break
    case ANIM.phone:
      // Filma al DJ con el celular
      pose.shoulderL.set(0.05, 0, 0.12)
      pose.elbowL.set(-0.2, 0, 0)
      pose.shoulderR.set(-1.25, 0, -0.1)
      pose.elbowR.set(-0.9, 0, 0)
      pose.neck.x *= 0.3
      break
    default:
      clubArm(pose.shoulderL, pose.elbowL, 1, 0)
      clubArm(pose.shoulderR, pose.elbowR, -1, Math.PI / 2)
  }
}
