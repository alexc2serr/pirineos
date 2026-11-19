import { TERRAIN_BOUNDS } from '../data/pyrenees'

/** URL de los tiles Terrarium de AWS (elevación codificada en RGB). */
const TILE_URL = (z: number, x: number, y: number) =>
  `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`

const TILE_SIZE = 256

/** Zoom de los tiles: z=10 -> ~29 km por tile a 42ºN (resolución ~110 m/px). */
export const DEM_ZOOM = 10

export interface Heightmap {
  width: number
  height: number
  /** Elevación en metros, fila a fila (norte -> sur). */
  data: Float32Array
  /** Esquina superior izquierda en píxeles Mercator globales. */
  originX: number
  originY: number
}

const lonToPx = (lon: number, z: number) => ((lon + 180) / 360) * TILE_SIZE * 2 ** z

const latToPx = (lat: number, z: number) => {
  const r = (lat * Math.PI) / 180
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * TILE_SIZE * 2 ** z
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`No se pudo cargar el tile ${url}`))
    img.src = url
  })
}

/** Descarga y une los tiles que cubren TERRAIN_BOUNDS en un único heightmap. */
export async function loadHeightmap(signal?: AbortSignal): Promise<Heightmap> {
  const z = DEM_ZOOM
  const { west, east, south, north } = TERRAIN_BOUNDS
  const x0 = Math.floor(lonToPx(west, z) / TILE_SIZE)
  const x1 = Math.floor(lonToPx(east, z) / TILE_SIZE)
  const y0 = Math.floor(latToPx(north, z) / TILE_SIZE)
  const y1 = Math.floor(latToPx(south, z) / TILE_SIZE)

  const cols = x1 - x0 + 1
  const rows = y1 - y0 + 1
  const width = cols * TILE_SIZE
  const height = rows * TILE_SIZE

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas 2D no disponible')

  const jobs: Promise<void>[] = []
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      jobs.push(
        loadImage(TILE_URL(z, tx, ty)).then((img) => {
          if (signal?.aborted) return
          ctx.drawImage(img, (tx - x0) * TILE_SIZE, (ty - y0) * TILE_SIZE)
        }),
      )
    }
  }
  await Promise.all(jobs)
  if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError')

  const rgba = ctx.getImageData(0, 0, width, height).data
  const data = new Float32Array(width * height)
  for (let i = 0; i < data.length; i++) {
    // Terrarium: elevación = (R * 256 + G + B / 256) - 32768
    data[i] = rgba[i * 4] * 256 + rgba[i * 4 + 1] + rgba[i * 4 + 2] / 256 - 32768
  }

  return { width, height, data, originX: x0 * TILE_SIZE, originY: y0 * TILE_SIZE }
}

/** Muestrea la elevación (m) en lat/lon con interpolación bilineal. */
export function sampleElevation(map: Heightmap, lat: number, lon: number): number {
  const px = lonToPx(lon, DEM_ZOOM) - map.originX
  const py = latToPx(lat, DEM_ZOOM) - map.originY
  const x = Math.min(Math.max(px, 0), map.width - 1.001)
  const y = Math.min(Math.max(py, 0), map.height - 1.001)
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const fx = x - xi
  const fy = y - yi
  const i = yi * map.width + xi
  const a = map.data[i]
  const b = map.data[i + 1]
  const c = map.data[i + map.width]
  const d = map.data[i + map.width + 1]
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy
}
