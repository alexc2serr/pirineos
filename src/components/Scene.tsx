import { Canvas } from '@react-three/fiber'
import { useState } from 'react'
import * as THREE from 'three'
import type { Hut, Peak, Route } from '../data/pyrenees'
import type { SeasonMode, TimeOfDay } from '../lib/atmosphere'
import type { CompassViewpoint } from '../lib/compassState'
import type { HeightField } from '../lib/heightField'
import type { ReplayTarget } from '../lib/replayState'
import { INITIAL_VIEW, type ViewMode } from '../lib/views'
import { Atmosphere } from './Atmosphere'
import { CameraRig, type PointFocusRequest, type RouteViewRequest, type ViewRequest } from './CameraRig'
import { CompassARScene } from './CompassARMode'
import { HikerAnimation3D } from './HikerAnimation3D'
import { HutMarkers } from './HutMarkers'
import { PeakMarkers } from './PeakMarkers'
import { PyreneesTerrain } from './PyreneesTerrain'
import { RoutePath3D } from './RoutePath3D'
import { SummitHorizon } from './SummitHorizon'

interface SceneProps {
  visiblePeaks: Peak[]
  visibleHuts: Hut[]
  selected: Peak | null
  selectedHut: Hut | null
  activeRoute: Route | null
  hoveredRouteProgress: number | null
  replayTarget: ReplayTarget | null
  replayRunId: number
  compassActive: boolean
  compassViewpoint: CompassViewpoint
  gyroEnabled: boolean
  mode: ViewMode
  timeOfDay: TimeOfDay
  seasonMode: SeasonMode
  viewRequest: ViewRequest | null
  routeViewRequest: RouteViewRequest | null
  pointFocusRequest: PointFocusRequest | null
  showPeaks: boolean
  showHuts: boolean
  hasHutFilter: boolean
  completedPeakIds: Set<string>
  visitedHutIds: Set<string>
  tourActive: boolean
  onTourStop: () => void
  onSelectPeak: (id: string) => void
  onSelectHut: (id: string) => void
  onReplayComplete: () => void
  onCanvasReady: (canvas: HTMLCanvasElement) => void
  onHeightFieldReady: (field: HeightField) => void
}

export function Scene({
  visiblePeaks,
  visibleHuts,
  selected,
  selectedHut,
  activeRoute,
  hoveredRouteProgress,
  replayTarget,
  replayRunId,
  compassActive,
  compassViewpoint,
  gyroEnabled,
  mode,
  timeOfDay,
  seasonMode,
  viewRequest,
  routeViewRequest,
  pointFocusRequest,
  showPeaks,
  showHuts,
  hasHutFilter,
  completedPeakIds,
  visitedHutIds,
  tourActive,
  onTourStop,
  onSelectPeak,
  onSelectHut,
  onReplayComplete,
  onCanvasReady,
  onHeightFieldReady,
}: SceneProps) {
  const [error, setError] = useState<string | null>(null)
  const [heightField, setHeightField] = useState<HeightField | null>(null)
  const isReplaying = replayTarget !== null
  const isNormalMode = !isReplaying && !compassActive

  const handleTerrainLoaded = (field: HeightField) => {
    setHeightField(field)
    onHeightFieldReady(field)
  }

  return (
    <div className="fixed inset-0 h-screen w-screen touch-none overflow-hidden">
      <Canvas
        dpr={[1, 2]}
        camera={{
          position: INITIAL_VIEW.position.toArray(),
          fov: 58,
          near: 0.03,
          far: 6000,
        }}
        gl={{ antialias: true, toneMapping: THREE.NoToneMapping, preserveDrawingBuffer: true }}
        onCreated={({ gl }) => onCanvasReady(gl.domElement)}
        style={{ width: '100vw', height: '100vh', display: 'block' }}
      >
        <Atmosphere timeOfDay={timeOfDay} seasonMode={seasonMode} />

        <PyreneesTerrain onLoaded={handleTerrainLoaded} onError={(e) => setError(e.message)} />

        {heightField && isNormalMode && (
          <>
            {(showPeaks || selected !== null) && (
              <PeakMarkers
                visiblePeaks={visiblePeaks}
                heightField={heightField}
                selectedId={selected?.id ?? null}
                completedPeakIds={completedPeakIds}
                mode={mode}
                onSelect={onSelectPeak}
              />
            )}
            {(showHuts || selectedHut !== null) && (
              <HutMarkers
                visibleHuts={visibleHuts}
                heightField={heightField}
                selectedHutId={selectedHut?.id ?? null}
                visitedHutIds={visitedHutIds}
                hasActiveFilter={hasHutFilter}
                onSelectHut={onSelectHut}
              />
            )}
            {activeRoute && (
              <RoutePath3D
                route={activeRoute}
                heightField={heightField}
                hoveredProgress={hoveredRouteProgress}
              />
            )}
            {selected && mode === 'summit' && <SummitHorizon peak={selected} heightField={heightField} />}
          </>
        )}

        {heightField && replayTarget && (
          <HikerAnimation3D
            target={replayTarget}
            heightField={heightField}
            runId={replayRunId}
            onComplete={onReplayComplete}
          />
        )}

        {heightField && compassActive && (
          <CompassARScene
            viewpoint={compassViewpoint}
            heightField={heightField}
            gyroEnabled={gyroEnabled}
          />
        )}

        <CameraRig
          selected={selected}
          selectedHut={selectedHut}
          mode={mode}
          heightField={heightField}
          viewRequest={viewRequest}
          routeViewRequest={routeViewRequest}
          pointFocusRequest={pointFocusRequest}
          tourActive={tourActive}
          replayActive={isReplaying}
          compassActive={compassActive}
          onTourStop={onTourStop}
        />
      </Canvas>

      {!heightField && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-24">
          <p className="rounded-full border border-white/10 bg-slate-950/60 px-5 py-2 font-mono text-xs tracking-[0.2em] text-white/80 backdrop-blur-md">
            CARGANDO RELIEVE…
          </p>
        </div>
      )}
      {error && (
        <div className="absolute bottom-4 left-4 rounded-lg bg-red-900/70 px-4 py-2 font-mono text-sm backdrop-blur">
          Error cargando el DEM: {error}
        </div>
      )}
    </div>
  )
}
