import gsap from 'gsap'
import * as THREE from 'three'

export type TimeOfDay = 'dawn' | 'noon' | 'sunset'
export type SeasonMode = 'summer' | 'winter'

export const TIME_ORDER: TimeOfDay[] = ['dawn', 'noon', 'sunset']
export const TIME_LABEL: Record<TimeOfDay, string> = {
  dawn: 'Amanecer',
  noon: 'Mediodía',
  sunset: 'Atardecer',
}

interface Preset {
  /** Azimut del sol en grados, 0 = norte, sentido horario. */
  az: number
  /** Elevación del sol sobre el horizonte, en grados. */
  el: number
  /** Color de la luz solar (componentes de pantalla 0-1). */
  sun: [number, number, number]
  /** Color de bruma/horizonte (hex sRGB). */
  haze: string
  ambient: number
  rayleigh: number
  turbidity: number
}

export const PRESETS: Record<TimeOfDay, Preset> = {
  dawn: { az: 55, el: 14, sun: [1.0, 0.8, 0.62], haze: '#d3c6cc', ambient: 1.0, rayleigh: 2.0, turbidity: 6 },
  noon: { az: 180, el: 52, sun: [1.0, 0.96, 0.88], haze: '#b8cde0', ambient: 1.15, rayleigh: 1.2, turbidity: 4 },
  sunset: { az: 262, el: 7, sun: [1.0, 0.54, 0.26], haze: '#e6b996', ambient: 0.9, rayleigh: 3.0, turbidity: 10 },
}

/** Dirección unitaria hacia el sol (+X este, -Z norte). */
export function sunDirection(azDeg: number, elDeg: number, out = new THREE.Vector3()): THREE.Vector3 {
  const az = THREE.MathUtils.degToRad(azDeg)
  const el = THREE.MathUtils.degToRad(elDeg)
  return out.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el))
}

const hexToDisplay = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

function targets(t: TimeOfDay) {
  const p = PRESETS[t]
  const haze = hexToDisplay(p.haze)
  const i = TIME_ORDER.indexOf(t)
  return {
    az: p.az,
    el: p.el,
    sunR: p.sun[0],
    sunG: p.sun[1],
    sunB: p.sun[2],
    hazeR: haze[0],
    hazeG: haze[1],
    hazeB: haze[2],
    ambient: p.ambient,
    rayleigh: p.rayleigh,
    turbidity: p.turbidity,
    /** Pesos de los tres mapas de sombras precalculados (amanecer, mediodía, atardecer). */
    w0: i === 0 ? 1 : 0,
    w1: i === 1 ? 1 : 0,
    w2: i === 2 ? 1 : 0,
  }
}

/**
 * Estado atmosférico compartido (mutable a propósito: GSAP lo anima y los
 * componentes lo leen cada frame sin provocar renders de React).
 */
export const atmosphere = {
  ...targets('dawn'),
  /** Cota de nieve en metros (Verano ~2750 m, Invierno ~1450 m). */
  snowLine: 2750,
  /** Factor estacional 0 = Verano Alpino, 1 = Invierno / Nieve. */
  winterFactor: 0,
}

let current: TimeOfDay = 'dawn'
let timeline: gsap.core.Timeline | null = null
let seasonTween: gsap.core.Tween | null = null

/** Anima suavemente la cota de nieve y el ambiente estacional (Verano ↔ Invierno). */
export function setSeasonMode(season: SeasonMode) {
  seasonTween?.kill()
  const isWinter = season === 'winter'
  seasonTween = gsap.to(atmosphere, {
    snowLine: isWinter ? 1450 : 2750,
    winterFactor: isWinter ? 1 : 0,
    duration: 1.8,
    ease: 'power2.inOut',
  })
}

/** Anima suavemente el sol y la atmósfera; amanecer ↔ atardecer pasa por el mediodía. */
export function setTimeOfDay(next: TimeOfDay) {
  timeline?.kill()
  const from = TIME_ORDER.indexOf(current)
  const to = TIME_ORDER.indexOf(next)
  const path: number[] = []
  if (from === to) path.push(to)
  else {
    const step = from < to ? 1 : -1
    for (let i = from + step; i !== to + step; i += step) path.push(i)
  }
  const tl = gsap.timeline()
  for (const idx of path) {
    tl.to(atmosphere, { ...targets(TIME_ORDER[idx]), duration: 1.5, ease: 'sine.inOut' })
  }
  timeline = tl
  current = next
}
