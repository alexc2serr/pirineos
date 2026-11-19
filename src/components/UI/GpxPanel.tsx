import { useState } from 'react'
import type { ParsedGpxTrack } from '../../utils/gpxParser'

interface GpxPanelProps {
  track: ParsedGpxTrack | null
  onViewFullRoute: () => void
  onStartReplay: () => void
  onUploadAnother: () => void
  onClose: () => void
}

/** Ficha técnica del track GPX importado (Bottom Sheet en móvil, panel lateral en escritorio). */
export function GpxPanel({
  track,
  onViewFullRoute,
  onStartReplay,
  onUploadAnother,
  onClose,
}: GpxPanelProps) {
  const [lastShown, setLastShown] = useState<ParsedGpxTrack | null>(null)
  if (track && track.id !== lastShown?.id) {
    setLastShown(track)
  }
  const shown = track ?? lastShown
  const open = track !== null

  return (
    <aside
      aria-hidden={!open}
      className={`pointer-events-auto fixed inset-x-0 bottom-0 z-40 flex max-h-[55vh] flex-col overflow-hidden rounded-t-2xl border border-b-0 border-teal-300/30 bg-slate-950/85 text-white shadow-2xl backdrop-blur-md transition-transform duration-500 ease-out md:inset-x-auto md:bottom-24 md:right-4 md:top-20 md:max-h-none md:w-[390px] md:rounded-2xl md:border-b md:bg-slate-950/80 ${
        open ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-x-[120%] md:translate-y-0'
      }`}
    >
      {shown && (
        <>
          <div className="flex justify-center pt-2 md:hidden">
            <span className="h-1 w-10 rounded-full bg-teal-300/40" />
          </div>

          <div className="overflow-y-auto p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-300/40 bg-teal-400/20 px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.16em] text-teal-200">
                TRACK GPX REAL
              </span>
              <span className="truncate font-mono text-[10px] text-white/45">
                {shown.fileName}
              </span>
            </div>

            <h2 className="mt-3 font-display text-xl font-semibold leading-snug tracking-wide sm:text-2xl">
              {shown.name}
            </h2>
            <p className="mt-0.5 text-sm text-white/60">
              {shown.massif}
              {shown.matchedLabel && (
                <span className="ml-1.5 text-teal-300/90">· Detectado: {shown.matchedLabel}</span>
              )}
            </p>

            {/* Botón principal Vídeo Cozy GPX */}
            <div className="mt-4 grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={onStartReplay}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 px-4 py-2.5 font-mono text-xs font-bold text-slate-950 shadow-lg transition-opacity hover:opacity-95"
              >
                🎬 Crear Vídeo Cozy de mi Ruta GPX
              </button>
              <button
                type="button"
                onClick={onViewFullRoute}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-teal-300/35 bg-teal-400/15 px-3 py-2 font-mono text-[11px] font-semibold text-teal-100 transition-colors hover:bg-teal-400/25"
              >
                Ver Ruta Completa en 3D
              </button>
            </div>

            {/* Cuadrícula de estadísticas reales */}
            <h3 className="mt-5 font-mono text-[10px] tracking-[0.25em] text-white/50">
              ESTADÍSTICAS DEL TRACK
            </h3>
            <div className="mt-2 grid grid-cols-2 gap-2 font-mono">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <span className="block text-[9px] tracking-[0.15em] text-white/45">DISTANCIA</span>
                <span className="mt-1 block text-lg font-semibold text-white">
                  {shown.distanceKm.toLocaleString('es-ES')} <span className="text-xs text-white/60">km</span>
                </span>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <span className="block text-[9px] tracking-[0.15em] text-white/45">
                  DURACIÓN ({shown.hasRealTime ? 'REAL' : 'EST. MIDE'})
                </span>
                <span className="mt-1 block text-lg font-semibold text-white">
                  {shown.estimatedTime}
                </span>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <span className="block text-[9px] tracking-[0.15em] text-white/45">DESNIVEL + / −</span>
                <span className="mt-1 block text-base font-semibold text-emerald-300">
                  +{shown.elevationGain.toLocaleString('es-ES')} m
                </span>
                <span className="block text-[11px] text-rose-300/80">
                  −{shown.elevationLoss.toLocaleString('es-ES')} m
                </span>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <span className="block text-[9px] tracking-[0.15em] text-white/45">COTA MÁX / MÍN</span>
                <span className="mt-1 block text-base font-semibold text-amber-200">
                  {shown.maxElevation !== null ? `${shown.maxElevation.toLocaleString('es-ES')} m` : '—'}
                </span>
                <span className="block text-[11px] text-white/55">
                  {shown.minElevation !== null ? `mín. ${shown.minElevation.toLocaleString('es-ES')} m` : 'Sin datos <ele>'}
                </span>
              </div>
            </div>

            <p className="mt-3 font-mono text-[10px] leading-relaxed text-white/45">
              {shown.rawPointCount.toLocaleString('es-ES')} puntos GPS analizados · optimizado a{' '}
              {shown.simplifiedPointCount} nodos clave adheridos al relieve DEM.
            </p>
          </div>

          <div className="flex gap-2 border-t border-white/10 p-3.5 sm:p-4">
            <button
              type="button"
              onClick={onUploadAnother}
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 font-mono text-[11px] font-medium text-white/85 transition-colors hover:bg-white/15"
            >
              📂 Otro GPX
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg bg-white/90 px-4 py-2 text-xs font-semibold text-slate-900 transition-colors hover:bg-white sm:text-sm"
            >
              ← Vista Aérea
            </button>
          </div>
        </>
      )}
    </aside>
  )
}
