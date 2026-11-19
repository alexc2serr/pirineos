import * as THREE from 'three'
import { VERTICAL_EXAGGERATION, latLonToWorld, worldYToElevation, type Route } from '../data/pyrenees'
import type { HeightField } from './heightField'
import type { CameraView } from './views'

export interface ElevationSample {
  /** Progreso normalizado 0..1 */
  progress: number
  /** Distancia acumulada en km */
  distanceKm: number
  /** Elevación real en metros */
  elevationM: number
  /** Pendiente porcentual suavizada (%) */
  slopePct: number
  /** Posición 3D exacta sobre la ruta */
  position: THREE.Vector3
}

/** Offset vertical sobre la malla DEM (0.045 unidades ≈ 19 m reales a escala ×2.4) para evitar clipping. */
const ROUTE_LIFT = 0.045
const ROUTE_SUBDIVISIONS = 160

const toMeters = (worldY: number) => (worldY / VERTICAL_EXAGGERATION) * 1000

/** Cola de prioridad mínima (montículo binario) para el A* sobre el DEM. */
class MinHeap {
  private keys: number[] = []
  private values: number[] = []

  get size() {
    return this.keys.length
  }

  push(key: number, value: number) {
    this.keys.push(key)
    this.values.push(value)
    let i = this.keys.length - 1
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this.keys[parent] <= this.keys[i]) break
      this.swap(i, parent)
      i = parent
    }
  }

  pop(): number {
    const top = this.values[0]
    const lastKey = this.keys.pop()!
    const lastValue = this.values.pop()!
    if (this.keys.length > 0) {
      this.keys[0] = lastKey
      this.values[0] = lastValue
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = l + 1
        let m = i
        if (l < this.keys.length && this.keys[l] < this.keys[m]) m = l
        if (r < this.keys.length && this.keys[r] < this.keys[m]) m = r
        if (m === i) break
        this.swap(i, m)
        i = m
      }
    }
    return top
  }

  private swap(a: number, b: number) {
    ;[this.keys[a], this.keys[b]] = [this.keys[b], this.keys[a]]
    ;[this.values[a], this.values[b]] = [this.values[b], this.values[a]]
  }
}

/** A* sobre una malla local del DEM: penaliza pendientes extremas para seguir vaguadas y collados naturales. */
function findTerrainPath(field: HeightField, from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[] {
  const pad = 1.6
  const minX = Math.min(from.x, to.x) - pad
  const minZ = Math.min(from.z, to.z) - pad
  const w = Math.abs(from.x - to.x) + pad * 2
  const d = Math.abs(from.z - to.z) + pad * 2
  const cell = Math.max(0.14, Math.max(w, d) / 110)
  const nx = Math.ceil(w / cell) + 1
  const nz = Math.ceil(d / cell) + 1

  const ground = new Float32Array(nx * nz)
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) ground[j * nx + i] = field.sampleWorld(minX + i * cell, minZ + j * cell)
  }

  const toNode = (v: THREE.Vector3) => ({
    i: Math.min(nx - 1, Math.max(0, Math.round((v.x - minX) / cell))),
    j: Math.min(nz - 1, Math.max(0, Math.round((v.z - minZ) / cell))),
  })
  const start = toNode(from)
  const goal = toNode(to)
  const startIdx = start.j * nx + start.i
  const goalIdx = goal.j * nx + goal.i

  const cost = new Float32Array(nx * nz).fill(Infinity)
  const prev = new Int32Array(nx * nz).fill(-1)
  const heap = new MinHeap()
  const heuristic = (i: number, j: number) => Math.hypot(i - goal.i, j - goal.j) * cell * 1000
  cost[startIdx] = 0
  heap.push(heuristic(start.i, start.j), startIdx)

  while (heap.size > 0) {
    const idx = heap.pop()
    if (idx === goalIdx) break
    const ci = idx % nx
    const cj = (idx - ci) / nx
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        if (di === 0 && dj === 0) continue
        const ni = ci + di
        const nj = cj + dj
        if (ni < 0 || nj < 0 || ni >= nx || nj >= nz) continue
        const nIdx = nj * nx + ni
        const distM = Math.hypot(di, dj) * cell * 1000
        const grade = Math.abs(toMeters(ground[nIdx] - ground[idx])) / distM
        const step = distM * (1 + 3 * (grade / 0.3) ** 2)
        const next = cost[idx] + step
        if (next < cost[nIdx]) {
          cost[nIdx] = next
          prev[nIdx] = idx
          heap.push(next + heuristic(ni, nj), nIdx)
        }
      }
    }
  }

  const nodes: THREE.Vector3[] = []
  for (let idx = goalIdx; idx !== -1; idx = prev[idx]) {
    const i = idx % nx
    const j = (idx - i) / nx
    nodes.push(new THREE.Vector3(minX + i * cell, 0, minZ + j * cell))
    if (idx === startIdx) break
  }
  nodes.reverse()
  if (nodes.length < 2) return [from.clone(), to.clone()]
  nodes[0].set(from.x, 0, from.z)
  nodes[nodes.length - 1].set(to.x, 0, to.z)
  return nodes
}

/**
 * Construye el trazado 3D adherido al relieve real del DEM (CatmullRomCurve3 con 160 subdivisiones).
 * Para rutas automáticas de solo 2 puntos (< 16 km), calcula waypoints intermedios siguiendo las vaguadas.
 */
export function buildRoutePoints(route: Route, field: HeightField): THREE.Vector3[] {
  if (route.waypoints.length < 2) return []

  const rawPoints = route.waypoints.map(([lat, lon]) => latLonToWorld(lat, lon, 0))
  let controlPoints: THREE.Vector3[] = rawPoints

  if (rawPoints.length === 2) {
    const dist = rawPoints[0].distanceTo(rawPoints[1])
    if (dist > 0.25 && dist <= 16) {
      const astar = findTerrainPath(field, rawPoints[0], rawPoints[1])
      const stride = Math.max(1, Math.floor(astar.length / 24))
      controlPoints = astar.filter((_, idx) => idx % stride === 0 || idx === astar.length - 1)
    }
  }

  // Asegura al menos 2 puntos distintos para CatmullRomCurve3
  if (controlPoints.length < 2) return []
  const curve = new THREE.CatmullRomCurve3(controlPoints, false, 'centripetal')
  const sampled = curve.getPoints(ROUTE_SUBDIVISIONS)

  for (const p of sampled) {
    p.y = field.sampleWorld(p.x, p.z) + ROUTE_LIFT
  }
  return sampled
}

/**
 * Calcula una vista panorámica de cámara que encuadra la ruta completa
 * (desde el parking/refugio de salida hasta la cumbre/destino).
 */
export function computeRouteOverviewCamera(route: Route, field: HeightField): CameraView | null {
  const pts = buildRoutePoints(route, field)
  if (pts.length < 2) return null

  const box = new THREE.Box3().setFromPoints(pts)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  const span = Math.max(2.2, Math.hypot(size.x, size.z))

  // Vector perpendicular al eje inicio->fin para mirar la subida de perfil panorámico
  const start = pts[0]
  const end = pts[pts.length - 1]
  const dir = new THREE.Vector3(end.x - start.x, 0, end.z - start.z)
  if (dir.lengthSq() < 1e-4) dir.set(1, 0, 0)
  dir.normalize()
  const side = new THREE.Vector3(-dir.z, 0, dir.x)

  // Posiciona la cámara mirando desde el lado con mejor visibilidad y elevada sobre el recorrido
  const camDist = THREE.MathUtils.clamp(span * 1.15, 3.2, 26)
  const camPos = center
    .clone()
    .addScaledVector(side, camDist * 0.72)
    .addScaledVector(dir, -camDist * 0.45)

  const groundAtCam = field.sampleWorld(camPos.x, camPos.z)
  camPos.y = Math.max(box.max.y + span * 0.45, groundAtCam + 1.8)

  return { position: camPos, target: center }
}

/**
 * Genera el perfil de elevación 2D ↔ 3D muestreando la altura real del DEM
 * a lo largo de toda la ruta, con distancia acumulada y pendiente suavizada (%).
 */
export function sampleRouteElevationProfile(route: Route, field: HeightField): ElevationSample[] {
  const pts = buildRoutePoints(route, field)
  if (pts.length < 2) return []

  const rawDist: number[] = [0]
  for (let i = 1; i < pts.length; i++) {
    const segKm = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z)
    rawDist.push(rawDist[i - 1] + segKm)
  }
  const totalRawKm = Math.max(0.05, rawDist[rawDist.length - 1])
  const scaleDist = route.distanceKm > 0 ? route.distanceKm / totalRawKm : 1

  const elevations = pts.map((p) => Math.max(0, worldYToElevation(p.y - ROUTE_LIFT)))
  const samples: ElevationSample[] = []

  for (let i = 0; i < pts.length; i++) {
    const prevIdx = Math.max(0, i - 2)
    const nextIdx = Math.min(pts.length - 1, i + 2)
    const runM = Math.max(15, (rawDist[nextIdx] - rawDist[prevIdx]) * scaleDist * 1000)
    const riseM = elevations[nextIdx] - elevations[prevIdx]
    const slopePct = THREE.MathUtils.clamp(Math.round((riseM / runM) * 100), -65, 65)

    samples.push({
      progress: i / (pts.length - 1),
      distanceKm: Number((rawDist[i] * scaleDist).toFixed(2)),
      elevationM: Math.round(elevations[i]),
      slopePct,
      position: pts[i],
    })
  }

  return samples
}
