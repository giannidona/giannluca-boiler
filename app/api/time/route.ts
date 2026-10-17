// Reloj de referencia para que todos los oyentes calculen la misma posición de la radio,
// aunque el reloj de su dispositivo esté corrido.
export const dynamic = "force-dynamic"

export function GET() {
  return Response.json({ now: Date.now() }, { headers: { "Cache-Control": "no-store" } })
}
