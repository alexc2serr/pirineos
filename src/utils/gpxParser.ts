import { HUTS, TERRAIN_BOUNDS, peaks, type Route } from '../data/pyrenees'

export interface GpxPoint {
  lat: number
  lon: number
  ele: number | null
  timeMs: number | null
}

export interface ParsedGpxTrack {
  id: string
  name: string
  fileName: string
  massif: string
  matchedLabel: string | null
  matchedKind: 'peak' | 'hut'
  distanceKm: number
  elevationGain: number
  elevationLoss: number
  maxElevation: number | null
  minElevation: number | null
  estimatedTime: string
  hasRealTime: boolean
  rawPointCount: number
  simplifiedPointCount: number
  route: Route
}

export type GpxParseResult =
  | { ok: true; track: ParsedGpxTrack }
  | { ok: false; error: string }

const EARTH_RADIUS_KM = 6371
const NOISE_THRESHOLD_M = 2.5
const TARGET_MAX_POINTS = 300

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const toRad = Math.PI / 180
  const dLat = (bLat - aLat) * toRad
  const dLon = (bLon - aLon) * toRad
  const sinLat = Math.sin(dLat / 2)
  const sinLon = Math.sin(dLon / 2)
  const h = sinLat * sinLat + Math.cos(aLat * toRad) * Math.cos(bLat * toRad) * sinLon * sinLon
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

function formatDurationMs(ms: number): string {
  const totalMin = Math.max(1, Math.round(ms / 60000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m}min`
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

function estimateMideDuration(distanceKm: number, elevationGain: number): string {
  // Criterio MIDE orientativo: ~4 km/h en horizontal + ~400 m/h de desnivel positivo
  const hours = Math.max(0.25, distanceKm / 4.0 + elevationGain / 400)
  return formatDurationMs(hours * 3600 * 1000)
}

function inferMassifFromCoords(lon: number): string {
  if (lon < -0.85) return 'Pirineo Navarro'
  if (lon < -0.52) return 'Valles Occidentales / Aspe'
  if (lon < -0.22) return 'Valle de Tena / Ossau / Balaitús'
  if (lon < -0.07) return 'Vignemale / Panticosa'
  if (lon < 0.18) return 'Ordesa / Monte Perdido / Pineta'
  if (lon < 0.38) return 'Néouvielle / Cotiella / Bachimala'
  if (lon < 0.56) return 'Posets / Perdiguero'
  if (lon < 0.78) return 'Maladeta / Aneto'
  if (lon < 1.12) return "Aigüestortes / Val d'Aran"
  if (lon < 1.65) return 'Pallars / Andorra / Ariège'
  if (lon < 2.15) return 'Cerdanya / Carlit / Cadí'
  return 'Ripollès / Canigó / Pirineo Oriental'
}

/** Distancia perpendicular aproximada en grados para Ramer-Douglas-Peucker */
function perpDistSq(p: GpxPoint, a: GpxPoint, b: GpxPoint): number {
  const dx = b.lon - a.lon
  const dy = b.lat - a.lat
  const lenSq = dx * dx + dy * dy
  if (lenSq < 1e-14) {
    return (p.lon - a.lon) ** 2 + (p.lat - a.lat) ** 2
  }
  const t = Math.max(0, Math.min(1, ((p.lon - a.lon) * dx + (p.lat - a.lat) * dy) / lenSq))
  const projLon = a.lon + t * dx
  const projLat = a.lat + t * dy
  return (p.lon - projLon) ** 2 + (p.lat - projLat) ** 2
}

function rdpSegment(pts: GpxPoint[], epsSq: number): GpxPoint[] {
  if (pts.length <= 2) return pts
  let maxD = 0
  let maxI = 0
  const first = pts[0]
  const last = pts[pts.length - 1]
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDistSq(pts[i], first, last)
    if (d > maxD) {
      maxD = d
      maxI = i
    }
  }
  if (maxD > epsSq) {
    const left = rdpSegment(pts.slice(0, maxI + 1), epsSq)
    const right = rdpSegment(pts.slice(maxI), epsSq)
    return [...left.slice(0, -1), ...right]
  }
  return [first, last]
}

/**
 * Simplifica el track conservando siempre inicio, final y el punto más alto (cumbre),
 * reduciendo a ~250-320 puntos clave para mantener 60 FPS fluidos en WebGL.
 */
function simplifyKeepingSummit(pts: GpxPoint[], summitIdx: number): GpxPoint[] {
  if (pts.length <= TARGET_MAX_POINTS) return pts

  const splitAndSimplify = (epsDeg: number) => {
    const epsSq = epsDeg * epsDeg
    if (summitIdx > 0 && summitIdx < pts.length - 1) {
      const a = rdpSegment(pts.slice(0, summitIdx + 1), epsSq)
      const b = rdpSegment(pts.slice(summitIdx), epsSq)
      return [...a.slice(0, -1), ...b]
    }
    return rdpSegment(pts, epsSq)
  }

  let eps = 0.00008 // ~8 m
  let simplified = splitAndSimplify(eps)
  for (let iter = 0; iter < 8 && simplified.length > TARGET_MAX_POINTS; iter++) {
    eps *= 1.65
    simplified = splitAndSimplify(eps)
  }

  // Fallback uniforme si el track es enorme y sigue superando el tope
  if (simplified.length > TARGET_MAX_POINTS + 40) {
    const step = (simplified.length - 1) / (TARGET_MAX_POINTS - 1)
    const sampled: GpxPoint[] = []
    for (let i = 0; i < TARGET_MAX_POINTS; i++) {
      sampled.push(simplified[Math.round(i * step)])
    }
    return sampled
  }
  return simplified
}

function getText(el: Element | Document, tagName: string): string | null {
  const node = el.getElementsByTagName(tagName)[0]
  const text = node?.textContent?.trim()
  return text ? text : null
}

/** Parsea el texto XML de un archivo .GPX estándar (Wikiloc, Strava, Garmin, Komoot, etc.). */
export function parseGpxText(xmlText: string, fileName = 'ruta.gpx'): GpxParseResult {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length > 0) {
    return { ok: false, error: 'El archivo no es un XML/GPX válido. Verifica que no esté dañado.' }
  }

  let rawNodes = Array.from(doc.getElementsByTagName('trkpt'))
  if (rawNodes.length < 2) rawNodes = Array.from(doc.getElementsByTagName('rtept'))
  if (rawNodes.length < 2) rawNodes = Array.from(doc.getElementsByTagName('wpt'))

  if (rawNodes.length < 2) {
    return {
      ok: false,
      error: 'El archivo GPX no contiene suficientes puntos de recorrido (<trkpt> o <rtept>).',
    }
  }

  const points: GpxPoint[] = []
  for (const node of rawNodes) {
    const lat = Number(node.getAttribute('lat'))
    const lon = Number(node.getAttribute('lon'))
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
    const eleStr = getText(node, 'ele')
    const eleNum = eleStr != null ? Number(eleStr) : NaN
    const timeStr = getText(node, 'time')
    const timeMs = timeStr ? Date.parse(timeStr) : NaN
    points.push({
      lat,
      lon,
      ele: Number.isFinite(eleNum) ? eleNum : null,
      timeMs: Number.isFinite(timeMs) ? timeMs : null,
    })
  }

  if (points.length < 2) {
    return { ok: false, error: 'No se encontraron coordenadas GPS válidas en el archivo GPX.' }
  }

  // Validación geográfica contra TERRAIN_BOUNDS de los Pirineos
  const insideCount = points.filter(
    (p) =>
      p.lat >= TERRAIN_BOUNDS.south &&
      p.lat <= TERRAIN_BOUNDS.north &&
      p.lon >= TERRAIN_BOUNDS.west &&
      p.lon <= TERRAIN_BOUNDS.east,
  ).length

  if (insideCount === 0 || insideCount / points.length < 0.35) {
    return {
      ok: false,
      error:
        'Este track GPX está fuera del área de los Pirineos cubierta por el mapa 3D (Lat 41.9°–43.4°, Lon -2.0°–3.2°).',
    }
  }

  // Cálculo de estadísticas reales sobre la serie completa
  let totalDistKm = 0
  let gainM = 0
  let lossM = 0
  let maxEle: number | null = null
  let minEle: number | null = null
  let summitIdx = points.length - 1
  let anchorEle: number | null = null

  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    if (i > 0) {
      totalDistKm += haversineKm(points[i - 1].lat, points[i - 1].lon, p.lat, p.lon)
    }
    if (p.ele !== null) {
      if (maxEle === null || p.ele > maxEle) {
        maxEle = p.ele
        summitIdx = i
      }
      if (minEle === null || p.ele < minEle) minEle = p.ele
      if (anchorEle === null) {
        anchorEle = p.ele
      } else {
        const diff = p.ele - anchorEle
        if (diff >= NOISE_THRESHOLD_M) {
          gainM += diff
          anchorEle = p.ele
        } else if (diff <= -NOISE_THRESHOLD_M) {
          lossM += -diff
          anchorEle = p.ele
        }
      }
    }
  }

  // Duración real desde <time> o estimada MIDE
  const firstTime = points.find((p) => p.timeMs !== null)?.timeMs ?? null
  let lastTime: number | null = null
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].timeMs !== null) {
      lastTime = points[i].timeMs
      break
    }
  }
  const hasRealTime = firstTime !== null && lastTime !== null && lastTime - firstTime > 60_000
  const estimatedTime = hasRealTime
    ? formatDurationMs(lastTime! - firstTime!)
    : estimateMideDuration(totalDistKm, gainM)

  // Detección de cumbre o refugio cercano al punto más alto / final
  const highPt = points[summitIdx]
  const endPt = points[points.length - 1]

  const bestPeak = peaks
    .map((pk) => ({ pk, d: haversineKm(highPt.lat, highPt.lon, pk.coordinates.lat, pk.coordinates.lon) }))
    .sort((a, b) => a.d - b.d)[0]

  const bestHut = HUTS.map((h) => ({
    h,
    d: Math.min(
      haversineKm(highPt.lat, highPt.lon, h.coordinates.lat, h.coordinates.lon),
      haversineKm(endPt.lat, endPt.lon, h.coordinates.lat, h.coordinates.lon),
    ),
  })).sort((a, b) => a.d - b.d)[0]

  let matchedLabel: string | null = null
  let matchedKind: 'peak' | 'hut' = 'peak'
  let massif = inferMassifFromCoords(highPt.lon)

  if (bestPeak && bestPeak.d <= 1.2) {
    matchedLabel = bestPeak.pk.name
    matchedKind = 'peak'
    massif = bestPeak.pk.massif
  } else if (bestHut && bestHut.d <= 0.7) {
    matchedLabel = bestHut.h.name
    matchedKind = 'hut'
    massif = bestHut.h.massif
  }

  // Nombre del track
  const trkEl = doc.getElementsByTagName('trk')[0] ?? doc.getElementsByTagName('rte')[0]
  const xmlName = (trkEl ? getText(trkEl, 'name') : null) ?? getText(doc, 'name')
  const cleanFileName = fileName.replace(/\.gpx$/i, '').replace(/[_-]+/g, ' ').trim()
  const baseName = xmlName || cleanFileName || 'Track GPX'
  const displayName =
    matchedLabel && !baseName.toLowerCase().includes(matchedLabel.toLowerCase())
      ? `${baseName} · ${matchedLabel}`
      : baseName

  // Simplificación manteniendo la cumbre exacta
  const simplified = simplifyKeepingSummit(points, summitIdx)
  const waypoints: [number, number][] = simplified.map((p) => [p.lat, p.lon])

  const distRounded = Number(totalDistKm.toFixed(2))
  const gainRounded = Math.round(gainM)
  const lossRounded = Math.round(lossM)

  const route: Route = {
    id: `gpx-${Date.now()}`,
    name: displayName,
    originType: 'gpx',
    distanceKm: distRounded,
    elevationGain: gainRounded,
    ascent: gainRounded,
    estimatedTime,
    difficulty: gainRounded > 1400 ? 'PD' : 'F',
    description: `Track GPX importado desde ${fileName} (${points.length.toLocaleString('es-ES')} puntos originales simplificados a ${simplified.length} nodos clave).`,
    waypoints,
  }

  return {
    ok: true,
    track: {
      id: route.id,
      name: displayName,
      fileName,
      massif,
      matchedLabel,
      matchedKind,
      distanceKm: distRounded,
      elevationGain: gainRounded,
      elevationLoss: lossRounded,
      maxElevation: maxEle !== null ? Math.round(maxEle) : null,
      minElevation: minEle !== null ? Math.round(minEle) : null,
      estimatedTime,
      hasRealTime,
      rawPointCount: points.length,
      simplifiedPointCount: simplified.length,
      route,
    },
  }
}
