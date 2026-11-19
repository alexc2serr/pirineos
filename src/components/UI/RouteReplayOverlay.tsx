import { useEffect, useRef, useState } from 'react'
import { replayState, type ReplayPhase, type ReplayTarget } from '../../lib/replayState'
import { triggerVideoDownload, type RecordedVideo } from '../../utils/videoRecorder'

interface RouteReplayOverlayProps {
  target: ReplayTarget
  recording: boolean
  recordedVideo: RecordedVideo | null
  onReplayAgain: () => void
  onExit: () => void
}

/**
 * Interfaz limpia durante el modo vídeo Relive Cozy:
 * - Indicador en vivo de altitud, distancia y porcentaje mientras avanza el montañero
 * - Tarjeta resumen cozy de cumbre al llegar al 100% con descarga directa de MP4/WebM
 */
export function RouteReplayOverlay({
  target,
  recording,
  recordedVideo,
  onReplayAgain,
  onExit,
}: RouteReplayOverlayProps) {
  const [phase, setPhase] = useState<ReplayPhase>('hiking')
  const altRef = useRef<HTMLSpanElement>(null)
  const distRef = useRef<HTMLSpanElement>(null)
  const pctRef = useRef<HTMLSpanElement>(null)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let raf = 0
    let lastPhase: ReplayPhase = 'hiking'
    const tick = () => {
      if (altRef.current) {
        altRef.current.textContent = `${Math.round(replayState.currentAltitudeM).toLocaleString('es-ES')} m`
      }
      if (distRef.current) {
        distRef.current.textContent = `${replayState.currentDistanceKm.toFixed(1)} km`
      }
      if (pctRef.current) {
        pctRef.current.textContent = `${Math.round(replayState.progress * 100)}%`
      }
      if (barRef.current) {
        barRef.current.style.width = `${Math.max(2, replayState.progress * 100)}%`
      }
      if (replayState.phase !== lastPhase) {
        lastPhase = replayState.phase
        setPhase(lastPhase)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const showSummitCard = phase === 'celebrating' || phase === 'done'

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-between p-5 sm:p-8">
      {/* Barra superior: progreso en vivo + botón salir */}
      <div className="flex w-full items-start justify-between gap-4">
        <div className="hidden w-28 sm:block" />

        {!showSummitCard ? (
          <div className="w-[min(92vw,440px)] rounded-2xl border border-amber-300/35 bg-slate-950/75 px-4 py-3 text-white shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                {recording && (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-rose-300">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
                    REC
                  </span>
                )}
                <span className="truncate font-sans text-sm font-semibold text-amber-100">
                  {target.name}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2 font-mono text-xs text-amber-200/90 tabular-nums">
                <span ref={altRef}>0 m</span>
                <span className="text-white/30">·</span>
                <span ref={distRef}>0.0 km</span>
                <span className="text-white/30">·</span>
                <span ref={pctRef}>0%</span>
              </div>
            </div>
            <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                ref={barRef}
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-200 transition-[width] duration-75"
                style={{ width: '2%' }}
              />
            </div>
          </div>
        ) : (
          <div />
        )}

        <button
          type="button"
          onClick={onExit}
          className="pointer-events-auto rounded-xl border border-white/15 bg-slate-950/70 px-3.5 py-2 font-mono text-xs text-white/85 shadow-lg backdrop-blur-md transition-colors hover:bg-slate-900 hover:text-white"
        >
          ✕ Salir
        </button>
      </div>

      {/* Tarjeta resumen cozy al alcanzar la cima */}
      {showSummitCard && (
        <div className="pointer-events-auto w-[min(92vw,470px)] rounded-3xl border-2 border-amber-700/30 bg-gradient-to-b from-[#fef9ef]/95 to-[#f6ebd7]/95 p-6 text-center text-slate-900 shadow-[0_24px_60px_rgba(15,23,42,0.55)] backdrop-blur-md">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-1 font-mono text-[11px] font-bold tracking-[0.18em] text-amber-300">
            {target.kind === 'peak' ? '¡CUMBRE ALCANZADA!' : '¡REFUGIO ALCANZADO!'}
          </span>

          <h2 className="mt-3 font-display text-2xl font-bold tracking-wide text-slate-900 sm:text-3xl">
            {target.name}
          </h2>
          <p className="mt-1 font-mono text-base font-bold text-amber-700">
            {target.elevation.toLocaleString('es-ES')} m · {target.massif}
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2 font-mono">
            <div className="rounded-xl bg-slate-900/[0.06] px-2 py-2.5">
              <span className="block text-[9px] font-semibold tracking-[0.15em] text-slate-500">
                DURACIÓN
              </span>
              <span className="mt-0.5 block text-sm font-bold text-slate-900">
                {target.route.estimatedTime}
              </span>
            </div>
            <div className="rounded-xl bg-slate-900/[0.06] px-2 py-2.5">
              <span className="block text-[9px] font-semibold tracking-[0.15em] text-slate-500">
                DISTANCIA
              </span>
              <span className="mt-0.5 block text-sm font-bold text-slate-900">
                {target.route.distanceKm.toLocaleString('es-ES')} km
              </span>
            </div>
            <div className="rounded-xl bg-slate-900/[0.06] px-2 py-2.5">
              <span className="block text-[9px] font-semibold tracking-[0.15em] text-slate-500">
                DESNIVEL
              </span>
              <span className="mt-0.5 block text-sm font-bold text-slate-900">
                +{target.route.elevationGain.toLocaleString('es-ES')} m
              </span>
            </div>
          </div>

          <p className="mt-3.5 text-xs font-medium text-slate-600">
            Salida: <span className="text-slate-800">{target.originLabel}</span>
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {recordedVideo ? (
              <button
                type="button"
                onClick={() => triggerVideoDownload(recordedVideo)}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 font-mono text-xs font-semibold text-amber-300 shadow-md transition-colors hover:bg-slate-800"
              >
                Descargar {recordedVideo.filename.endsWith('.mp4') ? 'MP4' : 'Vídeo'} de nuevo
              </button>
            ) : (
              <span className="rounded-xl bg-amber-900/10 px-3.5 py-2 font-mono text-[11px] font-medium text-amber-900">
                Finalizando vídeo…
              </span>
            )}
            <button
              type="button"
              onClick={onReplayAgain}
              className="rounded-xl border border-slate-900/20 bg-white/70 px-3.5 py-2.5 font-mono text-xs font-semibold text-slate-800 transition-colors hover:bg-white"
            >
              Repetir
            </button>
            <button
              type="button"
              onClick={onExit}
              className="rounded-xl border border-slate-900/15 bg-slate-900/10 px-3.5 py-2.5 font-mono text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-900/20"
            >
              Salir del modo vídeo
            </button>
          </div>

          <p className="mt-3 font-mono text-[9px] font-semibold tracking-[0.25em] text-amber-900/55">
            PIRINEOS 3D
          </p>
        </div>
      )}
    </div>
  )
}
