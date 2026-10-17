export function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Parses "H:MM:SS" or "M:SS"; returns 0 if invalid or empty. */
export function parseDurationLabel(duration: string): number {
  if (!duration?.includes(':')) return 0
  const parts = duration.split(':').map(Number)
  if (parts.some((n) => Number.isNaN(n))) return 0
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  return parts[0] * 60 + parts[1]
}
