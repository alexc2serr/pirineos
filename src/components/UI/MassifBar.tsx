import { MASSIF_VIEWS, type CameraView } from '../../lib/views'

interface MassifBarProps {
  onGo: (view: CameraView) => void
}

/** Accesos directos inferiores para volar a las grandes zonas de la cordillera. */
export function MassifBar({ onGo }: MassifBarProps) {
  return (
    <nav
      aria-label="Macizos"
      className="pointer-events-auto grid min-w-0 max-w-3xl flex-1 grid-cols-2 gap-1 overflow-hidden rounded-xl border border-white/10 bg-slate-950/60 p-1.5 text-white shadow-xl backdrop-blur-md md:grid-cols-4"
    >
      {MASSIF_VIEWS.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onGo(m.view)}
          className="min-w-0 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-white/10"
        >
          <span className="block truncate text-xs font-semibold tracking-wide">{m.label}</span>
          <span className="block truncate font-mono text-[10px] text-white/50">{m.sub}</span>
        </button>
      ))}
    </nav>
  )
}
