import { useState } from 'react'
import { exportTrekToGpx, stageToRoute, type Trek } from '../../data/treks'
import type { HeightField } from '../../lib/heightField'
import type { ElevationSample } from '../../lib/routes'
import { ElevationProfileChart } from './ElevationProfileChart'

interface TrekPanelProps {
  trek: Trek | null
  selectedStageDay: number | null
  heightField: HeightField | null
  hoveredProgress: number | null
  onSelectStage: (day: number | null) => void
  onHoverProgress: (progress: number | null) => void
  onFocusSample: (sample: ElevationSample) => void
  onViewFullTrek: (trek: Trek) => void
  onStartTrekReplay: (trek: Trek) => void
  onClose: () => void
}

/** Ficha lateral (Bottom Sheet en móvil) para explorar una travesía multi-etapa y sus perfiles. */
export function TrekPanel({
  trek,
  selectedStageDay,
  heightField,
  hoveredProgress,
  onSelectStage,
  onHoverProgress,
  onFocusSample,
  onViewFullTrek,
  onStartTrekReplay,
  onClose,
}: TrekPanelProps) {
  const [lastShown, setLastShown] = useState<Trek | null>(null)
  if (trek && trek.id !== lastShown?.id) {
    setLastShown(trek)
  }
  const shown = trek ?? lastShown
  const open = trek !== null

  return (
    <aside
      aria-hidden={!open}
      className={`pointer-events-auto fixed inset-x-0 bottom-0 z-40 flex max-h-[56vh] flex-col overflow-hidden rounded-t-2xl border border-b-0 border-sky-300/30 bg-slate-950/88 text-white shadow-2xl backdrop-blur-md transition-transform duration-500 ease-out md:inset-x-auto md:bottom-24 md:right-4 md:top-20 md:max-h-none md:w-[400px] md:rounded-2xl md:border-b md:bg-slate-950/80 ${
        open ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-x-[120%] md:translate-y-0'
      }`}
    >
      {shown && (
        <>
          <div className="flex justify-center pt-2 md:hidden">
            <span className="h-1 w-10 rounded-full bg-sky-300/40" />
          </div>

          <div className="overflow-y-auto p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full border border-sky-300/40 bg-sky-400/20 px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.16em] text-sky-200">
                {shown.isCustom ? 'MI TRAVESÍA' : 'TRAVESÍA CLÁSICA'}
              </span>
              <span className="font-mono text-[10px] text-white/55">
                {shown.stages.length} {shown.stages.length === 1 ? 'ETAPA' : 'ETAPAS'}
              </span>
            </div>

            <h2 className="mt-2.5 font-display text-xl font-semibold tracking-wide sm:text-2xl">
              {shown.name}
            </h2>
            <p className="mt-0.5 text-xs text-white/60">{shown.region}</p>
            <p className="mt-2 text-xs leading-relaxed text-white/75">{shown.description}</p>

            {/* Resumen global */}
            <div className="mt-3.5 grid grid-cols-3 gap-2 font-mono">
              <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-center">
                <span className="block text-[8.5px] tracking-[0.15em] text-white/45">ETAPAS</span>
                <span className="mt-0.5 block text-sm font-semibold text-white">{shown.stages.length} d</span>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-center">
                <span className="block text-[8.5px] tracking-[0.15em] text-white/45">DISTANCIA</span>
                <span className="mt-0.5 block text-sm font-semibold text-sky-200">
                  {shown.totalDistanceKm.toLocaleString('es-ES')} km
                </span>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-center">
                <span className="block text-[8.5px] tracking-[0.15em] text-white/45">DESNIVEL</span>
                <span className="mt-0.5 block text-sm font-semibold text-amber-200">
                  +{shown.totalElevationGain.toLocaleString('es-ES')} m
                </span>
              </div>
            </div>

            {/* Acciones principales */}
            <div className="mt-3.5 grid grid-cols-1 gap-1.5">
              <button
                type="button"
                onClick={() => onStartTrekReplay(shown)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 px-3 py-2.5 font-mono text-xs font-bold text-slate-950 shadow-md transition-opacity hover:opacity-95"
              >
                🎬 Vídeo Cozy de Travesía
              </button>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onSelectStage(null)
                    onViewFullTrek(shown)
                  }}
                  className="rounded-xl border border-sky-300/35 bg-sky-400/15 px-2.5 py-2 font-mono text-[10.5px] font-semibold text-sky-100 transition-colors hover:bg-sky-400/25"
                >
                  Ver Circuito Completo
                </button>
                <button
                  type="button"
                  onClick={() => exportTrekToGpx(shown)}
                  className="rounded-xl border border-white/15 bg-white/5 px-2.5 py-2 font-mono text-[10.5px] font-semibold text-white/85 transition-colors hover:bg-white/15"
                >
                  ⬇ Descargar .GPX
                </button>
              </div>
            </div>

            {/* Etapas día por día */}
            <h3 className="mt-5 font-mono text-[10px] tracking-[0.25em] text-white/50">
              ETAPAS ({shown.stages.length} DÍAS) · PULSA PARA VER PERFIL
            </h3>
            <div className="mt-2 space-y-2">
              {shown.stages.map((stage) => {
                const isSelected = selectedStageDay === stage.day
                const stageRoute = stageToRoute(shown, stage)
                return (
                  <div
                    key={stage.day}
                    className={`rounded-xl border transition-colors ${
                      isSelected
                        ? 'border-white/35 bg-white/[0.09]'
                        : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.07]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectStage(isSelected ? null : stage.day)}
                      className="w-full p-3 text-left"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: stage.color }}
                          />
                          <span className="truncate font-mono text-[11px] font-bold text-white">
                            DÍA {stage.day}
                          </span>
                          <span className="truncate text-xs text-white/80">
                            {stage.fromName} → {stage.toName}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1.5 flex items-center gap-3 pl-4 font-mono text-[10px] text-white/60">
                        <span>{stage.distanceKm} km</span>
                        <span>+{stage.elevationGain} m</span>
                        <span>{stage.estimatedTime}</span>
                      </div>
                    </button>

                    {isSelected && (
                      <div className="border-t border-white/10 px-3 pb-3 pt-1">
                        <ElevationProfileChart
                          route={stageRoute}
                          heightField={heightField}
                          hoveredProgress={hoveredProgress}
                          onHoverProgress={onHoverProgress}
                          onFocusSample={onFocusSample}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="border-t border-white/10 p-3.5 sm:p-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg bg-white/90 px-4 py-2 text-xs font-semibold text-slate-900 transition-colors hover:bg-white sm:text-sm"
            >
              ← Vista Aérea de Cordillera
            </button>
          </div>
        </>
      )}
    </aside>
  )
}
