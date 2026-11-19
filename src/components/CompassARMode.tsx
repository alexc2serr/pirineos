import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import {
  elevationToWorldY,
  latLonToWorld,
  peaks,
  worldYToElevation,
  type Peak,
} from '../data/pyrenees'
import {
  COMPASS_VIEWPOINTS,
  compassTelemetry,
  type CompassViewpoint,
} from '../lib/compassState'
import { getPeakTop, type HeightField } from '../lib/heightField'
import { compassLabel } from '../lib/telemetry'

const MAX_PEAK_DIST_KM = 95
const LABEL_GAP_X = 115
const LABEL_GAP_Y = 34

interface VisiblePeakTarget {
  peak: Peak
  top: THREE.Vector3
  distanceKm: number
  bearingDeg: number
}

function hasLineOfSight(from: THREE.Vector3, to: THREE.Vector3, field: HeightField): boolean {
  const samples = 64
  for (let i = 1; i < samples; i++) {
    const t = i / samples
    const x = from.x + (to.x - from.x) * t
    const z = from.z + (to.z - from.z) * t
    const y = from.y + (to.y - from.y) * t
    if (field.sampleWorld(x, z) > y + 0.05) return false
  }
  return true
}

function angleLerpDeg(current: number, target: number, alpha: number): number {
  let diff = ((target - current + 540) % 360) - 180
  return (current + diff * alpha + 360) % 360
}

/* ------------------------------------------------------------------ */
/* Parte 3D dentro de <Canvas>: cámara en mirador + etiquetas picos   */
/* ------------------------------------------------------------------ */

interface CompassARSceneProps {
  viewpoint: CompassViewpoint
  heightField: HeightField
  gyroEnabled: boolean
}

export function CompassARScene({ viewpoint, heightField, gyroEnabled }: CompassARSceneProps) {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)

  const yawDegRef = useRef(180)
  const pitchDegRef = useRef(2)
  const targetYawDegRef = useRef(180)
  const targetPitchDegRef = useRef(2)
  const draggingRef = useRef(false)
  const lastPointerRef = useRef({ x: 0, y: 0 })
  const labelRefs = useRef(new Map<string, HTMLDivElement>())
  const scratch = useRef(new THREE.Vector3())

  // Posición exacta de observación (+15 m sobre el terreno DEM real)
  const observerPos = useMemo(() => {
    const p = latLonToWorld(viewpoint.lat, viewpoint.lon, 0)
    const groundY = heightField.sampleWorld(p.x, p.z)
    p.y = groundY + elevationToWorldY(15)
    return p
  }, [viewpoint, heightField])

  // Picos visibles con línea de visión despejada desde este mirador
  const visibleTargets = useMemo<VisiblePeakTarget[]>(() => {
    const out: VisiblePeakTarget[] = []
    for (const peak of peaks) {
      const top = getPeakTop(peak, heightField)
      const dx = top.x - observerPos.x
      const dz = top.z - observerPos.z
      const dist = Math.hypot(dx, dz)
      if (dist < 0.25 || dist > MAX_PEAK_DIST_KM) continue
      if (!hasLineOfSight(observerPos, top, heightField)) continue
      const bearingDeg = (THREE.MathUtils.radToDeg(Math.atan2(dx, -dz)) + 360) % 360
      out.push({ peak, top, distanceKm: dist, bearingDeg })
    }
    out.sort((a, b) => b.peak.elevation - a.peak.elevation)
    return out
  }, [observerPos, heightField])

  // Orientación inicial apuntando hacia el pico más alto visible
  useEffect(() => {
    camera.position.copy(observerPos)
    camera.rotation.order = 'YXZ'
    const initialHeading = visibleTargets[0]?.bearingDeg ?? 180
    yawDegRef.current = initialHeading
    targetYawDegRef.current = initialHeading
    pitchDegRef.current = 3
    targetPitchDegRef.current = 3
    compassTelemetry.observerEleM = Math.round(worldYToElevation(observerPos.y - elevationToWorldY(15)))
  }, [observerPos, visibleTargets, camera])

  // Sensores del móvil (DeviceOrientationEvent) cuando gyroEnabled === true
  useEffect(() => {
    if (!gyroEnabled) return

    const onOrientation = (e: DeviceOrientationEvent) => {
      const iosHeading = (e as DeviceOrientationEvent & { webkitCompassHeading?: number })
        .webkitCompassHeading
      if (typeof iosHeading === 'number' && Number.isFinite(iosHeading)) {
        targetYawDegRef.current = iosHeading
      } else if (typeof e.alpha === 'number' && Number.isFinite(e.alpha)) {
        targetYawDegRef.current = (360 - e.alpha) % 360
      }

      if (typeof e.beta === 'number' && Number.isFinite(e.beta)) {
        // Sostener el móvil en vertical (~90°) equivale a mirar al horizonte (0°)
        const pitch = THREE.MathUtils.clamp(e.beta - 90, -35, 38)
        targetPitchDegRef.current = pitch
      }
    }

    window.addEventListener('deviceorientation', onOrientation, true)
    return () => window.removeEventListener('deviceorientation', onOrientation, true)
  }, [gyroEnabled])

  // Arrastrar 360º libre en escritorio o cuando el giroscopio está apagado
  useEffect(() => {
    const dom = gl.domElement
    const onDown = (e: PointerEvent) => {
      if (gyroEnabled) return
      draggingRef.current = true
      lastPointerRef.current = { x: e.clientX, y: e.clientY }
    }
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current || gyroEnabled) return
      const dx = e.clientX - lastPointerRef.current.x
      const dy = e.clientY - lastPointerRef.current.y
      lastPointerRef.current = { x: e.clientX, y: e.clientY }
      targetYawDegRef.current = (targetYawDegRef.current - dx * 0.22 + 360) % 360
      targetPitchDegRef.current = THREE.MathUtils.clamp(targetPitchDegRef.current + dy * 0.16, -32, 38)
    }
    const onUp = () => {
      draggingRef.current = false
    }

    dom.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      dom.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [gl, gyroEnabled])

  useFrame(({ size }, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const smooth = 1 - Math.exp(-dt * (gyroEnabled ? 8 : 14))

    yawDegRef.current = angleLerpDeg(yawDegRef.current, targetYawDegRef.current, smooth)
    pitchDegRef.current = THREE.MathUtils.lerp(pitchDegRef.current, targetPitchDegRef.current, smooth)

    camera.position.copy(observerPos)
    camera.rotation.order = 'YXZ'
    camera.rotation.y = -THREE.MathUtils.degToRad(yawDegRef.current)
    camera.rotation.x = THREE.MathUtils.degToRad(pitchDegRef.current)
    camera.rotation.z = 0

    compassTelemetry.headingDeg = yawDegRef.current
    compassTelemetry.pitchDeg = pitchDegRef.current

    // Proyectar etiquetas visibles sin solaparse + localizar el pico más cercano al retículo central
    const v = scratch.current
    const occupied: { x: number; y: number }[] = []
    let closestCenter: { target: VisiblePeakTarget; ndcDist: number } | null = null

    for (const item of visibleTargets) {
      const el = labelRefs.current.get(item.peak.id)
      if (!el) continue

      v.copy(item.top).project(camera)
      let show = v.z <= 1 && Math.abs(v.x) <= 0.96 && Math.abs(v.y) <= 0.88

      if (show) {
        const ndcDist = Math.hypot(v.x, v.y)
        if (ndcDist < 0.14 && (!closestCenter || ndcDist < closestCenter.ndcDist)) {
          closestCenter = { target: item, ndcDist }
        }

        const sx = (v.x * 0.5 + 0.5) * size.width
        const sy = (-v.y * 0.5 + 0.5) * size.height
        if (occupied.some((p) => Math.abs(p.x - sx) < LABEL_GAP_X && Math.abs(p.y - sy) < LABEL_GAP_Y)) {
          show = false
        } else {
          occupied.push({ x: sx, y: sy })
        }
      }

      el.style.opacity = show ? '1' : '0'
    }

    if (closestCenter) {
      compassTelemetry.centerPeakName = closestCenter.target.peak.name
      compassTelemetry.centerPeakEle = closestCenter.target.peak.elevation
      compassTelemetry.centerPeakDistKm = closestCenter.target.distanceKm
    } else {
      compassTelemetry.centerPeakName = ''
      compassTelemetry.centerPeakEle = 0
      compassTelemetry.centerPeakDistKm = 0
    }
  })

  return (
    <>
      {visibleTargets.map(({ peak, top, distanceKm }) => (
        <Html
          key={peak.id}
          position={[top.x, top.y + 0.08, top.z]}
          center
          zIndexRange={[20, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div
            ref={(el) => {
              if (el) labelRefs.current.set(peak.id, el)
              else labelRefs.current.delete(peak.id)
            }}
            className="flex -translate-y-1/2 select-none flex-col items-center transition-opacity duration-150"
          >
            <div className="whitespace-nowrap rounded-md border border-white/20 bg-slate-950/75 px-2 py-0.5 text-center backdrop-blur-sm">
              <span className="block font-sans text-[10.5px] font-semibold leading-tight text-white">
                {peak.name}
              </span>
              <span className="block font-mono text-[9.5px] leading-tight text-amber-200/90">
                {peak.elevation.toLocaleString('es-ES')} m · {distanceKm.toFixed(1)} km
              </span>
            </div>
            <span className="h-3 w-px bg-amber-300/80" />
          </div>
        </Html>
      ))}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* HUD Overlay estilo PeakFinder: cinta graduada + retículo + controles */
/* ------------------------------------------------------------------ */

interface CompassAROverlayProps {
  viewpoint: CompassViewpoint
  gpsStatus: string | null
  gyroEnabled: boolean
  onSelectViewpoint: (vp: CompassViewpoint) => void
  onRequestGps: () => void
  onToggleGyro: () => void
  onExit: () => void
}

const TAPE_TICKS = Array.from({ length: 72 }, (_, i) => i * 5) // cada 5°

function tickLabel(deg: number): string | null {
  const map: Record<number, string> = {
    0: 'N',
    45: 'NE',
    90: 'E',
    135: 'SE',
    180: 'S',
    225: 'SO',
    270: 'O',
    315: 'NO',
  }
  return map[deg] ?? null
}

export function CompassAROverlay({
  viewpoint,
  gpsStatus,
  gyroEnabled,
  onSelectViewpoint,
  onRequestGps,
  onToggleGyro,
  onExit,
}: CompassAROverlayProps) {
  const [centerPeak, setCenterPeak] = useState({ name: '', ele: 0, dist: 0 })
  const headingTextRef = useRef<HTMLSpanElement>(null)
  const cardinalRef = useRef<HTMLSpanElement>(null)
  const tapeRef = useRef<HTMLDivElement>(null)
  const observerEleRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let raf = 0
    let lastName = ''
    const pxPerDeg = 4 // 360° = 1440 px
    const tick = () => {
      const h = ((compassTelemetry.headingDeg % 360) + 360) % 360
      if (headingTextRef.current) {
        headingTextRef.current.textContent = `${String(Math.round(h) % 360).padStart(3, '0')}°`
      }
      if (cardinalRef.current) {
        cardinalRef.current.textContent = compassLabel(h)
      }
      if (tapeRef.current) {
        // Cinta triplicada (-360..720) para desplazamiento continuo sin saltos
        const offset = -(h + 360) * pxPerDeg
        tapeRef.current.style.transform = `translate3d(${offset}px, 0, 0)`
      }
      if (observerEleRef.current) {
        observerEleRef.current.textContent = `${compassTelemetry.observerEleM.toLocaleString('es-ES')} m`
      }
      if (compassTelemetry.centerPeakName !== lastName) {
        lastName = compassTelemetry.centerPeakName
        setCenterPeak({
          name: compassTelemetry.centerPeakName,
          ele: compassTelemetry.centerPeakEle,
          dist: compassTelemetry.centerPeakDistKm,
        })
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex flex-col justify-between p-4 sm:p-6">
      {/* Cinta de brújula superior graduada */}
      <div className="flex flex-col items-center">
        <div className="relative w-[min(94vw,540px)] overflow-hidden rounded-2xl border border-white/15 bg-slate-950/75 py-2.5 shadow-2xl backdrop-blur-md">
          {/* Triángulo indicador central */}
          <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 border-x-[6px] border-t-[7px] border-x-transparent border-t-amber-300" />

          <div className="relative h-7 overflow-hidden">
            <div
              ref={tapeRef}
              className="absolute left-1/2 top-0 flex h-full items-end will-change-transform"
              style={{ width: `${360 * 3 * 4}px` }}
            >
              {[-360, 0, 360].map((cycle) =>
                TAPE_TICKS.map((deg) => {
                  const x = (deg + 360 + cycle) * 4
                  const label = tickLabel(deg)
                  const isMajor = deg % 45 === 0
                  return (
                    <div
                      key={`${cycle}-${deg}`}
                      className="absolute bottom-0 flex -translate-x-1/2 flex-col items-center"
                      style={{ left: `${x}px` }}
                    >
                      {label && (
                        <span
                          className={`mb-0.5 font-mono text-[10px] font-bold ${
                            label === 'N' ? 'text-rose-400' : 'text-white/90'
                          }`}
                        >
                          {label}
                        </span>
                      )}
                      <span
                        className={`w-px ${
                          isMajor ? 'h-2.5 bg-amber-300/90' : deg % 15 === 0 ? 'h-2 bg-white/55' : 'h-1 bg-white/25'
                        }`}
                      />
                    </div>
                  )
                }),
              )}
            </div>
          </div>

          <div className="mt-1 flex items-center justify-center gap-2 font-mono text-xs">
            <span ref={cardinalRef} className="font-bold text-amber-300">
              S
            </span>
            <span ref={headingTextRef} className="tabular-nums text-white">
              180°
            </span>
            <span className="text-white/30">·</span>
            <span className="truncate text-[11px] text-white/75">{viewpoint.name}</span>
            <span className="text-white/30">·</span>
            <span ref={observerEleRef} className="text-[11px] text-sky-200">
              —
            </span>
          </div>
        </div>

        {gpsStatus && (
          <p className="mt-2 rounded-full border border-amber-300/30 bg-slate-950/80 px-3.5 py-1 font-mono text-[10px] text-amber-200 backdrop-blur-md">
            {gpsStatus}
          </p>
        )}
      </div>

      {/* Retículo central de mira */}
      <div className="pointer-events-none fixed left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
        <div className="relative flex h-12 w-12 items-center justify-center">
          <span className="h-12 w-px bg-white/35" />
          <span className="absolute h-px w-12 bg-white/35" />
          <span className="absolute h-4 w-4 rounded-full border border-amber-300/90 shadow-[0_0_12px_rgba(251,191,36,0.65)]" />
        </div>
        {centerPeak.name && (
          <div className="mt-2 whitespace-nowrap rounded-lg border border-amber-300/45 bg-slate-950/85 px-3 py-1 text-center shadow-xl backdrop-blur-md">
            <span className="block font-sans text-xs font-semibold text-white">{centerPeak.name}</span>
            <span className="block font-mono text-[10px] text-amber-200">
              {centerPeak.ele.toLocaleString('es-ES')} m · {centerPeak.dist.toFixed(1)} km
            </span>
          </div>
        )}
      </div>

      {/* Controles inferiores: selector de mirador, GPS, Giroscopio y Salir */}
      <div className="pointer-events-auto mx-auto flex w-[min(96vw,740px)] flex-col gap-2 rounded-2xl border border-white/15 bg-slate-950/80 p-3 text-white shadow-2xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <label htmlFor="viewpoint-select" className="font-mono text-[10px] tracking-[0.18em] text-white/50">
              MIRADOR:
            </label>
            <select
              id="viewpoint-select"
              value={viewpoint.id}
              onChange={(e) => {
                const found = COMPASS_VIEWPOINTS.find((v) => v.id === e.target.value)
                if (found) onSelectViewpoint(found)
              }}
              className="rounded-lg border border-white/15 bg-slate-900 px-2.5 py-1.5 font-sans text-xs text-white focus:border-amber-300/60 focus:outline-none"
            >
              {viewpoint.id === 'user-gps' && <option value="user-gps">📍 Mi ubicación GPS actual</option>}
              {COMPASS_VIEWPOINTS.map((vp) => (
                <option key={vp.id} value={vp.id}>
                  {vp.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={onRequestGps}
              className="rounded-lg border border-sky-300/35 bg-sky-400/15 px-2.5 py-1.5 font-mono text-[11px] font-medium text-sky-100 transition-colors hover:bg-sky-400/30"
            >
              📍 Mi GPS
            </button>

            <button
              type="button"
              onClick={onToggleGyro}
              className={`rounded-lg border px-2.5 py-1.5 font-mono text-[11px] font-medium transition-colors ${
                gyroEnabled
                  ? 'border-emerald-300/50 bg-emerald-400/90 font-semibold text-slate-950'
                  : 'border-white/15 bg-white/10 text-white/85 hover:bg-white/20'
              }`}
            >
              {gyroEnabled ? '📱 Giroscopio ON' : '📱 Activar Giroscopio'}
            </button>

            <button
              type="button"
              onClick={onExit}
              className="rounded-lg bg-white px-3 py-1.5 font-mono text-[11px] font-semibold text-slate-950 transition-colors hover:bg-amber-200"
            >
              Salir del Modo Brújula
            </button>
          </div>
        </div>

        <p className="font-mono text-[10px] text-white/50">
          {gyroEnabled
            ? 'Gira el teléfono hacia el horizonte para identificar las cumbres reales.'
            : 'Arrastra la pantalla en 360º para explorar el horizonte desde este mirador.'}{' '}
          {viewpoint.note && <span className="text-white/70">· {viewpoint.note}</span>}
        </p>
      </div>
    </div>
  )
}
