import { useMemo, useRef, type ComponentRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import { hutsById, type Route } from '../data/pyrenees'
import type { HeightField } from '../lib/heightField'
import { buildRoutePoints } from '../lib/routes'

interface RoutePath3DProps {
  route: Route
  heightField: HeightField
}

const PIN_STEM_HEIGHT = 0.55

/**
 * Renderiza una ruta de ascensión 3D adherida al relieve real del DEM con:
 * - Halo oscuro de contraste debajo (visible sobre nieve y bosque)
 * - Línea principal brillante (cian eléctrico para Parking, dorado alpino para Refugio)
 * - Pulso luminoso animado en dirección de subida
 * - Pin 3D distintivo de inicio (Parking azul P / Refugio ámbar)
 */
export function RoutePath3D({ route, heightField }: RoutePath3DProps) {
  const points = useMemo(() => buildRoutePoints(route, heightField), [route, heightField])
  const pulseRef = useRef<ComponentRef<typeof Line>>(null)

  useFrame((_, dt) => {
    const mat = pulseRef.current?.material as { dashOffset?: number } | undefined
    if (mat && typeof mat.dashOffset === 'number') {
      mat.dashOffset -= dt * 0.65
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

      {/* Baliza luminosa en el punto de llegada */}
      <mesh position={[end.x, end.y + 0.02, end.z]}>
        <sphereGeometry args={[0.07, 16, 12]} />
        <meshBasicMaterial color={mainColor} />
      </mesh>
    </group>
  )
}
