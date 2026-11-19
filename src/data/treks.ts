import type { Route } from './routesData'

export interface TrekStop {
  id: string
  name: string
  kind: 'hut' | 'peak' | 'point'
  lat: number
  lon: number
  elevation: number
}

export interface TrekStage {
  day: number
  fromName: string
  toName: string
  distanceKm: number
  elevationGain: number
  estimatedTime: string
  waypoints: [number, number][]
  color: string
}

export interface Trek {
  id: string
  name: string
  region: string
  description: string
  isCustom?: boolean
  stops: TrekStop[]
  stages: TrekStage[]
  totalDistanceKm: number
  totalElevationGain: number
}

export const STAGE_COLORS = [
  '#38bdf8', // Día 1: cian eléctrico
  '#f59e0b', // Día 2: dorado alpino
  '#34d399', // Día 3: esmeralda
  '#fb7185', // Día 4: coral
  '#a78bfa', // Día 5: violeta
  '#2dd4bf', // Día 6: turquesa
  '#facc15', // Día 7: amarillo
  '#f97316', // Día 8: naranja
]

const EARTH_R_KM = 6371

export function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const r = Math.PI / 180
  const dLat = (bLat - aLat) * r
  const dLon = (bLon - aLon) * r
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_R_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function formatMideTime(distanceKm: number, elevationGain: number): string {
  const hours = Math.max(0.5, distanceKm / 3.8 + elevationGain / 420)
  const totalMin = Math.round((hours * 60) / 15) * 15
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m}min`
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

/** Construye un objeto `Trek` completo calculando etapas, km, desnivel y colores a partir de paradas. */
export function buildTrekFromStops(
  id: string,
  name: string,
  region: string,
  description: string,
  stops: TrekStop[],
  isCustom = false,
): Trek {
  const stages: TrekStage[] = []
  let totalDistanceKm = 0
  let totalElevationGain = 0

  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i]
    const b = stops[i + 1]
    const straightKm = haversineKm(a.lat, a.lon, b.lat, b.lon)
    const distKm = Number(Math.max(1.2, straightKm * 1.32).toFixed(1))
    // En alta montaña pirenaica siempre hay collados intermedios entre dos refugios
    const netGain = Math.max(0, b.elevation - a.elevation)
    const passBonus = Math.round(Math.min(650, straightKm * 65))
    const elevationGain = Math.max(180, Math.round((netGain + passBonus) / 10) * 10)

    totalDistanceKm += distKm
    totalElevationGain += elevationGain

    stages.push({
      day: i + 1,
      fromName: a.name,
      toName: b.name,
      distanceKm: distKm,
      elevationGain,
      estimatedTime: formatMideTime(distKm, elevationGain),
      waypoints: [
        [a.lat, a.lon],
        [b.lat, b.lon],
      ],
      color: STAGE_COLORS[i % STAGE_COLORS.length],
    })
  }

  return {
    id,
    name,
    region,
    description,
    isCustom,
    stops,
    stages,
    totalDistanceKm: Number(totalDistanceKm.toFixed(1)),
    totalElevationGain,
  }
}

/* ------------------------------------------------------------------ */
/* Catálogo de 4 Grandes Travesías Clásicas del Pirineo                */
/* ------------------------------------------------------------------ */

export const CLASSIC_TREKS: Trek[] = [
  {
    id: 'carros-de-foc',
    name: 'Carros de Foc',
    region: 'Aigüestortes i Estany de Sant Maurici',
    description:
      'La gran travesía circular de los 9 refugios del Parque Nacional de Aigüestortes, encadenando lagos glaciares y collados graníticos de más de 2.600 m.',
    stops: [
      { id: 'restanca', name: 'Refugi de la Restanca', kind: 'hut', lat: 42.6331, lon: 0.8542, elevation: 2010 },
      { id: 'ventosa', name: 'Refugi Ventosa i Calvell', kind: 'hut', lat: 42.6075, lon: 0.8758, elevation: 2220 },
      { id: 'estany-llong', name: "Refugi d'Estany Llong", kind: 'hut', lat: 42.5739, lon: 0.9467, elevation: 1985 },
      { id: 'amitges', name: "Refugi d'Amitges", kind: 'hut', lat: 42.5931, lon: 0.9853, elevation: 2365 },
      { id: 'saboredo', name: 'Refugi de Saboredo', kind: 'hut', lat: 42.6164, lon: 0.9617, elevation: 2310 },
      { id: 'colomers', name: 'Refugi de Colomèrs', kind: 'hut', lat: 42.6247, lon: 0.9233, elevation: 2135 },
      { id: 'restanca-end', name: 'Refugi de la Restanca', kind: 'hut', lat: 42.6331, lon: 0.8542, elevation: 2010 },
    ],
    stages: [
      {
        day: 1,
        fromName: 'Refugi de la Restanca',
        toName: 'Refugi Ventosa i Calvell',
        distanceKm: 6.5,
        elevationGain: 680,
        estimatedTime: '3h',
        color: STAGE_COLORS[0],
        waypoints: [
          [42.6331, 0.8542],
          [42.622, 0.8615],
          [42.614, 0.87],
          [42.6075, 0.8758],
        ],
      },
      {
        day: 2,
        fromName: 'Refugi Ventosa i Calvell',
        toName: "Refugi d'Estany Llong",
        distanceKm: 11.4,
        elevationGain: 820,
        estimatedTime: '4h 45min',
        color: STAGE_COLORS[1],
        waypoints: [
          [42.6075, 0.8758],
          [42.598, 0.899],
          [42.589, 0.919],
          [42.5739, 0.9467],
        ],
      },
      {
        day: 3,
        fromName: "Refugi d'Estany Llong",
        toName: "Refugi d'Amitges",
        distanceKm: 10.2,
        elevationGain: 890,
        estimatedTime: '4h 30min',
        color: STAGE_COLORS[2],
        waypoints: [
          [42.5739, 0.9467],
          [42.579, 0.968],
          [42.5855, 0.981],
          [42.5931, 0.9853],
        ],
      },
      {
        day: 4,
        fromName: "Refugi d'Amitges",
        toName: 'Refugi de Saboredo',
        distanceKm: 6.2,
        elevationGain: 460,
        estimatedTime: '2h 45min',
        color: STAGE_COLORS[3],
        waypoints: [
          [42.5931, 0.9853],
          [42.605, 0.974],
          [42.6164, 0.9617],
        ],
      },
      {
        day: 5,
        fromName: 'Refugi de Saboredo',
        toName: 'Refugi de Colomèrs',
        distanceKm: 5.8,
        elevationGain: 420,
        estimatedTime: '2h 30min',
        color: STAGE_COLORS[4],
        waypoints: [
          [42.6164, 0.9617],
          [42.621, 0.942],
          [42.6247, 0.9233],
        ],
      },
      {
        day: 6,
        fromName: 'Refugi de Colomèrs',
        toName: 'Refugi de la Restanca',
        distanceKm: 9.8,
        elevationGain: 710,
        estimatedTime: '4h 15min',
        color: STAGE_COLORS[5],
        waypoints: [
          [42.6247, 0.9233],
          [42.629, 0.892],
          [42.631, 0.871],
          [42.6331, 0.8542],
        ],
      },
    ],
    totalDistanceKm: 49.9,
    totalElevationGain: 3980,
  },

  {
    id: 'senda-de-camille',
    name: 'La Senda de Camille',
    region: 'Valles Occidentales / Béarn (ES · FR)',
    description:
      'Travesía transfronteriza por el territorio del último oso autóctono del Pirineo, enlazando los valles de Hecho, Aragüés, Ansó, Lescun y Aspe.',
    stops: [
      { id: 'gabardito', name: 'Refugio de Gabardito', kind: 'hut', lat: 42.7667, lon: -0.6922, elevation: 1380 },
      { id: 'lizara', name: 'Refugio de Lizara', kind: 'hut', lat: 42.7625, lon: -0.6347, elevation: 1540 },
      { id: 'linza', name: 'Refugio de Linza', kind: 'hut', lat: 42.8994, lon: -0.7994, elevation: 1340 },
      { id: 'lescun', name: 'Lescun (Circo)', kind: 'point', lat: 42.9344, lon: -0.6347, elevation: 900 },
      { id: 'arlet', name: "Refuge d'Arlet", kind: 'hut', lat: 42.8425, lon: -0.6131, elevation: 1986 },
      { id: 'ayous', name: "Refuge d'Ayous", kind: 'hut', lat: 42.8439, lon: -0.4919, elevation: 1982 },
    ],
    stages: [
      {
        day: 1,
        fromName: 'Refugio de Gabardito',
        toName: 'Refugio de Lizara',
        distanceKm: 10.5,
        elevationGain: 760,
        estimatedTime: '4h 15min',
        color: STAGE_COLORS[0],
        waypoints: [
          [42.7667, -0.6922],
          [42.771, -0.665],
          [42.7625, -0.6347],
        ],
      },
      {
        day: 2,
        fromName: 'Refugio de Lizara',
        toName: 'Refugio de Linza',
        distanceKm: 20.4,
        elevationGain: 1280,
        estimatedTime: '7h 30min',
        color: STAGE_COLORS[1],
        waypoints: [
          [42.7625, -0.6347],
          [42.815, -0.695],
          [42.86, -0.755],
          [42.8994, -0.7994],
        ],
      },
      {
        day: 3,
        fromName: 'Refugio de Linza',
        toName: 'Lescun (Circo)',
        distanceKm: 17.8,
        elevationGain: 980,
        estimatedTime: '6h 30min',
        color: STAGE_COLORS[2],
        waypoints: [
          [42.8994, -0.7994],
          [42.912, -0.735],
          [42.926, -0.685],
          [42.9344, -0.6347],
        ],
      },
      {
        day: 4,
        fromName: 'Lescun (Circo)',
        toName: "Refuge d'Arlet",
        distanceKm: 15.2,
        elevationGain: 1320,
        estimatedTime: '6h',
        color: STAGE_COLORS[3],
        waypoints: [
          [42.9344, -0.6347],
          [42.895, -0.625],
          [42.865, -0.618],
          [42.8425, -0.6131],
        ],
      },
      {
        day: 5,
        fromName: "Refuge d'Arlet",
        toName: "Refuge d'Ayous",
        distanceKm: 14.5,
        elevationGain: 890,
        estimatedTime: '5h 30min',
        color: STAGE_COLORS[4],
        waypoints: [
          [42.8425, -0.6131],
          [42.848, -0.555],
          [42.845, -0.522],
          [42.8439, -0.4919],
        ],
      },
    ],
    totalDistanceKm: 78.4,
    totalElevationGain: 5230,
  },

  {
    id: 'alta-ruta-perdidos',
    name: 'Alta Ruta de los Perdidos',
    region: 'Ordesa · Pineta · Gavarnie (ES · FR)',
    description:
      'Vuelta integral al macizo calcáreo de Monte Perdido y Vignemale, cruzando los circos glaciares de Ordesa, Pineta, Estaubé y Gavarnie por la Brecha de Rolando.',
    stops: [
      { id: 'bujaruelo', name: 'San Nicolás de Bujaruelo', kind: 'hut', lat: 42.6956, lon: -0.1069, elevation: 1338 },
      { id: 'goriz', name: 'Refugio de Góriz', kind: 'hut', lat: 42.6628, lon: 0.0144, elevation: 2200 },
      { id: 'pineta', name: 'Refugio de Pineta', kind: 'hut', lat: 42.6683, lon: 0.0978, elevation: 1240 },
      { id: 'espuguettes', name: 'Refuge des Espuguettes', kind: 'hut', lat: 42.7192, lon: 0.0156, elevation: 2027 },
      { id: 'sarradets', name: 'Refuge des Sarradets', kind: 'hut', lat: 42.6967, lon: -0.0322, elevation: 2587 },
      { id: 'bujaruelo-end', name: 'San Nicolás de Bujaruelo', kind: 'hut', lat: 42.6956, lon: -0.1069, elevation: 1338 },
    ],
    stages: [
      {
        day: 1,
        fromName: 'San Nicolás de Bujaruelo',
        toName: 'Refugio de Góriz',
        distanceKm: 16.5,
        elevationGain: 1280,
        estimatedTime: '6h 15min',
        color: STAGE_COLORS[0],
        waypoints: [
          [42.6956, -0.1069],
          [42.656, -0.056],
          [42.655, -0.01],
          [42.6628, 0.0144],
        ],
      },
      {
        day: 2,
        fromName: 'Refugio de Góriz',
        toName: 'Refugio de Pineta',
        distanceKm: 13.8,
        elevationGain: 680,
        estimatedTime: '5h 30min',
        color: STAGE_COLORS[1],
        waypoints: [
          [42.6628, 0.0144],
          [42.665, 0.048],
          [42.667, 0.075],
          [42.6683, 0.0978],
        ],
      },
      {
        day: 3,
        fromName: 'Refugio de Pineta',
        toName: 'Refuge des Espuguettes',
        distanceKm: 14.2,
        elevationGain: 1450,
        estimatedTime: '6h 30min',
        color: STAGE_COLORS[2],
        waypoints: [
          [42.6683, 0.0978],
          [42.692, 0.068],
          [42.712, 0.042],
          [42.7192, 0.0156],
        ],
      },
      {
        day: 4,
        fromName: 'Refuge des Espuguettes',
        toName: 'Refuge des Sarradets',
        distanceKm: 8.6,
        elevationGain: 920,
        estimatedTime: '4h',
        color: STAGE_COLORS[3],
        waypoints: [
          [42.7192, 0.0156],
          [42.712, -0.008],
          [42.704, -0.022],
          [42.6967, -0.0322],
        ],
      },
      {
        day: 5,
        fromName: 'Refuge des Sarradets',
        toName: 'San Nicolás de Bujaruelo',
        distanceKm: 9.4,
        elevationGain: 240,
        estimatedTime: '3h 30min',
        color: STAGE_COLORS[4],
        waypoints: [
          [42.6967, -0.0322],
          [42.703, -0.064],
          [42.699, -0.088],
          [42.6956, -0.1069],
        ],
      },
    ],
    totalDistanceKm: 62.5,
    totalElevationGain: 4570,
  },

  {
    id: 'tour-aneto-posets',
    name: 'Tour del Aneto y Posets',
    region: 'Valle de Benasque · Chistau',
    description:
      'Enlaza los dos colosos más altos de los Pirineos (Aneto 3.404 m y Posets 3.375 m) recorriendo los grandes refugios del corazón del Pirineo aragonés.',
    stops: [
      { id: 'renclusa', name: 'Refugio de La Renclusa', kind: 'hut', lat: 42.6689, lon: 0.6503, elevation: 2140 },
      { id: 'estos', name: 'Refugio de Estós', kind: 'hut', lat: 42.6778, lon: 0.4833, elevation: 1895 },
      { id: 'biados', name: 'Refugio de Biadós', kind: 'hut', lat: 42.6586, lon: 0.3767, elevation: 1760 },
      { id: 'angel-orus', name: 'Refugio Ángel Orús', kind: 'hut', lat: 42.6258, lon: 0.4567, elevation: 2148 },
      { id: 'renclusa-end', name: 'Refugio de La Renclusa', kind: 'hut', lat: 42.6689, lon: 0.6503, elevation: 2140 },
    ],
    stages: [
      {
        day: 1,
        fromName: 'Refugio de La Renclusa',
        toName: 'Refugio de Estós',
        distanceKm: 18.2,
        elevationGain: 920,
        estimatedTime: '6h 30min',
        color: STAGE_COLORS[0],
        waypoints: [
          [42.6689, 0.6503],
          [42.681, 0.595],
          [42.676, 0.538],
          [42.6778, 0.4833],
        ],
      },
      {
        day: 2,
        fromName: 'Refugio de Estós',
        toName: 'Refugio de Biadós',
        distanceKm: 13.4,
        elevationGain: 880,
        estimatedTime: '5h 15min',
        color: STAGE_COLORS[1],
        waypoints: [
          [42.6778, 0.4833],
          [42.68, 0.432],
          [42.671, 0.402],
          [42.6586, 0.3767],
        ],
      },
      {
        day: 3,
        fromName: 'Refugio de Biadós',
        toName: 'Refugio Ángel Orús',
        distanceKm: 11.6,
        elevationGain: 1090,
        estimatedTime: '5h',
        color: STAGE_COLORS[2],
        waypoints: [
          [42.6586, 0.3767],
          [42.642, 0.402],
          [42.631, 0.428],
          [42.6258, 0.4567],
        ],
      },
      {
        day: 4,
        fromName: 'Refugio Ángel Orús',
        toName: 'Refugio de La Renclusa',
        distanceKm: 21.5,
        elevationGain: 1240,
        estimatedTime: '7h 30min',
        color: STAGE_COLORS[3],
        waypoints: [
          [42.6258, 0.4567],
          [42.632, 0.525],
          [42.648, 0.592],
          [42.6689, 0.6503],
        ],
      },
    ],
    totalDistanceKm: 64.7,
    totalElevationGain: 4130,
  },
]

/* ------------------------------------------------------------------ */
/* Conversión a Route (3D / Perfil / Vídeo Cozy) y Exportación .GPX    */
/* ------------------------------------------------------------------ */

export function stageToRoute(trek: Trek, stage: TrekStage): Route {
  return {
    id: `${trek.id}-day-${stage.day}`,
    name: `Día ${stage.day}: ${stage.fromName} → ${stage.toName}`,
    originType: 'hut',
    distanceKm: stage.distanceKm,
    elevationGain: stage.elevationGain,
    ascent: stage.elevationGain,
    estimatedTime: stage.estimatedTime,
    difficulty: stage.elevationGain > 1150 ? 'PD' : 'F',
    description: `Etapa ${stage.day} de ${trek.name}.`,
    waypoints: stage.waypoints,
  }
}

export function trekToCombinedRoute(trek: Trek): {
  route: Route
  stageMarkers: { startProgress: number; label: string }[]
} {
  const waypoints: [number, number][] = []
  const stageMarkers: { startProgress: number; label: string }[] = []
  let accKm = 0
  const totalKm = Math.max(0.1, trek.totalDistanceKm)

  for (const stage of trek.stages) {
    stageMarkers.push({
      startProgress: accKm / totalKm,
      label: `Día ${stage.day} · ${stage.fromName} → ${stage.toName}`,
    })
    accKm += stage.distanceKm
    for (let i = 0; i < stage.waypoints.length; i++) {
      if (waypoints.length > 0 && i === 0) continue
      waypoints.push(stage.waypoints[i])
    }
  }

  return {
    route: {
      id: `trek-${trek.id}`,
      name: trek.name,
      originType: 'gpx',
      distanceKm: trek.totalDistanceKm,
      elevationGain: trek.totalElevationGain,
      ascent: trek.totalElevationGain,
      estimatedTime: `${trek.stages.length} días`,
      difficulty: 'PD',
      description: trek.description,
      waypoints,
    },
    stageMarkers,
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Exporta cualquier travesía multi-etapa como archivo .GPX estándar descargable. */
export function exportTrekToGpx(trek: Trek) {
  const wpts = trek.stops
    .map(
      (s, i) =>
        `  <wpt lat="${s.lat.toFixed(5)}" lon="${s.lon.toFixed(5)}"><ele>${s.elevation}</ele><name>${escapeXml(
          i === 0 ? `Inicio: ${s.name}` : `Noche ${i}: ${s.name}`,
        )}</name></wpt>`,
    )
    .join('\n')

  const segs = trek.stages
    .map((stage) => {
      const pts = stage.waypoints
        .map(([lat, lon]) => `      <trkpt lat="${lat.toFixed(5)}" lon="${lon.toFixed(5)}" />`)
        .join('\n')
      return `    <trkseg>\n${pts}\n    </trkseg>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="PIRINEOS 3D" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(trek.name)}</name>
    <desc>${escapeXml(trek.description)}</desc>
  </metadata>
${wpts}
  <trk>
    <name>${escapeXml(trek.name)}</name>
${segs}
  </trk>
</gpx>`

  const slug = trek.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  const blob = new Blob([xml], { type: 'application/gpx+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `travesia-${slug || 'pirineos'}.gpx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
