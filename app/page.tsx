"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { useRadio } from "@/lib/use-radio"
import { multiplayer } from "@/lib/multiplayer"
import { localPlayer } from "@/lib/player"
import { lookFromName } from "@/components/scene/looks"
import { resolvePosition } from "@/components/scene/world"
import { Overlay } from "@/components/overlay/overlay"

// three.js solo existe en el navegador.
const BoilerRoom = dynamic(() => import("@/components/scene/boiler-room"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-xs uppercase tracking-widest text-white/40">
      Armando la sala…
    </div>
  ),
})

export default function Page() {
  const radio = useRadio()
  const [joined, setJoined] = useState(false)
  const [follow, setFollow] = useState(false)

  useEffect(() => {
    multiplayer.connect()
    return () => multiplayer.disconnect()
  }, [])

  const enter = (name: string) => {
    radio.tuneIn()
    // Aparece frente a la cabina, mirando al DJ
    const spawn = resolvePosition((Math.random() - 0.5) * 3, 2.2 + Math.random() * 1.5)
    Object.assign(localPlayer, {
      active: true,
      name,
      look: lookFromName(name),
      x: spawn.x,
      z: spawn.z,
      yaw: Math.PI,
      phase: Math.random() * Math.PI * 2,
    })
    multiplayer.join(name)
    setJoined(true)
    setFollow(true)
  }

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-background">
      <BoilerRoom follow={follow} joined={joined} />
      <Overlay
        radio={radio}
        joined={joined}
        follow={follow}
        onEnter={enter}
        onListen={radio.tuneIn}
        onToggleCamera={() => setFollow((f) => !f)}
      />
    </main>
  )
}
