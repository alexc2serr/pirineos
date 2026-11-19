import * as THREE from 'three'
import { HUTS, latLonToWorld, type Hut } from '../data/pyrenees'
import type { HeightField } from './heightField'

export interface PlacedHut {
  hut: Hut
  /** Posición 3D exacta sobre la malla del terreno (latLonToWorld + elevación real del DEM). */
  position: THREE.Vector3
}

const cache = new WeakMap<HeightField, Map<string, PlacedHut>>()

/**
 * Proyecta todos los refugios del catálogo `HUTS` mediante `latLonToWorld`
 * y los apoya exactamente sobre la elevación real de la malla del terreno.
 */
export function getPlacedHuts(field: HeightField): Map<string, PlacedHut> {
  const cached = cache.get(field)
  if (cached) return cached

  const placed = new Map<string, PlacedHut>()
  for (const hut of HUTS) {
    const position = latLonToWorld(hut.coordinates.lat, hut.coordinates.lon, 0)
    position.y = field.sampleWorld(position.x, position.z)
    placed.set(hut.id, { hut, position })
  }
  cache.set(field, placed)
  return placed
}
