import { useMemo, useRef, type ComponentRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import { latLonToWorld } from '../data/pyrenees'
import { stageToRoute, type Trek } from '../data/treks'
import type { HeightField } from '../lib/heightField'
import { sampleRouteElevationProfile } from '../lib/routes'

interface MultiStageTrek3DProps {
  trek: Trek
  heightField: HeightField
  selectedStageDay: number | null
  hoveredProgress: number | null
  onSelectStage: (day: number) => void
}

const STOP_STEM_H = 0.62
const HOVER_BEAM_H = 0.75

/**
 * Renderiza una travesía multi-etapa completa en 3D sobre el DEM:
 * - Cada etapa con su color distintivo + halo oscuro de contraste
 * - Marcadores numerados "Salida", "Noche 1", "Noche 2"... sobre cada refugio/parada
 * - Baliza pulsante sincronizada con el perfil de elevación de la etapa seleccionada
 */
export function MultiStageTrek3D({
  trek,
  heightField,
  selectedStageDay,
  hoveredProgress,
  onSelectStage,
}: MultiStageTrek3DProps) {
  const pulseRef = useRef<ComponentRef<typeof Line>>(null)
  const beaconRef = useRef<THREE.Mesh>(null)

  const stageData = useMemo(
    () =>
      trek.stages.map((stage) => {
        const samples = sampleRouteElevationProfile(stageToRoute(trek, stage), heightField)
        return {
          stage,
          samples,
          points: samples.map((s) => s.position),
        }
      }),
    [trek, heightField],
  )

  const stopMarkers = useMemo(() => {
    // Evita duplicar etiqueta si el final coincide exactamente con la salida (travesía circular)
    const first = trek.stops[0]
    return trek.stops
      .map((stop, idx) => {
        const isCircularEnd =
          idx > 0 &&
          idx === trek.stops.length - 1 &&
          first &&
          Math.abs(stop.lat - first.lat) < 0.001 &&
          Math.abs(stop.lon - first.lon) < 0.001
        const pos = latLonToWorld(stop.lat, stop.lon, 0)
        pos.y = heightField.sampleWorld(pos.x, pos.z) + 0.05
        return { stop, idx, pos, isCircularEnd }
      })
      .filter((m) => !m.isCircularEnd)
  }, [trek.stops, heightField])

  useFrame(({ clock }, dt) => {
    const mat = pulseRef.current?.material as { dashOffset?: number } | undefined
    if (mat && typeof mat.dashOffset === 'number') {
      mat.dashOffset -= dt * 0.6
    }
    if (beaconRef.current) {
      beaconRef.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 6) * 0.22)
    }
  })

  const selectedStageObj = stageData.find((d) => d.stage.day === selectedStageDay)
  const hoveredSample =
    selectedStageObj && hoveredProgress !== null && selectedStageObj.samples.length > 1
      ? selectedStageObj.samples[
          Math.min(
            selectedStageObj.samples.length - 1,
            Math.max(0, Math.round(hoveredProgress * (selectedStageObj.samples.length - 1))),
          )
        ]
      : null

  return (
    <group>
      {stageData.map(({ stage, points }) => {
        if (points.length < 2) return null
        const isSelected = selectedStageDay === stage.day
        const dimmed = selectedStageDay !== null && !isSelected

        return (
          <group key={stage.day}>
            <Line
              points={points}
              color="#020617"
              lineWidth={isSelected ? 10 : 7.5}
              transparent
              opacity={dimmed ? 0.4 : 0.78}
            />
            <Line
              points={points}
              color={stage.color}
              lineWidth={isSelected ? 5 : 3.6}
              transparent
              opacity={dimmed ? 0.55 : 0.96}
            />
            {isSelected && (
              <Line
                ref={pulseRef}
                points={points}
                color="#ffffff"
                lineWidth={3}
                dashed
                dashSize={0.18}
                gapSize={0.4}
              />
            )}
          </group>
        )
      })}

      {/* Marcadores numerados de Salida y Noche 1, Noche 2… */}
      {stopMarkers.map(({ stop, idx, pos }) => {
        const isStart = idx === 0
        const stageColor = isStart
          ? trek.stages[0]?.color ?? '#38bdf8'
          : trek.stages[Math.min(idx - 1, trek.stages.length - 1)]?.color ?? '#f59e0b'
        const badgeText = isStart ? 'Salida' : `Noche ${idx}`

        return (
          <group key={`${stop.id}-${idx}`}>
            <Line
              points={[
                [pos.x, pos.y, pos.z],
                [pos.x, pos.y + STOP_STEM_H, pos.z],
              ]}
              color={stageColor}
              lineWidth={2}
            />
            <Html
              position={[pos.x, pos.y + STOP_STEM_H, pos.z]}
              center
              zIndexRange={[29, 22]}
              style={{ pointerEvents: 'auto' }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  const targetDay = isStart ? 1 : Math.min(idx, trek.stages.length)
                  if (targetDay >= 1) onSelectStage(targetDay)
                }}
                className="flex -translate-y-1/2 cursor-pointer select-none items-center gap-1.5 whitespace-nowrap rounded-full border border-white/25 bg-slate-950/85 py-1 pl-1.5 pr-2.5 text-left text-white shadow-xl backdrop-blur-md transition-transform hover:scale-105"
              >
                <span
                  className="rounded-full px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-slate-950"
                  style={{ backgroundColor: stageColor }}
                >
                  {badgeText}
                </span>
                <span className="max-w-[140px] truncate font-sans text-[10.5px] font-semibold">
                  {stop.name}
                </span>
              </button>
            </Html>
          </group>
        )
      })}

      {/* Baliza pulsante sincronizada con el perfil de elevación de la etapa activa */}
      {hoveredSample && selectedStageObj && (
        <group>
          <mesh ref={beaconRef} position={hoveredSample.position}>
            <sphereGeometry args={[0.1, 16, 12]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <Line
            points={[
              [hoveredSample.position.x, hoveredSample.position.y, hoveredSample.position.z],
              [
                hoveredSample.position.x,
                hoveredSample.position.y + HOVER_BEAM_H,
                hoveredSample.position.z,
              ],
            ]}
            color="#ffffff"
            lineWidth={2}
          />
          <Html
            position={[
              hoveredSample.position.x,
              hoveredSample.position.y + HOVER_BEAM_H,
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
    </group>
  )
}
