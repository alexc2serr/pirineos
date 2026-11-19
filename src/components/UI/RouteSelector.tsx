import { useMemo, useState } from 'react'
import type { Route, RouteOriginType } from '../../data/pyrenees'

interface RouteSelectorProps {
  routes: Route[]
  activeRoute: Route | null
  onSelectRoute: (route: Route) => void
  onViewFullRoute: (route: Route) => void
  onStartReplay: (route: Route) => void
}

/** Selector interactivo de rutas dividido en "Desde Parking (Coche)" y "Desde Refugios". */
export function RouteSelector({
  routes,
  activeRoute,
  onSelectRoute,
  onViewFullRoute,
  onStartReplay,
}: RouteSelectorProps) {
  const parkingRoutes = useMemo(() => routes.filter((r) => r.originType === 'parking'), [routes])
  const hutRoutes = useMemo(() => routes.filter((r) => r.originType === 'hut'), [routes])

  const defaultTab: RouteOriginType =
    activeRoute?.originType ?? (parkingRoutes.length > 0 ? 'parking' : 'hut')
  const [originTab, setOriginTab] = useState<RouteOriginType>(defaultTab)

  const currentTab: RouteOriginType =
    originTab === 'parking' && parkingRoutes.length === 0
      ? 'hut'
      : originTab === 'hut' && hutRoutes.length === 0
        ? 'parking'
        : originTab

  const shownRoutes = currentTab === 'parking' ? parkingRoutes : hutRoutes

  if (routes.length === 0) return null

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-mono text-[10px] tracking-[0.25em] text-white/50">
          RUTAS Y ACCESOS 3D
        </h3>
        {activeRoute && (
          <button
            type="button"
            onClick={() => onViewFullRoute(activeRoute)}
            className="flex items-center gap-1 rounded-md border border-sky-300/40 bg-sky-400/20 px-2 py-1 font-mono text-[10px] font-medium text-sky-200 transition-colors hover:bg-sky-400/35"
          >
            <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M3 10s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5Z" />
              <circle cx="10" cy="10" r="2" />
            </svg>
            Ver Ruta Completa
          </button>
        )}
      </div>

      {/* Pestañas Parking vs Refugios */}
      <div className="mt-2 grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-white/5 p-0.5">
        <button
          type="button"
          disabled={parkingRoutes.length === 0}
          onClick={() => {
            setOriginTab('parking')
            if (parkingRoutes[0] && activeRoute?.originType !== 'parking') {
              onSelectRoute(parkingRoutes[0])
            }
          }}
          className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 font-mono text-[10px] tracking-wide transition-colors disabled:opacity-35 ${
            currentTab === 'parking'
              ? 'bg-sky-400/90 font-semibold text-slate-950'
              : 'text-white/75 hover:bg-white/10'
          }`}
        >
          <span className="font-bold">P</span>
          Desde Parking ({parkingRoutes.length})
        </button>
        <button
          type="button"
          disabled={hutRoutes.length === 0}
          onClick={() => {
            setOriginTab('hut')
            if (hutRoutes[0] && activeRoute?.originType !== 'hut') {
              onSelectRoute(hutRoutes[0])
            }
          }}
          className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 font-mono text-[10px] tracking-wide transition-colors disabled:opacity-35 ${
            currentTab === 'hut'
              ? 'bg-amber-400/90 font-semibold text-slate-950'
              : 'text-white/75 hover:bg-white/10'
          }`}
        >
          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor" aria-hidden>
            <path d="M8 1.5 1 8h2v6.5h4v-4h2v4h4V8h2L8 1.5Z" />
          </svg>
          Desde Refugios ({hutRoutes.length})
        </button>
      </div>

      {/* Lista de rutas del bloque activo */}
      <div className="mt-2 space-y-2">
        {shownRoutes.map((route) => {
          const isSelected = activeRoute?.id === route.id
          const isParking = route.originType === 'parking'
          return (
            <div
              key={route.id}
              className={`rounded-xl border transition-colors ${
                isSelected
                  ? isParking
                    ? 'border-sky-300/50 bg-sky-400/10'
                    : 'border-amber-300/50 bg-amber-400/10'
                  : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08]'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectRoute(route)}
                className="w-full p-3 text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold leading-snug text-white">{route.name}</span>
                  <span className="shrink-0 rounded border border-white/15 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/85">
                    {route.difficulty}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-white/65">
                  <span>{route.distanceKm.toLocaleString('es-ES')} km</span>
                  <span>+{route.elevationGain.toLocaleString('es-ES')} m</span>
                  <span>{route.estimatedTime}</span>
                </div>
              </button>

              {isSelected && (
                <div className="border-t border-white/10 px-3 pb-3 pt-2.5 text-xs">
                  <p className="leading-relaxed text-white/75">{route.description}</p>

                  {route.parkingInfo && (
                    <div className="mt-2.5 rounded-lg border border-sky-300/25 bg-slate-950/60 p-2.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-sky-400 font-mono text-[10px] font-bold text-slate-950">
                          P
                        </span>
                        <span className="font-sans text-[11px] font-semibold text-sky-200">
                          {route.parkingInfo.name}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-white/70">
                        {route.parkingInfo.accessNotes}
                      </p>
                    </div>
                  )}

                  <div className="mt-2.5 grid grid-cols-1 gap-1.5">
                    <button
                      type="button"
                      onClick={() => onStartReplay(route)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 px-3 py-2 font-mono text-[11px] font-bold text-slate-950 shadow-md transition-opacity hover:opacity-95"
                    >
                      🎬 Crear Vídeo Cozy de la Ruta
                    </button>
                    <button
                      type="button"
                      onClick={() => onViewFullRoute(route)}
                      className={`flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-[11px] font-semibold transition-colors ${
                        isParking
                          ? 'border-sky-300/40 bg-sky-400/20 text-sky-100 hover:bg-sky-400/30'
                          : 'border-amber-300/40 bg-amber-400/20 text-amber-100 hover:bg-amber-400/30'
                      }`}
                    >
                      Ver Ruta Completa en 3D
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
