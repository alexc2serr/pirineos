import { useMemo, useRef, type ComponentRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import { hutsById, type Route } from '../data/pyrenees'
import type { HeightField } from '../lib/heightField'
import { sampleRouteElevationProfile } from '../lib/routes'

interface RoutePath3DProps {
  route: Route
  heightField: HeightField
  hoveredProgress?: number | null
}

const PIN_STEM_HEIGHT = 0.55
const HOVER_BEAM_HEIGHT = 0.72

/**
 * Renderiza una ruta de ascensión 3D adherida al relieve real del DEM con:
 * - Halo oscuro de contraste debajo (visible sobre nieve y bosque)
 * - Línea principal brillante (turquesa GPX, cian Parking, dorado Refugio)
 * - Pulso luminoso animado en dirección de subida
 * - Pin 3D de inicio + marcador pulsante sincronizado con el perfil de elevación 2D
 */
export function RoutePath3D({ route, heightField, hoveredProgress = null }: RoutePath3DProps) {
  const samples = useMemo(
    () => sampleRouteElevationProfile(route, heightField),
    [route, heightField],
  )
  const points = useMemo(() => samples.map((s) => s.position), [samples])
  const pulseRef = useRef<ComponentRef<typeof Line>>(null)
  const beaconRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }, dt) => {
    const mat = pulseRef.current?.material as { dashOffset?: number } | undefined
    if (mat && typeof mat.dashOffset === 'number') {
      mat.dashOffset -= dt * 0.65
    }
    if (beaconRef.current) {
      const scale = 1 + Math.sin(clock.elapsedTime * 6) * 0.22
      beaconRef.current.scale.setScalar(scale)
    }
  })

  if (points.length < 2) return null

  const start = points[0]
  const end = points[points.length - 1]
  const isParking = route.originType === 'parking'
  const isGpx = route.originType === 'gpx'
  const mainColor = isGpx ? '#2dd4bf' : isParking ? '#38bdf8' : '#f59e0b'
  const startLabel = isGpx
    ? route.name
    : isParking
      ? (route.parkingInfo?.name ?? 'Parking de acceso')
      : (route.hutId ? hutsById[route.hutId]?.name : undefined) ?? 'Refugio de salida'

  const hoveredSample =
    hoveredProgress !== null && samples.length > 1
      ? samples[Math.min(samples.length - 1, Math.max(0, Math.round(hoveredProgress * (samples.length - 1))))]
      : null

  return (
    <group>
      {/* Halo oscuro de alto contraste para destacar sobre nieve blanca y bosque */}
      <Line points={points} color="#020617" lineWidth={9} transparent opacity={0.75} />

      {/* Línea principal brillante */}
      <Line points={points} color={mainColor} lineWidth={4.2} transparent opacity={0.95} />

      {/* Pulso direccional animado hacia la cima */}
      <Line
        ref={pulseRef}
        points={points}
        color="#ffffff"
        lineWidth={3}
        dashed
        dashSize={0.18}
        gapSize={0.42}
      />

      {/* Tallo vertical conectando el pin de inicio con el trazado */}
      <Line
        points={[
          [start.x, start.y, start.z],
          [start.x, start.y + PIN_STEM_HEIGHT, start.z],
        ]}
        color={mainColor}
        lineWidth={2}
      />

      {/* Pin de Inicio (GPX turquesa, Parking azul P o Refugio ámbar) */}
      <Html
        position={[start.x, start.y + PIN_STEM_HEIGHT, start.z]}
        center
        zIndexRange={[28, 20]}
        style={{ pointerEvents: 'none' }}
      >
        <div
          className={`flex -translate-y-1/2 select-none items-center gap-2 rounded-full border py-1 pl-1.5 pr-3 shadow-xl backdrop-blur-md ${
            isGpx
              ? 'border-teal-300/50 bg-slate-950/85 text-white'
              : isParking
                ? 'border-sky-300/50 bg-slate-950/85 text-white'
                : 'border-amber-300/50 bg-slate-950/85 text-white'
          }`}
        >
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold text-slate-950 ${
              isGpx ? 'bg-teal-300' : isParking ? 'bg-sky-400' : 'bg-amber-400'
            }`}
          >
            {isGpx ? (
              'GPX'
            ) : isParking ? (
              'P'
            ) : (
              <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor" aria-hidden>
                <path d="M8 1.5 1 8h2v6.5h4v-4h2v4h4V8h2L8 1.5Z" />
              </svg>
            )}
          </span>
          <div className="max-w-[200px]">
            <span className="block truncate font-sans text-[11px] font-semibold leading-tight">
              {startLabel}
            </span>
            <span
              className={`block font-mono text-[9px] uppercase tracking-wider ${
                isGpx ? 'text-teal-300' : isParking ? 'text-sky-300' : 'text-amber-200'
              }`}
            >
              {isGpx ? 'Inicio · Track GPX' : isParking ? 'Inicio · Parking' : 'Inicio · Refugio'}
            </span>
          </div>
        </div>
      </Html>

      {/* Marcador pulsante sincronizado con el hover del Perfil de Elevación 2D */}
      {hoveredSample && (
        <group>
          <mesh ref={beaconRef} position={hoveredSample.position}>
            <sphereGeometry args={[0.095, 16, 12]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={hoveredSample.position}>
            <sphereGeometry args={[0.15, 16, 12]} />
            <meshBasicMaterial color={mainColor} transparent opacity={0.4} depthWrite={false} />
          </mesh>
          <Line
            points={[
              [hoveredSample.position.x, hoveredSample.position.y, hoveredSample.position.z],
              [
                hoveredSample.position.x,
                hoveredSample.position.y + HOVER_BEAM_HEIGHT,
                hoveredSample.position.z,
              ],
            ]}
            color="#ffffff"
            lineWidth={2}
            transparent
            opacity={0.9}
          />
          <Html
            position={[
              hoveredSample.position.x,
              hoveredSample.position.y + HOVER_BEAM_HEIGHT,
              hoveredSample.position.z,
            ]}
            center
            zIndexRange={[35, 30]}
            style={{ pointerEvents: 'none' }}
          >
            <div className="-translate-y-1/2 whitespace-nowrap rounded-lg border border-white/30 bg-slate-950/90 px-2.5 py-1 font-mono text-[10px] text-white shadow-xl backdrop-blur-md">
              <span className="font-semibold text-amber-200">
                {hoveredSample.elevationM.toLocaleString('es-ES')} m
              </span>
              <span className="mx-1.5 text-white/35">·</span>
              <span className="text-sky-200">
                {hoveredSample.slopePct >= 0 ? `+${hoveredSample.slopePct}%` : `${hoveredSample.slopePct}%`}
              </span>
              <span className="mx-1.5 text-white/35">·</span>
              <span className="text-white/75">Km {hoveredSample.distanceKm.toFixed(1)}</span>
            </div>
          </Html>
        </group>
      )}

      {/* Baliza luminosa en el punto de llegada */}
      <mesh position={[end.x, end.y + 0.02, end.z]}>
        <sphereGeometry args={[0.07, 16, 12]} />
        <meshBasicMaterial color={mainColor} />
      </mesh>
    </group>
  )
}
