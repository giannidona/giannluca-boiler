"use client"

export function EqBars() {
  return (
    <div className="flex items-end gap-0.5 h-3 w-4">
      <span className="w-1 bg-accent animate-pulse" style={{ height: "8px", animationDelay: "0ms" }} />
      <span className="w-1 bg-accent animate-pulse" style={{ height: "12px", animationDelay: "150ms" }} />
      <span className="w-1 bg-accent animate-pulse" style={{ height: "6px", animationDelay: "300ms" }} />
    </div>
  )
}
