import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RouteViewRequest, ViewRequest } from './components/CameraRig'
import { Scene } from './components/Scene'
import { HutPanel } from './components/UI/HutPanel'
import { MassifBar } from './components/UI/MassifBar'
import { PeakPanel } from './components/UI/PeakPanel'
import { RouteReplayOverlay } from './components/UI/RouteReplayOverlay'
import { TelemetryHUD } from './components/UI/TelemetryHUD'
import { TopBar, type ExplorerTab } from './components/UI/TopBar'
import { hutsById, peaksById, type Route } from './data/pyrenees'
import type { TimeOfDay } from './lib/atmosphere'
import {
  DEFAULT_FILTERS,
  DEFAULT_HUT_FILTERS,
  applyFilters,
  applyHutFilters,
  type Filters,
  type HutFilters,
} from './lib/filters'
import { resetReplayState, type ReplayTarget } from './lib/replayState'
import type { CameraView, ViewMode } from './lib/views'
import {
  CozyVideoRecorder,
  triggerVideoDownload,
  type RecordedVideo,
} from './utils/videoRecorder'

export default function App() {
  const [tab, setTab] = useState<ExplorerTab>('peaks')
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [hutFilters, setHutFilters] = useState<HutFilters>(DEFAULT_HUT_FILTERS)
  const [selectedPeakId, setSelectedPeakId] = useState<string | null>(null)
  const [selectedHutId, setSelectedHutId] = useState<string | null>(null)
  const [activeRoute, setActiveRoute] = useState<Route | null>(null)
  const [mode, setMode] = useState<ViewMode>('aerial')
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('dawn')
  const [viewRequest, setViewRequest] = useState<ViewRequest | null>(null)
  const [routeViewRequest, setRouteViewRequest] = useState<RouteViewRequest | null>(null)
  const [showHuts, setShowHuts] = useState(false)
  const [tourActive, setTourActive] = useState(false)

  // Estado del modo Vídeo Cozy (Relive 3D)
  const [replayTarget, setReplayTarget] = useState<ReplayTarget | null>(null)
  const [replayRunId, setReplayRunId] = useState(0)
  const [recording, setRecording] = useState(false)
  const [recordedVideo, setRecordedVideo] = useState<RecordedVideo | null>(null)
  const webglCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const recorderRef = useRef<CozyVideoRecorder | null>(null)

  const visiblePeaks = useMemo(() => applyFilters(filters), [filters])
  const visibleHuts = useMemo(() => applyHutFilters(hutFilters), [hutFilters])
  const hasHutFilter =
    hutFilters.query.trim() !== '' ||
    hutFilters.type !== 'all' ||
    hutFilters.meals ||
    hutFilters.showers ||
    hutFilters.hearth
  const selectedPeak = selectedPeakId ? (peaksById[selectedPeakId] ?? null) : null
  const selectedHut = selectedHutId ? (hutsById[selectedHutId] ?? null) : null

  const clearRecordedVideo = useCallback(() => {
    setRecordedVideo((prev) => {
      if (prev) URL.revokeObjectURL(prev.url)
      return null
    })
  }, [])

  const startRecorderFor = useCallback(
    (target: ReplayTarget) => {
      recorderRef.current?.cancel()
      recorderRef.current = null
      clearRecordedVideo()
      const canvas = webglCanvasRef.current
      if (!canvas) {
        setRecording(false)
        return
      }
      try {
        const rec = new CozyVideoRecorder(canvas, target)
        const ok = rec.start()
        recorderRef.current = ok ? rec : null
        setRecording(ok)
      } catch {
        setRecording(false)
      }
    },
    [clearRecordedVideo],
  )

  const startReplay = useCallback(
    (route: Route) => {
      const originLabel =
        route.originType === 'parking'
          ? (route.parkingInfo?.name ?? 'Parking de acceso')
          : (route.hutId ? hutsById[route.hutId]?.name : undefined) ?? 'Refugio de montaña'

      let target: ReplayTarget | null = null
      if (selectedPeak) {
        target = {
          id: selectedPeak.id,
          name: selectedPeak.name,
          elevation: selectedPeak.elevation,
          massif: selectedPeak.massif,
          kind: 'peak',
          route,
          originLabel,
        }
      } else if (selectedHut) {
        target = {
          id: selectedHut.id,
          name: selectedHut.name,
          elevation: selectedHut.elevation,
          massif: selectedHut.massif,
          kind: 'hut',
          route,
          originLabel,
        }
      }
      if (!target) return

      setTourActive(false)
      setActiveRoute(route)
      setReplayTarget(target)
      setReplayRunId((n) => n + 1)
      startRecorderFor(target)
    },
    [selectedPeak, selectedHut, startRecorderFor],
  )

  const handleReplayAgain = useCallback(() => {
    if (!replayTarget) return
    setReplayRunId((n) => n + 1)
    startRecorderFor(replayTarget)
  }, [replayTarget, startRecorderFor])

  const handleReplayComplete = useCallback(() => {
    const rec = recorderRef.current
    recorderRef.current = null
    setRecording(false)
    if (!rec) return
    void rec.stop().then((video) => {
      if (!video) return
      setRecordedVideo(video)
      triggerVideoDownload(video)
    })
  }, [])

  const exitReplay = useCallback(() => {
    recorderRef.current?.cancel()
    recorderRef.current = null
    setRecording(false)
    resetReplayState()
    clearRecordedVideo()
    setReplayTarget(null)
  }, [clearRecordedVideo])

  const handleTabChange = useCallback((next: ExplorerTab) => {
    setTab(next)
    if (next === 'huts') setShowHuts(true)
  }, [])

  // Seleccionar un pico lanza el vuelo, activa Modo Cumbre 360º y preselecciona su primera ruta
  const selectPeak = useCallback((id: string) => {
    setTourActive(false)
    setSelectedHutId(null)
    setSelectedPeakId(id)
    setMode('summit')
    const peak = peaksById[id]
    setActiveRoute(peak?.routes[0] ?? null)
  }, [])

  // Seleccionar un refugio vuela hacia él, muestra los refugios, abre su ficha y selecciona su primera ruta
  const selectHut = useCallback((id: string) => {
    setTourActive(false)
    setSelectedPeakId(null)
    setSelectedHutId(id)
    setShowHuts(true)
    setMode('orbit')
    const hut = hutsById[id]
    setActiveRoute(hut?.routes?.[0] ?? null)
  }, [])

  const handleViewFullRoute = useCallback((route: Route) => {
    setTourActive(false)
    setActiveRoute(route)
    setMode('aerial')
    setRouteViewRequest((prev) => ({ id: (prev?.id ?? 0) + 1, route }))
  }, [])

  const back = useCallback(() => {
    if (replayTarget) {
      exitReplay()
      return
    }
    setTourActive(false)
    setSelectedPeakId(null)
    setSelectedHutId(null)
    setActiveRoute(null)
    setMode('aerial')
  }, [replayTarget, exitReplay])

  const goToView = useCallback((view: CameraView) => {
    setTourActive(false)
    setSelectedPeakId(null)
    setSelectedHutId(null)
    setActiveRoute(null)
    setMode('aerial')
    setViewRequest((prev) => ({ id: (prev?.id ?? 0) + 1, view }))
  }, [])

  const toggleTour = useCallback(() => {
    setTourActive((prev) => {
      if (!prev) {
        setSelectedPeakId(null)
        setSelectedHutId(null)
        setActiveRoute(null)
        setMode('aerial')
      }
      return !prev
    })
  }, [])

  const stopTour = useCallback(() => setTourActive(false), [])

  // Pantalla completa automática en la primera interacción del usuario
  useEffect(() => {
    const enterFullscreen = () => {
      if (!document.fullscreenElement) {
        void document.documentElement.requestFullscreen().catch(() => {})
      }
    }
    window.addEventListener('pointerdown', enterFullscreen, { once: true })
    return () => window.removeEventListener('pointerdown', enterFullscreen)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [back])

  useEffect(
    () => () => {
      recorderRef.current?.cancel()
    },
    [],
  )

  const isReplaying = replayTarget !== null

  return (
    <div className="fixed inset-0 m-0 h-screen w-screen overflow-hidden p-0">
      <Scene
        visiblePeaks={visiblePeaks}
        visibleHuts={visibleHuts}
        selected={selectedPeak}
        selectedHut={selectedHut}
        activeRoute={activeRoute}
        replayTarget={replayTarget}
        replayRunId={replayRunId}
        mode={mode}
        timeOfDay={timeOfDay}
        viewRequest={viewRequest}
        routeViewRequest={routeViewRequest}
        showHuts={showHuts}
        hasHutFilter={hasHutFilter}
        tourActive={tourActive}
        onTourStop={stopTour}
        onSelectPeak={selectPeak}
        onSelectHut={selectHut}
        onReplayComplete={handleReplayComplete}
        onCanvasReady={(c) => {
          webglCanvasRef.current = c
        }}
      />

      {!isReplaying ? (
        <>
          {/* Degradado superior para legibilidad */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#050b1c]/85 via-[#050b1c]/35 to-transparent sm:h-56" />

          <header className="pointer-events-none absolute left-4 top-3.5 select-none sm:left-8 sm:top-7 md:left-12 md:top-9">
            <h1 className="font-display text-2xl font-semibold tracking-[0.22em] text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.55)] sm:text-4xl sm:tracking-[0.26em] md:text-6xl">
              PIRINEOS
            </h1>
            <div className="mt-2 hidden items-center gap-3 sm:flex sm:mt-3 sm:gap-4">
              <span className="h-px w-10 bg-white/60 md:w-14" />
              <p className="font-mono text-[10px] tracking-[0.2em] text-white/80 md:text-xs">
                CORDILLERA TRANSFRONTERIZA · ES / FR · 3.404M MAX
              </p>
            </div>
          </header>

          <TopBar
            tab={tab}
            onTabChange={handleTabChange}
            filters={filters}
            onChange={setFilters}
            hutFilters={hutFilters}
            onHutFiltersChange={setHutFilters}
            peakCount={visiblePeaks.length}
            hutCount={visibleHuts.length}
            onSelectPeak={selectPeak}
            onSelectHut={selectHut}
            timeOfDay={timeOfDay}
            onTimeChange={setTimeOfDay}
            showHuts={showHuts}
            onToggleHuts={() => setShowHuts((v) => !v)}
            tourActive={tourActive}
            onToggleTour={toggleTour}
          />

          <PeakPanel
            peak={selectedPeak}
            mode={mode}
            activeRoute={activeRoute}
            onSelectRoute={setActiveRoute}
            onViewFullRoute={handleViewFullRoute}
            onStartReplay={startReplay}
            onModeChange={setMode}
            onSelectHut={selectHut}
            onBack={back}
          />

          <HutPanel
            hut={selectedHut}
            activeRoute={activeRoute}
            onSelectRoute={setActiveRoute}
            onViewFullRoute={handleViewFullRoute}
            onStartReplay={startReplay}
            onBack={back}
          />

          <div
            className={`pointer-events-none fixed bottom-3 left-3 right-3 z-30 flex-col gap-1.5 sm:bottom-6 sm:left-8 sm:right-8 sm:gap-2 lg:flex-row lg:items-end lg:justify-between lg:gap-4 ${
              selectedPeak || selectedHut ? 'hidden md:flex' : 'flex'
            }`}
          >
            <MassifBar onGo={goToView} />
            <TelemetryHUD />
          </div>
        </>
      ) : (
        <RouteReplayOverlay
          target={replayTarget}
          recording={recording}
          recordedVideo={recordedVideo}
          onReplayAgain={handleReplayAgain}
          onExit={exitReplay}
        />
      )}
    </div>
  )
}
