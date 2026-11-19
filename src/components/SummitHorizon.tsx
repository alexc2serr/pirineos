import { Html } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import type { Peak } from '../data/pyrenees'
import { getPeakTop, summitEyeY, type HeightField } from '../lib/heightField'

const RING_RADIUS_KM = 60
const MARKS = [
  { label: 'N', deg: 0 },
  { label: 'NE', deg: 45 },
  { label: 'E', deg: 90 },
  { label: 'SE', deg: 135 },
  { label: 'S', deg: 180 },
  { label: 'SO', deg: 225 },
  { label: 'O', deg: 270 },
  { label: 'NO', deg: 315 },
]

interface SummitHorizonProps {
  peak: Peak
  heightField: HeightField | null
}

/** Puntos cardinales flotando en el horizonte alrededor de la cima (Modo Cumbre). */
export function SummitHorizon({ peak, heightField }: SummitHorizonProps) {
  const marks = useMemo(() => {
    const top = getPeakTop(peak, heightField)
    const y = top.y + summitEyeY()
    return MARKS.map((m) => {
      const rad = THREE.MathUtils.degToRad(m.deg)
      return {
        ...m,
        position: [top.x + Math.sin(rad) * RING_RADIUS_KM, y, top.z - Math.cos(rad) * RING_RADIUS_KM] as [
          number,
          number,
          number,
        ],
      }
    })
  }, [peak, heightField])

  return (
    <>
      {marks.map((m) => (
        <Html key={m.label} position={m.position} center zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
          <div className="flex select-none flex-col items-center gap-1">
            <span className="font-mono text-xs font-medium tracking-[0.2em] text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.7)]">
              {m.label}
            </span>
            <span className="h-4 w-px bg-white/60" />
          </div>
        </Html>
      ))}
    </>
  )
}
