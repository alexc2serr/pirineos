import * as THREE from 'three'
import { elevationToWorldY, latLonToWorld } from '../data/pyrenees'

export type ViewMode = 'aerial' | 'orbit' | 'summit'

export interface CameraView {
  position: THREE.Vector3
  target: THREE.Vector3
}

/** Vista helicóptero inicial: valle de Luchon, mirando al suroeste hacia Maladeta / Aneto. */
export const INITIAL_VIEW: CameraView = {
  position: latLonToWorld(42.8, 0.8, 2800),
  target: latLonToWorld(42.64, 0.55, 3000),
}

/** Vista Aérea de Cordillera: elevada, sobre el centro de la cadena. */
export const AERIAL_VIEW: CameraView = {
  position: latLonToWorld(42.3, 1.0, 8000),
  target: latLonToWorld(42.68, 0.4, 2000),
}

export const ORBIT_OFFSET = new THREE.Vector3(3.4, elevationToWorldY(1500), -3.4)

export interface MassifView {
  id: string
  label: string
  sub: string
  view: CameraView
}

/** Accesos rápidos de la barra inferior (cámara en el lado iluminado, mirando al macizo). */
export const MASSIF_VIEWS: MassifView[] = [
  {
    id: 'west',
    label: 'Pirineo Occidental',
    sub: "Balaitús · Midi d'Ossau",
    view: { position: latLonToWorld(42.97, -0.2, 3600), target: latLonToWorld(42.84, -0.36, 2400) },
  },
  {
    id: 'ordesa',
    label: 'Ordesa y Monte Perdido',
    sub: 'Monte Perdido · Taillón',
    view: { position: latLonToWorld(42.82, 0.2, 3800), target: latLonToWorld(42.68, 0.03, 2800) },
  },
  {
    id: 'maladeta',
    label: 'Macizo de la Maladeta',
    sub: 'Aneto · Posets',
    view: { position: latLonToWorld(42.78, 0.78, 3800), target: latLonToWorld(42.64, 0.64, 3000) },
  },
  {
    id: 'east',
    label: 'Pirineo Oriental',
    sub: "Pica d'Estats · Canigó",
    view: { position: latLonToWorld(43.0, 2.3, 7000), target: latLonToWorld(42.58, 1.7, 1800) },
  },
]

/** Recorrido cinematográfico oeste → este sobre los grandes macizos pirenaicos. */
export const TOUR_WAYPOINTS: CameraView[] = [
  { position: latLonToWorld(42.98, -0.58, 3900), target: latLonToWorld(42.84, -0.38, 2500) },
  { position: latLonToWorld(42.91, -0.18, 4100), target: latLonToWorld(42.77, -0.14, 2900) },
  { position: latLonToWorld(42.82, 0.14, 4100), target: latLonToWorld(42.67, 0.03, 3000) },
  { position: latLonToWorld(42.8, 0.48, 4200), target: latLonToWorld(42.65, 0.44, 3000) },
  { position: latLonToWorld(42.78, 0.82, 4300), target: latLonToWorld(42.63, 0.65, 3100) },
  { position: latLonToWorld(42.81, 1.35, 4200), target: latLonToWorld(42.66, 1.39, 2800) },
  { position: latLonToWorld(42.72, 2.25, 4200), target: latLonToWorld(42.5, 2.38, 2400) },
]
