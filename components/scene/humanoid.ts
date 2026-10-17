import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"

/**
 * Humanoide low-poly estilo PS2: piezas facetadas con pocas caras, unidas por un
 * esqueleto simple (FK). Lo usan tanto el DJ como el público, así se ven iguales.
 * Coordenadas locales: mira hacia +z, izquierda del personaje = +x, pies en y = 0.
 */

// ---------------------------------------------------------------------------
// Geometría

/** [y, radioX, radioZ, offsetZ?] */
type Ring = [number, number, number, number?]

/**
 * Malla tipo "torno" con sección elíptica. La cara frontal (+z) cae justo en el
 * centro de un facet y en u = 0.5, para pintar caras/remeras en la textura.
 */
function ringGeometry(input: Ring[], radial: number): THREE.BufferGeometry {
  const rings = input[0][0] > input[input.length - 1][0] ? [...input].reverse() : input
  const yMin = rings[0][0]
  const yMax = rings[rings.length - 1][0]
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  const stride = radial + 1

  for (const [y, rx, rz, oz = 0] of rings) {
    for (let j = 0; j <= radial; j++) {
      const theta = Math.PI + ((j + 0.5) / radial) * Math.PI * 2
      pos.push(rx * Math.sin(theta), y, oz + rz * Math.cos(theta))
      uv.push((j + 0.5) / radial, (y - yMin) / (yMax - yMin || 1))
    }
  }
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * stride + j
      const b = (i + 1) * stride + j
      idx.push(a, a + 1, b, a + 1, b + 1, b)
    }
  }
  // Tapas
  const addCap = (ringIndex: number, top: boolean) => {
    const [y, , , oz = 0] = rings[ringIndex]
    const c = pos.length / 3
    pos.push(0, y, oz)
    uv.push(0.5, top ? 1 : 0)
    for (let j = 0; j < radial; j++) {
      const a = ringIndex * stride + j
      if (top) idx.push(c, a, a + 1)
      else idx.push(c, a + 1, a)
    }
  }
  addCap(0, false)
  addCap(rings.length - 1, true)

  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

function mutateVertices(g: THREE.BufferGeometry, fn: (v: THREE.Vector3) => void) {
  const p = g.attributes.position as THREE.BufferAttribute
  const v = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i)
    fn(v)
    p.setXYZ(i, v.x, v.y, v.z)
  }
  g.computeVertexNormals()
  return g
}

function merge(parts: THREE.BufferGeometry[]) {
  const flat = parts.map((p) => {
    const g = p.index ? p.toNonIndexed() : p
    g.deleteAttribute("normal")
    return g
  })
  const out = mergeGeometries(flat)!
  out.computeVertexNormals()
  return out
}

// Medidas del esqueleto
export const BONES = {
  ankleHeight: 0.075,
  thigh: 0.44,
  shin: 0.42,
  hipOffset: { x: 0.09, y: -0.05 },
  spine: 0.08,
  neck: 0.44,
  shoulder: { x: 0.2, y: 0.39 },
  upperArm: 0.29,
  forearm: 0.26,
}

export type HairStyle = "short" | "long" | "cap" | "bun"

export function createBodyGeometries() {
  const pelvis = ringGeometry(
    [
      [-0.11, 0.13, 0.09],
      [-0.02, 0.155, 0.1],
      [0.08, 0.145, 0.096],
    ],
    8,
  )
  const torso = ringGeometry(
    [
      [0, 0.142, 0.095],
      [0.12, 0.148, 0.1],
      [0.24, 0.168, 0.11, 0.006],
      [0.32, 0.19, 0.115, 0.01],
      [0.39, 0.2, 0.105],
      [0.43, 0.13, 0.08],
      [0.455, 0.05, 0.05],
    ],
    8,
  )
  const head = ringGeometry(
    [
      [0, 0.045, 0.045],
      [0.06, 0.048, 0.05],
      [0.085, 0.064, 0.07, 0.016],
      [0.12, 0.08, 0.09, 0.012],
      [0.17, 0.088, 0.098, 0.005],
      [0.215, 0.09, 0.1],
      [0.26, 0.087, 0.097, -0.005],
      [0.3, 0.07, 0.08, -0.008],
      [0.33, 0.04, 0.05, -0.01],
      [0.34, 0.012, 0.015, -0.01],
    ],
    10,
  )
  const upperArm = ringGeometry(
    [
      [0.03, 0.05, 0.05],
      [-0.05, 0.053, 0.051],
      [-0.29, 0.04, 0.04],
    ],
    6,
  )
  const forearm = ringGeometry(
    [
      [0.01, 0.04, 0.04],
      [-0.08, 0.043, 0.04],
      [-0.26, 0.03, 0.028],
    ],
    6,
  )
  // Mano tipo mitón, con un pulgar en bloque
  const palm = mutateVertices(new THREE.BoxGeometry(0.07, 0.1, 0.035).translate(0, -0.06, 0), (v) => {
    if (v.y < -0.09) v.x *= 0.8
  })
  const thumb = new THREE.BoxGeometry(0.022, 0.05, 0.024).translate(0, -0.04, 0.02).rotateZ(0.1)
  const hand = merge([palm, thumb])

  const thigh = ringGeometry(
    [
      [0.03, 0.078, 0.08],
      [-0.05, 0.086, 0.088],
      [-0.25, 0.07, 0.072],
      [-0.44, 0.052, 0.055],
    ],
    7,
  )
  const shin = ringGeometry(
    [
      [0.01, 0.052, 0.055],
      [-0.1, 0.058, 0.062, -0.008],
      [-0.3, 0.042, 0.045],
      [-0.42, 0.036, 0.038],
    ],
    7,
  )
  const shoe = mutateVertices(new THREE.BoxGeometry(0.1, 0.075, 0.26).translate(0, -0.04, 0.055), (v) => {
    if (v.z > 0.1 && v.y > -0.04) v.y -= 0.035
    if (v.z > 0.1) v.x *= 0.85
  })

  return { pelvis, torso, head, upperArm, forearm, hand, thigh, shin, shoe }
}

/** Pelo como cáscara sobre la cabeza, inclinada hacia atrás para dejar la frente libre. */
function hairShell(lowY: number, tilt: number, puff = 1) {
  return ringGeometry(
    [
      [lowY, 0.096 * puff, 0.106 * puff, -0.004],
      [0.25, 0.097 * puff, 0.107 * puff, -0.008],
      [0.3, 0.08 * puff, 0.09 * puff, -0.012],
      [0.335, 0.05 * puff, 0.06 * puff, -0.014],
      [0.355, 0.012, 0.015, -0.014],
    ],
    10,
  )
    .translate(0, -0.22, 0)
    .rotateX(-tilt)
    .translate(0, 0.22, 0)
}

export function createHairGeometry(style: HairStyle): THREE.BufferGeometry {
  switch (style) {
    case "short":
      return hairShell(0.2, 0.32)
    case "long": {
      const back = mutateVertices(new THREE.BoxGeometry(0.2, 0.3, 0.05, 1, 2, 1).translate(0, 0.13, -0.085), (v) => {
        if (v.y < 0.05) v.x *= 0.85
      })
      return merge([hairShell(0.19, 0.25, 1.03), back])
    }
    case "cap": {
      const brim = new THREE.BoxGeometry(0.17, 0.014, 0.11).translate(0, 0.0, 0.05).rotateX(-0.12).translate(0, 0.265, 0.07)
      return merge([hairShell(0.235, 0.12, 1.04), brim])
    }
    case "bun": {
      const bun = new THREE.IcosahedronGeometry(0.052, 0).translate(0, 0.33, -0.07)
      return merge([hairShell(0.2, 0.3), bun])
    }
  }
}

// ---------------------------------------------------------------------------
// Texturas (blancas: el color de piel / ropa lo pone el tinte de cada instancia)

function canvas(size: number) {
  const c = document.createElement("canvas")
  c.width = c.height = size
  return [c, c.getContext("2d")!] as const
}

function finishTexture(c: HTMLCanvasElement) {
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function createFaceTexture() {
  const S = 256
  const [c, ctx] = canvas(S)
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, S, S)
  const cx = S / 2
  // La altura en la textura sigue la altura de la cabeza (0..0.34 m)
  const yAt = (h: number) => (1 - h / 0.34) * S

  // Sombra suave del costado y de la nuca
  const side = ctx.createLinearGradient(0, 0, S, 0)
  side.addColorStop(0, "rgba(0,0,0,0.12)")
  side.addColorStop(0.35, "rgba(0,0,0,0)")
  side.addColorStop(0.65, "rgba(0,0,0,0)")
  side.addColorStop(1, "rgba(0,0,0,0.12)")
  ctx.fillStyle = side
  ctx.fillRect(0, 0, S, S)

  // Cejas
  ctx.fillStyle = "#2a1c14"
  ctx.fillRect(cx - 27, yAt(0.243), 17, 4)
  ctx.fillRect(cx + 10, yAt(0.243), 17, 4)
  // Ojos
  for (const dx of [-18, 18]) {
    ctx.fillStyle = "#f4f1ea"
    ctx.fillRect(cx + dx - 7, yAt(0.222), 14, 7)
    ctx.fillStyle = "#1a1310"
    ctx.fillRect(cx + dx - 3, yAt(0.222), 7, 7)
  }
  // Nariz
  ctx.fillStyle = "rgba(90,40,25,0.28)"
  ctx.fillRect(cx - 4, yAt(0.2), 8, 22)
  ctx.fillStyle = "rgba(60,25,15,0.4)"
  ctx.fillRect(cx - 7, yAt(0.155), 14, 4)
  // Boca
  ctx.fillStyle = "#7a3a30"
  ctx.fillRect(cx - 12, yAt(0.125), 24, 4)
  ctx.fillStyle = "rgba(120,50,40,0.35)"
  ctx.fillRect(cx - 9, yAt(0.115), 18, 3)
  // Orejas (a los costados de la cara)
  ctx.fillStyle = "rgba(90,40,25,0.25)"
  for (const x of [S * 0.25, S * 0.75]) ctx.fillRect(x - 6, yAt(0.23), 12, 26)

  return finishTexture(c)
}

export function createShirtTexture() {
  const S = 128
  const [c, ctx] = canvas(S)
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, S, S)
  // Pliegues verticales
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.03 + (i % 3) * 0.015})`
    ctx.fillRect(i * 15 + 3, 10, 3, S - 30)
  }
  // Dobladillo y cuello
  ctx.fillStyle = "rgba(0,0,0,0.22)"
  ctx.fillRect(0, S - 8, S, 8)
  ctx.fillStyle = "rgba(0,0,0,0.35)"
  ctx.fillRect(0, 0, S, 5)
  ctx.fillRect(S / 2 - 12, 5, 24, 6)
  return finishTexture(c)
}

// ---------------------------------------------------------------------------
// Esqueleto

export const PART = {
  pelvis: 0,
  torso: 1,
  head: 2,
  upperArmL: 3,
  forearmL: 4,
  handL: 5,
  upperArmR: 6,
  forearmR: 7,
  handR: 8,
  thighL: 9,
  shinL: 10,
  shoeL: 11,
  thighR: 12,
  shinR: 13,
  shoeR: 14,
} as const
export const PART_COUNT = 15

/** Ángulos de cada articulación (radianes). Los tobillos se nivelan solos para apoyar los pies. */
export class Pose {
  pelvis = new THREE.Euler()
  spine = new THREE.Euler()
  neck = new THREE.Euler()
  shoulderL = new THREE.Euler()
  elbowL = new THREE.Euler()
  shoulderR = new THREE.Euler()
  elbowR = new THREE.Euler()
  hipL = new THREE.Euler()
  kneeL = new THREE.Euler()
  hipR = new THREE.Euler()
  kneeR = new THREE.Euler()
}

const _q = new THREE.Quaternion()
const _v = new THREE.Vector3()
const _one = new THREE.Vector3(1, 1, 1)
const _local = new THREE.Matrix4()
const _ankle = new THREE.Euler()

function link(out: THREE.Matrix4, parent: THREE.Matrix4, x: number, y: number, z: number, rot: THREE.Euler) {
  _local.compose(_v.set(x, y, z), _q.setFromEuler(rot), _one)
  return out.multiplyMatrices(parent, _local)
}

/** Calcula la matriz de cada pieza a partir de la pose. `out` debe tener PART_COUNT matrices. */
export function solvePose(body: THREE.Matrix4, pose: Pose, out: THREE.Matrix4[]) {
  const B = BONES
  // Altura de cadera según cuánto se doblan las rodillas, así los pies quedan en el piso.
  const legHeight = (hip: THREE.Euler, knee: THREE.Euler) =>
    B.thigh * Math.cos(hip.x) * Math.cos(hip.z) + B.shin * Math.cos(hip.x + knee.x) * Math.cos(hip.z)
  const pelvisY = B.ankleHeight + Math.max(legHeight(pose.hipL, pose.kneeL), legHeight(pose.hipR, pose.kneeR)) - B.hipOffset.y

  const pelvis = link(out[PART.pelvis], body, 0, pelvisY, 0, pose.pelvis)
  const torso = link(out[PART.torso], pelvis, 0, B.spine, 0, pose.spine)
  link(out[PART.head], torso, 0, B.neck, 0, pose.neck)

  for (const side of [1, -1] as const) {
    const L = side === 1
    const shoulder = link(out[L ? PART.upperArmL : PART.upperArmR], torso, side * B.shoulder.x, B.shoulder.y, 0, L ? pose.shoulderL : pose.shoulderR)
    const forearm = link(out[L ? PART.forearmL : PART.forearmR], shoulder, 0, -B.upperArm, 0, L ? pose.elbowL : pose.elbowR)
    link(out[L ? PART.handL : PART.handR], forearm, 0, -B.forearm, 0, _ankle.set(0, 0, 0))

    const hip = L ? pose.hipL : pose.hipR
    const knee = L ? pose.kneeL : pose.kneeR
    const thigh = link(out[L ? PART.thighL : PART.thighR], pelvis, side * B.hipOffset.x, B.hipOffset.y, 0, hip)
    const shin = link(out[L ? PART.shinL : PART.shinR], thigh, 0, -B.thigh, 0, knee)
    // El pie compensa la inclinación de la pierna y de la cadera.
    link(out[L ? PART.shoeL : PART.shoeR], shin, 0, -B.shin, 0, _ankle.set(-(hip.x + knee.x + pose.pelvis.x), 0, -hip.z))
  }
  return out
}

export function createPartMatrices() {
  return Array.from({ length: PART_COUNT }, () => new THREE.Matrix4())
}
