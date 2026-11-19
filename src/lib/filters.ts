import { HUTS, peaks, type Country, type Difficulty, type Hut, type HutType, type Peak } from '../data/pyrenees'

export type SideFilter = 'all' | 'ES' | 'FR'
export type DifficultyFilter = 'all' | Difficulty
export type AltitudeFilter = 'all' | 'under2500' | '2500to3000' | 'over3000'
export type HutTypeFilter = 'all' | HutType

export interface Filters {
  side: SideFilter
  difficulty: DifficultyFilter
  altitude: AltitudeFilter
  query: string
}

export interface HutFilters {
  side: SideFilter
  type: HutTypeFilter
  meals: boolean
  showers: boolean
  hearth: boolean
  query: string
}

export const DEFAULT_FILTERS: Filters = {
  side: 'all',
  difficulty: 'all',
  altitude: 'all',
  query: '',
}

export const DEFAULT_HUT_FILTERS: HutFilters = {
  side: 'all',
  type: 'all',
  meals: false,
  showers: false,
  hearth: false,
  query: '',
}

export const DIFFICULTIES: Difficulty[] = ['F', 'PD', 'AD', 'D']

const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const onSide = (country: Country, side: SideFilter) =>
  side === 'all' || country === side || country === 'ES/FR'

const matchesAltitude = (elevation: number, filter: AltitudeFilter) => {
  switch (filter) {
    case 'under2500':
      return elevation < 2500
    case '2500to3000':
      return elevation >= 2500 && elevation < 3000
    case 'over3000':
      return elevation >= 3000
    default:
      return true
  }
}

export function applyFilters(filters: Filters): Peak[] {
  const q = normalize(filters.query.trim())
  return peaks.filter(
    (p) =>
      onSide(p.country, filters.side) &&
      (filters.difficulty === 'all' || p.difficulty === filters.difficulty) &&
      matchesAltitude(p.elevation, filters.altitude) &&
      (q === '' || normalize(`${p.name} ${p.massif}`).includes(q)),
  )
}

export function applyHutFilters(filters: HutFilters): Hut[] {
  const q = normalize(filters.query.trim())
  return HUTS.filter(
    (h) =>
      onSide(h.country, filters.side) &&
      (filters.type === 'all' || h.type === filters.type) &&
      (!filters.meals || h.services.meals) &&
      (!filters.showers || h.services.showers) &&
      (!filters.hearth || h.services.hearth) &&
      (q === '' || normalize(`${h.name} ${h.massif}`).includes(q)),
  )
}
