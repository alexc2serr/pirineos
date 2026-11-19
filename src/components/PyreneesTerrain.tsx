import { useEffect, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  KM_PER_DEG_LAT,
  KM_PER_DEG_LON_AT_CENTER,
  TERRAIN_BOUNDS,
  elevationToWorldY,
  latLonToWorld,
} from '../data/pyrenees'
import { PRESETS, TIME_ORDER, atmosphere, sunDirection } from '../lib/atmosphere'
import { HeightField, SEGMENTS_X, SEGMENTS_Z } from '../lib/heightField'
import { loadHeightmap, sampleElevation, type Heightmap } from '../lib/terrainData'
import { createTerrainMaterial } from '../shaders/terrainShader'

/** Anchura (km) de la franja perimetral donde el relieve se aplana y se funde con la bruma. */
const EDGE_FADE_KM = 45

const smoothstep = (t: number) => {
  const c = Math.min(Math.max(t, 0), 1)
  return c * c * (3 - 2 * c)
}

/**
 * Sombras proyectadas: para cada vértice se lanza un rayo hacia el sol sobre el
 * campo de alturas. 1 = iluminado, 0 = en sombra (con penumbra suave).
 */
function computeShadows(
  heights: Float32Array,
  vx: number,
  vz: number,
  stepX: number,
  stepZ: number,
  sun: THREE.Vector3,
) {
  const shadow = new Float32Array(vx * vz)
  const hLen = Math.hypot(sun.x, sun.z)
  const dirX = sun.x / hLen
  const dirZ = sun.z / hLen
  const rise = sun.y / hLen
  const stepKm = 0.5
  const maxSteps = 140
  const maxY = elevationToWorldY(3500)
  const gx = (dirX * stepKm) / stepX
  const gz = (dirZ * stepKm) / stepZ

  for (let j = 0; j < vz; j++) {
    for (let i = 0; i < vx; i++) {
      const y0 = heights[j * vx + i] + 0.01
      let fx = i
      let fz = j
      let worst = 0
      for (let s = 1; s <= maxSteps; s++) {
        fx += gx
        fz += gz
        if (fx < 0 || fz < 0 || fx > vx - 1.001 || fz > vz - 1.001) break
        const rayY = y0 + s * stepKm * rise
        if (rayY > maxY) break
        const xi = fx | 0
        const zi = fz | 0
        const tx = fx - xi
        const tz = fz - zi
        const k = zi * vx + xi
        const h =
          (heights[k] * (1 - tx) + heights[k + 1] * tx) * (1 - tz) +
          (heights[k + vx] * (1 - tx) + heights[k + vx + 1] * tx) * tz
        const excess = h - rayY
        if (excess > worst) worst = excess
      }
      const t = Math.min(worst / 0.12, 1)
      shadow[j * vx + i] = 1 - t * t * (3 - 2 * t)
    }
  }
  return shadow
}

function buildGeometry(map: Heightmap): { geometry: THREE.BufferGeometry; field: HeightField } {
  const { west, east, south, north } = TERRAIN_BOUNDS
  const vx = SEGMENTS_X + 1
  const vz = SEGMENTS_Z + 1
  const positions = new Float32Array(vx * vz * 3)
  const heights = new Float32Array(vx * vz)
  const edge = new Float32Array(vx * vz)
  const indices = new Uint32Array(SEGMENTS_X * SEGMENTS_Z * 6)

  let p = 0
  for (let j = 0; j < vz; j++) {
    const lat = north - ((north - south) * j) / SEGMENTS_Z
    for (let i = 0; i < vx; i++) {
      const lon = west + ((east - west) * i) / SEGMENTS_X
      const dEdge = Math.min(
        (lon - west) * KM_PER_DEG_LON_AT_CENTER,
        (east - lon) * KM_PER_DEG_LON_AT_CENTER,
        (lat - south) * KM_PER_DEG_LAT,
        (north - lat) * KM_PER_DEG_LAT,
      )
      const fade = smoothstep(dEdge / EDGE_FADE_KM)
      const elev = Math.max(sampleElevation(map, lat, lon), 0) * fade
      const w = latLonToWorld(lat, lon, 0)
      const y = elevationToWorldY(elev)
      const idx = j * vx + i
      heights[idx] = y
      edge[idx] = fade
      positions[p++] = w.x
      positions[p++] = y
      positions[p++] = w.z
    }
  }

  let k = 0
  for (let j = 0; j < SEGMENTS_Z; j++) {
    for (let i = 0; i < SEGMENTS_X; i++) {
      const a = j * vx + i
      const b = a + 1
      const c = a + vx
      const d = c + 1
      indices[k++] = a
      indices[k++] = c
      indices[k++] = b
      indices[k++] = b
      indices[k++] = c
      indices[k++] = d
    }
  }

  const stepX = ((east - west) * KM_PER_DEG_LON_AT_CENTER) / SEGMENTS_X
  const stepZ = ((north - south) * KM_PER_DEG_LAT) / SEGMENTS_Z

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  // Un mapa de sombras por franja horaria; el shader los mezcla según la hora animada
  TIME_ORDER.forEach((time, i) => {
    const sun = sunDirection(PRESETS[time].az, PRESETS[time].el)
    geometry.setAttribute(
      `aShadow${i}`,
      new THREE.BufferAttribute(computeShadows(heights, vx, vz, stepX, stepZ, sun), 1),
    )
  })
  geometry.setAttribute('aEdge', new THREE.BufferAttribute(edge, 1))
  geometry.setIndex(new THREE.BufferAttribute(indices, 1))
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()

  return { geometry, field: new HeightField(heights) }
}

export interface PyreneesTerrainProps {
  onLoaded?: (field: HeightField) => void
  onError?: (error: Error) => void
}

const sunScratch = new THREE.Vector3()

/** Relieve pirenaico continuo (tiles Terrarium de AWS) que se funde con la bruma. */
export function PyreneesTerrain({ onLoaded, onError }: PyreneesTerrainProps) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null)
  const material = useMemo(() => createTerrainMaterial(), [])

  useEffect(() => {
    const controller = new AbortController()
    let built: THREE.BufferGeometry | null = null
    loadHeightmap(controller.signal)
      .then((map) => {
        const result = buildGeometry(map)
        built = result.geometry
        setGeometry(built)
        onLoaded?.(result.field)
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        onError?.(err instanceof Error ? err : new Error(String(err)))
      })
    return () => {
      controller.abort()
      built?.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => () => material.dispose(), [material])

  // Sincroniza los uniforms con el estado atmosférico y estacional animado
  useFrame(() => {
    const u = material.uniforms
    u.uSunDir.value.copy(sunDirection(atmosphere.az, atmosphere.el, sunScratch))
    u.uSunColor.value.set(atmosphere.sunR, atmosphere.sunG, atmosphere.sunB)
    u.uShadowW.value.set(atmosphere.w0, atmosphere.w1, atmosphere.w2)
    u.uHaze.value.set(atmosphere.hazeR, atmosphere.hazeG, atmosphere.hazeB)
    u.uAmbient.value = atmosphere.ambient
    u.uSnowLine.value = atmosphere.snowLine
    u.uWinterFactor.value = atmosphere.winterFactor
  })

  if (!geometry) return null
  return <mesh geometry={geometry} material={material} name="terrain" frustumCulled={false} />
}
