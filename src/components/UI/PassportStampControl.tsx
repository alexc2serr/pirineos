import { useState } from 'react'
import type { PassportEntry } from '../../hooks/useMountaineerPassport'

interface PassportStampControlProps {
  kind: 'peak' | 'hut'
  entry: PassportEntry | undefined
  onToggle: () => void
  onUpdate: (patch: Partial<Pick<PassportEntry, 'date' | 'notes'>>) => void
}

/** Sello alpino interactivo para marcar cumbres coronadas o refugios visitados con fecha y nota personal. */
export function PassportStampControl({ kind, entry, onToggle, onUpdate }: PassportStampControlProps) {
  const [showNotes, setShowNotes] = useState(false)
  const completed = Boolean(entry)

  const markLabel = kind === 'peak' ? '🏔 Marcar como Coronado' : '🏠 Marcar como Visitado'
  const doneLabel = kind === 'peak' ? '✓ Coronado' : '✓ Visitado'

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 font-mono text-xs font-semibold transition-all ${
            completed
              ? 'border-emerald-300/60 bg-emerald-400/90 text-slate-950 shadow-[0_0_20px_rgba(52,211,153,0.3)] hover:bg-emerald-300'
              : 'border-white/15 bg-white/5 text-white/90 hover:border-emerald-300/40 hover:bg-emerald-400/15'
          }`}
        >
          {completed ? doneLabel : markLabel}
        </button>

        {completed && entry && (
          <button
            type="button"
            onClick={() => setShowNotes((v) => !v)}
            className="rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-2.5 py-2 font-mono text-[10.5px] font-medium text-emerald-200 transition-colors hover:bg-emerald-400/20"
          >
            {showNotes ? 'Ocultar nota' : entry.notes ? '✎ Ver nota' : '+ Nota / Fecha'}
          </button>
        )}
      </div>

      {completed && entry && (
        <div className="mt-2 rounded-xl border border-emerald-300/25 bg-emerald-950/35 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <label className="font-mono text-[9.5px] tracking-[0.16em] text-emerald-200/75">
              {kind === 'peak' ? 'FECHA ASCENSIÓN' : 'FECHA VISITA'}
            </label>
            <input
              type="date"
              value={entry.date}
              onChange={(e) => onUpdate({ date: e.target.value })}
              className="rounded-md border border-emerald-300/25 bg-slate-950/70 px-2 py-0.5 font-mono text-[11px] text-emerald-100 focus:border-emerald-300 focus:outline-none"
            />
          </div>

          {showNotes && (
            <textarea
              rows={2}
              value={entry.notes}
              onChange={(e) => onUpdate({ notes: e.target.value })}
              placeholder={
                kind === 'peak'
                  ? 'Ej. Subida desde Pineta con nieve primavera…'
                  : 'Ej. Noche espectacular con cena caliente…'
              }
              className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-slate-950/70 p-2 font-sans text-xs text-white placeholder:text-white/35 focus:border-emerald-300/50 focus:outline-none"
            />
          )}
        </div>
      )}
    </div>
  )
}
