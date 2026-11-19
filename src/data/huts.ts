import type { Country } from './pyrenees'
import osmData from './osm_pyrenees.json'
import { CURATED_HUT_ROUTES, buildAutoHutRoutes, type Route } from './routesData'

export type HutType = 'Guardado' | 'Libre / Vivac'

export interface HutServices {
  /** Comidas y cenas */
  meals: boolean
  /** Duchas / agua caliente */
  showers: boolean
  /** Enchufes / energía solar */
  electricity: boolean
  /** WiFi o emisora de emergencia */
  wifiOrRadio: boolean
  /** Fuente o agua potable */
  water: boolean
  /** Chimenea o estufa (clave en libres) */
  hearth: boolean
}

export interface Hut {
  id: string
  name: string
  /** Altitud en metros */
  elevation: number
  coordinates: { lat: number; lon: number }
  country: Country
  massif: string
  type: HutType
  /** Plazas totales en temporada */
  capacity: number
  /** Plazas en refugio de invierno / parte libre */
  winterCapacity: number
  /** Teléfono de contacto (si está disponible en OSM) */
  phone?: string
  /** Web oficial (si está disponible en OSM) */
  website?: string
  services: HutServices
  /** Aproximación habitual y tiempo estimado */
  accessNotes: string
  /** Rutas de acceso (desde parking y desde otros refugios) */
  routes?: Route[]
}

const GUARDED_FULL: HutServices = {
  meals: true,
  showers: true,
  electricity: true,
  wifiOrRadio: true,
  water: true,
  hearth: false,
}

const GUARDED_HIGH: HutServices = {
  meals: true,
  showers: false,
  electricity: true,
  wifiOrRadio: true,
  water: true,
  hearth: false,
}

const FREE_HEARTH: HutServices = {
  meals: false,
  showers: false,
  electricity: false,
  wifiOrRadio: false,
  water: true,
  hearth: true,
}

const FREE_BASIC: HutServices = {
  meals: false,
  showers: false,
  electricity: false,
  wifiOrRadio: false,
  water: true,
  hearth: false,
}

const CURATED_HUTS: Hut[] = [
  {
    id: 'estiva',
    name: 'Refugio de La Estiva',
    elevation: 2070,
    coordinates: { lat: 42.6815, lon: 0.1255 },
    country: 'ES',
    massif: 'Valle de Pineta / Sobrarbe',
    type: 'Libre / Vivac',
    capacity: 6,
    winterCapacity: 6,
    services: {
      meals: false,
      showers: false,
      electricity: false,
      wifiOrRadio: false,
      water: true,
      hearth: false,
    },
    accessNotes:
      'Sin comodidades (agua en abrevadero cercano). Acceso por pista de 10 km desde Espierba o por sendero GR-11 desde la Ermita de Pineta (2 h).',
  },
  {
    id: 'larri',
    name: 'Refugio de la Larri',
    elevation: 1590,
    coordinates: { lat: 42.6819, lon: 0.1047 },
    country: 'ES',
    massif: 'Monte Perdido / Pineta',
    type: 'Libre / Vivac',
    capacity: 12,
    winterCapacity: 12,
    services: FREE_HEARTH,
    accessNotes: 'Desde el Parador de Pineta por la pista o el sendero de las cascadas hasta los Llanos de la Larri (1 h 15 min).',
  },
  {
    id: 'renclusa',
    name: 'Refugio de La Renclusa',
    elevation: 2140,
    coordinates: { lat: 42.6689, lon: 0.6503 },
    country: 'ES',
    massif: 'Maladeta',
    type: 'Guardado',
    capacity: 93,
    winterCapacity: 93,
    services: { ...GUARDED_FULL, hearth: true },
    accessNotes: 'Desde La Besurta (acceso en autobús en verano desde Benasque / Llanos del Hospital), 45 min.',
  },
  {
    id: 'goriz',
    name: 'Refugio de Góriz',
    elevation: 2200,
    coordinates: { lat: 42.6628, lon: 0.0144 },
    country: 'ES',
    massif: 'Monte Perdido',
    type: 'Guardado',
    capacity: 80,
    winterCapacity: 80,
    services: GUARDED_HIGH,
    accessNotes: 'Desde la Pradera de Ordesa por Cola de Caballo y las Clavijas de Soaso o Senda de los Mulos (4 h 30 min).',
  },
  {
    id: 'respomuso',
    name: 'Refugio de Respomuso',
    elevation: 2200,
    coordinates: { lat: 42.8161, lon: -0.2897 },
    country: 'ES',
    massif: 'Balaitús / Tena',
    type: 'Guardado',
    capacity: 105,
    winterCapacity: 24,
    services: GUARDED_FULL,
    accessNotes: 'Desde el Embalse de La Sarra (Sallent de Gállego) por el GR-11 remontando el río Aguas Limpias (2 h 30 min).',
  },
  {
    id: 'casa-piedra',
    name: 'Refugio Casa de Piedra',
    elevation: 1636,
    coordinates: { lat: 42.7614, lon: -0.2336 },
    country: 'ES',
    massif: 'Panticosa',
    type: 'Guardado',
    capacity: 84,
    winterCapacity: 84,
    services: GUARDED_FULL,
    accessNotes: 'Acceso directo en vehículo hasta el Balneario de Panticosa (0 min).',
  },
  {
    id: 'bachimana',
    name: 'Refugio de los Ibones de Bachimaña',
    elevation: 2200,
    coordinates: { lat: 42.785, lon: -0.2233 },
    country: 'ES',
    massif: 'Panticosa',
    type: 'Guardado',
    capacity: 80,
    winterCapacity: 12,
    services: GUARDED_FULL,
    accessNotes: 'Desde el Balneario de Panticosa por el GR-11 y la Cuesta del Fraile (2 h).',
  },
  {
    id: 'telera',
    name: 'Refugio de Telera',
    elevation: 1620,
    coordinates: { lat: 42.7056, lon: -0.3389 },
    country: 'ES',
    massif: 'Partacua / Tena',
    type: 'Libre / Vivac',
    capacity: 8,
    winterCapacity: 8,
    services: FREE_HEARTH,
    accessNotes: 'Desde Piedrafita de Jaca por la pista forestal del Bosque del Betato y el Ibón de Piedrafita (1 h 30 min).',
  },
  {
    id: 'gabardito',
    name: 'Refugio de Gabardito',
    elevation: 1380,
    coordinates: { lat: 42.7667, lon: -0.6922 },
    country: 'ES',
    massif: 'Bisaurín / Hecho',
    type: 'Guardado',
    capacity: 50,
    winterCapacity: 12,
    services: { ...GUARDED_FULL, hearth: true },
    accessNotes: 'Acceso en coche por pista asfaltada desde el Valle de Hecho (0 min).',
  },
  {
    id: 'lizara',
    name: 'Refugio de Lizara',
    elevation: 1540,
    coordinates: { lat: 42.7625, lon: -0.6347 },
    country: 'ES',
    massif: 'Bisaurín / Aragüés',
    type: 'Guardado',
    capacity: 75,
    winterCapacity: 14,
    services: GUARDED_FULL,
    accessNotes: 'Acceso directo por carretera desde Aragüés del Puerto (0 min).',
  },
  {
    id: 'linza',
    name: 'Refugio de Linza',
    elevation: 1340,
    coordinates: { lat: 42.8994, lon: -0.7994 },
    country: 'ES',
    massif: 'Ansó / Tres Reyes',
    type: 'Guardado',
    capacity: 75,
    winterCapacity: 75,
    services: { ...GUARDED_FULL, hearth: true },
    accessNotes: 'Acceso directo en vehículo desde Ansó por Zuriza hasta el Plano de la Casa (0 min).',
  },
  {
    id: 'angel-orus',
    name: 'Refugio Ángel Orús',
    elevation: 2148,
    coordinates: { lat: 42.6258, lon: 0.4567 },
    country: 'ES',
    massif: 'Posets',
    type: 'Guardado',
    capacity: 98,
    winterCapacity: 16,
    services: GUARDED_FULL,
    accessNotes: 'Desde el aparcamiento de la Espigantosa (Eriste) por sendero bien marcado junto a la cascada (1 h 30 min).',
  },
  {
    id: 'estos',
    name: 'Refugio de Estós',
    elevation: 1895,
    coordinates: { lat: 42.6778, lon: 0.4833 },
    country: 'ES',
    massif: 'Posets / Perdiguero',
    type: 'Guardado',
    capacity: 115,
    winterCapacity: 12,
    services: GUARDED_FULL,
    accessNotes: 'Desde el aparcamiento del Valle de Estós (Benasque) remontando la pista junto al río (2 h 30 min).',
  },
  {
    id: 'biados',
    name: 'Refugio de Biadós',
    elevation: 1760,
    coordinates: { lat: 42.6586, lon: 0.3767 },
    country: 'ES',
    massif: 'Posets / Bachimala',
    type: 'Guardado',
    capacity: 70,
    winterCapacity: 10,
    services: { ...GUARDED_FULL, hearth: true },
    accessNotes: 'Desde San Juan de Plan por pista forestal transitable (11 km) hasta las bordas de Biadós (15 min a pie).',
  },
  {
    id: 'pineta',
    name: 'Refugio de Pineta',
    elevation: 1240,
    coordinates: { lat: 42.6683, lon: 0.0978 },
    country: 'ES',
    massif: 'Monte Perdido / Pineta',
    type: 'Guardado',
    capacity: 76,
    winterCapacity: 76,
    services: GUARDED_FULL,
    accessNotes: 'Acceso directo en coche desde Bielsa por la carretera del Valle de Pineta (0 min).',
  },
  {
    id: 'bujaruelo',
    name: 'Refugio de San Nicolás de Bujaruelo',
    elevation: 1338,
    coordinates: { lat: 42.6956, lon: -0.1069 },
    country: 'ES',
    massif: 'Ordesa / Vignemale',
    type: 'Guardado',
    capacity: 60,
    winterCapacity: 10,
    services: GUARDED_FULL,
    accessNotes: 'Por pista desde el Puente de los Navarros (Torla-Ordesa) junto al río Ara (0 min en coche / 1 h 30 min a pie).',
  },
  {
    id: 'ventosa',
    name: 'Refugi Joan Ventosa i Calvell',
    elevation: 2220,
    coordinates: { lat: 42.6075, lon: 0.8758 },
    country: 'ES',
    massif: 'Aigüestortes / Besiberri',
    type: 'Guardado',
    capacity: 78,
    winterCapacity: 8,
    services: GUARDED_FULL,
    accessNotes: 'Desde el embalse de Cavallers (Vall de Boí) bordeando el lago y el Planell de Riumalo (2 h 15 min).',
  },
  {
    id: 'estany-llong',
    name: "Refugi d'Estany Llong",
    elevation: 1985,
    coordinates: { lat: 42.5739, lon: 0.9467 },
    country: 'ES',
    massif: 'Aigüestortes',
    type: 'Guardado',
    capacity: 54,
    winterCapacity: 6,
    services: GUARDED_FULL,
    accessNotes: 'Desde el Planell d\'Aigüestortes (taxi desde Boí) por camino suave junto al río Sant Nicolau (1 h 15 min).',
  },
  {
    id: 'amitges',
    name: "Refugi d'Amitges",
    elevation: 2365,
    coordinates: { lat: 42.5931, lon: 0.9853 },
    country: 'ES',
    massif: 'Aigüestortes / Encantats',
    type: 'Guardado',
    capacity: 74,
    winterCapacity: 12,
    services: GUARDED_FULL,
    accessNotes: 'Desde el Estany de Sant Maurici (Espot) subiendo por la pista de Ratera (1 h 45 min).',
  },
  {
    id: 'colomers',
    name: 'Refugi de Colomèrs',
    elevation: 2135,
    coordinates: { lat: 42.6247, lon: 0.9233 },
    country: 'ES',
    massif: 'Val d\'Aran / Aigüestortes',
    type: 'Guardado',
    capacity: 60,
    winterCapacity: 6,
    services: GUARDED_FULL,
    accessNotes: 'Desde los Banhs de Tredòs (Salardú) por el circo lacustre de Colomèrs (1 h 45 min).',
  },
  {
    id: 'restanca',
    name: 'Refugi de la Restanca',
    elevation: 2010,
    coordinates: { lat: 42.6331, lon: 0.8542 },
    country: 'ES',
    massif: 'Val d\'Aran / Besiberri',
    type: 'Guardado',
    capacity: 80,
    winterCapacity: 12,
    services: GUARDED_FULL,
    accessNotes: 'Desde el Pont de Ressec (Arties) remontando el valle de Valarties (1 h 30 min).',
  },
  {
    id: 'saboredo',
    name: 'Refugi de Saboredo',
    elevation: 2310,
    coordinates: { lat: 42.6164, lon: 0.9617 },
    country: 'ES',
    massif: 'Val d\'Aran / Aigüestortes',
    type: 'Guardado',
    capacity: 21,
    winterCapacity: 4,
    services: GUARDED_HIGH,
    accessNotes: 'Desde el Pont de Locampo (Tredòs) por el valle de Ruda y el circo de Saboredo (2 h 15 min).',
  },
  {
    id: 'certascan',
    name: 'Refugi de Certascan',
    elevation: 2240,
    coordinates: { lat: 42.7014, lon: 1.2781 },
    country: 'ES',
    massif: 'Pallars Sobirà',
    type: 'Guardado',
    capacity: 40,
    winterCapacity: 6,
    services: GUARDED_FULL,
    accessNotes: 'Desde Tavascan (pista hasta la Presa de Montalto) por el valle de Llurri (2 h 30 min).',
  },
  {
    id: 'vallferrera',
    name: 'Refugi de Vallferrera',
    elevation: 1940,
    coordinates: { lat: 42.6272, lon: 1.385 },
    country: 'ES',
    massif: "Pica d'Estats",
    type: 'Guardado',
    capacity: 48,
    winterCapacity: 12,
    services: GUARDED_FULL,
    accessNotes: 'Desde el aparcamiento de la Molinassa (Àreu) por sendero cómodo en bosque (15 min).',
  },
  {
    id: 'ulldeter',
    name: "Refugi d'Ulldeter",
    elevation: 2220,
    coordinates: { lat: 42.4264, lon: 2.2564 },
    country: 'ES',
    massif: 'Ripollès / Bastiments',
    type: 'Guardado',
    capacity: 52,
    winterCapacity: 10,
    services: GUARDED_FULL,
    accessNotes: 'Desde el aparcamiento inferior de Vallter 2000 por el sendero del nacimiento del Ter (30 min).',
  },
  {
    id: 'bayssellance',
    name: 'Refuge de Bayssellance',
    elevation: 2651,
    coordinates: { lat: 42.7806, lon: -0.1239 },
    country: 'FR',
    massif: 'Vignemale',
    type: 'Guardado',
    capacity: 58,
    winterCapacity: 24,
    services: GUARDED_HIGH,
    accessNotes: 'Desde el Barrage d\'Ossoue (Gavarnie) subiendo por las grutas de Bellevue y el GR-10 (2 h 45 min).',
  },
  {
    id: 'sarradets',
    name: 'Refuge des Sarradets (Brecha de Rolando)',
    elevation: 2587,
    coordinates: { lat: 42.6967, lon: -0.0322 },
    country: 'FR',
    massif: 'Monte Perdido / Gavarnie',
    type: 'Guardado',
    capacity: 57,
    winterCapacity: 18,
    services: GUARDED_HIGH,
    accessNotes: 'Desde el Col de Tentes (Gavarnie) por el Puerto de Bujaruelo y el paso de Serradets (1 h 45 min).',
  },
  {
    id: 'wallon',
    name: 'Refuge Wallon (Marcadau)',
    elevation: 1865,
    coordinates: { lat: 42.8186, lon: -0.1944 },
    country: 'FR',
    massif: 'Vignemale / Marcadau',
    type: 'Guardado',
    capacity: 113,
    winterCapacity: 28,
    services: GUARDED_FULL,
    accessNotes: 'Desde el Pont d\'Espagne (Cauterets) remontando cómodamente el valle de Marcadau (2 h 30 min).',
  },
  {
    id: 'ayous',
    name: "Refuge d'Ayous",
    elevation: 1982,
    coordinates: { lat: 42.8439, lon: -0.4919 },
    country: 'FR',
    massif: 'Ossau',
    type: 'Guardado',
    capacity: 47,
    winterCapacity: 15,
    services: GUARDED_HIGH,
    accessNotes: 'Desde el Lago de Bious-Artigues (Laruns) recorriendo los lagos de Ayous (2 h 15 min).',
  },
  {
    id: 'pombie',
    name: 'Refuge de Pombie',
    elevation: 2032,
    coordinates: { lat: 42.8342, lon: -0.4317 },
    country: 'FR',
    massif: 'Ossau',
    type: 'Guardado',
    capacity: 47,
    winterCapacity: 22,
    services: GUARDED_HIGH,
    accessNotes: 'Desde el aparcamiento de Anéou (Col du Pourtalet) subiendo al Col de Soum de Pombie (1 h 30 min).',
  },
  {
    id: 'migouelou',
    name: 'Refuge de Migouélou',
    elevation: 2278,
    coordinates: { lat: 42.885, lon: -0.3033 },
    country: 'FR',
    massif: 'Balaitús / Val d\'Azun',
    type: 'Guardado',
    capacity: 36,
    winterCapacity: 16,
    services: GUARDED_HIGH,
    accessNotes: 'Desde el Plan d\'Aste (Arrens-Marsous) por los lazadas del valle de Batbielh (2 h 30 min).',
  },
  {
    id: 'cortalets',
    name: 'Refuge des Cortalets',
    elevation: 2150,
    coordinates: { lat: 42.5344, lon: 2.4547 },
    country: 'FR',
    massif: 'Canigó',
    type: 'Guardado',
    capacity: 112,
    winterCapacity: 14,
    services: GUARDED_FULL,
    accessNotes: 'Desde el Col de Millères o pista de Balatg (Taurinya / Prades) en 2 h 30 min a pie.',
  },
  {
    id: 'coronas',
    name: 'Refugio de Coronas (Vallibierna)',
    elevation: 1970,
    coordinates: { lat: 42.6011, lon: 0.6486 },
    country: 'ES',
    massif: 'Maladeta',
    type: 'Libre / Vivac',
    capacity: 12,
    winterCapacity: 12,
    services: FREE_HEARTH,
    accessNotes: 'Desde Senarta (Benasque) en autobús 4x4 en verano o 2 h 30 min por la pista de Vallibierna.',
  },
  {
    id: 'espata',
    name: 'Refugio de la Espata',
    elevation: 1690,
    coordinates: { lat: 42.6972, lon: -0.5064 },
    country: 'ES',
    massif: 'Collarada',
    type: 'Libre / Vivac',
    capacity: 8,
    winterCapacity: 8,
    services: FREE_BASIC,
    accessNotes: 'Desde Villanúa por la pista de la Fuente del Paco hacia la Trapa (1 h 30 min).',
  },
]

const normKey = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(refugio|refugi|refuge|cabana|cabane|de|del|la|las|el|los|des|d|l)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const approxDistKm = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) =>
  Math.hypot((a.lon - b.lon) * 82, (a.lat - b.lat) * 111)

interface OsmHutEntry {
  osmId: string
  name: string
  elevation: number | null
  lat: number
  lon: number
  country: string
  massif: string
  type: string
  capacity: number
  winterCapacity: number
  phone?: string
  website?: string
  services: HutServices
}

function mergeHuts(): Hut[] {
  const merged: Hut[] = CURATED_HUTS.map((h) => ({ ...h }))
  const osmHuts = (osmData.huts ?? []) as OsmHutEntry[]

  for (const osm of osmHuts) {
    const osmKey = normKey(osm.name)
    const match = merged.find(
      (h) =>
        (osmKey.length > 2 && normKey(h.name) === osmKey) ||
        approxDistKm(h.coordinates, { lat: osm.lat, lon: osm.lon }) < 0.75,
    )

    if (match) {
      // Enriquecemos el refugio curado con teléfono/web de OSM si faltaban
      if (!match.phone && osm.phone) match.phone = osm.phone
      if (!match.website && osm.website) match.website = osm.website
      continue
    }

    const type: HutType = osm.type === 'Guardado' ? 'Guardado' : 'Libre / Vivac'
    const country: Country =
      osm.country === 'FR' || osm.country === 'ES/FR' ? osm.country : 'ES'

    merged.push({
      id: `osm-hut-${osm.osmId.replace('/', '-')}`,
      name: osm.name,
      elevation: osm.elevation ?? 1750,
      coordinates: { lat: osm.lat, lon: osm.lon },
      country,
      massif: osm.massif,
      type,
      capacity: osm.capacity,
      winterCapacity: osm.winterCapacity,
      phone: osm.phone,
      website: osm.website,
      services: osm.services,
      accessNotes:
        type === 'Guardado'
          ? `Refugio guardado registrado en OpenStreetMap (${osm.massif}). Consultar apertura y reserva en la web o teléfono del refugio.`
          : `Refugio libre / cabaña de montaña registrado en OpenStreetMap (${osm.massif}). Sin servicio de guarda.`,
    })
  }

  // Asignar rutas curadas o generadas automáticamente a cada refugio
  for (const h of merged) {
    h.routes = CURATED_HUT_ROUTES[h.id] ?? buildAutoHutRoutes(h, merged)
  }

  return merged
}

export const HUTS: Hut[] = mergeHuts()
export const hutsById: Record<string, Hut> = Object.fromEntries(HUTS.map((h) => [h.id, h]))
