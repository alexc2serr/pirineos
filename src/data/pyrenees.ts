import * as THREE from 'three'
import { HUTS, hutsById, type Hut, type HutServices, type HutType } from './huts'
import osmData from './osm_pyrenees.json'
import {
  CURATED_PEAK_ROUTES,
  buildAutoPeakRoutes,
  type ParkingInfo,
  type Route,
  type RouteOriginType,
} from './routesData'

export {
  HUTS,
  hutsById,
  type Hut,
  type HutServices,
  type HutType,
  type ParkingInfo,
  type Route,
  type RouteOriginType,
}

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

export type Country = 'ES' | 'FR' | 'ES/FR'
export type Difficulty = 'F' | 'PD' | 'AD' | 'D'

interface LegacyRoute {
  name: string
  ascent: number
  time: string
  description: string
}

export interface NearbyHut {
  name: string
  /** Altitud en metros */
  elevation: number
  /** Plazas */
  capacity: number
  /** ID del refugio en `HUTS` si existe en el catálogo completo */
  hutId?: string
}

interface RawPeak {
  id: string
  name: string
  elevation: number
  coordinates: { lat: number; lon: number }
  country: Country
  massif: string
  difficulty: Difficulty
  routes: LegacyRoute[]
  nearbyHuts: NearbyHut[]
}

export interface Peak {
  id: string
  name: string
  elevation: number
  coordinates: { lat: number; lon: number }
  country: Country
  massif: string
  difficulty: Difficulty
  routes: Route[]
  nearbyHuts: NearbyHut[]
}

/* ------------------------------------------------------------------ */
/* Proyección geográfica                                               */
/* ------------------------------------------------------------------ */

/** Centro de la escena (lat/lon). */
export const CENTER = { lat: 42.65, lon: 0.5 } as const
/** Unidades de escena: 1 unidad = 1 km. */
export const KM_PER_DEG_LAT = 110.574
export const KM_PER_DEG_LON_AT_CENTER = 111.32 * Math.cos((CENTER.lat * Math.PI) / 180)
/** Exageración vertical para realzar el relieve. */
export const VERTICAL_EXAGGERATION = 2.4

/** Convierte metros reales de altitud en unidades de escena. */
export const elevationToWorldY = (elevationM: number): number =>
  (elevationM / 1000) * VERTICAL_EXAGGERATION

/** Inversa de `elevationToWorldY`. */
export const worldYToElevation = (y: number): number => (y / VERTICAL_EXAGGERATION) * 1000

/**
 * GPS (lat, lon, elevación en m) -> coordenadas de escena Three.js.
 * +X = Este, +Y = arriba, -Z = Norte.
 */
export function latLonToWorld(lat: number, lon: number, elevation = 0): THREE.Vector3 {
  const x = (lon - CENTER.lon) * KM_PER_DEG_LON_AT_CENTER
  const z = -(lat - CENTER.lat) * KM_PER_DEG_LAT
  return new THREE.Vector3(x, elevationToWorldY(elevation), z)
}

/** Inversa de `latLonToWorld` (ignora la altura). */
export function worldToLatLon(x: number, z: number): { lat: number; lon: number } {
  return { lat: CENTER.lat - z / KM_PER_DEG_LAT, lon: CENTER.lon + x / KM_PER_DEG_LON_AT_CENTER }
}

/** Posición 3D de la cima de un pico. */
export const peakToWorld = (peak: Peak, offsetM = 0): THREE.Vector3 =>
  latLonToWorld(peak.coordinates.lat, peak.coordinates.lon, peak.elevation + offsetM)

/* Helper para referenciar refugios del catálogo HUTS */
function refHut(id: string): NearbyHut {
  const h = hutsById[id]
  return { name: h.name, elevation: h.elevation, capacity: h.capacity, hutId: h.id }
}

/* ------------------------------------------------------------------ */
/* Dataset de Picos (64 cumbres emblemáticas de Oeste a Este)          */
/* ------------------------------------------------------------------ */

const CURATED_PEAKS: RawPeak[] = [
  /* ---------- NAVARRA / PIRINEO VASCO-NAVARRO ---------- */
  {
    id: 'orhi',
    name: 'Orhi (Ori)',
    elevation: 2017,
    coordinates: { lat: 42.9878, lon: -1.0056 },
    country: 'ES/FR',
    massif: 'Salazar / Larrau',
    difficulty: 'F',
    routes: [
      {
        name: 'Normal desde el Puerto de Larrau',
        ascent: 440,
        time: '1 h 30 min',
        description: 'Primer dosmil del Pirineo desde el Atlántico. Senda panorámica por la loma herbosa de Zazpigaina.',
      },
    ],
    nearbyHuts: [refHut('linza')],
  },
  {
    id: 'ezkaurre',
    name: 'Peña Ezkaurre',
    elevation: 2047,
    coordinates: { lat: 42.8528, lon: -0.8403 },
    country: 'ES',
    massif: 'Roncal / Ansó',
    difficulty: 'F',
    routes: [
      {
        name: 'Normal desde el Alto de Argibiela',
        ascent: 780,
        time: '2 h 30 min',
        description: 'Ascensión clásica entre hayedos y caliza blanca con vistas excepcionales al valle de Belagua.',
      },
    ],
    nearbyHuts: [refHut('linza')],
  },
  {
    id: 'mesa-tres-reyes',
    name: 'Mesa de los Tres Reyes',
    elevation: 2446,
    coordinates: { lat: 42.9194, lon: -0.7275 },
    country: 'ES/FR',
    massif: 'Larra / Belagua',
    difficulty: 'F',
    routes: [
      {
        name: 'Normal desde el Refugio de Linza',
        ascent: 1120,
        time: '3 h 30 min',
        description: 'Techo de Navarra por el Collado de Linza y la Hoya de la Solana, con fácil trepada final (I).',
      },
    ],
    nearbyHuts: [refHut('linza')],
  },
  {
    id: 'anie',
    name: 'Pic d\'Anie (Auñamendi)',
    elevation: 2507,
    coordinates: { lat: 42.9442, lon: -0.7208 },
    country: 'FR',
    massif: 'Larra / Pierre Saint-Martin',
    difficulty: 'F',
    routes: [
      {
        name: 'Normal desde el Refugio de Belagua / Lescun',
        ascent: 1050,
        time: '3 h 45 min',
        description: 'Elegante pirámide caliza rodeada por el inmenso karst de Larra. Requiere atención con niebla.',
      },
    ],
    nearbyHuts: [refHut('linza')],
  },
  {
    id: 'petrechema',
    name: 'Petrechema (Ansabère)',
    elevation: 2371,
    coordinates: { lat: 42.9056, lon: -0.7336 },
    country: 'ES/FR',
    massif: 'Ansó / Lescun',
    difficulty: 'F',
    routes: [
      {
        name: 'Normal desde Linza por el Collado de Linza',
        ascent: 1040,
        time: '3 h',
        description: 'Impresionante balcón sobre las Agujas de Ansabère por la Foya de los Ingenieros.',
      },
    ],
    nearbyHuts: [refHut('linza')],
  },

  /* ---------- VALLES OCCIDENTALES (HECHO / ARAGÜÉS / AÍSA) ---------- */
  {
    id: 'castillo-acher',
    name: 'Castillo de Acher',
    elevation: 2390,
    coordinates: { lat: 42.8153, lon: -0.7106 },
    country: 'ES',
    massif: 'Hecho / Selva de Oza',
    difficulty: 'F',
    routes: [
      {
        name: 'Normal desde la Selva de Oza',
        ascent: 1200,
        time: '3 h 30 min',
        description: 'Espectacular fortaleza natural de arenisca roja (sinclinal colgado) ascendiendo por su brecha sur.',
      },
    ],
    nearbyHuts: [refHut('gabardito')],
  },
  {
    id: 'pena-forca',
    name: 'Peña Forca',
    elevation: 2391,
    coordinates: { lat: 42.8017, lon: -0.7422 },
    country: 'ES',
    massif: 'Alano / Hecho',
    difficulty: 'F',
    routes: [
      {
        name: 'Normal desde Gabardito por el Lenito',
        ascent: 1020,
        time: '3 h 15 min',
        description: 'Cumbre más alta de la Sierra de Alano, con vistas soberbias a la Selva de Oza y Bisaurín.',
      },
    ],
    nearbyHuts: [refHut('gabardito')],
  },
  {
    id: 'bisaurin',
    name: 'Bisaurín',
    elevation: 2670,
    coordinates: { lat: 42.7867, lon: -0.6383 },
    country: 'ES',
    massif: 'Bisaurín',
    difficulty: 'F',
    routes: [
      {
        name: 'Normal desde el Refugio de Lizara',
        ascent: 1130,
        time: '3 h',
        description: 'Gigante de los Valles Occidentales por el Collado del Foratón y su característica pala sur.',
      },
      {
        name: 'Cara Norte desde Gabardito',
        ascent: 1300,
        time: '4 h 30 min',
        description: 'Ruta alpina invernal por el corredor norte (PD).',
      },
    ],
    nearbyHuts: [refHut('lizara'), refHut('gabardito')],
  },
  {
    id: 'aspe',
    name: 'Pico de Aspe',
    elevation: 2645,
    coordinates: { lat: 42.7656, lon: -0.5628 },
    country: 'ES',
    massif: 'Aspe / Aísa',
    difficulty: 'PD',
    routes: [
      {
        name: 'Normal desde el Valle de Aísa (La Cleta)',
        ascent: 1180,
        time: '3 h 30 min',
        description: 'Por el Paso de la Garganta de Aísa; en invierno requiere crampones y piolet en la pala final.',
      },
    ],
    nearbyHuts: [refHut('lizara')],
  },
  {
    id: 'collarada',
    name: 'Collarada',
    elevation: 2886,
    coordinates: { lat: 42.6944, lon: -0.4892 },
    country: 'ES',
    massif: 'Collarada',
    difficulty: 'F',
    routes: [
      {
        name: 'Normal desde Villanúa por La Trapa',
        ascent: 1550,
        time: '4 h 30 min',
        description: 'Clásica de la Jacetania pasando junto al Refugio de la Espata y el Collado de Ip.',
      },
      {
        name: 'Desde Canfranc por el Ibón de Ip',
        ascent: 1650,
        time: '5 h',
        description: 'Subida directa al ibón glaciar de Ip y pala final hasta la cumbre.',
      },
    ],
    nearbyHuts: [refHut('espata')],
  },
  {
    id: 'pala-de-ip',
    name: 'Pala de Ip',
    elevation: 2783,
    coordinates: { lat: 42.7192, lon: -0.4539 },
    country: 'ES',
    massif: 'Collarada / Ip',
    difficulty: 'PD',
    routes: [
      {
        name: 'Normal desde el Ibón de Ip',
        ascent: 1500,
        time: '4 h 30 min',
        description: 'Elegante pirámide sobre el circo de Ip con corta trepada somital.',
      },
    ],
    nearbyHuts: [refHut('espata')],
  },
  {
    id: 'moleta',
    name: 'Pico de la Moleta',
    elevation: 2572,
    coordinates: { lat: 42.7492, lon: -0.4783 },
    country: 'ES',
    massif: 'Canfranc / Canal Roya',
    difficulty: 'F',
    routes: [
      {
        name: 'Normal desde Canfranc-Estación',
        ascent: 1380,
        time: '4 h',
        description: 'Ascensión sostenida por bosque y praderas con panorámica directa sobre el Anayet y Midi d\'Ossau.',
      },
    ],
    nearbyHuts: [refHut('espata')],
  },

  /* ---------- VALLE DE TENA / PARTACUA / OSSAU ---------- */
  {
    id: 'pico-estiva',
    name: 'Pico de la Estiva',
    elevation: 2125,
    coordinates: { lat: 42.683, lon: 0.132 },
    country: 'ES',
    massif: 'Pineta / La Munia',
    difficulty: 'F',
    routes: [
      {
        name: 'Desde Espierba o Ermita de Pineta por el Refugio de La Estiva',
        ascent: 850,
        time: '2 h 30 min',
        description:
          'Subida panorámica por las praderas de La Estiva (sector Zuca Ronchada / La Munia) con vistas privilegiadas al Valle de Pineta y Monte Perdido.',
      },
    ],
    nearbyHuts: [refHut('estiva'), refHut('pineta'), refHut('larri')],
  },
  {
    id: 'pena-telera',
    name: 'Peña Telera',
    elevation: 2764,
    coordinates: { lat: 42.6958, lon: -0.3361 },
    country: 'ES',
    massif: 'Sierra de la Partacua',
    difficulty: 'PD',
    routes: [
      {
        name: 'Normal por el Paso Horizontal y Collado de Cachivirizas',
        ascent: 1480,
        time: '4 h 30 min',
        description: 'Desde Piedrafita de Jaca rodeando el circo por el Paso Horizontal. En invierno, meca del alpinismo en sus canales norte.',
      },
    ],
    nearbyHuts: [refHut('telera')],
  },
  {
    id: 'pena-blanca',
    name: 'Peña Blanca',
    elevation: 2556,
    coordinates: { lat: 42.7105, lon: -0.3489 },
    country: 'ES',
    massif: 'Sierra de la Partacua',
    difficulty: 'PD',
    routes: [
      {
        name: 'Normal desde el Ibón de Piedrafita',
        ascent: 1200,
        time: '3 h 45 min',
        description: 'Escarpada mole caliza sobre el Valle de Tena, combinable con la cresta hacia Peña Telera.',
      },
    ],
    nearbyHuts: [refHut('telera')],
  },
  {
    id: 'anayet',
    name: 'Pico Anayet',
    elevation: 2545,
    coordinates: { lat: 42.7819, lon: -0.4547 },
    country: 'ES',
    massif: 'Anayet / Valle de Tena',
    difficulty: 'PD',
    routes: [
      {
        name: 'Normal desde Corral de las Mulas (Formigal)',
        ascent: 930,
        time: '3 h',
        description: 'Atraviesa los icónicos Ibones de Anayet con vistas al Midi d\'Ossau y supera una cadena equipada en la chimenea final.',
      },
    ],
    nearbyHuts: [refHut('pombie'), refHut('ayous')],
  },
  {
    id: 'culibillas',
    name: 'Pico Culibillas',
    elevation: 2519,
    coordinates: { lat: 42.785, lon: -0.4278 },
    country: 'ES',
    massif: 'Anayet / Valle de Tena',
    difficulty: 'F',
    routes: [
      {
        name: 'Desde el aparcamiento de Anayet (Formigal)',
        ascent: 800,
        time: '2 h 30 min',
        description: 'Clásica de esquí de montaña y senderismo sobre el barranco de Culibillas y el Portalet.',
      },
    ],
    nearbyHuts: [refHut('pombie')],
  },
  {
    id: 'sabocos',
    name: 'Pico Mandilar (Sabocos)',
    elevation: 2220,
    coordinates: { lat: 42.6889, lon: -0.2644 },
    country: 'ES',
    massif: 'Tendeñera / Panticosa',
    difficulty: 'F',
    routes: [
      {
        name: 'Desde el Ibón de Sabocos (Panticosa)',
        ascent: 420,
        time: '1 h 30 min',
        description: 'Mirador privilegiado sobre la Sierra de la Partacua, el Valle de Tena y los tresmiles de Panticosa.',
      },
    ],
    nearbyHuts: [refHut('casa-piedra'), refHut('telera')],
  },
  {
    id: 'midi-ossau',
    name: "Pic du Midi d'Ossau",
    elevation: 2884,
    coordinates: { lat: 42.8431, lon: -0.4378 },
    country: 'FR',
    massif: 'Ossau',
    difficulty: 'AD',
    routes: [
      {
        name: 'Vía Normal por las Tres Chimeneas',
        ascent: 1180,
        time: '4 h 30 min',
        description: 'Desde el Refuge de Pombie, tres chimeneas de II+/III- en roca volcánica firme. Símbolo absoluto del Pirineo francés.',
      },
    ],
    nearbyHuts: [refHut('pombie'), refHut('ayous')],
  },
  {
    id: 'pic-de-larry',
    name: 'Pic de Larry',
    elevation: 2337,
    coordinates: { lat: 42.8508, lon: -0.5172 },
    country: 'FR',
    massif: 'Ossau / Aspe',
    difficulty: 'F',
    routes: [
      {
        name: 'Desde el Refuge d\'Ayous por el Col d\'Ayous',
        ascent: 950,
        time: '3 h',
        description: 'Cresta panorámica entre el valle de Aspe y los lagos de Ayous, frente a la cara oeste del Midi d\'Ossau.',
      },
    ],
    nearbyHuts: [refHut('ayous'), refHut('pombie')],
  },
  {
    id: 'lurien',
    name: 'Pic de Lurien',
    elevation: 2826,
    coordinates: { lat: 42.8669, lon: -0.3511 },
    country: 'FR',
    massif: 'Ossau / Balaitús',
    difficulty: 'PD',
    routes: [
      {
        name: 'Normal desde Fabrèges por el Lago de Lurien',
        ascent: 1580,
        time: '4 h 30 min',
        description: 'Esbelto pico granítico con gran ambiente de alta montaña frente al Palas y Balaitús.',
      },
    ],
    nearbyHuts: [refHut('pombie'), refHut('migouelou')],
  },

  /* ---------- BALAITÚS / PANTICOSA / VIGNEMALE ---------- */
  {
    id: 'palas',
    name: 'Pico Palas',
    elevation: 2974,
    coordinates: { lat: 42.8492, lon: -0.3133 },
    country: 'ES/FR',
    massif: 'Balaitús',
    difficulty: 'PD',
    routes: [
      {
        name: 'Chimenea Ledormeur desde Arremoulit / Respomuso',
        ascent: 900,
        time: '3 h 30 min',
        description: 'Granito excelente con pasos de II+ en chimenea aérea. Uno de los dosmiles más alpinos del Pirineo.',
      },
    ],
    nearbyHuts: [refHut('respomuso'), refHut('migouelou')],
  },
  {
    id: 'balaitus',
    name: 'Balaitús',
    elevation: 3144,
    coordinates: { lat: 42.8386, lon: -0.2903 },
    country: 'ES/FR',
    massif: 'Balaitús',
    difficulty: 'AD',
    routes: [
      {
        name: 'Gran Diagonal desde Respomuso',
        ascent: 1050,
        time: '4 h 30 min',
        description: 'Vira espectacular que cruza toda la pared oeste (II) hasta la cima. El tresmil más occidental.',
      },
      {
        name: 'Brecha Latour',
        ascent: 1000,
        time: '4 h 30 min',
        description: 'Clásica alpina con clavijas metálicas y corredor de nieve/roca (AD-).',
      },
    ],
    nearbyHuts: [refHut('respomuso'), refHut('migouelou')],
  },
  {
    id: 'infiernos',
    name: 'Picos del Infierno (Central)',
    elevation: 3082,
    coordinates: { lat: 42.7856, lon: -0.2603 },
    country: 'ES',
    massif: 'Panticosa',
    difficulty: 'PD',
    routes: [
      {
        name: 'Normal desde Bachimaña por los Ibones Azules',
        ascent: 950,
        time: '3 h 30 min',
        description: 'Recorre la espectacular marmolera blanca y la cresta aérea que une los tres picos del Infierno.',
      },
    ],
    nearbyHuts: [refHut('bachimana'), refHut('casa-piedra'), refHut('respomuso')],
  },
  {
    id: 'garmo-negro',
    name: 'Garmo Negro',
    elevation: 3051,
    coordinates: { lat: 42.7711, lon: -0.2656 },
    country: 'ES',
    massif: 'Panticosa',
    difficulty: 'F',
    routes: [
      {
        name: 'Normal desde Casa de Piedra (Balneario de Panticosa)',
        ascent: 1420,
        time: '3 h 45 min',
        description: 'Uno de los tresmiles más directos y frecuentados por la Mallata Baja y el Ibón de Pondiellos.',
      },
    ],
    nearbyHuts: [refHut('casa-piedra'), refHut('bachimana')],
  },
  {
    id: 'vignemale',
    name: 'Vignemale (Pique Longue)',
    elevation: 3298,
    coordinates: { lat: 42.7739, lon: -0.1475 },
    country: 'ES/FR',
    massif: 'Vignemale',
    difficulty: 'PD',
    routes: [
      {
        name: "Normal por el Glaciar d'Ossoue",
        ascent: 700,
        time: '2 h 45 min',
        description: 'Desde Bayssellance remonta el mayor glaciar de lengua del Pirineo francés y supera una trepada final (II).',
      },
      {
        name: 'Corredor de Gaube',
        ascent: 1150,
        time: '6 h',
        description: 'Mítica canal de hielo y mixto (D) en la vertiente norte.',
      },
    ],
    nearbyHuts: [refHut('bayssellance'), refHut('wallon'), refHut('bujaruelo')],
  },
  {
    id: 'petit-vignemale',
    name: 'Petit Vignemale',
    elevation: 3032,
    coordinates: { lat: 42.7797, lon: -0.1353 },
    country: 'FR',
    massif: 'Vignemale',
    difficulty: 'F',
    routes: [
      {
        name: 'Desde el Refuge de Bayssellance por la Hourquette d\'Ossoue',
        ascent: 400,
        time: '1 h 30 min',
        description: 'Mirador extraordinario sobre la cara norte del Vignemale y el glaciar de Ossoue.',
      },
    ],
    nearbyHuts: [refHut('bayssellance'), refHut('wallon')],
  },

  /* ---------- ORDESA / MONTE PERDIDO / GAVARNIE / PINETA ---------- */
  {
    id: 'taillon',
    name: 'Taillón',
    elevation: 3144,
    coordinates: { lat: 42.6939, lon: -0.0517 },
    country: 'ES/FR',
    massif: 'Monte Perdido',
    difficulty: 'F',
    routes: [
      {
        name: 'Normal por la Brecha de Rolando',
        ascent: 950,
        time: '3 h 30 min',
        description: 'Desde Sarradets o Bujaruelo cruzando la mítica Brecha de Rolando y la Falsa Brecha.',
      },
    ],
    nearbyHuts: [refHut('sarradets'), refHut('bujaruelo'), refHut('goriz')],
  },
  {
    id: 'casco-marbore',
    name: 'Casco de Marboré',
    elevation: 3006,
    coordinates: { lat: 42.6858, lon: -0.0258 },
    country: 'ES/FR',
    massif: 'Monte Perdido',
    difficulty: 'PD',
    routes: [
      {
        name: 'Desde la Brecha de Rolando por el Paso de los Sarrios',
        ascent: 500,
        time: '2 h 15 min',
        description: 'Paso equipado con cadenas y ascenso por la canal noroeste hacia una cima colgada sobre Ordesa.',
      },
    ],
    nearbyHuts: [refHut('sarradets'), refHut('goriz')],
  },
  {
    id: 'torre-marbore',
    name: 'Torre de Marboré',
    elevation: 3009,
    coordinates: { lat: 42.6869, lon: -0.0156 },
    country: 'ES/FR',
    massif: 'Monte Perdido',
    difficulty: 'PD',
    routes: [
      {
        name: 'Desde Góriz o Sarradets por el Collado de la Torre',
        ascent: 850,
        time: '3 h 30 min',
        description: 'Bastión vertical sobre el Circo de Gavarnie con pasos aéreos de II.',
      },
    ],
    nearbyHuts: [refHut('goriz'), refHut('sarradets')],
  },
  {
    id: 'cilindro-marbore',
    name: 'Cilindro de Marboré',
    elevation: 3328,
    coordinates: { lat: 42.6844, lon: 0.0239 },
    country: 'ES',
    massif: 'Monte Perdido',
    difficulty: 'PD',
    routes: [
      {
        name: 'Desde Góriz por el Lago Helado',
        ascent: 1150,
        time: '4 h',
        description: 'Comparte subida con Monte Perdido hasta el Lago Helado y supera dos chimeneas cortas (II+/III-).',
      },
    ],
    nearbyHuts: [refHut('goriz'), refHut('pineta')],
  },
  {
    id: 'monte-perdido',
    name: 'Monte Perdido',
    elevation: 3355,
    coordinates: { lat: 42.675, lon: 0.0339 },
    country: 'ES',
    massif: 'Monte Perdido',
    difficulty: 'PD',
    routes: [
      {
        name: 'Normal por Góriz y La Escupidera',
        ascent: 1160,
        time: '3 h 45 min',
        description: 'Macizo calcáreo más alto de Europa. Atención extrema en La Escupidera con nieve dura o hielo.',
      },
      {
        name: 'Ruta de Pineta por el Balcón y Lago Helado',
        ascent: 2100,
        time: '7 h',
        description: 'Largo y exigente ascenso por el Valle de Pineta con vistas al glaciar norte.',
      },
    ],
    nearbyHuts: [refHut('goriz'), refHut('pineta'), refHut('larri')],
  },
  {
    id: 'soum-ramond',
    name: 'Soum de Ramond (Pico de Añisclo)',
    elevation: 3254,
    coordinates: { lat: 42.6683, lon: 0.0442 },
    country: 'ES',
    massif: 'Monte Perdido',
    difficulty: 'PD',
    routes: [
      {
        name: 'Desde Góriz por el Collado de Añisclo',
        ascent: 1080,
        time: '4 h',
        description: 'Tercera de las Tres Sorores, con trepada estética de II en caliza descompuesta.',
      },
    ],
    nearbyHuts: [refHut('goriz'), refHut('pineta')],
  },
  {
    id: 'gran-astazou',
    name: 'Gran Astazou',
    elevation: 3071,
    coordinates: { lat: 42.7086, lon: 0.0419 },
    country: 'ES/FR',
    massif: 'Monte Perdido / Gavarnie',
    difficulty: 'PD',
    routes: [
      {
        name: 'Desde el Balcón de Pineta por el Collado de Astazou',
        ascent: 1850,
        time: '6 h',
        description: 'Domina el Circo de Gavarnie con 1.400 m de caída vertical al norte.',
      },
    ],
    nearbyHuts: [refHut('pineta'), refHut('larri'), refHut('goriz')],
  },
  {
    id: 'punta-larri',
    name: 'Pico de la Larri (Chinipro)',
    elevation: 2797,
    coordinates: { lat: 42.6956, lon: 0.1114 },
    country: 'ES',
    massif: 'Pineta / La Munia',
    difficulty: 'F',
    routes: [
      {
        name: 'Desde el Refugio de la Larri por los Llanos',
        ascent: 1210,
        time: '3 h 30 min',
        description: 'Sobrevuela el glaciar y la cara norte de Monte Perdido desde el circo colgado de la Larri.',
      },
    ],
    nearbyHuts: [refHut('larri'), refHut('pineta')],
  },
  {
    id: 'la-munia',
    name: 'La Munia',
    elevation: 3133,
    coordinates: { lat: 42.7153, lon: 0.1322 },
    country: 'ES/FR',
    massif: 'La Munia / Troumouse',
    difficulty: 'PD',
    routes: [
      {
        name: 'Normal desde el Valle de Pineta por el Collado de la Munia',
        ascent: 1750,
        time: '5 h 30 min',
        description: 'Atraviesa el célebre Paso del Gato (II+) sobre el abismo del Circo de Troumouse.',
      },
    ],
    nearbyHuts: [refHut('larri'), refHut('pineta')],
  },
  {
    id: 'robinera',
    name: 'Robiñera',
    elevation: 3003,
    coordinates: { lat: 42.7044, lon: 0.135 },
    country: 'ES',
    massif: 'La Munia / Pineta',
    difficulty: 'F',
    routes: [
      {
        name: 'Desde Chisagüés por los Lagos de la Munia',
        ascent: 1350,
        time: '4 h',
        description: 'Tresmil muy panorámico de pizarra oscura frente a las paredes de Monte Perdido.',
      },
    ],
    nearbyHuts: [refHut('larri'), refHut('pineta')],
  },
  {
    id: 'punta-suelza',
    name: 'Punta Suelza',
    elevation: 2972,
    coordinates: { lat: 42.6344, lon: 0.2519 },
    country: 'ES',
    massif: 'Bielsa / Chistau',
    difficulty: 'F',
    routes: [
      {
        name: 'Normal desde Parzán / Barrosa por el Ibón de Urdiceto',
        ascent: 1050,
        time: '3 h 15 min',
        description: 'Gran mirador aislado entre Pineta, Posets y Cotiella; una de las cumbres más completas bajo los 3.000 m.',
      },
    ],
    nearbyHuts: [refHut('biados'), refHut('pineta')],
  },

  /* ---------- NÉOUVIELLE / BIGORRE / COTIELLA ---------- */
  {
    id: 'pic-long',
    name: 'Pic Long',
    elevation: 3192,
    coordinates: { lat: 42.8011, lon: 0.1003 },
    country: 'FR',
    massif: 'Néouvielle',
    difficulty: 'AD',
    routes: [
      {
        name: 'Arista Este desde Cap-de-Long',
        ascent: 1050,
        time: '4 h 30 min',
        description: 'Techo del macizo granítico de Néouvielle, con crestas aéreas y terreno alpino.',
      },
    ],
    nearbyHuts: [refHut('pineta')],
  },
  {
    id: 'neouvielle',
    name: 'Pic de Néouvielle',
    elevation: 3091,
    coordinates: { lat: 42.8325, lon: 0.1161 },
    country: 'FR',
    massif: 'Néouvielle',
    difficulty: 'PD',
    routes: [
      {
        name: 'Normal desde el Lago de Aubert',
        ascent: 950,
        time: '3 h 30 min',
        description: 'Granito impecable sobre la reserva de lagos de Néouvielle por la Brèche de Chausenque.',
      },
    ],
    nearbyHuts: [refHut('pineta')],
  },
  {
    id: 'pic-midi-bigorre',
    name: 'Pic du Midi de Bigorre',
    elevation: 2877,
    coordinates: { lat: 42.9367, lon: 0.1428 },
    country: 'FR',
    massif: 'Bigorre',
    difficulty: 'F',
    routes: [
      {
        name: 'Normal desde el Col du Tourmalet',
        ascent: 770,
        time: '2 h 30 min',
        description: 'Célebre observatorio astronómico con una panorámica de 300 km sobre toda la cadena pirenaica.',
      },
    ],
    nearbyHuts: [refHut('pineta')],
  },
  {
    id: 'cotiella',
    name: 'Cotiella',
    elevation: 2912,
    coordinates: { lat: 42.515, lon: 0.3208 },
    country: 'ES',
    massif: 'Cotiella',
    difficulty: 'F',
    routes: [
      {
        name: 'Desde Armeña por el Collado de la Ribereta',
        ascent: 1080,
        time: '3 h 30 min',
        description: 'Impresionante macizo prepirenaico de paisaje lunar kárstico y vistas sin obstáculos hacia el norte.',
      },
    ],
    nearbyHuts: [refHut('biados')],
  },

  /* ---------- POSETS / BACHIMALA / PERDIGUERO ---------- */
  {
    id: 'gran-bachimala',
    name: 'Gran Bachimala (Schrader)',
    elevation: 3177,
    coordinates: { lat: 42.7039, lon: 0.3958 },
    country: 'ES/FR',
    massif: 'Bachimala',
    difficulty: 'PD',
    routes: [
      {
        name: 'Normal desde el Refugio de Biadós por Señal de Biadós',
        ascent: 1420,
        time: '4 h 30 min',
        description: 'Larga arista de esquistos oscuros sobre el valle de Chistau con soberbias vistas al Posets.',
      },
    ],
    nearbyHuts: [refHut('biados')],
  },
  {
    id: 'posets',
    name: 'Posets (Llardana)',
    elevation: 3375,
    coordinates: { lat: 42.6544, lon: 0.4353 },
    country: 'ES',
    massif: 'Posets',
    difficulty: 'PD',
    routes: [
      {
        name: 'Ruta Real desde Ángel Orús',
        ascent: 1230,
        time: '4 h',
        description: 'Segunda cumbre del Pirineo. Asciende por la Canal Fonda, Diente de Llardana y la aérea arista final.',
      },
      {
        name: 'Desde Biadós por el Collado de la Paul',
        ascent: 1620,
        time: '5 h 30 min',
        description: 'Vertiente occidental más solitaria y salvaje.',
      },
    ],
    nearbyHuts: [refHut('angel-orus'), refHut('biados'), refHut('estos')],
  },
  {
    id: 'eriste',
    name: 'Gran Pico de Eriste (Bagüeñola)',
    elevation: 3056,
    coordinates: { lat: 42.6258, lon: 0.4272 },
    country: 'ES',
    massif: 'Posets',
    difficulty: 'PD',
    routes: [
      {
        name: 'Desde el Refugio Ángel Orús por el Ibón de Millares',
        ascent: 950,
        time: '3 h 30 min',
        description: 'Elegante pirámide granítica con trepada final (II) junto al macizo del Posets.',
      },
    ],
    nearbyHuts: [refHut('angel-orus')],
  },
  {
    id: 'perdiguero',
    name: 'Pico Perdiguero',
    elevation: 3221,
    coordinates: { lat: 42.6919, lon: 0.5189 },
    country: 'ES/FR',
    massif: 'Perdiguero',
    difficulty: 'F',
    routes: [
      {
        name: 'Normal por el Valle de Literola e Ibón Blanco',
        ascent: 1600,
        time: '5 h',
        description: 'Gran bloque granítico fronterizo con magnífica panorámica hacia el Aneto y los valles de Luchon.',
      },
    ],
    nearbyHuts: [refHut('estos')],
  },
  {
    id: 'turbon',
    name: 'Turbón',
    elevation: 2492,
    coordinates: { lat: 42.4167, lon: 0.505 },
    country: 'ES',
    massif: 'Turbón / Ribagorza',
    difficulty: 'F',
    routes: [
      {
        name: 'Desde Las Vilas del Turbón por la Canal de la Plana',
        ascent: 1120,
        time: '3 h 30 min',
        description: 'Montaña mágica de la Ribagorza, gigante calizo aislado al sur del macizo de la Maladeta.',
      },
    ],
    nearbyHuts: [refHut('angel-orus')],
  },

  /* ---------- MALADETA / ANETO / BENASQUE ---------- */
  {
    id: 'pico-alba',
    name: 'Pico de Alba',
    elevation: 3118,
    coordinates: { lat: 42.6561, lon: 0.6203 },
    country: 'ES',
    massif: 'Maladeta',
    difficulty: 'PD',
    routes: [
      {
        name: 'Desde los Baños de Benasque por los Ibones de Alba',
        ascent: 1450,
        time: '4 h 30 min',
        description: 'Centinela occidental de la Maladeta, con trepada entretenida en granito firme (II).',
      },
    ],
    nearbyHuts: [refHut('renclusa')],
  },
  {
    id: 'pico-maladeta',
    name: 'Pico de la Maladeta',
    elevation: 3308,
    coordinates: { lat: 42.6461, lon: 0.6406 },
    country: 'ES',
    massif: 'Maladeta',
    difficulty: 'PD',
    routes: [
      {
        name: 'Normal desde La Renclusa por el Collado de la Rimaya',
        ascent: 1180,
        time: '4 h',
        description: 'Remonta el glaciar de la Maladeta y un corredor empinado hasta la arista cimera.',
      },
    ],
    nearbyHuts: [refHut('renclusa')],
  },
  {
    id: 'pico-maldito',
    name: 'Pico Maldito',
    elevation: 3350,
    coordinates: { lat: 42.6397, lon: 0.6425 },
    country: 'ES',
    massif: 'Maladeta',
    difficulty: 'AD',
    routes: [
      {
        name: 'Cresta del Medio desde La Renclusa',
        ascent: 1250,
        time: '4 h 45 min',
        description: 'Travesía alpina de granito con pasos de III- en la arista entre la Maladeta y el Aneto.',
      },
    ],
    nearbyHuts: [refHut('renclusa'), refHut('coronas')],
  },
  {
    id: 'punta-astorg',
    name: "Punta d'Astorg",
    elevation: 3355,
    coordinates: { lat: 42.6383, lon: 0.6458 },
    country: 'ES',
    massif: 'Maladeta',
    difficulty: 'AD',
    routes: [
      {
        name: 'Desde el Collado Maldito o Coronas',
        ascent: 1350,
        time: '5 h',
        description: 'Aguja esbelta junto al Pico Maldito con pasos aéreos de granito (II+/III).',
      },
    ],
    nearbyHuts: [refHut('renclusa'), refHut('coronas')],
  },
  {
    id: 'aneto',
    name: 'Aneto',
    elevation: 3404,
    coordinates: { lat: 42.6311, lon: 0.6567 },
    country: 'ES',
    massif: 'Maladeta',
    difficulty: 'PD',
    routes: [
      {
        name: 'Normal por La Renclusa, Portillón Superior y Paso de Mahoma',
        ascent: 1270,
        time: '4 h 30 min',
        description: 'Techo de los Pirineos. Glaciar del Aneto (crampones y piolet imprescindibles) y aéreo Paso de Mahoma.',
      },
      {
        name: 'Ruta de Coronas (Vallibierna)',
        ascent: 1450,
        time: '4 h 30 min',
        description: 'Vertiente sur desde el Refugio de Coronas pasando por los Ibones de Coronas.',
      },
    ],
    nearbyHuts: [refHut('renclusa'), refHut('coronas')],
  },
  {
    id: 'tempestades',
    name: 'Pico de Tempestades',
    elevation: 3290,
    coordinates: { lat: 42.6258, lon: 0.6639 },
    country: 'ES',
    massif: 'Maladeta',
    difficulty: 'AD',
    routes: [
      {
        name: 'Desde Coronas por el Ibón de Llosás',
        ascent: 1350,
        time: '5 h',
        description: 'Inicio de la famosa cresta de Salenques-Tempestades, roca granítica espectacular.',
      },
    ],
    nearbyHuts: [refHut('coronas'), refHut('renclusa')],
  },
  {
    id: 'vallibierna',
    name: 'Pico de Vallibierna',
    elevation: 3067,
    coordinates: { lat: 42.5928, lon: 0.6667 },
    country: 'ES',
    massif: 'Maladeta / Vallibierna',
    difficulty: 'PD',
    routes: [
      {
        name: 'Desde el Refugio de Coronas por los Ibones de Vallibierna',
        ascent: 1120,
        time: '3 h 30 min',
        description: 'Conocido por el emocionante Paso del Caballo que une Vallibierna con la Tuca de Culebras.',
      },
    ],
    nearbyHuts: [refHut('coronas')],
  },
  {
    id: 'mulleres',
    name: 'Tuc de Mulleres (Molières)',
    elevation: 3010,
    coordinates: { lat: 42.6328, lon: 0.6978 },
    country: 'ES',
    massif: 'Maladeta / Val d\'Aran',
    difficulty: 'F',
    routes: [
      {
        name: 'Desde la Boca Sur del Túnel de Vielha',
        ascent: 1400,
        time: '4 h 15 min',
        description: 'Tresmil más oriental del macizo de la Maladeta, gran clásica de esquí de montaña.',
      },
    ],
    nearbyHuts: [refHut('renclusa'), refHut('restanca')],
  },

  /* ---------- AIGÜESTORTES / BESIBERRI / VAL D'ARAN ---------- */
  {
    id: 'besiberri-nord',
    name: 'Besiberri Nord',
    elevation: 3014,
    coordinates: { lat: 42.6003, lon: 0.8264 },
    country: 'ES',
    massif: 'Besiberri / Aigüestortes',
    difficulty: 'PD',
    routes: [
      {
        name: 'Desde Ventosa i Calvell por el Estany de Tumeneia',
        ascent: 850,
        time: '3 h 30 min',
        description: 'Granito compacto con trepada final (II+) y vistas al macizo de la Maladeta y Aigüestortes.',
      },
    ],
    nearbyHuts: [refHut('ventosa'), refHut('restanca')],
  },
  {
    id: 'comaloforno',
    name: 'Comaloforno',
    elevation: 3029,
    coordinates: { lat: 42.5914, lon: 0.8278 },
    country: 'ES',
    massif: 'Besiberri',
    difficulty: 'PD',
    routes: [
      {
        name: 'Desde el Embalse de Cavallers por el Estany Gémena',
        ascent: 1300,
        time: '4 h 30 min',
        description: 'Cumbre más alta del macizo de los Besiberris con paso aéreo de II en la brecha final.',
      },
    ],
    nearbyHuts: [refHut('ventosa')],
  },
  {
    id: 'punta-alta',
    name: 'Punta Alta de Comalesbienes',
    elevation: 3014,
    coordinates: { lat: 42.5858, lon: 0.8806 },
    country: 'ES',
    massif: 'Aigüestortes',
    difficulty: 'F',
    routes: [
      {
        name: 'Desde la Presa de Cavallers por Comalesbienes',
        ascent: 1250,
        time: '4 h',
        description: 'Mar de bloques de granito que domina los más de 200 lagos del Parque Nacional de Aigüestortes.',
      },
    ],
    nearbyHuts: [refHut('ventosa'), refHut('estany-llong')],
  },
  {
    id: 'gran-tuc-colomers',
    name: 'Gran Tuc de Colomèrs',
    elevation: 2933,
    coordinates: { lat: 42.5892, lon: 0.9378 },
    country: 'ES',
    massif: 'Aigüestortes / Colomèrs',
    difficulty: 'F',
    routes: [
      {
        name: 'Desde el Refugi de Colomèrs o Estany Llong',
        ascent: 820,
        time: '3 h',
        description: 'Atalaya central sobre el circo lacustre de Colomèrs y el valle de Sant Nicolau.',
      },
    ],
    nearbyHuts: [refHut('colomers'), refHut('estany-llong'), refHut('amitges')],
  },
  {
    id: 'encantats',
    name: 'Els Encantats (Gran Encantat)',
    elevation: 2748,
    coordinates: { lat: 42.5686, lon: 1.0019 },
    country: 'ES',
    massif: 'Aigüestortes / Espot',
    difficulty: 'AD',
    routes: [
      {
        name: 'Canal Central desde Sant Maurici',
        ascent: 850,
        time: '3 h 30 min',
        description: 'Silueta gemela icónica de Cataluña con pasos de escalada III en caliza.',
      },
    ],
    nearbyHuts: [refHut('amitges'), refHut('estany-llong')],
  },

  /* ---------- PALLARS / ANDORRA / ARIÈGE ---------- */
  {
    id: 'pica-estats',
    name: "Pica d'Estats",
    elevation: 3143,
    coordinates: { lat: 42.6669, lon: 1.3978 },
    country: 'ES/FR',
    massif: "Pica d'Estats",
    difficulty: 'F',
    routes: [
      {
        name: 'Normal desde el Refugi de Vallferrera',
        ascent: 1250,
        time: '4 h 15 min',
        description: 'Techo de Cataluña. Remonta los lagos de Sotllo y Estats hasta el Port de Sotllo y la cima.',
      },
    ],
    nearbyHuts: [refHut('vallferrera'), refHut('certascan')],
  },
  {
    id: 'montcalm',
    name: 'Pic du Montcalm',
    elevation: 3077,
    coordinates: { lat: 42.6722, lon: 1.4064 },
    country: 'FR',
    massif: "Pica d'Estats / Ariège",
    difficulty: 'F',
    routes: [
      {
        name: 'Desde el Coll de Riufred (combinado con Pica d\'Estats)',
        ascent: 1300,
        time: '4 h 30 min',
        description: 'Tresmil más oriental del Pirineo francés, habitualmente encadenado con la Pica d\'Estats.',
      },
    ],
    nearbyHuts: [refHut('vallferrera')],
  },
  {
    id: 'comapedrosa',
    name: 'Comapedrosa',
    elevation: 2942,
    coordinates: { lat: 42.5917, lon: 1.4436 },
    country: 'ES/FR',
    massif: 'Andorra / Pallars',
    difficulty: 'F',
    routes: [
      {
        name: 'Normal desde Arinsal por el Estany Negre',
        ascent: 1380,
        time: '4 h',
        description: 'Techo de Andorra con vistas abiertas hacia el macizo de la Pica d\'Estats y el Cadí.',
      },
    ],
    nearbyHuts: [refHut('vallferrera')],
  },

  /* ---------- PIRINEO ORIENTAL (CERDANYA / BERGUEDÀ / RIPOLLÈS / CONFLENT) ---------- */
  {
    id: 'pedraforca',
    name: 'Pedraforca (Pollegó Superior)',
    elevation: 2506,
    coordinates: { lat: 42.2397, lon: 1.7031 },
    country: 'ES',
    massif: 'Cadí / Berguedà',
    difficulty: 'PD',
    routes: [
      {
        name: 'Normal desde el Mirador de Gresolet por el Verdet',
        ascent: 950,
        time: '3 h',
        description: 'Montaña mítica de doble cima con divertida trepada por las chimeneas del Verdet y bajada por la Tartera.',
      },
    ],
    nearbyHuts: [refHut('ulldeter')],
  },
  {
    id: 'carlit',
    name: 'Pic Carlit',
    elevation: 2921,
    coordinates: { lat: 42.5711, lon: 1.9317 },
    country: 'FR',
    massif: 'Carlit / Cerdanya',
    difficulty: 'F',
    routes: [
      {
        name: 'Normal desde el Lago de les Bulloses (Bouillouses)',
        ascent: 920,
        time: '3 h 15 min',
        description: 'Techo del Pirineo Oriental recorriendo la espectacular ruta de los 12 lagos glaciares del Carlit.',
      },
    ],
    nearbyHuts: [refHut('cortalets'), refHut('ulldeter')],
  },
  {
    id: 'puigpedros',
    name: 'Puigpedrós',
    elevation: 2914,
    coordinates: { lat: 42.4875, lon: 1.7619 },
    country: 'ES/FR',
    massif: 'Cerdanya',
    difficulty: 'F',
    routes: [
      {
        name: 'Normal desde el Refugi de Malniu',
        ascent: 780,
        time: '2 h 30 min',
        description: 'Cumbre más alta de la Cerdanya española, amplia y muy popular en verano y con esquís de travesía.',
      },
    ],
    nearbyHuts: [refHut('ulldeter')],
  },
  {
    id: 'puigmal',
    name: 'Puigmal',
    elevation: 2910,
    coordinates: { lat: 42.3833, lon: 2.1167 },
    country: 'ES/FR',
    massif: 'Ripollès / Núria',
    difficulty: 'F',
    routes: [
      {
        name: 'Normal desde el Santuario de Vall de Núria',
        ascent: 950,
        time: '2 h 45 min',
        description: 'Cuna del excursionismo catalán; ascensión cómoda y panorámica por la Coma de l\'Embut.',
      },
    ],
    nearbyHuts: [refHut('ulldeter')],
  },
  {
    id: 'bastiments',
    name: 'Bastiments (Pic del Gegant)',
    elevation: 2881,
    coordinates: { lat: 42.4264, lon: 2.2328 },
    country: 'ES/FR',
    massif: 'Ripollès / Ulldeter',
    difficulty: 'F',
    routes: [
      {
        name: 'Normal desde el Refugi d\'Ulldeter por el Coll de la Marrana',
        ascent: 680,
        time: '2 h',
        description: 'Clásica de la olla de Vallter con vistas directas al Canigó y en días claros hasta el Mediterráneo.',
      },
    ],
    nearbyHuts: [refHut('ulldeter')],
  },
  {
    id: 'canigo',
    name: 'Pic du Canigó',
    elevation: 2784,
    coordinates: { lat: 42.5189, lon: 2.4567 },
    country: 'FR',
    massif: 'Canigó / Conflent',
    difficulty: 'F',
    routes: [
      {
        name: 'Normal desde el Refuge des Cortalets',
        ascent: 650,
        time: '2 h 15 min',
        description: 'Último gran bastión alpino antes del mar Mediterráneo; ascensión panorámica por la cresta norte.',
      },
      {
        name: 'Por la Chimenea desde Mariailles',
        ascent: 1100,
        time: '3 h 45 min',
        description: 'Ruta clásica sur con trepada equipada en la conocida Cheminée del Canigó.',
      },
    ],
    nearbyHuts: [refHut('cortalets')],
  },
]

const normPeakKey = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(pico|pic|tuca|punta|pena|puig|tuc|mont|monte|gran|petit|de|del|la|las|el|los|d|l)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const distKm = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) =>
  Math.hypot((a.lon - b.lon) * 82, (a.lat - b.lat) * 111)

interface OsmPeakEntry {
  osmId: string
  name: string
  elevation: number
  lat: number
  lon: number
  country: string
  massif: string
}

function nearestHutsFor(lat: number, lon: number, count = 2): NearbyHut[] {
  return HUTS.map((h) => ({ h, d: distKm({ lat, lon }, h.coordinates) }))
    .filter((x) => x.d <= 18)
    .sort((a, b) => a.d - b.d)
    .slice(0, count)
    .map(({ h }) => ({ name: h.name, elevation: h.elevation, capacity: h.capacity, hutId: h.id }))
}

function upgradeCuratedRoutes(raw: RawPeak): Route[] {
  const curated = CURATED_PEAK_ROUTES[raw.id]
  if (curated) return curated

  const auto = buildAutoPeakRoutes(raw, HUTS)
  // Conservamos el texto descriptivo de la primera ruta curada en la ruta de refugio si existe
  const firstLegacy = raw.routes[0]
  if (firstLegacy && auto.length > 0) {
    const hutRoute = auto.find((r) => r.originType === 'hut') ?? auto[0]
    hutRoute.name = firstLegacy.name
    hutRoute.description = firstLegacy.description
    hutRoute.elevationGain = firstLegacy.ascent
    hutRoute.ascent = firstLegacy.ascent
    hutRoute.estimatedTime = firstLegacy.time
  }
  return auto
}

function mergePeaks(): Peak[] {
  const merged: Peak[] = CURATED_PEAKS.map((raw) => ({
    ...raw,
    routes: upgradeCuratedRoutes(raw),
  }))
  const osmPeaks = (osmData.peaks ?? []) as OsmPeakEntry[]

  for (const osm of osmPeaks) {
    const key = normPeakKey(osm.name)
    const exists = merged.some(
      (p) =>
        (key.length > 2 && normPeakKey(p.name) === key) ||
        distKm(p.coordinates, { lat: osm.lat, lon: osm.lon }) < 1.5,
    )
    if (exists) continue

    const country: Country =
      osm.country === 'FR' || osm.country === 'ES/FR' ? osm.country : 'ES'
    const difficulty: Difficulty = osm.elevation >= 3150 ? 'PD' : 'F'
    const nearby = nearestHutsFor(osm.lat, osm.lon, 2)
    const id = `osm-peak-${osm.osmId.replace('/', '-')}`
    const basePeak = {
      id,
      name: osm.name,
      elevation: osm.elevation,
      coordinates: { lat: osm.lat, lon: osm.lon },
      country,
      massif: osm.massif,
      difficulty,
    }

    merged.push({
      ...basePeak,
      routes: buildAutoPeakRoutes(basePeak, HUTS),
      nearbyHuts: nearby,
    })
  }

  return merged
}

export const peaks: Peak[] = mergePeaks()
export const peaksById: Record<string, Peak> = Object.fromEntries(peaks.map((p) => [p.id, p]))

/* ------------------------------------------------------------------ */
/* Extensión del terreno (grados)                                      */
/* ------------------------------------------------------------------ */

export const TERRAIN_BOUNDS = {
  west: -2.0,
  east: 3.2,
  south: 41.9,
  north: 43.4,
} as const
