import { useCallback, useEffect, useMemo, useState } from 'react'
import { buildTrekFromStops, type Trek, type TrekStop } from '../data/treks'

const STORAGE_KEY = 'pirineos3d_custom_treks_v1'

interface StoredCustomTrek {
  id: string
  name: string
  stops: TrekStop[]
}

function loadCustomTreks(): Trek[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as StoredCustomTrek[]
    if (!Array.isArray(arr)) return []
    return arr
      .filter((item) => item && typeof item.id === 'string' && Array.isArray(item.stops) && item.stops.length >= 2)
      .map((item) =>
        buildTrekFromStops(
          item.id,
          item.name || 'Mi Travesía Pirenaica',
          'Travesía Personalizada',
          `${item.stops.length - 1} etapas enlazando ${item.stops.map((s) => s.name).join(' → ')}.`,
          item.stops,
          true,
        ),
      )
  } catch {
    return []
  }
}

export function useTrekPlanner() {
  const [customTreks, setCustomTreks] = useState<Trek[]>(() => loadCustomTreks())
  const [isBuilding, setIsBuilding] = useState(false)
  const [draftName, setDraftName] = useState('Mi Travesía Pirenaica')
  const [draftStops, setDraftStops] = useState<TrekStop[]>([])

  useEffect(() => {
    try {
      const compact: StoredCustomTrek[] = customTreks.map((t) => ({
        id: t.id,
        name: t.name,
        stops: t.stops,
      }))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compact))
    } catch {
      // Ignorar si localStorage no está disponible
    }
  }, [customTreks])

  const startBuilding = useCallback(() => {
    setDraftName('Mi Travesía Pirenaica')
    setDraftStops([])
    setIsBuilding(true)
  }, [])

  const cancelBuilding = useCallback(() => {
    setIsBuilding(false)
    setDraftStops([])
  }, [])

  const addStop = useCallback((stop: TrekStop) => {
    setDraftStops((prev) => {
      // Evita duplicar la misma parada dos veces seguidas
      const last = prev[prev.length - 1]
      if (last && last.id === stop.id) return prev
      return [...prev, stop]
    })
  }, [])

  const removeStop = useCallback((index: number) => {
    setDraftStops((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const moveStop = useCallback((index: number, delta: -1 | 1) => {
    setDraftStops((prev) => {
      const target = index + delta
      if (target < 0 || target >= prev.length) return prev
      const copy = [...prev]
      const [moved] = copy.splice(index, 1)
      copy.splice(target, 0, moved)
      return copy
    })
  }, [])

  const draftTrek = useMemo<Trek | null>(() => {
    if (!isBuilding || draftStops.length < 2) return null
    return buildTrekFromStops(
      'draft-trek',
      draftName.trim() || 'Mi Travesía Pirenaica',
      'Borrador en curso',
      `${draftStops.length - 1} etapas planificadas.`,
      draftStops,
      true,
    )
  }, [isBuilding, draftName, draftStops])

  const saveDraftTrek = useCallback((): Trek | null => {
    if (draftStops.length < 2) return null
    const finalName = draftName.trim() || `Travesía ${customTreks.length + 1}`
    const created = buildTrekFromStops(
      `custom-trek-${Date.now()}`,
      finalName,
      'Travesía Personalizada',
      `${draftStops.length - 1} etapas enlazando ${draftStops.map((s) => s.name).join(' → ')}.`,
      draftStops,
      true,
    )
    setCustomTreks((prev) => [created, ...prev])
    setIsBuilding(false)
    setDraftStops([])
    return created
  }, [draftName, draftStops, customTreks.length])

  const deleteCustomTrek = useCallback((id: string) => {
    setCustomTreks((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return {
    customTreks,
    isBuilding,
    draftName,
    draftStops,
    draftTrek,
    setDraftName,
    startBuilding,
    cancelBuilding,
    addStop,
    removeStop,
    moveStop,
    saveDraftTrek,
    deleteCustomTrek,
  }
}
