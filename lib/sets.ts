export interface DjSet {
  name: string
  genre: string
  src: string
  /** Duración en segundos (medida con ffprobe). Define la grilla de la radio. */
  duration: number
}

function set(filename: string, genre: string, duration: number): DjSet {
  return {
    name: filename.replace(/\s*-\s*Giannluca\.mp3$/i, ""),
    genre,
    src: `/sets/${encodeURIComponent(filename)}`,
    duration,
  }
}

/**
 * Al agregar un set nuevo, sumalo acá con su duración:
 *   ffprobe -v error -show_entries format=duration -of csv=p=0 "archivo.mp3"
 * Cambiar la lista o el orden mueve la grilla para todos los oyentes.
 */
export const SETS: DjSet[] = [
  set("Eternal Dreams - Episode 1 - Giannluca.mp3", "Eternal Dreams", 3111.984762),
  set("Eternal Dreams - Episode 2 - Giannluca.mp3", "Eternal Dreams", 3789.870408),
  set("Eternal Dreams - Episode 3 - Giannluca.mp3", "Eternal Dreams", 3992.153243),
  set("Eternal Dreams - Episode 4 - Giannluca.mp3", "Eternal Dreams", 3867.150249),
  set("Eternal Dreams - Episode 5 - Giannluca.mp3", "Eternal Dreams", 3952.024671),
  set("Eternal Dreams - Episode 6 - Giannluca.mp3", "Eternal Dreams", 3776.286553),
  set("Eternal Dreams - Episode 7 - Giannluca.mp3", "Eternal Dreams", 3823.606712),
  set("Mini set - Giannluca.mp3", "Mini Set", 2568.974512),
  set("Organic House Set - Giannluca.mp3", "Organic House", 3788.761859),
  set("Sunset Time - Episode 1 - Giannluca.mp3", "Sunset Time", 3662.634376),
  set("Sunset Time - Episode 2 - Giannluca.mp3", "Sunset Time", 3563.620408),
  set("Sunset Time - Episode 3 - Giannluca.mp3", "Sunset Time", 1936.161088),
]

/** Momento en que la radio "empezó a transmitir". Todos calculan la posición desde acá. */
export const RADIO_EPOCH_MS = Date.UTC(2026, 0, 1, 0, 0, 0)

export const PLAYLIST_DURATION = SETS.reduce((acc, s) => acc + s.duration, 0)

export interface ScheduleSlot {
  index: number
  /** Segundos transcurridos dentro del set actual. */
  position: number
  /** Timestamp (ms) en que empezó el set actual. */
  startedAt: number
}

/** Qué set suena (y en qué segundo) en el instante `nowMs`. Determinístico: igual para todos. */
export function scheduleAt(nowMs: number): ScheduleSlot {
  const elapsed = (nowMs - RADIO_EPOCH_MS) / 1000
  const offset = ((elapsed % PLAYLIST_DURATION) + PLAYLIST_DURATION) % PLAYLIST_DURATION

  let acc = 0
  for (let i = 0; i < SETS.length; i++) {
    const d = SETS[i].duration
    if (offset < acc + d) {
      const position = offset - acc
      return { index: i, position, startedAt: nowMs - position * 1000 }
    }
    acc += d
  }
  return { index: 0, position: 0, startedAt: nowMs }
}

/** Los próximos `count` sets a partir de `nowMs`, con su hora de inicio. */
export function upcomingSets(nowMs: number, count: number): { index: number; startsAt: number }[] {
  const current = scheduleAt(nowMs)
  const out: { index: number; startsAt: number }[] = []
  let startsAt = current.startedAt + SETS[current.index].duration * 1000
  for (let k = 1; k <= count; k++) {
    const index = (current.index + k) % SETS.length
    out.push({ index, startsAt })
    startsAt += SETS[index].duration * 1000
  }
  return out
}
