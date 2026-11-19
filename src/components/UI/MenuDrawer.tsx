import { useMemo, useRef, useState } from 'react'
import { HUTS, hutsById, peaks, peaksById } from '../../data/pyrenees'
import { CLASSIC_TREKS, exportTrekToGpx, type Trek, type TrekStop } from '../../data/treks'
import type {
  ImportPassportResult,
  PassportData,
  PassportStats,
} from '../../hooks/useMountaineerPassport'
import { TIME_LABEL, TIME_ORDER, type SeasonMode, type TimeOfDay } from '../../lib/atmosphere'
import {
  DIFFICULTIES,
  type AltitudeFilter,
  type DifficultyFilter,
  type Filters,
  type HutFilters,
  type HutTypeFilter,
  type PassportStatusFilter,
  type SideFilter,
} from '../../lib/filters'
import type { ParsedGpxTrack } from '../../utils/gpxParser'

export type DrawerTab = 'filters' | 'visual' | 'gpx' | 'passport' | 'treks'
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
  onOpenCompass: () => void
  gpxHistory: ParsedGpxTrack[]
  onUploadGpx: () => void
  onOpenGpxTrack: (track: ParsedGpxTrack) => void
  onReplayGpxTrack: (track: ParsedGpxTrack) => void
  passportData: PassportData
  passportStats: PassportStats
  onExportPassport: () => void
  onImportPassport: (file: File) => Promise<ImportPassportResult>
  onSelectPeak: (id: string) => void
  onSelectHut: (id: string) => void
  // Travesías Multi-Etapa
  customTreks: Trek[]
  isBuildingTrek: boolean
  draftTrekName: string
  draftStops: TrekStop[]
  draftTrek: Trek | null
  onDraftNameChange: (name: string) => void
  onStartBuildingTrek: () => void
  onCancelBuildingTrek: () => void
  onRemoveDraftStop: (idx: number) => void
  onMoveDraftStop: (idx: number, delta: -1 | 1) => void
  onSaveDraftTrek: () => void
  onDeleteCustomTrek: (id: string) => void
  onOpenTrek: (trek: Trek) => void
  onReplayTrek: (trek: Trek) => void
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

const PASSPORT_FILTERS: { value: PassportStatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'completed', label: '✓ Coronados' },
  { value: 'pending', label: 'Pendientes' },
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

function ProgressRow({
  label,
  current,
  total,
  barClass,
}: {
  label: string
  current: number
  total: number
  barClass: string
}) {
  const pct = total > 0 ? Math.min(100, (current / total) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between font-mono text-[10.5px]">
        <span className="text-white/75">{label}</span>
        <span className="font-semibold text-white">
          {current} <span className="text-white/45">/ {total}</span>
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full transition-all duration-500 ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/** Menú hamburguesa lateral organizado en 4 pestañas: Filtros, Visual, GPX y Pasaporte. */
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
  onOpenCompass,
  gpxHistory,
  onUploadGpx,
  onOpenGpxTrack,
  onReplayGpxTrack,
  passportData,
  passportStats,
  onExportPassport,
  onImportPassport,
  onSelectPeak,
  onSelectHut,
  customTreks,
  isBuildingTrek,
  draftTrekName,
  draftStops,
  draftTrek,
  onDraftNameChange,
  onStartBuildingTrek,
  onCancelBuildingTrek,
  onRemoveDraftStop,
  onMoveDraftStop,
  onSaveDraftTrek,
  onDeleteCustomTrek,
  onOpenTrek,
  onReplayTrek,
}: MenuDrawerProps) {
  const [tab, setTab] = useState<DrawerTab>('filters')
  const [importFeedback, setImportFeedback] = useState<string | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  const timelineItems = useMemo(() => {
    const items: {
      key: string
      id: string
      kind: 'peak' | 'hut'
      name: string
      elevation: number
      date: string
      notes: string
    }[] = []

    for (const entry of Object.values(passportData.completedPeaks)) {
      const p = peaksById[entry.id]
      if (!p) continue
      items.push({
        key: `peak-${p.id}`,
        id: p.id,
        kind: 'peak',
        name: p.name,
        elevation: p.elevation,
        date: entry.date,
        notes: entry.notes,
      })
    }
    for (const entry of Object.values(passportData.visitedHuts)) {
      const h = hutsById[entry.id]
      if (!h) continue
      items.push({
        key: `hut-${h.id}`,
        id: h.id,
        kind: 'hut',
        name: h.name,
        elevation: h.elevation,
        date: entry.date,
        notes: entry.notes,
      })
    }

    items.sort((a, b) => b.date.localeCompare(a.date))
    return items
  }, [passportData])

  const handleImportFile = async (file: File) => {
    const res = await onImportPassport(file)
    if (res.ok) {
      setImportFeedback(`Importado: ${res.peaksCount} cumbres y ${res.hutsCount} refugios.`)
    } else {
      setImportFeedback(res.error)
    }
    window.setTimeout(() => setImportFeedback(null), 5000)
  }

  return (
    <aside
      aria-hidden={!open}
      className={`pointer-events-auto fixed right-4 top-20 z-40 flex max-h-[calc(100vh-96px)] w-[min(92vw,392px)] flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-950/85 text-white shadow-2xl backdrop-blur-md transition-all duration-300 ease-out sm:w-96 ${
        open ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-[115%] opacity-0'
      }`}
    >
      <input
        ref={importInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleImportFile(file)
          e.target.value = ''
        }}
      />

      {/* Cabecera de 5 pestañas */}
      <div className="border-b border-white/10 p-2">
        <div className="grid grid-cols-5 gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
          {(
            [
              { id: 'filters', label: 'Filtros' },
              { id: 'visual', label: 'Visual' },
              { id: 'treks', label: 'Travesías' },
              { id: 'gpx', label: gpxHistory.length ? `GPX(${gpxHistory.length})` : 'GPX' },
              { id: 'passport', label: '🏅' },
            ] as { id: DrawerTab; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              title={t.id === 'passport' ? 'Pasaporte Montañero' : t.label}
              onClick={() => setTab(t.id)}
              className={`truncate rounded-lg px-1 py-1.5 font-mono text-[9.5px] font-medium tracking-tight transition-colors ${
                tab === t.id
                  ? t.id === 'passport'
                    ? 'bg-emerald-400 font-semibold text-slate-950 shadow'
                    : t.id === 'treks'
                      ? 'bg-sky-400 font-semibold text-slate-950 shadow'
                      : 'bg-white text-slate-950 shadow'
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
            <div>
              <p className="font-mono text-[10px] tracking-[0.22em] text-white/45">EXPLORAR</p>
              <div className="mt-2 grid grid-cols-2 gap-1.5 rounded-xl border border-white/10 bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() => onExplorerModeChange('peaks')}
                  className={`rounded-lg py-2 font-mono text-[11px] font-semibold transition-colors ${
                    explorerMode === 'peaks' ? 'bg-white text-slate-950' : 'text-white/70 hover:text-white'
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

                <div>
                  <p className="font-mono text-[10px] tracking-[0.22em] text-white/45">MI PASAPORTE</p>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {PASSPORT_FILTERS.map((pf) => (
                      <button
                        key={pf.value}
                        type="button"
                        className={`rounded-lg px-2 py-1.5 font-mono text-[10.5px] tracking-wide transition-colors ${
                          filters.passport === pf.value
                            ? 'bg-emerald-400 font-semibold text-slate-950'
                            : 'bg-white/5 text-white/75 hover:bg-white/10 hover:text-white'
                        }`}
                        onClick={() => onFiltersChange({ ...filters, passport: pf.value })}
                      >
                        {pf.label}
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

            <div className="space-y-2 pt-1">
              <p className="font-mono text-[10px] tracking-[0.22em] text-white/45">
                EXPLORACIÓN CINEMATOGRÁFICA
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onOpenCompass()
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300/40 bg-amber-400/20 px-4 py-3 font-mono text-xs font-semibold text-amber-100 transition-colors hover:bg-amber-400/30"
              >
                🧭 ¿Qué pico estoy viendo?
              </button>
              <button
                type="button"
                onClick={() => {
                  onToggleTour()
                  if (!tourActive) onClose()
                }}
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-mono text-xs font-semibold transition-colors ${
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

        {tab === 'treks' && (
          <div className="space-y-5">
            {/* Sección 1: Constructor Personalizado Multi-Etapa */}
            <div>
              <p className="font-mono text-[10px] tracking-[0.22em] text-white/45">
                MI PLANIFICADOR MULTI-ETAPA
              </p>

              {!isBuildingTrek ? (
                <button
                  type="button"
                  onClick={onStartBuildingTrek}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-sky-300/45 bg-sky-400/20 px-4 py-3 font-mono text-xs font-semibold text-sky-100 transition-colors hover:bg-sky-400/30"
                >
                  ➕ Crear Nueva Travesía en 3D
                </button>
              ) : (
                <div className="mt-2 space-y-3 rounded-2xl border border-sky-300/40 bg-sky-950/35 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-semibold tracking-[0.16em] text-sky-300">
                      MODO CREACIÓN ACTIVO
                    </span>
                    <button
                      type="button"
                      onClick={onCancelBuildingTrek}
                      className="font-mono text-[10px] text-white/60 hover:text-white"
                    >
                      Cancelar
                    </button>
                  </div>

                  <input
                    value={draftTrekName}
                    onChange={(e) => onDraftNameChange(e.target.value)}
                    placeholder="Nombre de tu travesía…"
                    className="h-8 w-full rounded-lg border border-white/15 bg-slate-950/70 px-2.5 font-sans text-xs text-white focus:border-sky-300 focus:outline-none"
                  />

                  <p className="text-[11px] leading-relaxed text-sky-100/80">
                    Haz clic en los <strong>refugios o picos</strong> del mapa 3D (o en el buscador
                    superior) para ir encadenando paradas.
                  </p>

                  {draftStops.length > 0 && (
                    <ol className="space-y-1.5">
                      {draftStops.map((stop, idx) => (
                        <li
                          key={`${stop.id}-${idx}`}
                          className="flex items-center justify-between gap-1.5 rounded-lg border border-white/10 bg-slate-950/60 px-2.5 py-1.5"
                        >
                          <div className="min-w-0">
                            <span className="font-mono text-[9.5px] font-bold text-sky-300">
                              {idx === 0 ? 'SALIDA' : `NOCHE ${idx}`}
                            </span>
                            <span className="ml-1.5 truncate text-xs text-white">{stop.name}</span>
                          </div>
                          <div className="flex shrink-0 items-center gap-0.5 font-mono text-[10px]">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => onMoveDraftStop(idx, -1)}
                              className="rounded px-1 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-25"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              disabled={idx === draftStops.length - 1}
                              onClick={() => onMoveDraftStop(idx, 1)}
                              className="rounded px-1 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-25"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemoveDraftStop(idx)}
                              className="rounded px-1 text-rose-300/80 hover:bg-rose-400/20 hover:text-rose-200"
                            >
                              ✕
                            </button>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}

                  {draftTrek && (
                    <>
                      <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-slate-950/60 p-2 text-center font-mono text-[10px]">
                        <div>
                          <span className="block text-white/45">ETAPAS</span>
                          <span className="font-semibold text-white">{draftTrek.stages.length} d</span>
                        </div>
                        <div>
                          <span className="block text-white/45">DIST.</span>
                          <span className="font-semibold text-sky-200">{draftTrek.totalDistanceKm} km</span>
                        </div>
                        <div>
                          <span className="block text-white/45">DESNIVEL</span>
                          <span className="font-semibold text-amber-200">
                            +{draftTrek.totalElevationGain} m
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-1.5">
                        <button
                          type="button"
                          onClick={onSaveDraftTrek}
                          className="w-full rounded-lg bg-sky-400 py-2 font-mono text-[11px] font-bold text-slate-950 hover:bg-sky-300"
                        >
                          ✓ Guardar Travesía
                        </button>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onClose()
                              onReplayTrek(draftTrek)
                            }}
                            className="rounded-lg bg-amber-400 py-1.5 font-mono text-[10px] font-bold text-slate-950 hover:bg-amber-300"
                          >
                            🎬 Vídeo Cozy
                          </button>
                          <button
                            type="button"
                            onClick={() => exportTrekToGpx(draftTrek)}
                            className="rounded-lg border border-white/15 bg-white/5 py-1.5 font-mono text-[10px] font-semibold text-white/85 hover:bg-white/15"
                          >
                            ⬇ .GPX
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Travesías personalizadas guardadas */}
              {customTreks.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="font-mono text-[9.5px] tracking-[0.2em] text-white/45">
                    GUARDADAS ({customTreks.length})
                  </p>
                  {customTreks.map((trek) => (
                    <div
                      key={trek.id}
                      className="rounded-xl border border-sky-300/25 bg-white/[0.04] p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-white">{trek.name}</p>
                          <p className="mt-0.5 font-mono text-[10px] text-white/55">
                            {trek.stages.length} etapas · {trek.totalDistanceKm} km · +
                            {trek.totalElevationGain} m
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onDeleteCustomTrek(trek.id)}
                          title="Eliminar travesía"
                          className="shrink-0 font-mono text-[10px] text-white/40 hover:text-rose-300"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="mt-2.5 flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onClose()
                            onOpenTrek(trek)
                          }}
                          className="flex-1 rounded-lg bg-sky-400/20 py-1.5 font-mono text-[10px] font-semibold text-sky-200 hover:bg-sky-400/30"
                        >
                          Ver en 3D
                        </button>
                        <button
                          type="button"
                          onClick={() => exportTrekToGpx(trek)}
                          className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 font-mono text-[10px] text-white/80 hover:bg-white/15"
                        >
                          ⬇ .GPX
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sección 2: Travesías Clásicas */}
            <div>
              <p className="font-mono text-[10px] tracking-[0.22em] text-white/45">
                TRAVESÍAS CLÁSICAS ({CLASSIC_TREKS.length})
              </p>
              <div className="mt-2 space-y-2.5">
                {CLASSIC_TREKS.map((trek) => (
                  <div
                    key={trek.id}
                    className="rounded-xl border border-white/10 bg-white/[0.04] p-3 transition-colors hover:border-sky-300/35"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-semibold text-white">{trek.name}</h4>
                        <p className="mt-0.5 text-[10.5px] text-white/55">{trek.region}</p>
                      </div>
                      <span className="shrink-0 rounded-md bg-sky-400/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-sky-200">
                        {trek.stages.length} d
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3 font-mono text-[10px] text-white/65">
                      <span>{trek.totalDistanceKm} km</span>
                      <span>+{trek.totalElevationGain.toLocaleString('es-ES')} m</span>
                    </div>
                    <div className="mt-2.5 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onClose()
                          onOpenTrek(trek)
                        }}
                        className="flex-1 rounded-lg bg-white/90 py-1.5 font-mono text-[10.5px] font-semibold text-slate-950 transition-colors hover:bg-white"
                      >
                        Ver en 3D
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onClose()
                          onReplayTrek(trek)
                        }}
                        className="rounded-lg bg-amber-400 px-2.5 py-1.5 font-mono text-[10.5px] font-bold text-slate-950 transition-colors hover:bg-amber-300"
                      >
                        🎬 Vídeo
                      </button>
                    </div>
                  </div>
                ))}
              </div>
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

        {tab === 'passport' && (
          <div className="space-y-4">
            {/* Tarjeta de rango montañero */}
            <div className="rounded-2xl border border-emerald-300/30 bg-gradient-to-br from-emerald-500/15 via-slate-900/60 to-amber-500/10 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950/70 text-2xl">
                  {passportStats.rank.badge}
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-[9.5px] tracking-[0.2em] text-emerald-300/90">
                    RANGO MONTAÑERO
                  </p>
                  <h3 className="truncate font-display text-base font-semibold text-white">
                    {passportStats.rank.title}
                  </h3>
                  <p className="truncate text-[11px] text-white/60">{passportStats.rank.subtitle}</p>
                </div>
              </div>

              <div className="mt-3.5 grid grid-cols-2 gap-2 font-mono">
                <div className="rounded-lg bg-slate-950/50 px-2.5 py-2">
                  <span className="block text-[8.5px] tracking-[0.16em] text-white/45">COTA MÁXIMA</span>
                  <span className="mt-0.5 block text-sm font-semibold text-amber-200">
                    {passportStats.maxElevationM > 0
                      ? `${passportStats.maxElevationM.toLocaleString('es-ES')} m`
                      : '—'}
                  </span>
                </div>
                <div className="rounded-lg bg-slate-950/50 px-2.5 py-2">
                  <span className="block text-[8.5px] tracking-[0.16em] text-white/45">ALTITUD ACUM.</span>
                  <span className="mt-0.5 block text-sm font-semibold text-emerald-200">
                    {passportStats.accumulatedElevationM > 0
                      ? `${passportStats.accumulatedElevationM.toLocaleString('es-ES')} m`
                      : '—'}
                  </span>
                </div>
              </div>

              <div className="mt-3.5 space-y-2.5">
                <ProgressRow
                  label="Picos Totales"
                  current={passportStats.completedPeaksCount}
                  total={passportStats.totalPeaks}
                  barClass="bg-emerald-400"
                />
                <ProgressRow
                  label="Tresmiles (+3.000 m)"
                  current={passportStats.completed3000Count}
                  total={passportStats.total3000}
                  barClass="bg-amber-400"
                />
                <ProgressRow
                  label="Refugios Visitados"
                  current={passportStats.visitedHutsCount}
                  total={passportStats.totalHuts}
                  barClass="bg-sky-400"
                />
              </div>
            </div>

            {/* Listado cronológico clicable */}
            <div>
              <p className="font-mono text-[10px] tracking-[0.22em] text-white/45">
                MIS CUMBRES Y REFUGIOS ({timelineItems.length})
              </p>

              {timelineItems.length === 0 ? (
                <p className="mt-2 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 text-xs leading-relaxed text-white/50">
                  Abre cualquier pico o refugio en el mapa 3D y pulsa{' '}
                  <strong className="text-emerald-300">Marcar como Coronado</strong> o{' '}
                  <strong className="text-emerald-300">Visitado</strong> para sellar tu pasaporte.
                </p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {timelineItems.map((item) => (
                    <li key={item.key}>
                      <button
                        type="button"
                        onClick={() => {
                          onClose()
                          if (item.kind === 'peak') onSelectPeak(item.id)
                          else onSelectHut(item.id)
                        }}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left transition-colors hover:border-emerald-300/40 hover:bg-white/[0.08]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-semibold text-white">
                            {item.kind === 'peak' ? '🏔 ' : '🏠 '}
                            {item.name}
                          </span>
                          <span className="shrink-0 font-mono text-[10.5px] text-emerald-300">
                            {item.elevation.toLocaleString('es-ES')} m
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2 font-mono text-[9.5px] text-white/45">
                          <span>{item.date}</span>
                          {item.notes && <span className="truncate text-white/65">“{item.notes}”</span>}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Copia de seguridad JSON */}
            <div className="border-t border-white/10 pt-3">
              <p className="font-mono text-[10px] tracking-[0.22em] text-white/45">
                COPIA DE SEGURIDAD (JSON)
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onExportPassport}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 font-mono text-[11px] font-medium text-white/85 transition-colors hover:bg-white/15"
                >
                  ⬇ Exportar JSON
                </button>
                <button
                  type="button"
                  onClick={() => importInputRef.current?.click()}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 font-mono text-[11px] font-medium text-white/85 transition-colors hover:bg-white/15"
                >
                  ⬆ Importar JSON
                </button>
              </div>
              {importFeedback && (
                <p className="mt-2 font-mono text-[10.5px] text-emerald-300">{importFeedback}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
