import { useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type { Hut } from '../data/pyrenees'
import type { HeightField } from '../lib/heightField'
import { getPlacedHuts } from '../lib/huts'

/** Distancia umbral (km) por encima de la cual solo se muestran refugios emblemáticos. */
const FAR_THRESHOLD_KM = 120
const MAX_FAR_KM = 220
const MIN_SCREEN_GAP_PX = 28

interface HutMarkersProps {
  visibleHuts: Hut[]
  heightField: HeightField
  selectedHutId: string | null
  hasActiveFilter: boolean
  onSelectHut: (id: string) => void
}

const isCurated = (hut: Hut) => !hut.id.startsWith('osm-hut-')
const isEmblematic = (hut: Hut) => (isCurated(hut) && hut.type === 'Guardado') || hut.capacity >= 70

/** Marcadores ámbar/naranja de los refugios con LOD progresivo por distancia y anti-solapamiento. */
export function HutMarkers({
  visibleHuts,
  heightField,
  selectedHutId,
  hasActiveFilter,
  onSelectHut,
}: HutMarkersProps) {
  const camera = useThree((s) => s.camera)
  const placedMap = useMemo(() => getPlacedHuts(heightField), [heightField])
  const [hovered, setHovered] = useState<string | null>(null)
  const refs = useRef(new Map<string, HTMLDivElement>())
  const scratch = useRef(new THREE.Vector3())

  const items = useMemo(
    () =>
      visibleHuts
        .map((hut) => placedMap.get(hut.id))
        .filter((item): item is NonNullable<typeof item> => item !== undefined),
    [visibleHuts, placedMap],
  )

  useFrame(({ size }) => {
    const v = scratch.current
    const occupied: { x: number; y: number }[] = []

    const ordered = [...items].sort((a, b) => {
      const score = (h: Hut, pos: THREE.Vector3) =>
        (h.id === selectedHutId ? 1e7 : 0) +
        (h.id === hovered ? 5e6 : 0) +
        (isCurated(h) ? 2e4 : 0) +
        (h.type === 'Guardado' ? 1e4 : 0) +
        h.capacity * 10 -
        camera.position.distanceTo(pos) * 50
      return score(b.hut, b.position) - score(a.hut, a.position)
    })

    for (const { hut, position } of ordered) {
      const el = refs.current.get(hut.id)
      if (!el) continue

      const isFocus = hut.id === selectedHutId || hut.id === hovered
      const dist = camera.position.distanceTo(position)

      let show = true
      if (!isFocus) {
        if (hasActiveFilter) {
          show = dist < 240
        } else if (dist > FAR_THRESHOLD_KM) {
          // Vista aérea lejana: solo refugios guardados emblemáticos
          show = dist < MAX_FAR_KM && isEmblematic(hut)
        } else if (dist > 60) {
          // Distancia media: guardados + refugios libres curados (Estiva, La Larri, etc.)
          show = hut.type === 'Guardado' || isCurated(hut)
        } else {
          // Zoom de valle: todos los refugios cercanos (incluidos libres/vivac de OSM)
          show = true
        }
      }

      if (show) {
        v.copy(position).project(camera)
        if (v.z > 1 || Math.abs(v.x) > 1.06 || Math.abs(v.y) > 1.06) {
          show = false
        } else {
          const sx = (v.x * 0.5 + 0.5) * size.width
          const sy = (-v.y * 0.5 + 0.5) * size.height
          if (
            !isFocus &&
            occupied.some((p) => Math.abs(p.x - sx) < MIN_SCREEN_GAP_PX && Math.abs(p.y - sy) < MIN_SCREEN_GAP_PX)
          ) {
            show = false
          } else {
            occupied.push({ x: sx, y: sy })
          }
        }
      }

      el.style.opacity = show ? '1' : '0'
      el.style.pointerEvents = show ? 'auto' : 'none'
    }
  })

  return (
    <>
      {items.map(({ hut, position }) => {
        const isSelected = selectedHutId === hut.id
        const isHover = hovered === hut.id
        const isFree = hut.type === 'Libre / Vivac'

        return (
          <Html
            key={hut.id}
            position={[position.x, position.y + 0.06, position.z]}
            center
            zIndexRange={isSelected || isHover ? [30, 24] : [17, 0]}
            style={{ pointerEvents: 'none' }}
          >
            <div
              ref={(el) => {
                if (el) refs.current.set(hut.id, el)
                else refs.current.delete(hut.id)
              }}
              className="relative flex flex-col items-center transition-opacity duration-200"
            >
              {(isHover || isSelected) && (
                <div className="pointer-events-none absolute bottom-full mb-2 whitespace-nowrap rounded-lg border border-amber-200/40 bg-slate-950/85 px-2.5 py-1.5 text-center text-white shadow-xl backdrop-blur-md">
                  <p className="font-sans text-[11px] font-semibold leading-tight">{hut.name}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-amber-200/85">
                    {hut.elevation.toLocaleString('es-ES')} m · {hut.type}
                  </p>
                </div>
              )}
              <button
                type="button"
                aria-label={hut.name}
                title={`${hut.name} (${hut.elevation} m)`}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectHut(hut.id)
                }}
                onPointerEnter={() => setHovered(hut.id)}
                onPointerLeave={() => setHovered((cur) => (cur === hut.id ? null : cur))}
                className={`flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-2 text-slate-950 transition-transform hover:scale-125 ${
                  isSelected
                    ? 'scale-125 border-white bg-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.9)]'
                    : isFree
                      ? 'border-amber-100/80 bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.65)]'
                      : 'border-amber-100/85 bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.65)]'
                }`}
              >
                <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor" aria-hidden>
                  <path d="M8 1.5 1 8h2v6.5h4v-4h2v4h4V8h2L8 1.5Z" />
                </svg>
              </button>
            </div>
          </Html>
        )
      })}
    </>
  )
}
