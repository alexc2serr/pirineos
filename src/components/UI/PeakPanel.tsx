import { useState } from 'react'
import type { Country, Difficulty, Peak, Route } from '../../data/pyrenees'
import type { ViewMode } from '../../lib/views'
import { RouteSelector } from './RouteSelector'

interface PeakPanelProps {
  peak: Peak | null
  mode: ViewMode
  activeRoute: Route | null
  onSelectRoute: (route: Route) => void
  onViewFullRoute: (route: Route) => void
  onStartReplay: (route: Route) => void
  onModeChange: (mode: 'orbit' | 'summit') => void
  onSelectHut: (hutId: string) => void
  onBack: () => void
}

const COUNTRY_LABEL: Record<Country, string> = {
  ES: 'España',
  FR: 'Francia',
  'ES/FR': 'España / Francia',
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  F: 'Fácil',
  PD: 'Poco difícil',
  AD: 'Algo difícil',
  D: 'Difícil',
}

const DIFFICULTY_STYLE: Record<Difficulty, string> = {
  F: 'bg-emerald-400/20 text-emerald-200 border-emerald-300/30',
  PD: 'bg-sky-400/20 text-sky-200 border-sky-300/30',
  AD: 'bg-amber-400/20 text-amber-200 border-amber-300/30',
  D: 'bg-rose-400/20 text-rose-200 border-rose-300/30',
}

export function PeakPanel({
  peak,
  mode,
  activeRoute,
  onSelectRoute,
  onViewFullRoute,
  onStartReplay,
  onModeChange,
  onSelectHut,
  onBack,
}: PeakPanelProps) {
  const [lastShown, setLastShown] = useState<Peak | null>(null)
  if (peak && peak.id !== lastShown?.id) {
    setLastShown(peak)
  }
  const shown = peak ?? lastShown
  const open = peak !== null

  return (
    <aside
      aria-hidden={!open}
      className={`pointer-events-auto absolute bottom-28 right-4 top-[17.5rem] z-40 flex w-[min(92vw,400px)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/65 text-white shadow-2xl backdrop-blur-md transition-transform duration-500 ease-out sm:right-8 ${
        open ? 'translate-x-0' : 'translate-x-[120%]'
      }`}
    >
      {shown && (
        <>
          <div className="overflow-y-auto p-5">
            <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-white/55">
              {(shown.country === 'ES/FR' ? ['ES', 'FR'] : [shown.country]).map((c) => (
                <span key={c} className="rounded border border-white/20 px-1.5 py-0.5 text-white/80">
                  {c}
                </span>
              ))}
              <span>{COUNTRY_LABEL[shown.country].toUpperCase()}</span>
            </div>

            <h2 className="mt-3 font-display text-2xl font-semibold tracking-wide">{shown.name}</h2>
            <p className="mt-0.5 text-sm text-white/60">Macizo {shown.massif}</p>

            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="font-mono text-5xl font-medium leading-none tracking-tight">
                  {shown.elevation.toLocaleString('es-ES')}
                  <span className="ml-1 text-xl text-white/60">m</span>
                </p>
                <p className="mt-1 font-mono text-[10px] tracking-[0.2em] text-white/45">
                  {shown.coordinates.lat.toFixed(4)}°N · {shown.coordinates.lon.toFixed(4)}°
                </p>
              </div>
              <span
                className={`rounded-md border px-2.5 py-1 text-center font-mono ${DIFFICULTY_STYLE[shown.difficulty]}`}
              >
                <span className="block text-lg font-semibold leading-none">{shown.difficulty}</span>
                <span className="block text-[9px] tracking-wider">{DIFFICULTY_LABEL[shown.difficulty]}</span>
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => onModeChange('orbit')}
                className={`rounded-md px-2 py-2 text-xs font-medium transition-colors ${
                  mode === 'orbit' ? 'bg-white text-slate-900' : 'text-white/75 hover:bg-white/10'
                }`}
              >
                Vista orbital del pico
              </button>
              <button
                type="button"
                onClick={() => onModeChange('summit')}
                className={`rounded-md px-2 py-2 text-xs font-medium transition-colors ${
                  mode === 'summit' ? 'bg-white text-slate-900' : 'text-white/75 hover:bg-white/10'
                }`}
              >
                Panorámica 360º desde la cima
              </button>
            </div>
            {mode === 'summit' && (
              <p className="mt-2 font-mono text-[10px] tracking-wider text-sky-200/80">
                ARRASTRA PARA GIRAR 360º · LOS PICOS VISIBLES MUESTRAN DISTANCIA Y RUMBO
              </p>
            )}

            <RouteSelector
              key={shown.id}
              routes={shown.routes}
              activeRoute={activeRoute}
              onSelectRoute={onSelectRoute}
              onViewFullRoute={onViewFullRoute}
              onStartReplay={onStartReplay}
            />

            <h3 className="mt-6 font-mono text-[10px] tracking-[0.25em] text-white/50">
              REFUGIOS CERCANOS
            </h3>
            <ul className="mt-2 divide-y divide-white/10 rounded-lg border border-white/10 bg-white/5">
              {shown.nearbyHuts.map((h) => (
                <li key={h.name}>
                  {h.hutId ? (
                    <button
                      type="button"
                      onClick={() => onSelectHut(h.hutId!)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/10"
                    >
                      <span className="text-sm text-amber-100 underline decoration-amber-200/30 underline-offset-2">
                        {h.name}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] text-white/60">
                        {h.elevation.toLocaleString('es-ES')} m · {h.capacity} pl.
                      </span>
                    </button>
                  ) : (
                    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <span className="text-sm">{h.name}</span>
                      <span className="shrink-0 font-mono text-[11px] text-white/60">
                        {h.elevation.toLocaleString('es-ES')} m · {h.capacity} pl.
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] leading-relaxed text-white/40">
              La línea naranja traza la ruta de ascenso desde el refugio base sobre el modelo de
              elevación. Pulsa cualquier refugio para ver sus servicios.
            </p>
          </div>

          <div className="border-t border-white/10 p-4">
            <button
              type="button"
              onClick={onBack}
              className="w-full rounded-lg bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-white"
            >
              ← Vista Aérea de Cordillera
            </button>
          </div>
        </>
      )}
    </aside>
  )
}
