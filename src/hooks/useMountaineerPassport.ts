import { useCallback, useEffect, useMemo, useState } from 'react'
import { HUTS, hutsById, peaks, peaksById } from '../data/pyrenees'

const STORAGE_KEY = 'pirineos3d_passport_v1'

export interface PassportEntry {
  id: string
  /** Fecha YYYY-MM-DD */
  date: string
  /** Nota personal opcional */
  notes: string
}

export interface PassportData {
  version: 1
  completedPeaks: Record<string, PassportEntry>
  visitedHuts: Record<string, PassportEntry>
}

export interface PassportStats {
  completedPeaksCount: number
  totalPeaks: number
  completed3000Count: number
  total3000: number
  visitedHutsCount: number
  totalHuts: number
  maxElevationM: number
  accumulatedElevationM: number
  rank: {
    title: string
    badge: string
    subtitle: string
  }
}

export type ImportPassportResult =
  | { ok: true; peaksCount: number; hutsCount: number }
  | { ok: false; error: string }

const EMPTY_DATA: PassportData = {
  version: 1,
  completedPeaks: {},
  visitedHuts: {},
}

function todayIso(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function sanitizeEntries(raw: unknown): Record<string, PassportEntry> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, PassportEntry> = {}
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!val || typeof val !== 'object') continue
    const obj = val as Record<string, unknown>
    const id = typeof obj.id === 'string' && obj.id ? obj.id : key
    const date = typeof obj.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(obj.date) ? obj.date : todayIso()
    const notes = typeof obj.notes === 'string' ? obj.notes.slice(0, 300) : ''
    out[id] = { id, date, notes }
  }
  return out
}

function loadFromStorage(): PassportData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_DATA
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return {
      version: 1,
      completedPeaks: sanitizeEntries(parsed.completedPeaks),
      visitedHuts: sanitizeEntries(parsed.visitedHuts),
    }
  } catch {
    return EMPTY_DATA
  }
}

function computeRank(peaksCount: number, count3000: number): PassportStats['rank'] {
  if (count3000 >= 10 || peaksCount >= 25) {
    return {
      title: 'Leyenda de los Tresmiles',
      badge: '👑',
      subtitle: 'Dominio absoluto de la alta cordillera pirenaica',
    }
  }
  if (count3000 >= 3 || peaksCount >= 10) {
    return {
      title: 'Alpinista Pirineísta',
      badge: '⛏️',
      subtitle: 'Asiduo de crestas, glaciares y grandes macizos',
    }
  }
  if (peaksCount >= 3) {
    return {
      title: 'Cazador de Dosmiles',
      badge: '🥾',
      subtitle: 'Sumando cumbres y valles a buen ritmo',
    }
  }
  return {
    title: 'Iniciado Pirenaico',
    badge: '🧭',
    subtitle: 'Comienza tu colección de cumbres y refugios',
  }
}

const TOTAL_3000 = peaks.filter((p) => p.elevation >= 3000).length

export function useMountaineerPassport() {
  const [data, setData] = useState<PassportData>(() => loadFromStorage())

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // Ignorar si el almacenamiento está restringido en navegación privada
    }
  }, [data])

  const togglePeakCompleted = useCallback((peakId: string, date?: string, notes?: string) => {
    setData((prev) => {
      const next = { ...prev.completedPeaks }
      if (next[peakId]) {
        delete next[peakId]
      } else {
        next[peakId] = { id: peakId, date: date ?? todayIso(), notes: notes ?? '' }
      }
      return { ...prev, completedPeaks: next }
    })
  }, [])

  const updatePeakEntry = useCallback(
    (peakId: string, patch: Partial<Pick<PassportEntry, 'date' | 'notes'>>) => {
      setData((prev) => {
        const existing = prev.completedPeaks[peakId] ?? { id: peakId, date: todayIso(), notes: '' }
        return {
          ...prev,
          completedPeaks: {
            ...prev.completedPeaks,
            [peakId]: { ...existing, ...patch },
          },
        }
      })
    },
    [],
  )

  const toggleHutVisited = useCallback((hutId: string, date?: string, notes?: string) => {
    setData((prev) => {
      const next = { ...prev.visitedHuts }
      if (next[hutId]) {
        delete next[hutId]
      } else {
        next[hutId] = { id: hutId, date: date ?? todayIso(), notes: notes ?? '' }
      }
      return { ...prev, visitedHuts: next }
    })
  }, [])

  const updateHutEntry = useCallback(
    (hutId: string, patch: Partial<Pick<PassportEntry, 'date' | 'notes'>>) => {
      setData((prev) => {
        const existing = prev.visitedHuts[hutId] ?? { id: hutId, date: todayIso(), notes: '' }
        return {
          ...prev,
          visitedHuts: {
            ...prev.visitedHuts,
            [hutId]: { ...existing, ...patch },
          },
        }
      })
    },
    [],
  )

  const exportPassportJSON = useCallback(() => {
    const payload = {
      ...data,
      exportedAt: new Date().toISOString(),
      app: 'PIRINEOS 3D',
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mi-pasaporte-pirineos.json'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }, [data])

  const importPassportJSON = useCallback(async (file: File): Promise<ImportPassportResult> => {
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as Record<string, unknown>
      if (!parsed || typeof parsed !== 'object') {
        return { ok: false, error: 'El archivo JSON no tiene un formato de pasaporte válido.' }
      }
      const importedPeaks = sanitizeEntries(parsed.completedPeaks)
      const importedHuts = sanitizeEntries(parsed.visitedHuts)
      const validPeaks: Record<string, PassportEntry> = {}
      const validHuts: Record<string, PassportEntry> = {}

      for (const [id, entry] of Object.entries(importedPeaks)) {
        if (peaksById[id]) validPeaks[id] = entry
      }
      for (const [id, entry] of Object.entries(importedHuts)) {
        if (hutsById[id]) validHuts[id] = entry
      }

      if (Object.keys(validPeaks).length === 0 && Object.keys(validHuts).length === 0) {
        return { ok: false, error: 'No se encontraron cumbres ni refugios válidos en el archivo JSON.' }
      }

      setData((prev) => ({
        version: 1,
        completedPeaks: { ...prev.completedPeaks, ...validPeaks },
        visitedHuts: { ...prev.visitedHuts, ...validHuts },
      }))

      return {
        ok: true,
        peaksCount: Object.keys(validPeaks).length,
        hutsCount: Object.keys(validHuts).length,
      }
    } catch {
      return { ok: false, error: 'No se pudo leer el archivo JSON de copia de seguridad.' }
    }
  }, [])

  const completedPeakIds = useMemo(
    () => new Set(Object.keys(data.completedPeaks)),
    [data.completedPeaks],
  )
  const visitedHutIds = useMemo(() => new Set(Object.keys(data.visitedHuts)), [data.visitedHuts])

  const stats = useMemo<PassportStats>(() => {
    let count3000 = 0
    let maxEle = 0
    let accEle = 0
    let validPeakCount = 0

    for (const id of Object.keys(data.completedPeaks)) {
      const p = peaksById[id]
      if (!p) continue
      validPeakCount += 1
      if (p.elevation >= 3000) count3000 += 1
      if (p.elevation > maxEle) maxEle = p.elevation
      accEle += p.elevation
    }

    let validHutCount = 0
    for (const id of Object.keys(data.visitedHuts)) {
      if (hutsById[id]) validHutCount += 1
    }

    return {
      completedPeaksCount: validPeakCount,
      totalPeaks: peaks.length,
      completed3000Count: count3000,
      total3000: TOTAL_3000,
      visitedHutsCount: validHutCount,
      totalHuts: HUTS.length,
      maxElevationM: maxEle,
      accumulatedElevationM: accEle,
      rank: computeRank(validPeakCount, count3000),
    }
  }, [data])

  return {
    data,
    stats,
    completedPeakIds,
    visitedHutIds,
    togglePeakCompleted,
    updatePeakEntry,
    toggleHutVisited,
    updateHutEntry,
    exportPassportJSON,
    importPassportJSON,
  }
}
