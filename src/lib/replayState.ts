import type { Route } from '../data/pyrenees'

export type ReplayPhase = 'idle' | 'hiking' | 'celebrating' | 'done'

export interface ReplayTarget {
  id: string
  name: string
  elevation: number
  massif: string
  kind: 'peak' | 'hut' | 'trek'
  route: Route
  originLabel: string
  /** Etiquetas de etapas para travesías multi-etapa (progreso 0..1 -> "Día 1 · ...") */
  stageMarkers?: { startProgress: number; label: string }[]
}

/** Estado mutable compartido a 60 FPS entre HikerAnimation3D, RouteReplayOverlay y CozyVideoRecorder. */
export const replayState = {
  active: false,
  phase: 'idle' as ReplayPhase,
  /** Progreso de caminata 0..1 */
  progress: 0,
  /** Altitud actual del montañero en metros */
  currentAltitudeM: 0,
  /** Distancia recorrida en km */
  currentDistanceKm: 0,
  /** Etiqueta de etapa activa si es una travesía multi-etapa */
  currentStageLabel: '',
  /** Progreso de la celebración en cima 0..1 */
  celebrationT: 0,
}

export function resetReplayState() {
  replayState.active = false
  replayState.phase = 'idle'
  replayState.progress = 0
  replayState.currentAltitudeM = 0
  replayState.currentDistanceKm = 0
  replayState.currentStageLabel = ''
  replayState.celebrationT = 0
}
