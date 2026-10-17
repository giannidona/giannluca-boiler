/**
 * Puente entre el <audio> de la radio y la escena 3D.
 * La radio conecta un AnalyserNode; la escena llama a `update()` una vez por frame
 * y todos los objetos leen `bass` / `energy` (0..1) para moverse al ritmo.
 */
class AudioBus {
  bass = 0
  energy = 0
  /** Pulso que salta en cada golpe de bajo y decae solo. */
  kick = 0
  private analyser: AnalyserNode | null = null
  private data: Uint8Array<ArrayBuffer> | null = null
  private bassAvg = 0
  private lastKickAt = 0

  connect(analyser: AnalyserNode | null) {
    this.analyser = analyser
    this.data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null
  }

  update(dt: number, timeSec: number) {
    if (!this.analyser || !this.data) {
      // Sin audio: un pulso suave a ~122 BPM para que la sala no quede quieta.
      const phase = (timeSec * 122) / 60
      const beat = Math.pow(1 - (phase % 1), 4)
      this.bass = 0.25 + beat * 0.35
      this.energy = 0.3
      this.kick = beat * 0.6
      return
    }

    this.analyser.getByteFrequencyData(this.data)
    const bins = this.data.length
    // Con fftSize 1024 a 44.1/48 kHz cada bin ≈ 45 Hz: los primeros ~4 son el bajo.
    let bass = 0
    for (let i = 1; i < 5; i++) bass += this.data[i]
    bass /= 4 * 255
    let total = 0
    for (let i = 0; i < bins; i++) total += this.data[i]
    const energy = total / (bins * 255)

    const smoothing = 1 - Math.exp(-dt * 18)
    this.bass += (bass - this.bass) * smoothing
    this.energy += (energy - this.energy) * smoothing

    this.bassAvg += (bass - this.bassAvg) * (1 - Math.exp(-dt * 2))
    if (bass > this.bassAvg * 1.12 && bass > 0.35 && timeSec - this.lastKickAt > 0.25) {
      this.kick = 1
      this.lastKickAt = timeSec
    } else {
      this.kick *= Math.exp(-dt * 7)
    }
  }
}

export const audioBus = new AudioBus()
