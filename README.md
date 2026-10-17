# Giannluca's Boiler

Un mini Boiler Room en 3D: Giannluca pinchando en una sala de ladrillo con público, y sus sets sonando 24/7 como una radio en vivo.

Hecho con Next.js, React Three Fiber (three.js) y Tailwind.

## Cómo funciona la radio

Todos los oyentes escuchan lo mismo en el mismo momento, sin servidor de streaming:

- `lib/sets.ts` tiene la lista de sets con su duración exacta y una fecha de inicio fija (`RADIO_EPOCH_MS`).
  Con eso, `scheduleAt(ahora)` calcula qué set suena y en qué segundo. Es la misma cuenta para todos.
- `app/api/time` devuelve la hora del servidor; cada cliente mide la diferencia con su reloj para no depender de que el del dispositivo esté bien.
- `lib/use-radio.ts` reproduce el set que toca, salta al segundo correcto y cada 4 s corrige si se corrió más de 2 s.

### Agregar o cambiar sets

1. Copiá el mp3 a `public/sets/`.
2. Medí su duración:
   ```bash
   ffprobe -v error -show_entries format=duration -of csv=p=0 "public/sets/Nombre - Giannluca.mp3"
   ```
3. Agregalo a `SETS` en `lib/sets.ts`.

Cambiar la lista o el orden mueve la grilla para todos (es esperable).

## La escena

- `components/scene/boiler-room.tsx`: canvas, luces, cámara y postproceso.
- `components/scene/dj.tsx`: el DJ. Los colores (piel, pelo, ropa) están en `DJ_LOOK`.
- `components/scene/crowd.tsx`: el público (instanciado, ~140 personas).
- `components/scene/dj-booth.tsx`: mesa, CDJs, mixer, laptop y monitores.
- `components/scene/room.tsx`: paredes, cartel de neón y cañerías.
- `lib/audio-bus.ts`: analiza el audio para que todo se mueva con el bajo.

## Desarrollo

```bash
npm install
npm run dev
```
