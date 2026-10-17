# Giannluca's Boiler

Un mini Boiler Room en 3D: Giannluca pinchando en una sala de ladrillo con público, y sus sets sonando 24/7 como una radio en vivo. La gente entra con un nickname y camina por la sala, y todos se ven entre sí.

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

## Online: caminar por el boiler

`server/` es un servidor WebSocket chico (Node + `ws`) que reparte las posiciones de los jugadores 10 veces por segundo.

- Cada jugador manda su posición, hacia dónde mira y qué está haciendo (caminar, correr o alguno de los 5 bailes).
- El look de cada avatar sale del nickname: el mismo nick se ve igual en todas las pantallas.
- Los que entran con "Solo escuchar" igual ven a los demás y suman al contador de online.
- Sin servidor la web sigue andando: se puede caminar solo y la radio suena igual.

- Chat: Enter abre el chat, el mensaje aparece en el historial y en un globito sobre la cabeza. Máximo 140 caracteres y un mensaje cada 0,7 s por persona.
- Cada navegador manda una señal cada 50 s para que el hosting gratis no duerma el servidor mientras hay gente adentro.

Controles: WASD o flechas para caminar, Shift para correr, 1–5 para bailar, Enter para chatear, arrastrar para girar la cámara. En el celular, joystick, botones y el botón "Chat".

### Correrlo local

```bash
npm --prefix server install   # una sola vez
npm run dev:server            # servidor multijugador en :3001
npm run dev                   # la web en :3000
```

### Publicarlo

Vercel no mantiene conexiones WebSocket abiertas, así que el servidor va en otro lado (Render, Railway, Fly.io…):

1. Crear un servicio web desde este repo con **root directory `server`**, comando de instalación `npm install` y de inicio `npm start` (Node 22.18 o más nuevo).
2. Variable opcional en ese servicio: `ALLOWED_ORIGINS=https://tu-dominio.vercel.app` para aceptar conexiones solo desde la web.
3. En Vercel, agregar `NEXT_PUBLIC_MULTIPLAYER_URL=wss://<url-del-servicio>` y volver a desplegar.

## La escena

- `components/scene/boiler-room.tsx`: canvas, luces, cámara y postproceso.
- `components/scene/dj.tsx`: el DJ. El look (piel, pelo, peinado, ropa) está en `DJ_LOOK`.
- `components/scene/humanoid.ts`: el modelo low-poly estilo PS2 y su esqueleto, compartido por todos.
- `components/scene/people.tsx`: dibuja al público y a los jugadores juntos (mallas instanciadas).
- `components/scene/dance.ts`: animaciones de caminar y bailar.
- `components/scene/world.ts`: dónde está el público de relleno y las colisiones.
- `components/scene/player-controller.tsx`: movimiento del avatar propio y cámara en tercera persona.
- `components/scene/dj-booth.tsx`: mesa, CDJs, mixer, laptop y monitores.
- `components/scene/room.tsx`: paredes, cartel de neón y cañerías.
- `lib/audio-bus.ts`: analiza el audio para que todo se mueva con el bajo.

## Desarrollo

```bash
npm install
npm run dev
```
