"use client"

import dynamic from "next/dynamic"
import { useRadio } from "@/lib/use-radio"
import { RadioOverlay } from "@/components/radio-overlay"

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
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-background">
      <BoilerRoom />
      <RadioOverlay radio={radio} />
    </main>
  )
}
