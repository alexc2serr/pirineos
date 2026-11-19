import { useEffect, useRef } from 'react'
import { compassLabel, telemetry } from '../../lib/telemetry'

/** HUD telemétrico minimalista: lee el estado compartido vía rAF para mantener 60 FPS. */
export function TelemetryHUD() {
  const altRef = useRef<HTMLSpanElement>(null)
  const coordsRef = useRef<HTMLSpanElement>(null)
  const headingRef = useRef<HTMLSpanElement>(null)
  const compassRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      if (altRef.current) {
        altRef.current.textContent = `${Math.max(0, Math.round(telemetry.altitudeM)).toLocaleString('es-ES')} m`
      }
      if (coordsRef.current) {
        const lat = `${Math.abs(telemetry.lat).toFixed(4)}°${telemetry.lat >= 0 ? 'N' : 'S'}`
        const lon = `${Math.abs(telemetry.lon).toFixed(4)}°${telemetry.lon >= 0 ? 'E' : 'O'}`
        coordsRef.current.textContent = `${lat} · ${lon}`
      }
      if (headingRef.current) {
        const deg = Math.round(((telemetry.headingDeg % 360) + 360) % 360) % 360
        headingRef.current.textContent = `${String(deg).padStart(3, '0')}°`
      }
      if (compassRef.current) {
        compassRef.current.textContent = compassLabel(telemetry.headingDeg)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      aria-label="Telemetría de cámara"
      className="pointer-events-auto flex shrink-0 select-none items-center gap-3.5 self-end rounded-xl border border-white/10 bg-slate-950/60 px-3.5 py-2 font-mono text-white shadow-xl backdrop-blur-md"
    >
      <div>
        <span className="block text-[9px] tracking-[0.18em] text-white/45">ALT CAM</span>
        <span ref={altRef} className="block text-xs font-medium tabular-nums text-white/90">
          2.800 m
        </span>
      </div>
      <span className="h-6 w-px bg-white/10" />
      <div>
        <span className="block text-[9px] tracking-[0.18em] text-white/45">OBJETIVO GPS</span>
        <span ref={coordsRef} className="block text-xs font-medium tabular-nums text-white/90">
          42.6400°N · 0.5500°E
        </span>
      </div>
      <span className="h-6 w-px bg-white/10" />
      <div className="min-w-[3.5rem] text-right">
        <span className="block text-[9px] tracking-[0.18em] text-white/45">RUMBO</span>
        <span className="block text-xs font-medium tabular-nums">
          <span ref={compassRef} className="text-amber-200">
            SO
          </span>{' '}
          <span ref={headingRef} className="text-white/75">
            210°
          </span>
        </span>
      </div>
    </div>
  )
}
