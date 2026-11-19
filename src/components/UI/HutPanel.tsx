import { useState } from 'react'
import type { Country, Hut, HutServices, Route } from '../../data/pyrenees'
import { RouteSelector } from './RouteSelector'

interface HutPanelProps {
  hut: Hut | null
  activeRoute: Route | null
  onSelectRoute: (route: Route) => void
  onViewFullRoute: (route: Route) => void
  onStartReplay: (route: Route) => void
  onBack: () => void
}

const COUNTRY_LABEL: Record<Country, string> = {
  ES: 'España',
  FR: 'Francia',
  'ES/FR': 'España / Francia',
}

interface ServiceMeta {
  key: keyof HutServices
  label: string
  icon: string
}

const SERVICE_LIST: ServiceMeta[] = [
  { key: 'meals', label: 'Comidas', icon: 'M4 3v6a2 2 0 0 0 2 2v6h1.5v-6a2 2 0 0 0 2-2V3H8v5H6.5V3H5v5H4V3Zm11 0c-1.7 0-3 1.8-3 4v4h2v6h1.5V3H15Z' },
  { key: 'showers', label: 'Duchas', icon: 'M6 7a5 5 0 0 1 10 0v1H6V7Zm-1 3h12v1.5H5V10Zm2 3.5v2m3-2v3m3-3v2' },
  { key: 'electricity', label: 'Electricidad', icon: 'M11 2 4.5 11H10l-1 7 6.5-9H10l1-7Z' },
  { key: 'wifiOrRadio', label: 'WiFi / Radio', icon: 'M2.5 8.5a11 11 0 0 1 15 0M5.5 11.5a7 7 0 0 1 9 0M8.5 14.5a3 3 0 0 1 3 0M10 17.2h.01' },
  { key: 'water', label: 'Agua', icon: 'M10 2.5C10 2.5 4.5 9 4.5 12.8a5.5 5.5 0 0 0 11 0C15.5 9 10 2.5 10 2.5Z' },
  { key: 'hearth', label: 'Chimenea', icon: 'M10 2.5c2 2.4 4.5 4.7 4.5 8.2a4.5 4.5 0 1 1-9 0c0-1.6.6-3.1 1.6-4.4.2 1.3 1 2.2 1.9 2.4-.5-2-.3-4.3 1-6.2Z' },
]

export function HutPanel({
  hut,
  activeRoute,
  onSelectRoute,
  onViewFullRoute,
  onStartReplay,
  onBack,
}: HutPanelProps) {
  const [lastShown, setLastShown] = useState<Hut | null>(null)
  if (hut && hut.id !== lastShown?.id) {
    setLastShown(hut)
  }
  const shown = hut ?? lastShown
  const open = hut !== null

  return (
    <aside
      aria-hidden={!open}
      className={`pointer-events-auto absolute bottom-28 right-4 top-[17.5rem] z-40 flex w-[min(92vw,400px)] flex-col overflow-hidden rounded-2xl border border-amber-200/20 bg-slate-950/70 text-white shadow-2xl backdrop-blur-md transition-transform duration-500 ease-out sm:right-8 ${
        open ? 'translate-x-0' : 'translate-x-[120%]'
      }`}
    >
      {shown && (
        <>
          <div className="overflow-y-auto p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-white/55">
                {(shown.country === 'ES/FR' ? ['ES', 'FR'] : [shown.country]).map((c) => (
                  <span key={c} className="rounded border border-white/20 px-1.5 py-0.5 text-white/80">
                    {c}
                  </span>
                ))}
                <span>{COUNTRY_LABEL[shown.country].toUpperCase()}</span>
              </div>
              <span
                className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-medium tracking-wider ${
                  shown.type === 'Guardado'
                    ? 'border-emerald-300/35 bg-emerald-400/20 text-emerald-200'
                    : 'border-orange-300/35 bg-orange-400/20 text-orange-200'
                }`}
              >
                {shown.type.toUpperCase()}
              </span>
            </div>

            <h2 className="mt-3 font-display text-2xl font-semibold leading-snug tracking-wide">
              {shown.name}
            </h2>
            <p className="mt-0.5 text-sm text-white/60">Macizo {shown.massif}</p>

            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <p className="font-mono text-4xl font-medium leading-none tracking-tight text-amber-100">
                  {shown.elevation.toLocaleString('es-ES')}
                  <span className="ml-1 text-lg text-white/60">m</span>
                </p>
                <p className="mt-1 font-mono text-[10px] tracking-[0.18em] text-white/45">
                  {shown.coordinates.lat.toFixed(4)}°N · {shown.coordinates.lon.toFixed(4)}°
                </p>
              </div>
              <div className="flex gap-2 font-mono">
                <div className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-center">
                  <span className="block text-[9px] tracking-[0.15em] text-white/45">PLAZAS</span>
                  <span className="block text-base font-semibold text-white">{shown.capacity}</span>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-center">
                  <span className="block text-[9px] tracking-[0.15em] text-white/45">INVIERNO</span>
                  <span className="block text-base font-semibold text-sky-200">{shown.winterCapacity}</span>
                </div>
              </div>
            </div>

            <h3 className="mt-6 font-mono text-[10px] tracking-[0.25em] text-white/50">
              SERVICIOS E INSTALACIONES
            </h3>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              {SERVICE_LIST.map((srv) => {
                const available = shown.services[srv.key]
                return (
                  <div
                    key={srv.key}
                    className={`flex flex-col items-center justify-center rounded-xl border px-2 py-2.5 text-center transition-colors ${
                      available
                        ? 'border-amber-200/30 bg-amber-300/15 text-amber-100'
                        : 'border-white/5 bg-white/[0.02] text-white/30'
                    }`}
                  >
                    <svg
                      viewBox="0 0 20 20"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d={srv.icon} />
                    </svg>
                    <span className="mt-1.5 font-mono text-[10px] leading-tight">{srv.label}</span>
                    <span className="mt-0.5 text-[9px] opacity-75">{available ? 'Disponible' : 'No'}</span>
                  </div>
                )
              })}
            </div>

            <h3 className="mt-6 font-mono text-[10px] tracking-[0.25em] text-white/50">
              APROXIMACIÓN
            </h3>
            <p className="mt-2 rounded-lg border border-white/10 bg-white/5 p-3 text-[13px] leading-relaxed text-white/75">
              {shown.accessNotes}
            </p>

            {shown.routes && shown.routes.length > 0 && (
              <RouteSelector
                key={shown.id}
                routes={shown.routes}
                activeRoute={activeRoute}
                onSelectRoute={onSelectRoute}
                onViewFullRoute={onViewFullRoute}
                onStartReplay={onStartReplay}
              />
            )}

            {(shown.phone || shown.website) && (
              <div className="mt-4 flex flex-wrap gap-2 font-mono text-[11px]">
                {shown.phone && (
                  <a
                    href={`tel:${shown.phone.replace(/\s+/g, '')}`}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                  >
                    Tel: {shown.phone}
                  </a>
                )}
                {shown.website && (
                  <a
                    href={shown.website.startsWith('http') ? shown.website : `https://${shown.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-amber-200/30 bg-amber-300/10 px-3 py-1.5 text-amber-100 transition-colors hover:bg-amber-300/20"
                  >
                    Web oficial ↗
                  </a>
                )}
              </div>
            )}
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
