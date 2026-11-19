import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointFocusRequest, RouteViewRequest, ViewRequest } from './components/CameraRig'
import { CompassAROverlay } from './components/CompassARMode'
import { Scene } from './components/Scene'
import { GpxPanel } from './components/UI/GpxPanel'
import { HutPanel } from './components/UI/HutPanel'
import { MassifBar } from './components/UI/MassifBar'
import { MenuDrawer, type ExplorerMode } from './components/UI/MenuDrawer'
import { Navbar } from './components/UI/Navbar'
import { PeakPanel } from './components/UI/PeakPanel'
import { RouteReplayOverlay } from './components/UI/RouteReplayOverlay'
import { TelemetryHUD } from './components/UI/TelemetryHUD'
import { TrekPanel } from './components/UI/TrekPanel'
import { TERRAIN_BOUNDS, hutsById, peaksById, type Route } from './data/pyrenees'
import { stageToRoute, trekToCombinedRoute, type Trek } from './data/treks'
import { useMountaineerPassport } from './hooks/useMountaineerPassport'
import { useTrekPlanner } from './hooks/useTrekPlanner'
import type { SeasonMode, TimeOfDay } from './lib/atmosphere'
import { COMPASS_VIEWPOINTS, type CompassViewpoint } from './lib/compassState'
import {
  DEFAULT_FILTERS,
  DEFAULT_HUT_FILTERS,
  applyFilters,
  applyHutFilters,
  type Filters,
  type HutFilters,
} from './lib/filters'
import type { HeightField } from './lib/heightField'
import { resetReplayState, type ReplayTarget } from './lib/replayState'
import type { ElevationSample } from './lib/routes'
import type { CameraView, ViewMode } from './lib/views'
import { parseGpxText, type ParsedGpxTrack } from './utils/gpxParser'
import {
  CozyVideoRecorder,
  triggerVideoDownload,
  type RecordedVideo,
} from './utils/videoRecorder'

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [explorerMode, setExplorerMode] = useState<ExplorerMode>('peaks')
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [hutFilters, setHutFilters] = useState<HutFilters>(DEFAULT_HUT_FILTERS)
  const [selectedPeakId, setSelectedPeakId] = useState<string | null>(null)
  const [selectedHutId, setSelectedHutId] = useState<string | null>(null)
  const [gpxTrack, setGpxTrack] = useState<ParsedGpxTrack | null>(null)
  const [gpxHistory, setGpxHistory] = useState<ParsedGpxTrack[]>([])
  const [viewedTrek, setViewedTrek] = useState<Trek | null>(null)
  const [selectedTrekStageDay, setSelectedTrekStageDay] = useState<number | null>(null)
  const [activeRoute, setActiveRoute] = useState<Route | null>(null)
  const [hoveredRouteProgress, setHoveredRouteProgress] = useState<number | null>(null)
  const [heightField, setHeightField] = useState<HeightField | null>(null)
  const [mode, setMode] = useState<ViewMode>('aerial')
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('dawn')
  const [seasonMode, setSeasonMode] = useState<SeasonMode>('summer')
  const [viewRequest, setViewRequest] = useState<ViewRequest | null>(null)
  const [routeViewRequest, setRouteViewRequest] = useState<RouteViewRequest | null>(null)
  const [pointFocusRequest, setPointFocusRequest] = useState<PointFocusRequest | null>(null)
  const [showPeaks, setShowPeaks] = useState(true)
  const [showHuts, setShowHuts] = useState(false)
  const [tourActive, setTourActive] = useState(false)

  // Modo Brújula ("¿Qué pico estoy viendo?")
  const [compassActive, setCompassActive] = useState(false)
  const [compassViewpoint, setCompassViewpoint] = useState<CompassViewpoint>(COMPASS_VIEWPOINTS[1])
  const [gyroEnabled, setGyroEnabled] = useState(false)
  const [gpsStatus, setGpsStatus] = useState<string | null>(null)

  // Drag & Drop GPX y avisos
  const [isDraggingGpx, setIsDraggingGpx] = useState(false)
  const [gpxNotice, setGpxNotice] = useState<string | null>(null)
  const dragDepthRef = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estado del modo Vídeo Cozy (Relive 3D)
  const [replayTarget, setReplayTarget] = useState<ReplayTarget | null>(null)
  const [replayRunId, setReplayRunId] = useState(0)
  const [recording, setRecording] = useState(false)
  const [recordedVideo, setRecordedVideo] = useState<RecordedVideo | null>(null)
  const webglCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const recorderRef = useRef<CozyVideoRecorder | null>(null)

  const passport = useMountaineerPassport()
  const trekPlanner = useTrekPlanner()
  const activeTrek = trekPlanner.isBuilding ? trekPlanner.draftTrek : viewedTrek

  const visiblePeaks = useMemo(
    () => applyFilters(filters, passport.completedPeakIds),
    [filters, passport.completedPeakIds],
  )
  const visibleHuts = useMemo(() => applyHutFilters(hutFilters), [hutFilters])
  const hasHutFilter =
    hutFilters.query.trim() !== '' ||
    hutFilters.side !== 'all' ||
    hutFilters.type !== 'all' ||
    hutFilters.meals ||
    hutFilters.showers ||
    hutFilters.hearth
  const hasPeakFilter =
    filters.query.trim() !== '' ||
    filters.side !== 'all' ||
    filters.difficulty !== 'all' ||
    filters.altitude !== 'all' ||
    filters.passport !== 'all'
  const hasAnyFilter = hasPeakFilter || hasHutFilter

  const selectedPeak = selectedPeakId ? (peaksById[selectedPeakId] ?? null) : null
  const selectedHut = selectedHutId ? (hutsById[selectedHutId] ?? null) : null

  /* ---------- Modo Brújula (GPS + Giroscopio + Miradores) ---------- */

  const requestUserGps = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGpsStatus('GPS no disponible en este dispositivo · Usando mirador seleccionado.')
      return
    }
    setGpsStatus('Localizando tu posición GPS…')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords
        const inside =
          lat >= TERRAIN_BOUNDS.south &&
          lat <= TERRAIN_BOUNDS.north &&
          lon >= TERRAIN_BOUNDS.west &&
          lon <= TERRAIN_BOUNDS.east
        if (inside) {
          setCompassViewpoint({
            id: 'user-gps',
            name: 'Mi ubicación GPS',
            lat,
            lon,
            note: `${lat.toFixed(4)}°N · ${lon.toFixed(4)}°`,
          })
          setGpsStatus(null)
        } else {
          setGpsStatus('Tu GPS está fuera de los Pirineos · Puedes elegir cualquier mirador abajo.')
        }
      },
      () => {
        setGpsStatus('Permiso de GPS denegado · Elige un mirador en la barra inferior.')
      },
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 60000 },
    )
  }, [])

  const openCompassMode = useCallback(() => {
    setMenuOpen(false)
    setTourActive(false)
    setSelectedPeakId(null)
    setSelectedHutId(null)
    setGpxTrack(null)
    setActiveRoute(null)
    setHoveredRouteProgress(null)
    setCompassActive(true)
    requestUserGps()
  }, [requestUserGps])

  const exitCompassMode = useCallback(() => {
    setCompassActive(false)
    setGyroEnabled(false)
    setGpsStatus(null)
  }, [])

  const toggleGyro = useCallback(async () => {
    if (gyroEnabled) {
      setGyroEnabled(false)
      return
    }
    const DevOrient = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>
    }
    if (typeof DevOrient?.requestPermission === 'function') {
      try {
        const res = await DevOrient.requestPermission()
        if (res === 'granted') {
          setGyroEnabled(true)
          setGpsStatus(null)
        } else {
          setGpsStatus('Permiso de giroscopio denegado en iOS/Safari.')
        }
      } catch {
        setGpsStatus('No se pudo activar el giroscopio en este navegador.')
      }
    } else if ('DeviceOrientationEvent' in window) {
      setGyroEnabled(true)
      setGpsStatus(null)
    } else {
      setGpsStatus('Este dispositivo no dispone de sensores de orientación.')
    }
  }, [gyroEnabled])

  /* ---------- Vídeo Cozy (Relive 3D) ---------- */

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

  const launchReplayTarget = useCallback(
    (target: ReplayTarget) => {
      setMenuOpen(false)
      setCompassActive(false)
      setTourActive(false)
      setHoveredRouteProgress(null)
      setActiveRoute(target.route)
      setReplayTarget(target)
      setReplayRunId((n) => n + 1)
      startRecorderFor(target)
    },
    [startRecorderFor],
  )

  const startReplay = useCallback(
    (route: Route) => {
      const originLabel =
        route.originType === 'parking'
          ? (route.parkingInfo?.name ?? 'Parking de acceso')
          : route.originType === 'gpx'
            ? 'Track GPX'
            : (route.hutId ? hutsById[route.hutId]?.name : undefined) ?? 'Refugio de montaña'

      if (selectedPeak) {
        launchReplayTarget({
          id: selectedPeak.id,
          name: selectedPeak.name,
          elevation: selectedPeak.elevation,
          massif: selectedPeak.massif,
          kind: 'peak',
          route,
          originLabel,
        })
      } else if (selectedHut) {
        launchReplayTarget({
          id: selectedHut.id,
          name: selectedHut.name,
          elevation: selectedHut.elevation,
          massif: selectedHut.massif,
          kind: 'hut',
          route,
          originLabel,
        })
      }
    },
    [selectedPeak, selectedHut, launchReplayTarget],
  )

  const startReplayForGpx = useCallback(
    (track: ParsedGpxTrack) => {
      launchReplayTarget({
        id: track.id,
        name: track.name,
        elevation: track.maxElevation ?? 2000,
        massif: track.massif,
        kind: track.matchedKind,
        route: track.route,
        originLabel: `GPX · ${track.fileName}`,
      })
    },
    [launchReplayTarget],
  )

  const startReplayForTrek = useCallback(
    (trek: Trek) => {
      const { route, stageMarkers } = trekToCombinedRoute(trek)
      const maxStopEle = Math.max(...trek.stops.map((s) => s.elevation), 2200)
      launchReplayTarget({
        id: trek.id,
        name: trek.name,
        elevation: maxStopEle,
        massif: trek.region,
        kind: 'trek',
        route,
        originLabel: `${trek.stops[0]?.name ?? 'Salida'} (${trek.stages.length} etapas)`,
        stageMarkers,
      })
    },
    [launchReplayTarget],
  )

  const openTrek = useCallback((trek: Trek) => {
    setMenuOpen(false)
    setCompassActive(false)
    setTourActive(false)
    setSelectedPeakId(null)
    setSelectedHutId(null)
    setGpxTrack(null)
    setActiveRoute(null)
    setHoveredRouteProgress(null)
    setViewedTrek(trek)
    setSelectedTrekStageDay(null)
    setShowHuts(true)
    setMode('aerial')
    const { route } = trekToCombinedRoute(trek)
    setRouteViewRequest((prev) => ({ id: (prev?.id ?? 0) + 1, route }))
  }, [])

  const handleSelectTrekStage = useCallback(
    (day: number | null) => {
      setSelectedTrekStageDay(day)
      setHoveredRouteProgress(null)
      if (!activeTrek || day === null) return
      const stage = activeTrek.stages.find((s) => s.day === day)
      if (!stage) return
      setMode('aerial')
      setRouteViewRequest((prev) => ({
        id: (prev?.id ?? 0) + 1,
        route: stageToRoute(activeTrek, stage),
      }))
    },
    [activeTrek],
  )

  const handleViewFullTrek = useCallback((trek: Trek) => {
    const { route } = trekToCombinedRoute(trek)
    setMode('aerial')
    setRouteViewRequest((prev) => ({ id: (prev?.id ?? 0) + 1, route }))
  }, [])

  const handleStartBuildingTrek = useCallback(() => {
    setViewedTrek(null)
    setSelectedPeakId(null)
    setSelectedHutId(null)
    setGpxTrack(null)
    setActiveRoute(null)
    setShowHuts(true)
    trekPlanner.startBuilding()
  }, [trekPlanner])

  const handleSaveDraftTrek = useCallback(() => {
    const saved = trekPlanner.saveDraftTrek()
    if (saved) openTrek(saved)
  }, [trekPlanner, openTrek])

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

  /* ---------- GPX Drag & Drop ---------- */

  useEffect(() => {
    if (!gpxNotice) return
    const timer = window.setTimeout(() => setGpxNotice(null), 6000)
    return () => window.clearTimeout(timer)
  }, [gpxNotice])

  const openGpxTrack = useCallback((track: ParsedGpxTrack) => {
    setMenuOpen(false)
    setCompassActive(false)
    setTourActive(false)
    setSelectedPeakId(null)
    setSelectedHutId(null)
    setGpxTrack(track)
    setActiveRoute(track.route)
    setHoveredRouteProgress(null)
    setMode('aerial')
    setRouteViewRequest((prev) => ({ id: (prev?.id ?? 0) + 1, route: track.route }))
  }, [])

  const handleGpxFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.gpx') && !file.type.includes('xml')) {
        setGpxNotice('Por favor, selecciona un archivo con extensión .gpx (Wikiloc, Strava, Garmin, etc.).')
        return
      }
      try {
        const text = await file.text()
        const result = parseGpxText(text, file.name)
        if (!result.ok) {
          setGpxNotice(result.error)
          return
        }
        setGpxNotice(null)
        setGpxHistory((prev) => [result.track, ...prev.filter((t) => t.fileName !== result.track.fileName)])
        openGpxTrack(result.track)
      } catch {
        setGpxNotice('No se pudo leer el archivo GPX. Inténtalo de nuevo.')
      }
    },
    [openGpxTrack],
  )

  const openGpxPicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  useEffect(() => {
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files')

    const onDragEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      dragDepthRef.current += 1
      setIsDraggingGpx(true)
    }
    const onDragOver = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    }
    const onDragLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
      if (dragDepthRef.current === 0) setIsDraggingGpx(false)
    }
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      dragDepthRef.current = 0
      setIsDraggingGpx(false)
      const file = e.dataTransfer?.files?.[0]
      if (file) void handleGpxFile(file)
    }

    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [handleGpxFile])

  /* ---------- Navegación y convivencia de paneles ---------- */

  const toggleMenu = useCallback(() => {
    setMenuOpen((prev) => {
      const next = !prev
      if (next) {
        setSelectedPeakId(null)
        setSelectedHutId(null)
        setGpxTrack(null)
        setViewedTrek(null)
        setSelectedTrekStageDay(null)
        setActiveRoute(null)
        setHoveredRouteProgress(null)
      }
      return next
    })
  }, [])

  const handleExplorerModeChange = useCallback((next: ExplorerMode) => {
    setExplorerMode(next)
    if (next === 'huts') setShowHuts(true)
  }, [])

  const resetAllFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    setHutFilters(DEFAULT_HUT_FILTERS)
  }, [])

  const selectPeak = useCallback(
    (id: string) => {
      const peak = peaksById[id]
      if (trekPlanner.isBuilding && peak) {
        trekPlanner.addStop({
          id: peak.id,
          name: peak.name,
          kind: 'peak',
          lat: peak.coordinates.lat,
          lon: peak.coordinates.lon,
          elevation: peak.elevation,
        })
        return
      }
      setMenuOpen(false)
      setCompassActive(false)
      setTourActive(false)
      setSelectedHutId(null)
      setGpxTrack(null)
      setViewedTrek(null)
      setSelectedTrekStageDay(null)
      setHoveredRouteProgress(null)
      setSelectedPeakId(id)
      setMode('summit')
      setActiveRoute(peak?.routes[0] ?? null)
    },
    [trekPlanner],
  )

  const selectHut = useCallback(
    (id: string) => {
      const hut = hutsById[id]
      if (trekPlanner.isBuilding && hut) {
        trekPlanner.addStop({
          id: hut.id,
          name: hut.name,
          kind: 'hut',
          lat: hut.coordinates.lat,
          lon: hut.coordinates.lon,
          elevation: hut.elevation,
        })
        return
      }
      setMenuOpen(false)
      setCompassActive(false)
      setTourActive(false)
      setSelectedPeakId(null)
      setGpxTrack(null)
      setViewedTrek(null)
      setSelectedTrekStageDay(null)
      setHoveredRouteProgress(null)
      setSelectedHutId(id)
      setShowHuts(true)
      setMode('orbit')
      setActiveRoute(hut?.routes?.[0] ?? null)
    },
    [trekPlanner],
  )

  const handleSelectRoute = useCallback((route: Route) => {
    setActiveRoute(route)
    setHoveredRouteProgress(null)
  }, [])

  const handleViewFullRoute = useCallback((route: Route) => {
    setMenuOpen(false)
    setTourActive(false)
    setActiveRoute(route)
    setMode('aerial')
    setRouteViewRequest((prev) => ({ id: (prev?.id ?? 0) + 1, route }))
  }, [])

  const handleFocusSample = useCallback((sample: ElevationSample) => {
    setTourActive(false)
    setMode('aerial')
    setPointFocusRequest((prev) => ({ id: (prev?.id ?? 0) + 1, point: sample.position.clone() }))
  }, [])

  const back = useCallback(() => {
    if (replayTarget) {
      exitReplay()
      return
    }
    if (compassActive) {
      exitCompassMode()
      return
    }
    setMenuOpen(false)
    setTourActive(false)
    setSelectedPeakId(null)
    setSelectedHutId(null)
    setGpxTrack(null)
    setViewedTrek(null)
    setSelectedTrekStageDay(null)
    setActiveRoute(null)
    setHoveredRouteProgress(null)
    setMode('aerial')
  }, [replayTarget, exitReplay, compassActive, exitCompassMode])

  const goToView = useCallback((view: CameraView) => {
    setMenuOpen(false)
    setTourActive(false)
    setSelectedPeakId(null)
    setSelectedHutId(null)
    setGpxTrack(null)
    setViewedTrek(null)
    setSelectedTrekStageDay(null)
    setActiveRoute(null)
    setHoveredRouteProgress(null)
    setMode('aerial')
    setViewRequest((prev) => ({ id: (prev?.id ?? 0) + 1, view }))
  }, [])

  const toggleTour = useCallback(() => {
    setTourActive((prev) => {
      if (!prev) {
        setSelectedPeakId(null)
        setSelectedHutId(null)
        setGpxTrack(null)
        setActiveRoute(null)
        setHoveredRouteProgress(null)
        setMode('aerial')
      }
      return !prev
    })
  }, [])

  const stopTour = useCallback(() => setTourActive(false), [])

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
      if (e.key === 'Escape') {
        if (menuOpen) setMenuOpen(false)
        else back()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [back, menuOpen])

  useEffect(
    () => () => {
      recorderRef.current?.cancel()
    },
    [],
  )

  const isReplaying = replayTarget !== null
  const isNormalUI = !isReplaying && !compassActive
  const hasDetailOpen = Boolean(selectedPeak || selectedHut || gpxTrack || viewedTrek)

  return (
    <div className="fixed inset-0 m-0 h-screen w-screen overflow-hidden p-0">
      <input
        ref={fileInputRef}
        type="file"
        accept=".gpx,application/gpx+xml,application/xml,text/xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleGpxFile(file)
          e.target.value = ''
        }}
      />

      <Scene
        visiblePeaks={visiblePeaks}
        visibleHuts={visibleHuts}
        selected={selectedPeak}
        selectedHut={selectedHut}
        activeRoute={activeRoute}
        activeTrek={activeTrek}
        selectedTrekStageDay={selectedTrekStageDay}
        hoveredRouteProgress={hoveredRouteProgress}
        onSelectTrekStage={handleSelectTrekStage}
        replayTarget={replayTarget}
        replayRunId={replayRunId}
        compassActive={compassActive}
        compassViewpoint={compassViewpoint}
        gyroEnabled={gyroEnabled}
        mode={mode}
        timeOfDay={timeOfDay}
        seasonMode={seasonMode}
        viewRequest={viewRequest}
        routeViewRequest={routeViewRequest}
        pointFocusRequest={pointFocusRequest}
        showPeaks={showPeaks}
        showHuts={showHuts}
        hasHutFilter={hasHutFilter}
        completedPeakIds={passport.completedPeakIds}
        visitedHutIds={passport.visitedHutIds}
        tourActive={tourActive}
        onTourStop={stopTour}
        onSelectPeak={selectPeak}
        onSelectHut={selectHut}
        onReplayComplete={handleReplayComplete}
        onCanvasReady={(c) => {
          webglCanvasRef.current = c
        }}
        onHeightFieldReady={setHeightField}
      />

      {isNormalUI && (
        <>
          <div className="pointer-events-none fixed inset-x-0 top-0 z-20 h-28 bg-gradient-to-b from-[#050b1c]/75 via-[#050b1c]/25 to-transparent" />

          <Navbar
            menuOpen={menuOpen}
            onToggleMenu={toggleMenu}
            onSelectPeak={selectPeak}
            onSelectHut={selectHut}
            onUploadGpx={openGpxPicker}
            onOpenCompass={openCompassMode}
            hasActiveFilters={hasAnyFilter}
          />

          <MenuDrawer
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            explorerMode={explorerMode}
            onExplorerModeChange={handleExplorerModeChange}
            filters={filters}
            onFiltersChange={setFilters}
            hutFilters={hutFilters}
            onHutFiltersChange={setHutFilters}
            onResetFilters={resetAllFilters}
            peakCount={visiblePeaks.length}
            hutCount={visibleHuts.length}
            timeOfDay={timeOfDay}
            onTimeChange={setTimeOfDay}
            seasonMode={seasonMode}
            onSeasonChange={setSeasonMode}
            showHuts={showHuts}
            onToggleHuts={() => setShowHuts((v) => !v)}
            showPeaks={showPeaks}
            onTogglePeaks={() => setShowPeaks((v) => !v)}
            tourActive={tourActive}
            onToggleTour={toggleTour}
            onOpenCompass={openCompassMode}
            gpxHistory={gpxHistory}
            onUploadGpx={openGpxPicker}
            onOpenGpxTrack={openGpxTrack}
            onReplayGpxTrack={startReplayForGpx}
            passportData={passport.data}
            passportStats={passport.stats}
            onExportPassport={passport.exportPassportJSON}
            onImportPassport={passport.importPassportJSON}
            onSelectPeak={selectPeak}
            onSelectHut={selectHut}
            customTreks={trekPlanner.customTreks}
            isBuildingTrek={trekPlanner.isBuilding}
            draftTrekName={trekPlanner.draftName}
            draftStops={trekPlanner.draftStops}
            draftTrek={trekPlanner.draftTrek}
            onDraftNameChange={trekPlanner.setDraftName}
            onStartBuildingTrek={handleStartBuildingTrek}
            onCancelBuildingTrek={trekPlanner.cancelBuilding}
            onRemoveDraftStop={trekPlanner.removeStop}
            onMoveDraftStop={trekPlanner.moveStop}
            onSaveDraftTrek={handleSaveDraftTrek}
            onDeleteCustomTrek={trekPlanner.deleteCustomTrek}
            onOpenTrek={openTrek}
            onReplayTrek={startReplayForTrek}
          />

          <TrekPanel
            trek={viewedTrek}
            selectedStageDay={selectedTrekStageDay}
            heightField={heightField}
            hoveredProgress={hoveredRouteProgress}
            onSelectStage={handleSelectTrekStage}
            onHoverProgress={setHoveredRouteProgress}
            onFocusSample={handleFocusSample}
            onViewFullTrek={handleViewFullTrek}
            onStartTrekReplay={startReplayForTrek}
            onClose={back}
          />

          {/* Banner compacto cuando el usuario está encadenando paradas en el 3D */}
          {trekPlanner.isBuilding && !menuOpen && (
            <div className="pointer-events-auto fixed left-1/2 top-20 z-30 flex w-[min(92vw,520px)] -translate-x-1/2 items-center justify-between gap-3 rounded-xl border border-sky-300/45 bg-slate-950/85 px-3.5 py-2 font-mono text-[11px] text-sky-100 shadow-2xl backdrop-blur-md">
              <span className="truncate">
                Modo Travesía ({trekPlanner.draftStops.length} paradas) · Pulsa refugios o picos en el 3D
              </span>
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="shrink-0 rounded-lg bg-sky-400 px-2.5 py-1 text-[10px] font-bold text-slate-950"
              >
                Ver / Guardar
              </button>
            </div>
          )}

          <PeakPanel
            peak={selectedPeak}
            mode={mode}
            activeRoute={activeRoute}
            heightField={heightField}
            hoveredProgress={hoveredRouteProgress}
            passportEntry={selectedPeak ? passport.data.completedPeaks[selectedPeak.id] : undefined}
            onToggleCompleted={() => selectedPeak && passport.togglePeakCompleted(selectedPeak.id)}
            onUpdatePassport={(patch) => selectedPeak && passport.updatePeakEntry(selectedPeak.id, patch)}
            onHoverProgress={setHoveredRouteProgress}
            onFocusSample={handleFocusSample}
            onSelectRoute={handleSelectRoute}
            onViewFullRoute={handleViewFullRoute}
            onStartReplay={startReplay}
            onModeChange={setMode}
            onSelectHut={selectHut}
            onBack={back}
          />

          <HutPanel
            hut={selectedHut}
            activeRoute={activeRoute}
            heightField={heightField}
            hoveredProgress={hoveredRouteProgress}
            passportEntry={selectedHut ? passport.data.visitedHuts[selectedHut.id] : undefined}
            onToggleVisited={() => selectedHut && passport.toggleHutVisited(selectedHut.id)}
            onUpdatePassport={(patch) => selectedHut && passport.updateHutEntry(selectedHut.id, patch)}
            onHoverProgress={setHoveredRouteProgress}
            onFocusSample={handleFocusSample}
            onSelectRoute={handleSelectRoute}
            onViewFullRoute={handleViewFullRoute}
            onStartReplay={startReplay}
            onBack={back}
          />

          <GpxPanel
            track={gpxTrack}
            heightField={heightField}
            hoveredProgress={hoveredRouteProgress}
            onHoverProgress={setHoveredRouteProgress}
            onFocusSample={handleFocusSample}
            onViewFullRoute={() => gpxTrack && handleViewFullRoute(gpxTrack.route)}
            onStartReplay={() => gpxTrack && startReplayForGpx(gpxTrack)}
            onUploadAnother={openGpxPicker}
            onClose={back}
          />

          <div
            className={`pointer-events-none fixed bottom-3 left-3 right-3 z-30 flex-col gap-1.5 sm:bottom-5 sm:left-4 sm:right-4 sm:gap-2 lg:flex-row lg:items-end lg:justify-between lg:gap-4 ${
              hasDetailOpen ? 'hidden md:flex' : 'flex'
            }`}
          >
            <MassifBar onGo={goToView} />
            <TelemetryHUD />
          </div>
        </>
      )}

      {isReplaying && (
        <RouteReplayOverlay
          target={replayTarget}
          recording={recording}
          recordedVideo={recordedVideo}
          onReplayAgain={handleReplayAgain}
          onExit={exitReplay}
        />
      )}

      {compassActive && (
        <CompassAROverlay
          viewpoint={compassViewpoint}
          gpsStatus={gpsStatus}
          gyroEnabled={gyroEnabled}
          onSelectViewpoint={(vp) => {
            setCompassViewpoint(vp)
            setGpsStatus(null)
          }}
          onRequestGps={requestUserGps}
          onToggleGyro={() => void toggleGyro()}
          onExit={exitCompassMode}
        />
      )}

      {gpxNotice && (
        <div
          role="alert"
          className="pointer-events-auto fixed left-1/2 top-20 z-50 flex w-[min(92vw,460px)] -translate-x-1/2 items-start justify-between gap-3 rounded-xl border border-amber-300/40 bg-slate-950/90 px-4 py-3 text-xs text-amber-100 shadow-2xl backdrop-blur-md"
        >
          <span className="leading-relaxed">{gpxNotice}</span>
          <button
            type="button"
            onClick={() => setGpxNotice(null)}
            aria-label="Cerrar aviso"
            className="shrink-0 font-mono text-white/60 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {isDraggingGpx && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-6 backdrop-blur-md">
          <div className="flex max-w-lg flex-col items-center rounded-3xl border-2 border-dashed border-amber-300/80 bg-slate-900/75 px-8 py-12 text-center shadow-[0_0_50px_rgba(45,212,191,0.25)]">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400/25 to-amber-300/25 text-3xl">
              📂
            </span>
            <p className="mt-4 font-display text-xl font-semibold tracking-wide text-white sm:text-2xl">
              Suelta tu archivo .GPX aquí
            </p>
            <p className="mt-2 font-sans text-sm text-teal-200/85">
              para proyectar tu ruta real en 3D sobre los Pirineos
            </p>
            <p className="mt-3 font-mono text-[10px] tracking-[0.2em] text-white/45">
              WIKILOC · STRAVA · GARMIN · KOMOOT
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
