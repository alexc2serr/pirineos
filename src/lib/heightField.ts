import {
  CENTER,
  KM_PER_DEG_LAT,
  KM_PER_DEG_LON_AT_CENTER,
  TERRAIN_BOUNDS,
  type Peak,
} from '../data/pyrenees'
import * as THREE from 'three'
import { elevationToWorldY, peakToWorld } from '../data/pyrenees'

export const SEGMENTS_X = 1200
export const SEGMENTS_Z = 460

/** Campo de alturas de la malla (unidades de escena) con muestreo bilineal. */
export class HeightField {
  heights: Float32Array
  private vx = SEGMENTS_X + 1
  private vz = SEGMENTS_Z + 1

  constructor(heights: Float32Array) {
    this.heights = heights
  }

  /** Altura Y de la malla en coordenadas de escena (x, z). */
  sampleWorld(x: number, z: number): number {
    const { west, east, south, north } = TERRAIN_BOUNDS
    const lon = CENTER.lon + x / KM_PER_DEG_LON_AT_CENTER
    const lat = CENTER.lat - z / KM_PER_DEG_LAT
    const fx = Math.min(Math.max(((lon - west) / (east - west)) * SEGMENTS_X, 0), this.vx - 1.001)
    const fz = Math.min(Math.max(((north - lat) / (north - south)) * SEGMENTS_Z, 0), this.vz - 1.001)
    const xi = Math.floor(fx)
    const zi = Math.floor(fz)
    const tx = fx - xi
    const tz = fz - zi
    const k = zi * this.vx + xi
    const h = this.heights
    return (
      (h[k] * (1 - tx) + h[k + 1] * tx) * (1 - tz) +
      (h[k + this.vx] * (1 - tx) + h[k + this.vx + 1] * tx) * tz
    )
  }
}

/** Límites de navegación de la cámara (escena), con margen respecto al borde del DEM. */
const EDGE_MARGIN_KM = 30
export const NAV_BOUNDS = {
  minX: (TERRAIN_BOUNDS.west - CENTER.lon) * KM_PER_DEG_LON_AT_CENTER + EDGE_MARGIN_KM,
  maxX: (TERRAIN_BOUNDS.east - CENTER.lon) * KM_PER_DEG_LON_AT_CENTER - EDGE_MARGIN_KM,
  minZ: -(TERRAIN_BOUNDS.north - CENTER.lat) * KM_PER_DEG_LAT + EDGE_MARGIN_KM,
  maxZ: -(TERRAIN_BOUNDS.south - CENTER.lat) * KM_PER_DEG_LAT - EDGE_MARGIN_KM,
}

/**
 * Posición de la cima en la escena: usa la elevación real, o la altura de la malla
 * si ésta fuera superior (el DEM puede variar unas decenas de metros).
 */
export function getPeakTop(peak: Peak, field: HeightField | null): THREE.Vector3 {
  const top = peakToWorld(peak)
  if (field) top.y = Math.max(top.y, field.sampleWorld(top.x, top.z))
  return top
}

/** Altura de los ojos sobre la cima en Modo Cumbre (metros reales). */
export const SUMMIT_EYE_OFFSET_M = 30
export const summitEyeY = (): number => elevationToWorldY(SUMMIT_EYE_OFFSET_M)
