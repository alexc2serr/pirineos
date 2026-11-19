import { useId, useMemo, useRef, useState } from 'react'
import type { Route } from '../../data/pyrenees'
import type { HeightField } from '../../lib/heightField'
import { sampleRouteElevationProfile, type ElevationSample } from '../../lib/routes'

interface ElevationProfileChartProps {
  route: Route
  heightField: HeightField | null
  hoveredProgress: number | null
  onHoverProgress: (progress: number | null) => void
  onFocusSample: (sample: ElevationSample) => void
}

const CHART_W = 320
const CHART_H = 92
const PAD_X = 6
const PAD_TOP = 10
const PAD_BOTTOM = 16

function slopeColor(pct: number): string {
  const abs = Math.abs(pct)
  if (abs >= 25) return 'text-rose-300'
  if (abs >= 14) return 'text-amber-300'
  return 'text-emerald-300'
}

/** Gráfica topográfica SVG interactiva sincronizada bidireccionalmente con el trazado 3D. */
export function ElevationProfileChart({
  route,
  heightField,
  hoveredProgress,
  onHoverProgress,
  onFocusSample,
}: ElevationProfileChartProps) {
  const gradId = useId()
  const svgRef = useRef<SVGSVGElement>(null)
  const [localProgress, setLocalProgress] = useState<number | null>(null)

  const samples = useMemo(() => {
    if (!heightField) return []
    return sampleRouteElevationProfile(route, heightField)
  }, [route, heightField])

  const metrics = useMemo(() => {
    if (samples.length < 2) return null
    let minEle = Infinity
    let maxEle = -Infinity
    let maxIdx = 0
    for (let i = 0; i < samples.length; i++) {
      const e = samples[i].elevationM
      if (e < minEle) minEle = e
      if (e > maxEle) {
        maxEle = e
        maxIdx = i
      }
    }
    const spanEle = Math.max(80, maxEle - minEle)
    const innerW = CHART_W - PAD_X * 2
    const innerH = CHART_H - PAD_TOP - PAD_BOTTOM

    const toX = (p: number) => PAD_X + p * innerW
    const toY = (e: number) => PAD_TOP + innerH - ((e - minEle) / spanEle) * innerH

    const linePath = samples
      .map((s, i) => `${i === 0 ? 'M' : 'L'}${toX(s.progress).toFixed(1)},${toY(s.elevationM).toFixed(1)}`)
      .join(' ')

    const areaPath = `${linePath} L${toX(1).toFixed(1)},${(CHART_H - PAD_BOTTOM).toFixed(1)} L${toX(0).toFixed(1)},${(CHART_H - PAD_BOTTOM).toFixed(1)} Z`

    return {
      minEle,
      maxEle,
      maxSample: samples[maxIdx],
      totalKm: samples[samples.length - 1].distanceKm,
      linePath,
      areaPath,
      toX,
      toY,
    }
  }, [samples])

  if (!metrics || samples.length < 2) return null

  const activeProgress = hoveredProgress ?? localProgress
  const activeSample =
    activeProgress !== null
      ? samples[Math.min(samples.length - 1, Math.max(0, Math.round(activeProgress * (samples.length - 1))))]
      : null

  const strokeColor =
    route.originType === 'gpx' ? '#2dd4bf' : route.originType === 'parking' ? '#38bdf8' : '#f59e0b'

  const progressFromClientX = (clientX: number): number => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || rect.width <= 0) return 0
    const raw = (clientX - rect.left) / rect.width
    return Math.min(1, Math.max(0, raw))
  }

  const handlePointer = (clientX: number) => {
    const p = progressFromClientX(clientX)
    setLocalProgress(p)
    onHoverProgress(p)
  }

  const handleClick = (clientX: number) => {
    const p = progressFromClientX(clientX)
    const idx = Math.min(samples.length - 1, Math.max(0, Math.round(p * (samples.length - 1))))
    setLocalProgress(p)
    onHoverProgress(p)
    onFocusSample(samples[idx])
  }

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/60 p-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2 font-mono text-[9.5px]">
        <span className="tracking-[0.16em] text-white/45">PERFIL DE ELEVACIÓN</span>
        {activeSample ? (
          <span className="truncate text-white/90 tabular-nums">
            <span className={`font-semibold ${slopeColor(activeSample.slopePct)}`}>
              {activeSample.slopePct >= 0 ? `+${activeSample.slopePct}%` : `${activeSample.slopePct}%`}
            </span>
            {' · '}
            {activeSample.elevationM.toLocaleString('es-ES')} m · Km {activeSample.distanceKm.toFixed(1)}
          </span>
        ) : (
          <span className="text-white/50">Desliza o haz clic para inspeccionar</span>
        )}
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="h-24 w-full cursor-crosshair touch-none select-none overflow-visible"
        onPointerMove={(e) => handlePointer(e.clientX)}
        onPointerDown={(e) => handlePointer(e.clientX)}
        onPointerLeave={() => {
          setLocalProgress(null)
          onHoverProgress(null)
        }}
        onClick={(e) => handleClick(e.clientX)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.45" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Líneas guía horizontales sutiles */}
        <line
          x1={PAD_X}
          y1={PAD_TOP}
          x2={CHART_W - PAD_X}
          y2={PAD_TOP}
          stroke="rgba(255,255,255,0.08)"
          strokeDasharray="2 3"
        />
        <line
          x1={PAD_X}
          y1={CHART_H - PAD_BOTTOM}
          x2={CHART_W - PAD_X}
          y2={CHART_H - PAD_BOTTOM}
          stroke="rgba(255,255,255,0.12)"
        />

        {/* Área degradada y línea del perfil */}
        <path d={metrics.areaPath} fill={`url(#${gradId})`} />
        <path d={metrics.linePath} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinejoin="round" />

        {/* Etiquetas de cota mínima y máxima */}
        <text x={PAD_X + 2} y={PAD_TOP + 8} fill="rgba(255,255,255,0.65)" fontSize="8" fontFamily="JetBrains Mono, monospace">
          {metrics.maxEle.toLocaleString('es-ES')} m
        </text>
        <text
          x={PAD_X + 2}
          y={CHART_H - PAD_BOTTOM - 3}
          fill="rgba(255,255,255,0.5)"
          fontSize="8"
          fontFamily="JetBrains Mono, monospace"
        >
          {metrics.minEle.toLocaleString('es-ES')} m
        </text>

        {/* Marcas de distancia inferior */}
        <text x={PAD_X} y={CHART_H - 3} fill="rgba(255,255,255,0.45)" fontSize="8" fontFamily="JetBrains Mono, monospace">
          0 km
        </text>
        <text
          x={CHART_W / 2}
          y={CHART_H - 3}
          textAnchor="middle"
          fill="rgba(255,255,255,0.45)"
          fontSize="8"
          fontFamily="JetBrains Mono, monospace"
        >
          {(metrics.totalKm / 2).toFixed(1)} km
        </text>
        <text
          x={CHART_W - PAD_X}
          y={CHART_H - 3}
          textAnchor="end"
          fill="rgba(255,255,255,0.55)"
          fontSize="8"
          fontFamily="JetBrains Mono, monospace"
        >
          {metrics.totalKm.toFixed(1)} km
        </text>

        {/* Cursor interactivo sincronizado con el 3D */}
        {activeSample && (
          <g>
            <line
              x1={metrics.toX(activeSample.progress)}
              y1={PAD_TOP}
              x2={metrics.toX(activeSample.progress)}
              y2={CHART_H - PAD_BOTTOM}
              stroke="#ffffff"
              strokeOpacity="0.65"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <circle
              cx={metrics.toX(activeSample.progress)}
              cy={metrics.toY(activeSample.elevationM)}
              r="4.2"
              fill={strokeColor}
              stroke="#ffffff"
              strokeWidth="1.6"
            />
          </g>
        )}
      </svg>
    </div>
  )
}
