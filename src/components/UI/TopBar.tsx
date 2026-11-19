import { useEffect, useMemo, useState } from 'react'
import { HUTS, peaks } from '../../data/pyrenees'
import { TIME_LABEL, TIME_ORDER, type TimeOfDay } from '../../lib/atmosphere'
import {
  DIFFICULTIES,
  type AltitudeFilter,
  type DifficultyFilter,
  type Filters,
  type HutFilters,
  type HutTypeFilter,
  type SideFilter,
} from '../../lib/filters'

export type ExplorerTab = 'peaks' | 'huts'

interface TopBarProps {
  tab: ExplorerTab
  onTabChange: (tab: ExplorerTab) => void
  filters: Filters
  onChange: (filters: Filters) => void
  hutFilters: HutFilters
  onHutFiltersChange: (filters: HutFilters) => void
  peakCount: number
  hutCount: number
  onSelectPeak: (id: string) => void
  onSelectHut: (id: string) => void
  timeOfDay: TimeOfDay
  onTimeChange: (time: TimeOfDay) => void
  showHuts: boolean
  onToggleHuts: () => void
  tourActive: boolean
  onToggleTour: () => void
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
  { value: 'Libre / Vivac', label: 'Libres / Vivac' },
]

const chip = (active: boolean) =>
  `rounded-md px-2 py-1 font-mono text-[10px] tracking-wide transition-colors ${
    active ? 'bg-white/90 font-medium text-slate-900' : 'text-white/70 hover:bg-white/10 hover:text-white'
  }`

const amberChip = (active: boolean) =>
  `rounded-md px-2 py-1 font-mono text-[10px] tracking-wide transition-colors ${
    active ? 'bg-amber-300/95 font-medium text-slate-950' : 'text-white/70 hover:bg-white/10 hover:text-white'
  }`

function FullscreenButton() {
  const [active, setActive] = useState(false)

  useEffect(() => {
    const sync = () => setActive(document.fullscreenElement !== null)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen().catch(() => undefined)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={active ? 'Salir de pantalla completa' : 'Pantalla completa'}
      aria-label={active ? 'Salir de pantalla completa' : 'Pantalla completa'}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {active ? (
          <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
        ) : (
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        )}
      </svg>
    </button>
  )
}

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function TopBar({
  tab,
  onTabChange,
  filters,
  onChange,
  hutFilters,
  onHutFiltersChange,
  peakCount,
  hutCount,
  onSelectPeak,
  onSelectHut,
  timeOfDay,
  onTimeChange,
  showHuts,
  onToggleHuts,
  tourActive,
  onToggleTour,
}: TopBarProps) {
  const [focused, setFocused] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const query = tab === 'peaks' ? filters.query : hutFilters.query
  const setQuery = (q: string) => {
    if (tab === 'peaks') onChange({ ...filters, query: q })
    else onHutFiltersChange({ ...hutFilters, query: q })
  }

  const peakSuggestions = useMemo(() => {
    if (tab !== 'peaks') return []
    const q = norm(filters.query.trim())
    if (!q) return []
    return peaks.filter((p) => norm(`${p.name} ${p.massif}`).includes(q)).slice(0, 6)
  }, [tab, filters.query])

  const hutSuggestions = useMemo(() => {
    if (tab !== 'huts') return []
    const q = norm(hutFilters.query.trim())
    if (!q) return []
    return HUTS.filter((h) => norm(`${h.name} ${h.massif}`).includes(q)).slice(0, 6)
  }, [tab, hutFilters.query])

  const handlePickPeak = (id: string) => {
    onSelectPeak(id)
    setFocused(false)
    setMobileOpen(false)
  }

  const handlePickHut = (id: string) => {
    onSelectHut(id)
    setFocused(false)
    setMobileOpen(false)
  }

  return (
    <>
      {/* Botón compacto móvil (< md) arriba a la derecha */}
      <div className="pointer-events-auto fixed right-3 top-3 z-50 flex items-center gap-1.5 md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-white/15 bg-slate-950/75 px-3 font-mono text-[11px] font-medium text-white shadow-lg backdrop-blur-md transition-colors hover:bg-slate-900"
        >
          <span>{mobileOpen ? '✕ Cerrar' : '🔍 Explorar / Filtros'}</span>
        </button>
        <FullscreenButton />
      </div>

      {/* Fondo semitransparente para cerrar el cajón en móvil */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px] md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Panel de filtros: desplegable modal en móvil, fijo arriba a la derecha en md+ */}
      <div
        className={`pointer-events-auto fixed inset-x-3 top-14 z-50 max-h-[78vh] overflow-y-auto rounded-xl border border-white/10 bg-slate-950/85 p-3 text-white shadow-2xl backdrop-blur-md md:inset-x-auto md:right-8 md:top-7 md:z-40 md:block md:max-h-none md:w-[440px] md:overflow-visible md:bg-slate-950/65 ${
          mobileOpen ? 'block' : 'hidden'
        }`}
      >
        {/* Pestañas Picos / Refugios + Pantalla completa (en desktop) */}
        <div className="flex items-center gap-2">
          <div className="grid flex-1 grid-cols-2 gap-1 rounded-lg border border-white/10 bg-white/5 p-0.5">
            <button
              type="button"
              onClick={() => onTabChange('peaks')}
              className={`rounded-md py-1 font-mono text-[11px] tracking-wider transition-colors ${
                tab === 'peaks' ? 'bg-white/90 font-semibold text-slate-900' : 'text-white/70 hover:text-white'
              }`}
            >
              PICOS ({peakCount}/{peaks.length})
            </button>
            <button
              type="button"
              onClick={() => onTabChange('huts')}
              className={`rounded-md py-1 font-mono text-[11px] tracking-wider transition-colors ${
                tab === 'huts'
                  ? 'bg-amber-300/95 font-semibold text-slate-950'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              REFUGIOS ({hutCount}/{HUTS.length})
            </button>
          </div>
          <div className="hidden md:block">
            <FullscreenButton />
          </div>
        </div>

        {/* Buscador rápido */}
        <div className="relative mt-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 120)}
            placeholder={
              tab === 'peaks'
                ? 'Buscar pico o macizo (ej. Aneto, Estiva, Telera)…'
                : 'Buscar refugio (ej. Estiva, La Larri, Góriz)…'
            }
            className="h-8 w-full rounded-lg border border-white/10 bg-white/5 px-3 font-sans text-xs text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
          />
          {focused && tab === 'peaks' && peakSuggestions.length > 0 && (
            <ul className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-white/10 bg-slate-950/95 backdrop-blur-md">
              {peakSuggestions.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handlePickPeak(p.id)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-white/10"
                  >
                    <span className="truncate font-medium">{p.name}</span>
                    <span className="ml-2 shrink-0 font-mono text-[11px] text-white/60">
                      {p.elevation.toLocaleString('es-ES')} m
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {focused && tab === 'huts' && hutSuggestions.length > 0 && (
            <ul className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-amber-200/20 bg-slate-950/95 backdrop-blur-md">
              {hutSuggestions.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handlePickHut(h.id)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-white/10"
                  >
                    <span className="truncate font-medium text-amber-100">{h.name}</span>
                    <span className="ml-2 shrink-0 font-mono text-[10px] text-white/60">
                      {h.elevation.toLocaleString('es-ES')} m · {h.type === 'Guardado' ? 'Guard.' : 'Libre'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

      {/* Filtros dinámicos según pestaña */}
      {tab === 'peaks' ? (
        <div className="mt-2 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-0.5" role="group" aria-label="Vertiente">
              {SIDES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  className={chip(filters.side === s.value)}
                  onClick={() => onChange({ ...filters, side: s.value })}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-0.5" role="group" aria-label="Dificultad">
              {(['all', ...DIFFICULTIES] as DifficultyFilter[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  className={chip(filters.difficulty === d)}
                  onClick={() => onChange({ ...filters, difficulty: d })}
                >
                  {d === 'all' ? 'Todas' : d}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-0.5" role="group" aria-label="Altitud">
            <span className="mr-1 font-mono text-[9px] tracking-[0.15em] text-white/40">ALT:</span>
            {ALTITUDES.map((a) => (
              <button
                key={a.value}
                type="button"
                className={chip(filters.altitude === a.value)}
                onClick={() => onChange({ ...filters, altitude: a.value })}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-2 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-0.5" role="group" aria-label="Vertiente refugios">
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
            <div className="flex items-center gap-0.5" role="group" aria-label="Tipo de refugio">
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

          <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Servicios">
            <span className="mr-0.5 font-mono text-[9px] tracking-[0.15em] text-white/40">SERV:</span>
            <button
              type="button"
              className={amberChip(hutFilters.meals)}
              onClick={() => onHutFiltersChange({ ...hutFilters, meals: !hutFilters.meals })}
            >
              Con comidas
            </button>
            <button
              type="button"
              className={amberChip(hutFilters.showers)}
              onClick={() => onHutFiltersChange({ ...hutFilters, showers: !hutFilters.showers })}
            >
              Con duchas
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
      )}

      {/* Hora del día + capa Refugios + Tour */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5 border-t border-white/10 pt-2">
        <div className="flex items-center gap-0.5" role="group" aria-label="Hora del día">
          {TIME_ORDER.map((t) => (
            <button key={t} type="button" className={chip(timeOfDay === t)} onClick={() => onTimeChange(t)}>
              {TIME_LABEL[t]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleHuts}
            aria-pressed={showHuts}
            title="Mostrar u ocultar refugios en el mapa 3D"
            className={`flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px] tracking-wide transition-colors ${
              showHuts
                ? 'border-amber-300/60 bg-amber-400/90 font-medium text-slate-950'
                : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10 hover:text-white'
            }`}
          >
            <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" fill="currentColor" aria-hidden>
              <path d="M8 1.5 1 8h2v6.5h4v-4h2v4h4V8h2L8 1.5Z" />
            </svg>
            Refugios
          </button>

          <button
            type="button"
            onClick={onToggleTour}
            aria-pressed={tourActive}
            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[10px] tracking-wide transition-colors ${
              tourActive
                ? 'border-sky-300/60 bg-sky-300/90 font-medium text-slate-950'
                : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            {tourActive ? (
              <>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-950" />
                Detener
              </>
            ) : (
              <>
                <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" fill="currentColor" aria-hidden>
                  <path d="M4 3.2v9.6L13 8 4 3.2Z" />
                </svg>
                Sobrevolar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
    </>
  )
}
