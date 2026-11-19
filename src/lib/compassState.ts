export interface CompassViewpoint {
  id: string
  name: string
  lat: number
  lon: number
  note: string
}

/** Miradores emblemáticos de los Pirineos para observación 360º (fallback si no hay GPS o fuera de rango). */
export const COMPASS_VIEWPOINTS: CompassViewpoint[] = [
  {
    id: 'portalet',
    name: 'Col du Pourtalet (Portalet)',
    lat: 42.8058,
    lon: -0.4186,
    note: 'Frontera Valle de Tena / Ossau · vistas al Midi d\'Ossau y Anayet',
  },
  {
    id: 'mirador-ordesa',
    name: 'Mirador de Ordesa (Calcilarruego)',
    lat: 42.6365,
    lon: -0.0492,
    note: 'Sobre la Pradera de Ordesa · vistas a Monte Perdido, Taillón y Brecha',
  },
  {
    id: 'balcon-pineta',
    name: 'Balcón de Pineta',
    lat: 42.6922,
    lon: 0.0445,
    note: 'Circo de Pineta · cara norte de Monte Perdido y Astazou',
  },
  {
    id: 'aneto',
    name: 'Cumbre del Aneto',
    lat: 42.6311,
    lon: 0.6567,
    note: 'Techo de los Pirineos (3.404 m) · panorámica 360º completa',
  },
  {
    id: 'refugio-estiva',
    name: 'Refugio de La Estiva',
    lat: 42.6815,
    lon: 0.1255,
    note: 'Valle de Pineta · vistas a La Munia, Monte Perdido y Suelza',
  },
  {
    id: 'pic-midi-bigorre',
    name: 'Pic du Midi de Bigorre',
    lat: 42.9367,
    lon: 0.1428,
    note: 'Observatorio (2.877 m) · vertiente francesa de oeste a este',
  },
]

/** Estado mutable compartido a 60 FPS entre CompassARScene (WebGL) y CompassAROverlay (HUD). */
export const compassTelemetry = {
  headingDeg: 180,
  pitchDeg: 0,
  observerEleM: 2000,
  centerPeakName: '',
  centerPeakEle: 0,
  centerPeakDistKm: 0,
}
