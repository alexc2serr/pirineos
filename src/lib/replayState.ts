import type { Route } from '../data/pyrenees'

export type ReplayPhase = 'idle' | 'hiking' | 'celebrating' | 'done'

export interface ReplayTarget {
  id: string
  name: string
  elevation: number
  massif: string
  kind: 'peak' | 'hut'
  route: Route
  originLabel: string
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
  /** Progreso de la celebración en cima 0..1 */
  celebrationT: 0,
}

export function resetReplayState() {
  replayState.active = false
  replayState.phase = 'idle'
  replayState.progress = 0
  replayState.currentAltitudeM = 0
  replayState.currentDistanceKm = 0
  replayState.celebrationT = 0
}
