import { useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import { peaks, type Peak } from '../data/pyrenees'
import { getPeakTop, summitEyeY, type HeightField } from '../lib/heightField'
import type { ViewMode } from '../lib/views'

/** Altura de la línea vertical del marcador (unidades de escena ≈ 500 m reales). */
const LINE_HEIGHT = 1.2
const LABEL_W = 150
const LABEL_H = 40

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']

export const bearingName = (deg: number) => COMPASS[Math.round(deg / 45) % 8]

interface PeakInfo {
  distanceKm: number
  bearing: number
}

/** Línea de visión desde la cima hasta otro pico, muestreando la malla del terreno. */
function hasLineOfSight(from: THREE.Vector3, to: THREE.Vector3, field: HeightField): boolean {
  const samples = 80
  for (let i = 1; i < samples; i++) {
    const t = i / samples
    const x = from.x + (to.x - from.x) * t
    const z = from.z + (to.z - from.z) * t
    const y = from.y + (to.y - from.y) * t
    if (field.sampleWorld(x, z) > y + 0.04) return false
  }
  return true
}

interface PeakMarkersProps {
  visiblePeaks: Peak[]
  heightField: HeightField | null
  selectedId: string | null
  completedPeakIds: Set<string>
  mode: ViewMode
  onSelect: (id: string) => void
}

export function PeakMarkers({
  visiblePeaks,
  heightField,
  selectedId,
  completedPeakIds,
  mode,
  onSelect,
}: PeakMarkersProps) {
  const camera = useThree((s) => s.camera)
  const [hovered, setHovered] = useState<string | null>(null)
  const labelRefs = useRef(new Map<string, HTMLDivElement>())
  const hitRefs = useRef(new Map<string, THREE.Mesh>())
  const scratch = useRef(new THREE.Vector3())

  const tops = useMemo(
    () => new Map(peaks.map((p) => [p.id, getPeakTop(p, heightField)])),
    [heightField],
  )

  const summitMode = mode === 'summit' && selectedId !== null

  // En Modo Cumbre: picos visibles desde la cima, con distancia y rumbo
  const summitInfo = useMemo(() => {
    const info = new Map<string, PeakInfo>()
    if (!summitMode || !selectedId || !heightField) return info
    const origin = tops.get(selectedId)
    if (!origin) return info
    const eye = origin.clone().setY(origin.y + summitEyeY())
    for (const p of peaks) {
      if (p.id === selectedId) continue
      const top = tops.get(p.id)
      if (!top || !hasLineOfSight(eye, top, heightField)) continue
      const dx = top.x - origin.x
      const dz = top.z - origin.z
      info.set(p.id, {
        distanceKm: Math.hypot(dx, dz),
        bearing: (THREE.MathUtils.radToDeg(Math.atan2(dx, -dz)) + 360) % 360,
      })
    }
    return info
  }, [summitMode, selectedId, heightField, tops])

  useFrame(({ size }) => {
    const v = scratch.current
    const priority = (p: Peak) =>
      (p.id === hovered ? 1e6 : 0) +
      (p.id === selectedId ? 5e5 : 0) +
      p.elevation -
      camera.position.distanceTo(tops.get(p.id) ?? v) * 15
    const rects: { x: number; y: number }[] = []

    for (const peak of [...visiblePeaks].sort((a, b) => priority(b) - priority(a))) {
      const top = tops.get(peak.id)
      const label = labelRefs.current.get(peak.id)
      if (!top || !label) continue

      const dist = camera.position.distanceTo(top)
      const hit = hitRefs.current.get(peak.id)
      hit?.scale.setScalar(Math.max(0.3, dist * 0.015))

      let show = summitMode ? summitInfo.has(peak.id) : dist < 260
      v.copy(top)
      if (!summitMode) v.y += LINE_HEIGHT
      v.project(camera)
      if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) show = false

      const sx = (v.x * 0.5 + 0.5) * size.width
      const sy = (-v.y * 0.5 + 0.5) * size.height
      if (show && peak.id !== hovered && peak.id !== selectedId) {
        if (rects.some((r) => Math.abs(r.x - sx) < LABEL_W && Math.abs(r.y - sy) < LABEL_H)) show = false
      }
      if (show) rects.push({ x: sx, y: sy })

      label.style.opacity = show ? '1' : '0'
      label.style.pointerEvents = show ? 'auto' : 'none'
    }
  })

  return (
    <>
      {visiblePeaks.map((peak) => {
        const top = tops.get(peak.id)
        if (!top) return null
        const isHover = hovered === peak.id
        const isSelected = selectedId === peak.id
        const isCompleted = completedPeakIds.has(peak.id)
        const anchor: [number, number, number] = summitMode
          ? [top.x, top.y, top.z]
          : [top.x, top.y + LINE_HEIGHT, top.z]
        const info = summitInfo.get(peak.id)
        const hidden = summitMode && isSelected

        return (
          <group key={peak.id} visible={!hidden}>
            {!summitMode && (
              <Line
                points={[
                  [top.x, top.y, top.z],
                  [top.x, top.y + LINE_HEIGHT, top.z],
                ]}
                color={isHover || isSelected ? '#ffd9a0' : isCompleted ? '#34d399' : '#ffffff'}
                lineWidth={isHover || isSelected ? 2 : isCompleted ? 1.8 : 1.2}
                transparent
                opacity={isHover || isSelected || isCompleted ? 1 : 0.75}
              />
            )}

            <mesh
              position={[top.x, top.y, top.z]}
              ref={(m) => {
                if (m) hitRefs.current.set(peak.id, m)
                else hitRefs.current.delete(peak.id)
              }}
              onClick={(e) => {
                e.stopPropagation()
                onSelect(peak.id)
              }}
              onPointerOver={(e) => {
                e.stopPropagation()
                setHovered(peak.id)
                document.body.style.cursor = 'pointer'
              }}
              onPointerOut={() => {
                setHovered((h) => (h === peak.id ? null : h))
                document.body.style.cursor = ''
              }}
            >
              <sphereGeometry args={[1, 12, 8]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            <Html position={anchor} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
              <div
                ref={(el) => {
                  if (el) labelRefs.current.set(peak.id, el)
                  else labelRefs.current.delete(peak.id)
                }}
                onClick={() => onSelect(peak.id)}
                onPointerEnter={() => setHovered(peak.id)}
                onPointerLeave={() => setHovered((h) => (h === peak.id ? null : h))}
                className={`-translate-y-1/2 cursor-pointer select-none whitespace-nowrap rounded-md border px-2.5 py-1 text-center backdrop-blur-md transition-all duration-200 ${
                  isHover || isSelected
                    ? 'border-amber-200/60 bg-slate-950/80 shadow-[0_0_18px_rgba(255,217,160,0.35)]'
                    : isCompleted
                      ? 'border-emerald-300/65 bg-emerald-950/75 shadow-[0_0_14px_rgba(52,211,153,0.35)]'
                      : 'border-white/10 bg-slate-950/45'
                }`}
              >
                <div className="flex items-center justify-center gap-1 font-sans text-[11px] font-semibold leading-tight tracking-wide text-white">
                  {isCompleted && (
                    <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-emerald-400 font-mono text-[9px] font-bold text-slate-950">
                      ✓
                    </span>
                  )}
                  <span>{peak.name}</span>
                </div>
                <div className="font-mono text-[10px] leading-tight text-amber-100/80">
                  {peak.elevation.toLocaleString('es-ES')} m
                  {info && (
                    <span className="text-sky-200/80">
                      {' · '}
                      {info.distanceKm.toLocaleString('es-ES', { maximumFractionDigits: 1 })} km{' '}
                      {bearingName(info.bearing)}
                    </span>
                  )}
                </div>
              </div>
            </Html>
          </group>
        )
      })}
    </>
  )
}
