import * as THREE from "three"

/** PRNG determinístico para que la sala sea igual en cada carga. */
export function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas")
  c.width = w
  c.height = h
  return [c, c.getContext("2d")!] as const
}

function toTexture(c: HTMLCanvasElement, repeatX = 1, repeatY = 1, srgb = true) {
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(repeatX, repeatY)
  tex.anisotropy = 8
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function brickTexture(repeatX: number, repeatY: number) {
  const [c, ctx] = canvas(512, 512)
  const rand = mulberry32(7)
  ctx.fillStyle = "#1c1311"
  ctx.fillRect(0, 0, 512, 512)
  const bw = 128
  const bh = 42
  for (let row = 0; row * bh < 512; row++) {
    const shift = row % 2 ? bw / 2 : 0
    for (let col = -1; col * bw < 512; col++) {
      const r = 92 + rand() * 40
      const g = 40 + rand() * 18
      const b = 30 + rand() * 14
      ctx.fillStyle = `rgb(${r},${g},${b})`
      ctx.fillRect(col * bw + shift + 3, row * bh + 3, bw - 6, bh - 6)
      // Manchas y desgaste
      for (let k = 0; k < 14; k++) {
        ctx.fillStyle = `rgba(0,0,0,${rand() * 0.18})`
        ctx.fillRect(
          col * bw + shift + 3 + rand() * (bw - 12),
          row * bh + 3 + rand() * (bh - 12),
          4 + rand() * 18,
          2 + rand() * 6,
        )
      }
    }
  }
  return toTexture(c, repeatX, repeatY)
}

export function concreteTexture(repeat: number) {
  const [c, ctx] = canvas(512, 512)
  const rand = mulberry32(11)
  ctx.fillStyle = "#26221f"
  ctx.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 9000; i++) {
    const v = rand()
    ctx.fillStyle = v > 0.5 ? `rgba(255,255,255,${rand() * 0.035})` : `rgba(0,0,0,${rand() * 0.08})`
    ctx.fillRect(rand() * 512, rand() * 512, 1 + rand() * 3, 1 + rand() * 3)
  }
  return toTexture(c, repeat, repeat)
}

/** Texto centrado sobre un fondo; devuelve la textura y su relación de aspecto. */
export function textTexture(opts: {
  lines: { text: string; size: number; weight?: number; color: string; letterSpacing?: number }[]
  width: number
  height: number
  background?: string
  glow?: string
}) {
  const [c, ctx] = canvas(opts.width, opts.height)
  if (opts.background) {
    ctx.fillStyle = opts.background
    ctx.fillRect(0, 0, opts.width, opts.height)
  }
  const totalHeight = opts.lines.reduce((a, l) => a + l.size * 1.15, 0)
  let y = (opts.height - totalHeight) / 2
  ctx.textAlign = "center"
  ctx.textBaseline = "top"
  for (const line of opts.lines) {
    // Achica la fuente si la línea no entra en el ancho disponible.
    let size = line.size
    const font = (px: number) => `${line.weight ?? 700} ${px}px "Helvetica Neue", Arial, sans-serif`
    ctx.letterSpacing = `${line.letterSpacing ?? 0}px`
    ctx.font = font(size)
    const maxWidth = opts.width * 0.92
    const measured = ctx.measureText(line.text).width
    if (measured > maxWidth) size = Math.floor(size * (maxWidth / measured))
    ctx.font = font(size)
    ctx.fillStyle = line.color
    if (opts.glow) {
      ctx.shadowColor = opts.glow
      ctx.shadowBlur = size * 0.35
    }
    ctx.fillText(line.text, opts.width / 2, y)
    y += line.size * 1.15
  }
  const tex = toTexture(c)
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
  return tex
}
