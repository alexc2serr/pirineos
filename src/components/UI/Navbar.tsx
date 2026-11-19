import { useEffect, useMemo, useState } from 'react'
import { HUTS, peaks, type Country } from '../../data/pyrenees'

interface SearchHit {
  id: string
  kind: 'peak' | 'hut'
  name: string
  elevation: number
  country: Country
  massif: string
}

interface NavbarProps {
  menuOpen: boolean
  onToggleMenu: () => void
  onSelectPeak: (id: string) => void
  onSelectHut: (id: string) => void
  onUploadGpx: () => void
  onOpenCompass: () => void
  hasActiveFilters: boolean
}

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

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
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
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

/** Barra superior minimalista: título a la izquierda y herramientas compactas a la derecha. */
export function Navbar({
  menuOpen,
  onToggleMenu,
  onSelectPeak,
  onSelectHut,
  onUploadGpx,
  onOpenCompass,
  hasActiveFilters,
}: NavbarProps) {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)

  const hits = useMemo<SearchHit[]>(() => {
    const q = norm(query.trim())
    if (!q) return []
    const peakMatches: SearchHit[] = peaks
      .filter((p) => norm(`${p.name} ${p.massif}`).includes(q))
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        kind: 'peak',
        name: p.name,
        elevation: p.elevation,
        country: p.country,
        massif: p.massif,
      }))
    const hutMatches: SearchHit[] = HUTS.filter((h) => norm(`${h.name} ${h.massif}`).includes(q))
      .slice(0, 4)
      .map((h) => ({
        id: h.id,
        kind: 'hut',
        name: h.name,
        elevation: h.elevation,
        country: h.country,
        massif: h.massif,
      }))
    return [...peakMatches, ...hutMatches].slice(0, 7)
  }, [query])

  const pick = (hit: SearchHit) => {
    setQuery('')
    setFocused(false)
    if (hit.kind === 'peak') onSelectPeak(hit.id)
    else onSelectHut(hit.id)
  }

  return (
    <header className="pointer-events-none fixed left-4 right-4 top-4 z-40 flex items-center justify-between gap-3">
      {/* Bloque Izquierdo: Título editorial compacto */}
      <div className="pointer-events-auto select-none">
        <h1 className="font-display text-2xl font-semibold leading-none tracking-[0.22em] text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.65)] sm:text-3xl lg:text-4xl lg:tracking-[0.26em]">
          PIRINEOS
        </h1>
        <div className="mt-1.5 hidden items-center gap-2.5 lg:flex">
          <span className="h-px w-8 bg-white/55" />
          <p className="font-mono text-[10px] tracking-[0.2em] text-white/75">
            CORDILLERA TRANSFRONTERIZA · ES / FR · 3.404M MAX
          </p>
        </div>
      </div>

      {/* Bloque Derecho: Toolbar glassmorphism compacta */}
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-white/10 bg-slate-950/70 p-1.5 text-white shadow-2xl backdrop-blur-md sm:gap-2">
        {/* 1. Buscador rápido unificado (picos + refugios) */}
        <div className="relative w-36 sm:w-56 md:w-64">
          <svg
            viewBox="0 0 20 20"
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/45"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden
          >
            <circle cx="9" cy="9" r="6" />
            <path d="m14 14 3.5 3.5" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 140)}
            placeholder="Buscar pico o refugio…"
            className="h-9 w-full rounded-xl border border-white/10 bg-white/5 pl-8 pr-2.5 font-sans text-xs text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
          />
          {focused && hits.length > 0 && (
            <ul className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-white/15 bg-slate-950/95 shadow-2xl backdrop-blur-md sm:w-80">
              {hits.map((hit) => (
                <li key={`${hit.kind}-${hit.id}`}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(hit)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-white/10"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`shrink-0 rounded px-1 py-0.5 font-mono text-[8.5px] font-semibold uppercase ${
                            hit.kind === 'hut'
                              ? 'bg-amber-400/20 text-amber-200'
                              : 'bg-sky-400/20 text-sky-200'
                          }`}
                        >
                          {hit.kind === 'hut' ? 'Ref' : 'Pico'}
                        </span>
                        <span className="truncate text-xs font-medium text-white">{hit.name}</span>
                      </div>
                      <span className="mt-0.5 block truncate font-mono text-[9.5px] text-white/45">
                        {hit.massif}
                      </span>
                    </div>
                    <div className="shrink-0 text-right font-mono">
                      <span className="block text-[11px] text-amber-100/90">
                        {hit.elevation.toLocaleString('es-ES')} m
                      </span>
                      <span className="block text-[9px] text-white/45">{hit.country}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 2. Acceso rápido Modo Brújula ("¿Qué pico estoy viendo?") */}
        <button
          type="button"
          onClick={onOpenCompass}
          title="Modo Brújula: ¿Qué pico estoy viendo?"
          aria-label="Modo Brújula: ¿Qué pico estoy viendo?"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-300/30 bg-amber-400/15 text-base transition-colors hover:bg-amber-400/30"
        >
          🧭
        </button>

        {/* 3. Botón acción rápida Subir GPX */}
        <button
          type="button"
          onClick={onUploadGpx}
          title="Importar track .GPX (Wikiloc, Strava, Garmin)"
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-teal-300/30 bg-teal-400/15 px-2.5 font-mono text-[11px] font-medium text-teal-100 transition-colors hover:bg-teal-400/30"
        >
          <svg
            viewBox="0 0 20 20"
            className="h-4 w-4 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M10 13V4m0 0-3.5 3.5M10 4l3.5 3.5" />
            <path d="M3.5 13.5v1.5a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-1.5" />
          </svg>
          <span className="hidden sm:inline">Subir GPX</span>
        </button>

        {/* 3. Pantalla completa */}
        <FullscreenButton />

        {/* 4. Botón Hamburguesa */}
        <button
          type="button"
          onClick={onToggleMenu}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú de herramientas'}
          className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors ${
            menuOpen
              ? 'border-white/40 bg-white text-slate-950'
              : 'border-white/15 bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          {menuOpen ? (
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M5 5l10 10M15 5 5 15" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13" />
            </svg>
          )}
          {!menuOpen && hasActiveFilters && (
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-slate-950 bg-amber-400" />
          )}
        </button>
      </div>
    </header>
  )
}
