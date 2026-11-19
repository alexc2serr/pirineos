import { useState } from 'react'
import { HUTS, peaks } from '../../data/pyrenees'
import { TIME_LABEL, TIME_ORDER, type SeasonMode, type TimeOfDay } from '../../lib/atmosphere'
import {
  DIFFICULTIES,
  type AltitudeFilter,
  type DifficultyFilter,
  type Filters,
  type HutFilters,
  type HutTypeFilter,
  type SideFilter,
} from '../../lib/filters'
import type { ParsedGpxTrack } from '../../utils/gpxParser'

export type DrawerTab = 'filters' | 'visual' | 'gpx'
export type ExplorerMode = 'peaks' | 'huts'

interface MenuDrawerProps {
  open: boolean
  onClose: () => void
  explorerMode: ExplorerMode
  onExplorerModeChange: (mode: ExplorerMode) => void
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  hutFilters: HutFilters
  onHutFiltersChange: (filters: HutFilters) => void
  onResetFilters: () => void
  peakCount: number
  hutCount: number
  timeOfDay: TimeOfDay
  onTimeChange: (time: TimeOfDay) => void
  seasonMode: SeasonMode
  onSeasonChange: (season: SeasonMode) => void
  showHuts: boolean
  onToggleHuts: () => void
  showPeaks: boolean
  onTogglePeaks: () => void
  tourActive: boolean
  onToggleTour: () => void
  gpxHistory: ParsedGpxTrack[]
  onUploadGpx: () => void
  onOpenGpxTrack: (track: ParsedGpxTrack) => void
  onReplayGpxTrack: (track: ParsedGpxTrack) => void
}

const SIDES: { value: SideFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'ES', label: 'España' },
  { value: 'FR', label: 'Francia' },
]

const ALTITUDES: { value: AltitudeFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'under2500', label: '< 2.500m' },
  { value: '2500to3000', label: '2.500–3.000m' },
  { value: 'over3000', label: '+3.000m' },
]

const HUT_TYPES: { value: HutTypeFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'Guardado', label: 'Guardados' },
  { value: 'Libre / Vivac', label: 'Libres' },
]

const chip = (active: boolean) =>
  `rounded-lg px-2.5 py-1.5 font-mono text-[11px] tracking-wide transition-colors ${
    active
      ? 'bg-white/95 font-semibold text-slate-950'
      : 'bg-white/5 text-white/75 hover:bg-white/10 hover:text-white'
  }`

const amberChip = (active: boolean) =>
  `rounded-lg px-2.5 py-1.5 font-mono text-[11px] tracking-wide transition-colors ${
    active
      ? 'bg-amber-300/95 font-semibold text-slate-950'
      : 'bg-white/5 text-white/75 hover:bg-white/10 hover:text-white'
  }`

function SwitchRow({
  label,
  sub,
  checked,
  onChange,
  accent = 'amber',
}: {
  label: string
  sub: string
  checked: boolean
  onChange: () => void
  accent?: 'amber' | 'sky'
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-left transition-colors hover:bg-white/[0.08]"
    >
      <div>
        <span className="block text-xs font-semibold text-white">{label}</span>
        <span className="mt-0.5 block font-mono text-[10px] text-white/50">{sub}</span>
      </div>
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? (accent === 'amber' ? 'bg-amber-400' : 'bg-sky-400') : 'bg-white/15'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-slate-950 shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </span>
    </button>
  )
}

/** Menú hamburguesa lateral organizado en 3 pestañas: Filtros, Visual y Rutas GPX. */
export function MenuDrawer({
  open,
  onClose,
  explorerMode,
  onExplorerModeChange,
  filters,
  onFiltersChange,
  hutFilters,
  onHutFiltersChange,
  onResetFilters,
  peakCount,
  hutCount,
  timeOfDay,
  onTimeChange,
  seasonMode,
  onSeasonChange,
  showHuts,
  onToggleHuts,
  showPeaks,
  onTogglePeaks,
  tourActive,
  onToggleTour,
  gpxHistory,
  onUploadGpx,
  onOpenGpxTrack,
  onReplayGpxTrack,
}: MenuDrawerProps) {
  const [tab, setTab] = useState<DrawerTab>('filters')

  return (
    <aside
      aria-hidden={!open}
      className={`pointer-events-auto fixed right-4 top-20 z-40 flex max-h-[calc(100vh-96px)] w-[min(92vw,384px)] flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-950/85 text-white shadow-2xl backdrop-blur-md transition-all duration-300 ease-out sm:w-96 ${
        open
          ? 'translate-x-0 opacity-100'
          : 'pointer-events-none translate-x-[115%] opacity-0'
      }`}
    >
      {/* Cabecera de 3 pestañas */}
      <div className="border-b border-white/10 p-3">
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
          {(
            [
              { id: 'filters', label: 'Filtros' },
              { id: 'visual', label: 'Visual' },
              { id: 'gpx', label: `Rutas GPX${gpxHistory.length ? ` (${gpxHistory.length})` : ''}` },
            ] as { id: DrawerTab; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-2 py-1.5 font-mono text-[11px] font-medium tracking-wide transition-colors ${
                tab === t.id
                  ? 'bg-white text-slate-950 shadow'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido con scroll interno */}
      <div className="overflow-y-auto p-4">
        {tab === 'filters' && (
          <div className="space-y-4">
            {/* Selector Picos / Refugios */}
            <div>
              <p className="font-mono text-[10px] tracking-[0.22em] text-white/45">EXPLORAR</p>
              <div className="mt-2 grid grid-cols-2 gap-1.5 rounded-xl border border-white/10 bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() => onExplorerModeChange('peaks')}
                  className={`rounded-lg py-2 font-mono text-[11px] font-semibold transition-colors ${
                    explorerMode === 'peaks'
                      ? 'bg-white text-slate-950'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  PICOS ({peakCount}/{peaks.length})
                </button>
                <button
                  type="button"
                  onClick={() => onExplorerModeChange('huts')}
                  className={`rounded-lg py-2 font-mono text-[11px] font-semibold transition-colors ${
                    explorerMode === 'huts'
                      ? 'bg-amber-300 text-slate-950'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  REFUGIOS ({hutCount}/{HUTS.length})
                </button>
              </div>
            </div>

            {explorerMode === 'peaks' ? (
              <>
                <div>
                  <p className="font-mono text-[10px] tracking-[0.22em] text-white/45">VERTIENTE</p>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {SIDES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        className={chip(filters.side === s.value)}
                        onClick={() => onFiltersChange({ ...filters, side: s.value })}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="font-mono text-[10px] tracking-[0.22em] text-white/45">DIFICULTAD ALPINA</p>
                  <div className="mt-2 grid grid-cols-5 gap-1">
                    {(['all', ...DIFFICULTIES] as DifficultyFilter[]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        className={chip(filters.difficulty === d)}
                        onClick={() => onFiltersChange({ ...filters, difficulty: d })}
                      >
                        {d === 'all' ? 'Todas' : d}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="font-mono text-[10px] tracking-[0.22em] text-white/45">ALTITUD</p>
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {ALTITUDES.map((a) => (
                      <button
                        key={a.value}
                        type="button"
                        className={chip(filters.altitude === a.value)}
                        onClick={() => onFiltersChange({ ...filters, altitude: a.value })}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="font-mono text-[10px] tracking-[0.22em] text-white/45">VERTIENTE</p>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {SIDES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        className={amberChip(hutFilters.side === s.value)}
                        onClick={() => onHutFiltersChange({ ...hutFilters, side: s.value })}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="font-mono text-[10px] tracking-[0.22em] text-white/45">TIPO DE REFUGIO</p>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {HUT_TYPES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        className={amberChip(hutFilters.type === t.value)}
                        onClick={() => onHutFiltersChange({ ...hutFilters, type: t.value })}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="font-mono text-[10px] tracking-[0.22em] text-white/45">SERVICIOS</p>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      className={amberChip(hutFilters.meals)}
                      onClick={() => onHutFiltersChange({ ...hutFilters, meals: !hutFilters.meals })}
                    >
                      Comidas
                    </button>
                    <button
                      type="button"
                      className={amberChip(hutFilters.showers)}
                      onClick={() => onHutFiltersChange({ ...hutFilters, showers: !hutFilters.showers })}
                    >
                      Duchas
                    </button>
                    <button
                      type="button"
                      className={amberChip(hutFilters.hearth)}
                      onClick={() => onHutFiltersChange({ ...hutFilters, hearth: !hutFilters.hearth })}
                    >
                      Chimenea
                    </button>
                  </div>
                </div>
              </>
            )}

            <button
              type="button"
              onClick={onResetFilters}
              className="w-full rounded-xl border border-white/15 bg-white/5 py-2 font-mono text-[11px] font-medium text-white/75 transition-colors hover:bg-white/15 hover:text-white"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {tab === 'visual' && (
          <div className="space-y-4">
            <div>
              <p className="font-mono text-[10px] tracking-[0.22em] text-white/45">
                ESTACIÓN · PAQUETE DE NIEVE
              </p>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => onSeasonChange('summer')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 font-mono text-[11px] font-semibold transition-colors ${
                    seasonMode === 'summer'
                      ? 'border-amber-300/60 bg-amber-300/95 text-slate-950 shadow'
                      : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  ☀ Verano Alpino
                </button>
                <button
                  type="button"
                  onClick={() => onSeasonChange('winter')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 font-mono text-[11px] font-semibold transition-colors ${
                    seasonMode === 'winter'
                      ? 'border-sky-200/70 bg-sky-200 text-slate-950 shadow'
                      : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  ❄ Invierno / Nieve
                </button>
              </div>
            </div>

            <div>
              <p className="font-mono text-[10px] tracking-[0.22em] text-white/45">
                ILUMINACIÓN · HORA DEL DÍA
              </p>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {TIME_ORDER.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={chip(timeOfDay === t)}
                    onClick={() => onTimeChange(t)}
                  >
                    {TIME_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-mono text-[10px] tracking-[0.22em] text-white/45">CAPAS DEL MAPA 3D</p>
              <SwitchRow
                label="Etiquetas de Picos"
                sub={`${peakCount} cumbres visibles en el relieve`}
                checked={showPeaks}
                onChange={onTogglePeaks}
                accent="sky"
              />
              <SwitchRow
                label="Refugios de Montaña"
                sub={`${hutCount} refugios guardados y libres`}
                checked={showHuts}
                onChange={onToggleHuts}
                accent="amber"
              />
            </div>

            <div className="pt-1">
              <p className="font-mono text-[10px] tracking-[0.22em] text-white/45">
                EXPLORACIÓN CINEMATOGRÁFICA
              </p>
              <button
                type="button"
                onClick={() => {
                  onToggleTour()
                  if (!tourActive) onClose()
                }}
                className={`mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-mono text-xs font-semibold transition-colors ${
                  tourActive
                    ? 'bg-sky-300 text-slate-950 hover:bg-sky-200'
                    : 'bg-gradient-to-r from-sky-400 to-teal-300 text-slate-950 hover:opacity-95'
                }`}
              >
                {tourActive ? '⏹ Detener Tour Cordillera' : '▶ Iniciar Tour Sobrevolar Cordillera'}
              </button>
            </div>
          </div>
        )}

        {tab === 'gpx' && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => {
                onClose()
                onUploadGpx()
              }}
              className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-teal-300/45 bg-teal-400/10 px-4 py-6 text-center transition-colors hover:border-teal-300/75 hover:bg-teal-400/15"
            >
              <span className="text-2xl">📂</span>
              <span className="mt-2 font-sans text-sm font-semibold text-white">
                Subir o arrastrar archivo .GPX
              </span>
              <span className="mt-1 font-mono text-[10px] text-teal-200/75">
                WIKILOC · STRAVA · GARMIN · KOMOOT
              </span>
            </button>

            <div>
              <p className="font-mono text-[10px] tracking-[0.22em] text-white/45">
                TRACKS CARGADOS EN ESTA SESIÓN ({gpxHistory.length})
              </p>

              {gpxHistory.length === 0 ? (
                <p className="mt-2 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 text-xs leading-relaxed text-white/50">
                  Aún no has cargado ningún track `.gpx`. Arrastra un archivo sobre la pantalla o usa
                  el botón superior para proyectarlo en 3D.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {gpxHistory.map((track) => (
                    <li
                      key={track.id}
                      className="rounded-xl border border-teal-300/25 bg-white/[0.04] p-3"
                    >
                      <p className="truncate text-xs font-semibold text-white">{track.name}</p>
                      <p className="mt-1 font-mono text-[10px] text-white/60">
                        {track.distanceKm} km · +{track.elevationGain} m · {track.estimatedTime}
                      </p>
                      <div className="mt-2.5 flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onOpenGpxTrack(track)
                            onClose()
                          }}
                          className="flex-1 rounded-lg border border-teal-300/35 bg-teal-400/15 py-1.5 font-mono text-[10px] font-semibold text-teal-100 transition-colors hover:bg-teal-400/25"
                        >
                          Ver en 3D
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onReplayGpxTrack(track)
                            onClose()
                          }}
                          className="flex-1 rounded-lg bg-amber-400 py-1.5 font-mono text-[10px] font-bold text-slate-950 transition-colors hover:bg-amber-300"
                        >
                          🎬 Vídeo Cozy
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
