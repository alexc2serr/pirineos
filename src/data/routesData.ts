import type { Difficulty, Hut } from './pyrenees'

export type RouteOriginType = 'parking' | 'hut'

export interface ParkingInfo {
  name: string
  coordinates: { lat: number; lon: number }
  accessNotes: string
}

export interface Route {
  id: string
  name: string
  originType: RouteOriginType
  parkingInfo?: ParkingInfo
  hutId?: string
  /** Distancia total (solo subida) en km */
  distanceKm: number
  /** Desnivel positivo acumulado en metros */
  elevationGain: number
  /** Alias de elevationGain */
  ascent: number
  /** Tiempo estimado (ej. "2h 30min") */
  estimatedTime: string
  difficulty: Difficulty
  description: string
  /** Secuencia ordenada de coordenadas GPS [lat, lon] desde el inicio hasta el destino */
  waypoints: [number, number][]
}

/* ------------------------------------------------------------------ */
/* Parkings de acceso rodado reales en el Pirineo                      */
/* ------------------------------------------------------------------ */

export const PARKINGS: Record<string, ParkingInfo> = {
  pineta: {
    name: 'Parking Fondo del Valle de Pineta (Bielsa)',
    coordinates: { lat: 42.6656, lon: 0.0975 },
    accessNotes:
      'Bielsa es la puerta de entrada al Valle de Pineta. Al llegar al fondo del valle (junto al Parador y la Ermita) se puede aparcar en las zonas habilitadas o en el parking regulado de pago (~1,5€ todo el día).',
  },
  espierba: {
    name: 'Aparcamiento de Espierba (Valle de Pineta)',
    coordinates: { lat: 42.6345, lon: 0.1615 },
    accessNotes:
      'Acceso por carretera estrecha asfaltada desde Bielsa hacia Espierba (6 km). Pequeño aparcamiento al inicio de la pista forestal de 10 km hacia La Estiva.',
  },
  besurta: {
    name: 'Parking de Llanos del Hospital / La Besurta (Benasque)',
    coordinates: { lat: 42.6833, lon: 0.6561 },
    accessNotes:
      'Desde Benasque por la A-139 hasta el vado del Hospital. En verano el paso a La Besurta está cerrado a coches privados: hay servicio de autobús lanzadera desde Benasque y el parking gratuito de El Vado.',
  },
  ordesa: {
    name: 'Parking de Torla / Pradera de Ordesa',
    coordinates: { lat: 42.6497, lon: -0.0567 },
    accessNotes:
      'En temporada alta y Semana Santa el acceso privado a la Pradera está restringido: aparcamiento gratuito en Torla-Ordesa con autobús lanzadera cada 15-20 min hasta la Pradera.',
  },
  pontEspagne: {
    name: "Parking de Pont d'Espagne (Cauterets)",
    coordinates: { lat: 42.8511, lon: -0.1386 },
    accessNotes:
      "Carretera D920 desde Cauterets hasta el gran aparcamiento regulado de Pont d'Espagne (~8€/día). Punto de partida hacia el Lac de Gaube y el Refuge des Oulettes.",
  },
  aneou: {
    name: 'Parking de Anéou (Col du Pourtalet)',
    coordinates: { lat: 42.8117, lon: -0.4158 },
    accessNotes:
      'Aparcamiento gratuito y amplio en la cabaña de Anéou, a 1 km al norte de la frontera del Portalet (vertiente francesa). Excelente acceso todo el año hacia Pombie y Midi d\'Ossau.',
  },
  larrau: {
    name: 'Puerto de Larrau (Navarra / Soule)',
    coordinates: { lat: 42.9736, lon: -0.9922 },
    accessNotes: 'Aparcamiento libre junto al túnel fronterizo del Puerto de Larrau (1.573 m).',
  },
  linza: {
    name: 'Parking Refugio de Linza (Ansó)',
    coordinates: { lat: 42.8994, lon: -0.7994 },
    accessNotes: 'Carretera asfaltada desde Ansó por Zuriza hasta el amplio aparcamiento gratuito de Linza.',
  },
  oza: {
    name: 'Parking Selva de Oza (Valle de Hecho)',
    coordinates: { lat: 42.8336, lon: -0.7081 },
    accessNotes: 'Carretera desde Hecho hasta la Selva de Oza; aparcamiento habilitado junto al puente.',
  },
  lizara: {
    name: 'Parking Refugio de Lizara (Aragüés del Puerto)',
    coordinates: { lat: 42.7625, lon: -0.6347 },
    accessNotes: 'Acceso asfaltado directo hasta el refugio de Lizara (1.540 m), aparcamiento gratuito.',
  },
  canfranc: {
    name: 'Parking Canfranc-Estación / Villanúa',
    coordinates: { lat: 42.7167, lon: -0.525 },
    accessNotes: 'Acceso directo por la N-330 hasta Canfranc-Estación o Villanúa (pista de La Trapa).',
  },
  piedrafita: {
    name: 'Parking de Piedrafita de Jaca (Valle de Tena)',
    coordinates: { lat: 42.685, lon: -0.3236 },
    accessNotes: 'Aparcamiento gratuito a la entrada de Piedrafita de Jaca y junto al Parque Faunístico de Lacuniacha.',
  },
  lasarra: {
    name: 'Parking Embalse de La Sarra (Sallent de Gállego)',
    coordinates: { lat: 42.7853, lon: -0.3289 },
    accessNotes: 'Carretera desde Sallent de Gállego hasta el embalse de La Sarra (1.438 m), aparcamiento amplio.',
  },
  panticosa: {
    name: 'Parking Balneario de Panticosa',
    coordinates: { lat: 42.7614, lon: -0.2336 },
    accessNotes: 'Carretera A-2606 hasta el Balneario de Panticosa (1.636 m). Amplio aparcamiento gratuito junto a Casa de Piedra.',
  },
  biados: {
    name: 'Parking de Biadós (San Juan de Plan)',
    coordinates: { lat: 42.6586, lon: 0.3767 },
    accessNotes: 'Pista forestal de 11 km desde San Juan de Plan (transitable con turismo con precaución) hasta las bordas de Biadós.',
  },
  espigantosa: {
    name: 'Parking de La Espigantosa (Eriste)',
    coordinates: { lat: 42.6075, lon: 0.4719 },
    accessNotes: 'En verano hay autobús desde Eriste; el resto del año pista de 4 km hasta el puente de la Espigantosa.',
  },
  cavallers: {
    name: 'Parking Embalse de Cavallers (Vall de Boí)',
    coordinates: { lat: 42.5872, lon: 0.8553 },
    accessNotes: 'Carretera L-500 hasta la presa de Cavallers (1.780 m), aparcamiento gratuito (conviene madrugar en verano).',
  },
  espot: {
    name: 'Parking de Prat de Pierró (Espot / Sant Maurici)',
    coordinates: { lat: 42.5789, lon: 1.0319 },
    accessNotes: 'Aparcamiento gratuito a la entrada del Parque Nacional de Aigüestortes; servicio de taxis 4x4 desde Espot.',
  },
  molinassa: {
    name: 'Parking de La Molinassa (Àreu)',
    coordinates: { lat: 42.6258, lon: 1.3803 },
    accessNotes: 'Pista forestal de 11 km desde Àreu (Vall Ferrera) hasta el aparcamiento de La Molinassa (1.805 m).',
  },
  bouillouses: {
    name: 'Parking Lac des Bouillouses (Font-Romeu)',
    coordinates: { lat: 42.5628, lon: 2.0014 },
    accessNotes: 'En verano la carretera está regulada: aparcamiento en Pla de Barrès con autobús lanzadera al lago.',
  },
  vallter: {
    name: 'Parking Vallter 2000 (Setcases)',
    coordinates: { lat: 42.4264, lon: 2.2647 },
    accessNotes: 'Carretera GIV-5264 hasta la estación de esquí de Vallter 2000 (2.150 m), aparcamiento gratuito.',
  },
  cortaletsRoad: {
    name: 'Parking Col de Millères / Balatg (Canigó)',
    coordinates: { lat: 42.5489, lon: 2.4214 },
    accessNotes: 'Acceso desde Prades / Taurinya por pista forestal hasta el aparcamiento habilitado bajo Cortalets.',
  },
}

/* ------------------------------------------------------------------ */
/* Rutas curadas con waypoints GPS reales                              */
/* ------------------------------------------------------------------ */

export const CURATED_PEAK_ROUTES: Record<string, Route[]> = {
  'pico-estiva': [
    {
      id: 'estiva-from-pineta-parking',
      name: 'Desde Parking de Pineta (vía GR-11 y Refugio de La Estiva)',
      originType: 'parking',
      parkingInfo: PARKINGS.pineta,
      distanceKm: 6.4,
      elevationGain: 885,
      ascent: 885,
      estimatedTime: '2h 45min',
      difficulty: 'F',
      description:
        'Parte desde el fondo del Valle de Pineta junto a la Ermita, remonta el bosque por el GR-11 hasta las praderas del Refugio de La Estiva (2.070 m) y alcanza la loma cimera con vistas frontales a Monte Perdido y La Munia.',
      waypoints: [
        [42.6656, 0.0975],
        [42.6685, 0.1025],
        [42.6728, 0.1098],
        [42.6772, 0.1175],
        [42.6815, 0.1255],
        [42.6824, 0.1292],
        [42.683, 0.132],
      ],
    },
    {
      id: 'estiva-from-hut',
      name: 'Desde Refugio de La Estiva',
      originType: 'hut',
      hutId: 'estiva',
      distanceKm: 0.9,
      elevationGain: 60,
      ascent: 60,
      estimatedTime: '25min',
      difficulty: 'F',
      description:
        'Corta ascensión panorámica directamente desde la cabaña libre de La Estiva hacia el este por praderas alpinas hasta la cima.',
      waypoints: [
        [42.6815, 0.1255],
        [42.6822, 0.1288],
        [42.683, 0.132],
      ],
    },
  ],

  aneto: [
    {
      id: 'aneto-from-besurta-parking',
      name: 'Desde Parking de La Besurta / Llanos del Hospital (vía La Renclusa)',
      originType: 'parking',
      parkingInfo: PARKINGS.besurta,
      distanceKm: 7.8,
      elevationGain: 1510,
      ascent: 1510,
      estimatedTime: '5h 30min',
      difficulty: 'PD',
      description:
        'Itinerario clásico al techo de los Pirineos. Desde La Besurta sube al Refugio de La Renclusa, remonta la cresta de los Portillones hasta el Portillón Superior, cruza el glaciar del Aneto (crampones y piolet imprescindibles) y supera el aéreo Paso de Mahoma.',
      waypoints: [
        [42.6833, 0.6561],
        [42.6755, 0.6525],
        [42.6689, 0.6503],
        [42.6582, 0.6488],
        [42.6495, 0.6462],
        [42.6412, 0.6505],
        [42.6352, 0.6542],
        [42.6311, 0.6567],
      ],
    },
    {
      id: 'aneto-from-renclusa-hut',
      name: 'Desde Refugio de La Renclusa (vía Portillón Superior y Paso de Mahoma)',
      originType: 'hut',
      hutId: 'renclusa',
      distanceKm: 5.4,
      elevationGain: 1270,
      ascent: 1270,
      estimatedTime: '4h 30min',
      difficulty: 'PD',
      description:
        'Salida de madrugada desde La Renclusa (2.140 m) ganando altura por bloques de granito hacia el Portillón Superior, travesía del glaciar y cresta final de Mahoma.',
      waypoints: [
        [42.6689, 0.6503],
        [42.6582, 0.6488],
        [42.6495, 0.6462],
        [42.6412, 0.6505],
        [42.6352, 0.6542],
        [42.6311, 0.6567],
      ],
    },
  ],

  'monte-perdido': [
    {
      id: 'perdido-from-ordesa-parking',
      name: 'Desde Pradera de Ordesa (vía Cola de Caballo y Refugio de Góriz)',
      originType: 'parking',
      parkingInfo: PARKINGS.ordesa,
      distanceKm: 13.5,
      elevationGain: 2050,
      ascent: 2050,
      estimatedTime: '7h 30min',
      difficulty: 'PD',
      description:
        'Recorre el espectacular cañón de Ordesa pasando por las Gradas de Soaso y Cola de Caballo, sube por las Clavijas al Refugio de Góriz y ataca la cumbre por el Lago Helado y La Escupidera.',
      waypoints: [
        [42.6497, -0.0567],
        [42.6512, -0.032],
        [42.6548, -0.0085],
        [42.6585, 0.0052],
        [42.6628, 0.0144],
        [42.6712, 0.0228],
        [42.6768, 0.0285],
        [42.675, 0.0339],
      ],
    },
    {
      id: 'perdido-from-pineta-parking',
      name: 'Desde Parking de Pineta (vía Balcón de Pineta y Lago Helado)',
      originType: 'parking',
      parkingInfo: PARKINGS.pineta,
      distanceKm: 9.2,
      elevationGain: 2115,
      ascent: 2115,
      estimatedTime: '6h 45min',
      difficulty: 'PD',
      description:
        'Durísima y majestuosa ascensión por las zetas del Balcón de Pineta hasta el Ibón de Marboré, bordeando el glaciar norte hacia el Lago Helado y la cima.',
      waypoints: [
        [42.6656, 0.0975],
        [42.6708, 0.0825],
        [42.6815, 0.062],
        [42.6922, 0.0445],
        [42.6875, 0.035],
        [42.6795, 0.0298],
        [42.675, 0.0339],
      ],
    },
    {
      id: 'perdido-from-goriz-hut',
      name: 'Desde Refugio de Góriz por La Escupidera',
      originType: 'hut',
      hutId: 'goriz',
      distanceKm: 4.3,
      elevationGain: 1160,
      ascent: 1160,
      estimatedTime: '3h 45min',
      difficulty: 'PD',
      description:
        'Vía normal desde Góriz (2.200 m) pasando por Ciudad de Piedra, Lago Helado (2.990 m) y el canal inclinado de La Escupidera.',
      waypoints: [
        [42.6628, 0.0144],
        [42.6695, 0.0215],
        [42.6768, 0.0285],
        [42.675, 0.0339],
      ],
    },
  ],

  vignemale: [
    {
      id: 'vignemale-from-pont-espagne',
      name: "Desde Pont d'Espagne (vía Oulettes de Gaube y Bayssellance)",
      originType: 'parking',
      parkingInfo: PARKINGS.pontEspagne,
      distanceKm: 13.8,
      elevationGain: 1850,
      ascent: 1850,
      estimatedTime: '6h 30min',
      difficulty: 'PD',
      description:
        "Gran clásica francesa remontando el Lac de Gaube hasta el Refuge des Oulettes bajo la imponente cara norte, subiendo a la Hourquette d'Ossoue y Bayssellance para atravesar el Glaciar d'Ossoue.",
      waypoints: [
        [42.8511, -0.1386],
        [42.8335, -0.1398],
        [42.8112, -0.1455],
        [42.7964, -0.1452],
        [42.7852, -0.1325],
        [42.7806, -0.1239],
        [42.7758, -0.1365],
        [42.7739, -0.1475],
      ],
    },
    {
      id: 'vignemale-from-bayssellance',
      name: "Desde Refuge de Bayssellance por el Glaciar d'Ossoue",
      originType: 'hut',
      hutId: 'bayssellance',
      distanceKm: 3.6,
      elevationGain: 700,
      ascent: 700,
      estimatedTime: '2h 45min',
      difficulty: 'PD',
      description:
        "Descenso breve a la lengua del glaciar d'Ossoue y ascensión encordada hasta la base de la Pique Longue (trepada final II).",
      waypoints: [
        [42.7806, -0.1239],
        [42.7765, -0.1322],
        [42.7745, -0.1415],
        [42.7739, -0.1475],
      ],
    },
  ],

  'midi-ossau': [
    {
      id: 'ossau-from-aneou-parking',
      name: 'Desde Parking de Anéou (vía Refuge de Pombie y Tres Chimeneas)',
      originType: 'parking',
      parkingInfo: PARKINGS.aneou,
      distanceKm: 7.4,
      elevationGain: 1180,
      ascent: 1180,
      estimatedTime: '4h 30min',
      difficulty: 'AD',
      description:
        "Aproximación cómoda desde Anéou al Col de Soum de Pombie y Refuge de Pombie, continuando al Col de Suzon para escalar las célebres Tres Chimeneas (II+/III-) hasta la cumbre del Grand Pic.",
      waypoints: [
        [42.8117, -0.4158],
        [42.8215, -0.4225],
        [42.8295, -0.4272],
        [42.8342, -0.4317],
        [42.8422, -0.4312],
        [42.8442, -0.4348],
        [42.8431, -0.4378],
      ],
    },
    {
      id: 'ossau-from-pombie-hut',
      name: 'Desde Refuge de Pombie por las Tres Chimeneas',
      originType: 'hut',
      hutId: 'pombie',
      distanceKm: 2.8,
      elevationGain: 860,
      ascent: 860,
      estimatedTime: '3h',
      difficulty: 'AD',
      description:
        'Sube por la pedrera de la Grande Raillère hasta el Col de Suzon y acomete las tres chimeneas de andesita hasta la Cruz del Midi.',
      waypoints: [
        [42.8342, -0.4317],
        [42.8405, -0.4308],
        [42.8442, -0.4348],
        [42.8431, -0.4378],
      ],
    },
  ],
}

export const CURATED_HUT_ROUTES: Record<string, Route[]> = {
  estiva: [
    {
      id: 'hut-estiva-from-pineta',
      name: 'Desde Parking de Pineta (vía Ermita y sendero GR-11)',
      originType: 'parking',
      parkingInfo: PARKINGS.pineta,
      distanceKm: 5.5,
      elevationGain: 830,
      ascent: 830,
      estimatedTime: '2h 15min',
      difficulty: 'F',
      description:
        'Ascensión clásica por el sendero GR-11 desde la Ermita de Pineta atravesando hayedos y praderas hasta el Refugio libre de La Estiva (2.070 m), con agua en abrevadero cercano.',
      waypoints: [
        [42.6656, 0.0975],
        [42.6685, 0.1025],
        [42.6728, 0.1098],
        [42.6772, 0.1175],
        [42.6815, 0.1255],
      ],
    },
    {
      id: 'hut-estiva-from-espierba',
      name: 'Desde Espierba por la pista de La Estiva',
      originType: 'parking',
      parkingInfo: PARKINGS.espierba,
      distanceKm: 10.0,
      elevationGain: 780,
      ascent: 780,
      estimatedTime: '3h',
      difficulty: 'F',
      description:
        'Pista forestal de 10 km desde el núcleo de Espierba remontando la sierra hasta las praderas altas de La Estiva.',
      waypoints: [
        [42.6345, 0.1615],
        [42.6485, 0.153],
        [42.6625, 0.1425],
        [42.674, 0.133],
        [42.6815, 0.1255],
      ],
    },
    {
      id: 'hut-estiva-from-ref-pineta',
      name: 'Desde Refugio de Pineta por GR-11',
      originType: 'hut',
      hutId: 'pineta',
      distanceKm: 5.2,
      elevationGain: 830,
      ascent: 830,
      estimatedTime: '2h',
      difficulty: 'F',
      description: 'Enlace directo desde el Refugio de Pineta (1.240 m) siguiendo las marcas rojas y blancas del GR-11.',
      waypoints: [
        [42.6683, 0.0978],
        [42.6728, 0.1098],
        [42.6772, 0.1175],
        [42.6815, 0.1255],
      ],
    },
  ],

  larri: [
    {
      id: 'hut-larri-from-pineta',
      name: 'Desde Parking de Pineta por los Llanos de La Larri',
      originType: 'parking',
      parkingInfo: PARKINGS.pineta,
      distanceKm: 3.8,
      elevationGain: 350,
      ascent: 350,
      estimatedTime: '1h 15min',
      difficulty: 'F',
      description:
        'Excursión muy popular desde el fondo del Valle de Pineta subiendo junto a las cascadas hasta los espectaculares Llanos de La Larri, con vistas directas al glaciar de Monte Perdido.',
      waypoints: [
        [42.6656, 0.0975],
        [42.6705, 0.0992],
        [42.6752, 0.1018],
        [42.679, 0.1035],
        [42.6819, 0.1047],
      ],
    },
    {
      id: 'hut-larri-from-ref-pineta',
      name: 'Desde Refugio de Pineta',
      originType: 'hut',
      hutId: 'pineta',
      distanceKm: 3.4,
      elevationGain: 350,
      ascent: 350,
      estimatedTime: '1h 10min',
      difficulty: 'F',
      description: 'Sube por el camino de las cascadas de La Larri hasta el refugio libre.',
      waypoints: [
        [42.6683, 0.0978],
        [42.6745, 0.1012],
        [42.6819, 0.1047],
      ],
    },
  ],
}

/* ------------------------------------------------------------------ */
/* Generador automático de rutas coherentes (Parking + Refugio)        */
/* ------------------------------------------------------------------ */

const ALL_PARKINGS = Object.values(PARKINGS)

function approxKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  return Math.hypot((a.lon - b.lon) * 82, (a.lat - b.lat) * 111)
}

function formatDuration(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60 / 15) * 15
  if (m === 60) return `${h + 1}h`
  if (h === 0) return `${Math.max(15, m)}min`
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

export function buildAutoPeakRoutes(
  peak: { id: string; name: string; elevation: number; coordinates: { lat: number; lon: number }; massif: string; difficulty: Difficulty },
  allHuts: Hut[],
): Route[] {
  const routes: Route[] = []

  // 1. Ruta desde el parking / acceso rodado más cercano
  const nearestParking = ALL_PARKINGS.map((p) => ({ p, d: approxKm(p.coordinates, peak.coordinates) })).sort(
    (a, b) => a.d - b.d,
  )[0]

  if (nearestParking) {
    const distKm = Number(Math.max(2.4, nearestParking.d * 1.35).toFixed(1))
    const gain = Math.max(450, Math.round((peak.elevation - 1450) / 10) * 10)
    const hours = distKm / 3.8 + gain / 420
    routes.push({
      id: `${peak.id}-auto-parking`,
      name: `Desde ${nearestParking.p.name}`,
      originType: 'parking',
      parkingInfo: nearestParking.p,
      distanceKm: distKm,
      elevationGain: gain,
      ascent: gain,
      estimatedTime: formatDuration(hours),
      difficulty: peak.difficulty,
      description: `Aproximación desde el acceso rodado más cercano (${nearestParking.p.name}) remontando el valle hacia la cumbre de ${peak.name}.`,
      waypoints: [
        [nearestParking.p.coordinates.lat, nearestParking.p.coordinates.lon],
        [peak.coordinates.lat, peak.coordinates.lon],
      ],
    })
  }

  // 2. Ruta desde el refugio real más cercano
  const nearestHut = allHuts
    .map((h) => ({ h, d: approxKm(h.coordinates, peak.coordinates) }))
    .sort((a, b) => a.d - b.d)[0]

  if (nearestHut) {
    const distKm = Number(Math.max(1.2, nearestHut.d * 1.3).toFixed(1))
    const gain = Math.max(220, Math.round((peak.elevation - nearestHut.h.elevation) / 10) * 10)
    const hours = distKm / 3.6 + gain / 400
    routes.push({
      id: `${peak.id}-auto-hut`,
      name: `Desde ${nearestHut.h.name}`,
      originType: 'hut',
      hutId: nearestHut.h.id,
      distanceKm: distKm,
      elevationGain: gain,
      ascent: gain,
      estimatedTime: formatDuration(hours),
      difficulty: peak.difficulty,
      description: `Ascensión de alta montaña partiendo desde ${nearestHut.h.name} (${nearestHut.h.elevation} m) hasta la cima de ${peak.name}.`,
      waypoints: [
        [nearestHut.h.coordinates.lat, nearestHut.h.coordinates.lon],
        [peak.coordinates.lat, peak.coordinates.lon],
      ],
    })
  }

  return routes
}

export function buildAutoHutRoutes(hut: Hut, allHuts: Hut[]): Route[] {
  const routes: Route[] = []

  // 1. Acceso desde parking más cercano
  const nearestParking = ALL_PARKINGS.map((p) => ({ p, d: approxKm(p.coordinates, hut.coordinates) })).sort(
    (a, b) => a.d - b.d,
  )[0]

  if (nearestParking) {
    const distKm = Number(Math.max(0.8, nearestParking.d * 1.3).toFixed(1))
    const gain = Math.max(120, Math.round(Math.max(0, hut.elevation - 1350) / 10) * 10)
    const hours = Math.max(0.4, distKm / 4.0 + gain / 450)
    routes.push({
      id: `${hut.id}-auto-parking`,
      name: `Aproximación desde ${nearestParking.p.name}`,
      originType: 'parking',
      parkingInfo: nearestParking.p,
      distanceKm: distKm,
      elevationGain: gain,
      ascent: gain,
      estimatedTime: formatDuration(hours),
      difficulty: 'F',
      description: hut.accessNotes,
      waypoints: [
        [nearestParking.p.coordinates.lat, nearestParking.p.coordinates.lon],
        [hut.coordinates.lat, hut.coordinates.lon],
      ],
    })
  }

  // 2. Travesía desde el refugio vecino más cercano
  const neighborHut = allHuts
    .filter((h) => h.id !== hut.id)
    .map((h) => ({ h, d: approxKm(h.coordinates, hut.coordinates) }))
    .sort((a, b) => a.d - b.d)[0]

  if (neighborHut && neighborHut.d <= 16) {
    const distKm = Number(Math.max(1.5, neighborHut.d * 1.35).toFixed(1))
    const gain = Math.max(150, Math.round(Math.abs(hut.elevation - neighborHut.h.elevation) / 10) * 10 + 150)
    const hours = distKm / 3.8 + gain / 450
    routes.push({
      id: `${hut.id}-auto-hut`,
      name: `Travesía desde ${neighborHut.h.name}`,
      originType: 'hut',
      hutId: neighborHut.h.id,
      distanceKm: distKm,
      elevationGain: gain,
      ascent: gain,
      estimatedTime: formatDuration(hours),
      difficulty: 'F',
      description: `Enlace de alta montaña entre ${neighborHut.h.name} (${neighborHut.h.elevation} m) y ${hut.name} (${hut.elevation} m).`,
      waypoints: [
        [neighborHut.h.coordinates.lat, neighborHut.h.coordinates.lon],
        [hut.coordinates.lat, hut.coordinates.lon],
      ],
    })
  }

  return routes
}
