import { MASSIF_VIEWS, type CameraView } from '../../lib/views'

interface MassifBarProps {
  onGo: (view: CameraView) => void
}

/** Accesos directos inferiores para volar a las grandes zonas de la cordillera. */
export function MassifBar({ onGo }: MassifBarProps) {
  return (
    <nav
      aria-label="Macizos"
      className="pointer-events-auto grid min-w-0 max-w-3xl flex-1 grid-cols-2 gap-1 overflow-hidden rounded-xl border border-white/10 bg-slate-950/65 p-1 text-white shadow-xl backdrop-blur-md sm:p-1.5 md:grid-cols-4"
    >
      {MASSIF_VIEWS.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onGo(m.view)}
          className="min-w-0 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/10 sm:px-2.5"
        >
          <span className="block truncate text-[11px] font-semibold tracking-wide sm:text-xs">{m.label}</span>
          <span className="hidden truncate font-mono text-[10px] text-white/50 sm:block">{m.sub}</span>
        </button>
      ))}
    </nav>
  )
}
