import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_FILE = path.resolve(__dirname, '../src/data/osm_pyrenees.json')

// Bounding box de los Pirineos: south, west, north, east
const [SOUTH, WEST, NORTH, EAST] = [42.25, -1.8, 43.15, 3.2]
const BBOX_STR = `${SOUTH},${WEST},${NORTH},${EAST}`

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]
const QLEVER_OSM_ENDPOINT = 'https://qlever.cs.uni-freiburg.de/api/osm-planet'

function parseNumber(val) {
  if (val == null) return null
  const m = String(val).replace(',', '.').match(/-?\d+(\.\d+)?/)
  return m ? Number(m[0]) : null
}

function parseWktPoint(wkt) {
  if (!wkt) return null
  // POINT(lon lat) o POLYGON((lon lat, ...)) -> centroid aproximado si es polígono
  const pt = wkt.match(/POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i)
  if (pt) return { lon: Number(pt[1]), lat: Number(pt[2]) }
  const pairs = [...wkt.matchAll(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g)]
  if (!pairs.length) return null
  let sumLon = 0
  let sumLat = 0
  for (const m of pairs) {
    sumLon += Number(m[1])
    sumLat += Number(m[2])
  }
  return { lon: sumLon / pairs.length, lat: sumLat / pairs.length }
}

function norm(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function inferCountry(lat, lon, tags = {}) {
  const name = (tags.name || '').toLowerCase()
  if (tags['addr:country'] === 'FR' || name.startsWith('refuge ') || name.startsWith('cabane ')) return 'FR'
  if (tags['addr:country'] === 'ES' || name.startsWith('refugio ') || name.startsWith('refugi ')) return 'ES'
  const borderLat =
    lon < -0.7
      ? 42.96
      : lon < -0.2
        ? 42.84
        : lon < 0.3
          ? 42.73
          : lon < 0.9
            ? 42.71
            : lon < 1.6
              ? 42.66
              : 42.44
  if (Math.abs(lat - borderLat) < 0.015) return 'ES/FR'
  return lat > borderLat ? 'FR' : 'ES'
}

function inferMassif(lat, lon) {
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

function distKm(a, b) {
  const dx = (a.lon - b.lon) * 82
  const dy = (a.lat - b.lat) * 111
  return Math.hypot(dx, dy)
}

async function tryOverpass(ql) {
  for (const url of OVERPASS_ENDPOINTS) {
    try {
      console.log(`Intentando Overpass (${url})…`)
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent': 'Pirineos3D-DataImporter/1.0',
        },
        body: `data=${encodeURIComponent(ql)}`,
        signal: AbortSignal.timeout(12000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      console.warn(`Overpass no disponible en ${url}: ${err.message}`)
    }
  }
  return null
}

async function queryQLever(sparql) {
  console.log(`Consultando OpenStreetMap vía QLever (${QLEVER_OSM_ENDPOINT})…`)
  const res = await fetch(QLEVER_OSM_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      Accept: 'application/sparql-results+json',
      'User-Agent': 'Pirineos3D-DataImporter/1.0',
    },
    body: `query=${encodeURIComponent(sparql)}`,
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new Error(`QLever HTTP ${res.status} ${res.statusText}`)
  const data = await res.json()
  return data.results.bindings
}

async function fetchHuts() {
  const overpass = await tryOverpass(`
    [out:json][timeout:10];
    (
      node["tourism"="alpine_hut"]["name"](${BBOX_STR});
      way["tourism"="alpine_hut"]["name"](${BBOX_STR});
      node["tourism"="wilderness_hut"]["name"](${BBOX_STR});
      way["tourism"="wilderness_hut"]["name"](${BBOX_STR});
    );
    out center tags;
  `)

  const rawItems = []
  if (overpass?.elements?.length) {
    for (const el of overpass.elements) {
      const tags = el.tags || {}
      const lat = el.lat ?? el.center?.lat
      const lon = el.lon ?? el.center?.lon
      if (!tags.name || lat == null || lon == null) continue
      rawItems.push({
        osmId: `${el.type}/${el.id}`,
        tourism: tags.tourism,
        name: tags.name,
        lat,
        lon,
        tags,
      })
    }
  } else {
    const bindings = await queryQLever(`
      PREFIX osmkey: <https://www.openstreetmap.org/wiki/Key:>
      PREFIX geo: <http://www.opengis.net/ont/geosparql#>
      PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
      SELECT ?osm ?tourism ?name ?ele ?cap ?wcap ?phone ?web ?shower ?fireplace ?water ?elec ?wifi ?geo WHERE {
        VALUES ?tourism { "alpine_hut" "wilderness_hut" }
        ?osm osmkey:tourism ?tourism ;
             osmkey:name ?name ;
             geo:hasGeometry/geo:asWKT ?geo .
        FILTER(geof:latitude(?geo) >= ${SOUTH} && geof:latitude(?geo) <= ${NORTH} &&
               geof:longitude(?geo) >= ${WEST} && geof:longitude(?geo) <= ${EAST})
        OPTIONAL { ?osm osmkey:ele ?ele }
        OPTIONAL { ?osm osmkey:capacity ?cap }
        OPTIONAL { ?osm <https://www.openstreetmap.org/wiki/Key:capacity:winter> ?wcap }
        OPTIONAL { ?osm osmkey:phone ?phone }
        OPTIONAL { ?osm osmkey:website ?web }
        OPTIONAL { ?osm osmkey:shower ?shower }
        OPTIONAL { ?osm osmkey:fireplace ?fireplace }
        OPTIONAL { ?osm osmkey:drinking_water ?water }
        OPTIONAL { ?osm osmkey:electricity ?elec }
        OPTIONAL { ?osm osmkey:internet_access ?wifi }
      }
    `)
    for (const b of bindings) {
      const pt = parseWktPoint(b.geo?.value)
      if (!pt || !b.name?.value) continue
      const osmId = (b.osm?.value || '').replace('https://www.openstreetmap.org/', '')
      rawItems.push({
        osmId,
        tourism: b.tourism?.value,
        name: b.name.value,
        lat: pt.lat,
        lon: pt.lon,
        tags: {
          name: b.name.value,
          ele: b.ele?.value,
          capacity: b.cap?.value,
          'capacity:winter': b.wcap?.value,
          phone: b.phone?.value,
          website: b.web?.value,
          shower: b.shower?.value,
          fireplace: b.fireplace?.value,
          drinking_water: b.water?.value,
          electricity: b.elec?.value,
          internet_access: b.wifi?.value,
        },
      })
    }
  }

  console.log(`Refugios brutos recibidos: ${rawItems.length}`)
  const seen = []
  for (const item of rawItems) {
    const { tags, lat, lon, tourism, osmId } = item
    const name = item.name.trim()
    const key = norm(name)
    const ele = parseNumber(tags.ele)
    const cap = parseNumber(tags.capacity)
    const winterCap = parseNumber(tags['capacity:winter'])
    const isGuarded = tourism === 'alpine_hut'

    const hut = {
      osmId,
      name,
      elevation: ele != null && ele > 300 && ele < 3500 ? Math.round(ele) : null,
      lat: Number(lat.toFixed(5)),
      lon: Number(lon.toFixed(5)),
      country: inferCountry(lat, lon, tags),
      massif: inferMassif(lat, lon),
      type: isGuarded ? 'Guardado' : 'Libre / Vivac',
      capacity: cap != null && cap > 0 ? Math.round(cap) : isGuarded ? 45 : 8,
      winterCapacity:
        winterCap != null && winterCap >= 0
          ? Math.round(winterCap)
          : isGuarded
            ? 12
            : cap != null && cap > 0
              ? Math.round(cap)
              : 8,
      phone: tags.phone || undefined,
      website: tags.website || undefined,
      services: {
        meals: isGuarded,
        showers: tags.shower === 'yes' || (isGuarded && tags.shower !== 'no' && (ele ?? 2000) < 2350),
        electricity: tags.electricity === 'yes' || isGuarded,
        wifiOrRadio: tags.internet_access === 'wlan' || tags.internet_access === 'yes' || isGuarded,
        water: tags.drinking_water !== 'no',
        hearth: tags.fireplace === 'yes' || (!isGuarded && tags.fireplace !== 'no'),
      },
    }

    const dupIdx = seen.findIndex((h) => norm(h.name) === key && distKm(h, hut) < 0.5)
    if (dupIdx >= 0) {
      if (!seen[dupIdx].elevation && hut.elevation) seen[dupIdx] = hut
    } else {
      seen.push(hut)
    }
  }

  return seen
    .filter((h) => h.elevation == null || h.elevation >= 900)
    .sort((a, b) => {
      const scoreA = (a.type === 'Guardado' ? 2000 : 0) + (a.elevation ?? 0) + (a.capacity > 10 ? 500 : 0)
      const scoreB = (b.type === 'Guardado' ? 2000 : 0) + (b.elevation ?? 0) + (b.capacity > 10 ? 500 : 0)
      return scoreB - scoreA
    })
}

async function fetchPeaks() {
  const overpass = await tryOverpass(`
    [out:json][timeout:10];
    node["natural"="peak"]["name"]["ele"](${BBOX_STR});
    out body;
  `)

  const candidates = []
  if (overpass?.elements?.length) {
    for (const el of overpass.elements) {
      const tags = el.tags || {}
      const ele = parseNumber(tags.ele)
      if (!tags.name || ele == null || ele < 2000 || ele > 3410) continue
      const prom = parseNumber(tags.prominence) ?? 0
      const hasWiki = Boolean(tags.wikidata || tags.wikipedia)
      candidates.push({
        osmId: `node/${el.id}`,
        name: tags.name.trim(),
        elevation: Math.round(ele),
        lat: Number(el.lat.toFixed(5)),
        lon: Number(el.lon.toFixed(5)),
        country: inferCountry(el.lat, el.lon, tags),
        massif: inferMassif(el.lat, el.lon),
        score: ele + (hasWiki ? 450 : 0) + Math.min(prom, 600) * 0.8,
      })
    }
  } else {
    const bindings = await queryQLever(`
      PREFIX osmkey: <https://www.openstreetmap.org/wiki/Key:>
      PREFIX geo: <http://www.opengis.net/ont/geosparql#>
      PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
      SELECT ?osm ?name ?ele ?prom ?wiki ?geo WHERE {
        ?osm osmkey:natural "peak" ;
             osmkey:name ?name ;
             osmkey:ele ?ele ;
             geo:hasGeometry/geo:asWKT ?geo .
        FILTER(geof:latitude(?geo) >= ${SOUTH} && geof:latitude(?geo) <= ${NORTH} &&
               geof:longitude(?geo) >= ${WEST} && geof:longitude(?geo) <= ${EAST})
        OPTIONAL { ?osm osmkey:prominence ?prom }
        OPTIONAL { ?osm osmkey:wikidata ?wiki }
      }
    `)
    for (const b of bindings) {
      const pt = parseWktPoint(b.geo?.value)
      const ele = parseNumber(b.ele?.value)
      if (!pt || !b.name?.value || ele == null || ele < 2000 || ele > 3410) continue
      const prom = parseNumber(b.prom?.value) ?? 0
      const hasWiki = Boolean(b.wiki?.value)
      const osmId = (b.osm?.value || '').replace('https://www.openstreetmap.org/', '')
      candidates.push({
        osmId,
        name: b.name.value.trim(),
        elevation: Math.round(ele),
        lat: Number(pt.lat.toFixed(5)),
        lon: Number(pt.lon.toFixed(5)),
        country: inferCountry(pt.lat, pt.lon, { name: b.name.value }),
        massif: inferMassif(pt.lat, pt.lon),
        score: ele + (hasWiki ? 450 : 0) + Math.min(prom, 600) * 0.8,
      })
    }
  }

  console.log(`Picos > 2000m candidatos recibidos: ${candidates.length}`)
  candidates.sort((a, b) => b.score - a.score)

  const selected = []
  const seenNames = new Set()
  for (const p of candidates) {
    if (selected.length >= 180) break
    const key = norm(p.name)
    if (seenNames.has(key)) continue
    const minDist = p.elevation >= 3100 ? 1.2 : 3.2
    if (selected.some((other) => distKm(other, p) < minDist)) continue
    seenNames.add(key)
    selected.push({
      osmId: p.osmId,
      name: p.name,
      elevation: p.elevation,
      lat: p.lat,
      lon: p.lon,
      country: p.country,
      massif: p.massif,
    })
  }
  return selected
}

async function main() {
  const huts = await fetchHuts()
  const peaks = await fetchPeaks()

  const output = {
    fetchedAt: new Date().toISOString(),
    source: 'OpenStreetMap (Overpass / QLever OSM Planet)',
    bbox: [SOUTH, WEST, NORTH, EAST],
    counts: { huts: huts.length, peaks: peaks.length },
    huts,
    peaks,
  }

  await fs.writeFile(OUT_FILE, JSON.stringify(output, null, 2), 'utf8')
  console.log(`Guardado ${OUT_FILE}: ${huts.length} refugios y ${peaks.length} picos reales de OpenStreetMap.`)
}

main().catch((err) => {
  console.error('Error importando datos de OpenStreetMap:', err)
  process.exit(1)
})
