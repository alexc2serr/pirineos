import { useEffect, useRef, type ComponentRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import gsap from 'gsap'
import * as THREE from 'three'
import { elevationToWorldY, worldToLatLon, worldYToElevation, type Hut, type Peak, type Route } from '../data/pyrenees'
import { NAV_BOUNDS, getPeakTop, summitEyeY, type HeightField } from '../lib/heightField'
import { getPlacedHuts } from '../lib/huts'
import { computeRouteOverviewCamera } from '../lib/routes'
import { telemetry } from '../lib/telemetry'
import {
  AERIAL_VIEW,
  INITIAL_VIEW,
  ORBIT_OFFSET,
  TOUR_WAYPOINTS,
  type CameraView,
  type ViewMode,
} from '../lib/views'

type Controls = ComponentRef<typeof OrbitControls>
type LimitProfile = ViewMode | 'free'

/** Distancia (km) entre la cámara y el punto que mira en Modo Cumbre. */
const SUMMIT_LOOK_DISTANCE = 0.002

const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'])

export interface ViewRequest {
  /** Cambia con cada petición para poder repetir el mismo destino. */
  id: number
  view: CameraView
}

export interface RouteViewRequest {
  id: number
  route: Route
}

const HUT_ORBIT_OFFSET = new THREE.Vector3(2.2, elevationToWorldY(900), -2.2)

interface CameraRigProps {
  selected: Peak | null
  selectedHut: Hut | null
  mode: ViewMode
  heightField: HeightField | null
  viewRequest: ViewRequest | null
  routeViewRequest: RouteViewRequest | null
  tourActive: boolean
  replayActive: boolean
  onTourStop: () => void
}

export function CameraRig({
  selected,
  selectedHut,
  mode,
  heightField,
  viewRequest,
  routeViewRequest,
  tourActive,
  replayActive,
  onTourStop,
}: CameraRigProps) {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const controlsRef = useRef<Controls>(null)
  const tweenRef = useRef<gsap.core.Tween | null>(null)
  const firstRun = useRef(true)
  const modeRef = useRef<ViewMode>(mode)
  const flyingRef = useRef(false)
  const tourRef = useRef(false)
  const replayRef = useRef(replayActive)
  replayRef.current = replayActive
  const keys = useRef(new Set<string>())
  const shiftRef = useRef(false)
  const velocity = useRef(new THREE.Vector3())
  const scratch = useRef({
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    desired: new THREE.Vector3(),
    dir: new THREE.Vector3(),
  })
  modeRef.current = mode

  const applyLimits = (profile: LimitProfile) => {
    const c = controlsRef.current
    if (!c) return
    c.enableDamping = true
    c.dampingFactor = 0.08
    c.enableRotate = true
    c.screenSpacePanning = false // el desplazamiento es horizontal, a lo largo del terreno
    switch (profile) {
      case 'free':
        c.minDistance = 0
        c.maxDistance = Infinity
        c.minPolarAngle = 0
        c.maxPolarAngle = Math.PI
        c.enableZoom = false
        c.enablePan = false
        break
      case 'aerial':
        c.minDistance = 1
        c.maxDistance = 140
        c.minPolarAngle = 0.05
        c.maxPolarAngle = Math.PI * 0.495
        c.enableZoom = true
        c.enablePan = true
        c.rotateSpeed = 0.6
        c.panSpeed = 1.1
        break
      case 'orbit':
        c.minDistance = 0.8
        c.maxDistance = 45
        c.minPolarAngle = 0.05
        c.maxPolarAngle = Math.PI * 0.495
        c.enableZoom = true
        c.enablePan = false
        c.rotateSpeed = 0.6
        break
      case 'summit':
        c.minDistance = SUMMIT_LOOK_DISTANCE
        c.maxDistance = SUMMIT_LOOK_DISTANCE
        c.minPolarAngle = Math.PI * 0.12
        c.maxPolarAngle = Math.PI * 0.88
        c.enableZoom = false
        c.enablePan = false
        c.rotateSpeed = 0.35
        break
    }
  }

  /** Vuelo suave con arco: la cámara sube a mitad del recorrido para sobrevolar las crestas. */
  const flyTo = (toPos: THREE.Vector3, toTarget: THREE.Vector3, finalProfile: ViewMode) => {
    const c = controlsRef.current
    if (!c) return
    tweenRef.current?.kill()
    tourRef.current = false

    const fromPos = camera.position.clone()
    const fromTarget = c.target.clone()
    const dist = fromPos.distanceTo(toPos)
    const lift = Math.max(1.2, dist * 0.22)
    const state = { t: 0 }

    flyingRef.current = true
    velocity.current.set(0, 0, 0)
    c.enabled = false
    applyLimits('free')

    tweenRef.current = gsap.to(state, {
      t: 1,
      duration: THREE.MathUtils.clamp(1.6 + dist * 0.025, 2.2, 5.5),
      ease: 'power3.inOut',
      onUpdate: () => {
        camera.position.lerpVectors(fromPos, toPos, state.t)
        camera.position.y += Math.sin(Math.PI * state.t) * lift
        c.target.lerpVectors(fromTarget, toTarget, state.t)
        c.update()
      },
      onComplete: () => {
        camera.position.copy(toPos)
        c.target.copy(toTarget)
        applyLimits(finalProfile)
        c.enabled = true
        c.update()
        flyingRef.current = false
      },
    })
  }

  // Pausa controles durante el modo vídeo Relive Cozy para que HikerAnimation3D controle la cámara
  useEffect(() => {
    const c = controlsRef.current
    if (!c) return
    if (replayActive) {
      tweenRef.current?.kill()
      flyingRef.current = false
      tourRef.current = false
      velocity.current.set(0, 0, 0)
      c.enabled = false
    } else {
      applyLimits(modeRef.current)
      c.enabled = true
      c.update()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayActive])

  useEffect(() => {
    const c = controlsRef.current
    if (!c || replayActive) return

    if (!selected && !selectedHut) {
      if (firstRun.current) {
        // Estado inicial: la cámara ya está en la vista helicóptero
        firstRun.current = false
        applyLimits('aerial')
        return
      }
      if (!tourActive) flyTo(AERIAL_VIEW.position, AERIAL_VIEW.target, 'aerial')
      return
    }
    firstRun.current = false

    if (selectedHut && heightField) {
      const placed = getPlacedHuts(heightField).get(selectedHut.id)
      if (placed) {
        flyTo(placed.position.clone().add(HUT_ORBIT_OFFSET), placed.position, 'orbit')
      }
      return
    }

    if (!selected) return

    const top = getPeakTop(selected, heightField)
    if (mode === 'summit') {
      const eye = top.clone().setY(top.y + summitEyeY())
      // Mirada inicial: hacia el centro de la cordillera (o al norte si ya estamos en él)
      const heading = new THREE.Vector3(-eye.x, 0, -eye.z)
      if (heading.lengthSq() < 400) heading.set(0, 0, -1)
      heading.normalize()
      const target = eye.clone().addScaledVector(heading, SUMMIT_LOOK_DISTANCE)
      flyTo(eye, target, 'summit')
    } else {
      flyTo(top.clone().add(ORBIT_OFFSET), top, 'orbit')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, selectedHut, mode, heightField])

  // Vuelo a un macizo desde la barra inferior (declarado tras el efecto anterior: prevalece)
  useEffect(() => {
    if (!viewRequest) return
    firstRun.current = false
    flyTo(viewRequest.view.position, viewRequest.view.target, 'aerial')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewRequest])

  // Encuadre panorámico completo de la ruta activa ("Ver Ruta Completa")
  useEffect(() => {
    if (!routeViewRequest || !heightField) return
    firstRun.current = false
    const overview = computeRouteOverviewCamera(routeViewRequest.route, heightField)
    if (overview) {
      flyTo(overview.position, overview.target, 'aerial')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeViewRequest, heightField])

  // Tour cinematográfico oeste → este; cualquier interacción devuelve el control manual
  useEffect(() => {
    const c = controlsRef.current
    if (!tourActive) {
      if (tourRef.current) {
        tweenRef.current?.kill()
        tourRef.current = false
        flyingRef.current = false
        if (c) {
          applyLimits('aerial')
          c.enabled = true
          c.update()
        }
      }
      return
    }
    if (!c) return

    firstRun.current = false
    tweenRef.current?.kill()
    tourRef.current = true
    flyingRef.current = true
    velocity.current.set(0, 0, 0)
    c.enabled = false
    applyLimits('free')

    const posCurve = new THREE.CatmullRomCurve3(
      [camera.position.clone(), ...TOUR_WAYPOINTS.map((w) => w.position.clone())],
      false,
      'centripetal',
    )
    const targetCurve = new THREE.CatmullRomCurve3(
      [c.target.clone(), ...TOUR_WAYPOINTS.map((w) => w.target.clone())],
      false,
      'centripetal',
    )
    const state = { t: 0 }

    const stopTour = () => {
      if (!tourRef.current) return
      tweenRef.current?.kill()
      tourRef.current = false
      flyingRef.current = false
      applyLimits('aerial')
      c.enabled = true
      c.update()
      onTourStop()
    }

    tweenRef.current = gsap.to(state, {
      t: 1,
      duration: 46,
      ease: 'sine.inOut',
      onUpdate: () => {
        posCurve.getPointAt(state.t, camera.position)
        targetCurve.getPointAt(state.t, c.target)
        c.update()
      },
      onComplete: stopTour,
    })

    const dom = gl.domElement
    dom.addEventListener('pointerdown', stopTour)
    dom.addEventListener('wheel', stopTour, { passive: true })
    window.addEventListener('keydown', stopTour)
    return () => {
      dom.removeEventListener('pointerdown', stopTour)
      dom.removeEventListener('wheel', stopTour)
      window.removeEventListener('keydown', stopTour)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourActive])

  useEffect(() => () => void tweenRef.current?.kill(), [])

  // Teclado: WASD / flechas para volar en el Modo Aéreo
  useEffect(() => {
    const isTyping = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
    }
    const down = (e: KeyboardEvent) => {
      shiftRef.current = e.shiftKey
      if (isTyping(e) || e.ctrlKey || e.metaKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (MOVE_KEYS.has(k)) {
        keys.current.add(k)
        e.preventDefault()
      }
    }
    const up = (e: KeyboardEvent) => {
      shiftRef.current = e.shiftKey
      keys.current.delete(e.key.toLowerCase())
    }
    const clear = () => keys.current.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
    }
  }, [])

  useFrame((_, dt) => {
    const c = controlsRef.current
    if (!c || replayRef.current) return
    const p = camera.position
    const summit = modeRef.current === 'summit' && !flyingRef.current

    // Vuelo con teclado (solo Modo Aéreo)
    const { forward, right, desired, dir } = scratch.current
    desired.set(0, 0, 0)
    if (modeRef.current === 'aerial' && !flyingRef.current) {
      const k = keys.current
      const fwd = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0)
      const side = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0)
      if (fwd !== 0 || side !== 0) {
        camera.getWorldDirection(forward)
        forward.y = 0
        if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1)
        forward.normalize()
        right.set(-forward.z, 0, forward.x)
        const speed =
          THREE.MathUtils.clamp(p.distanceTo(c.target) * 0.4, 2, 45) * (shiftRef.current ? 2.5 : 1)
        desired.addScaledVector(forward, fwd).addScaledVector(right, side)
        if (desired.lengthSq() > 0) desired.normalize().multiplyScalar(speed)
      }
    }
    velocity.current.lerp(desired, 1 - Math.exp(-dt * 6))
    if (velocity.current.lengthSq() > 1e-5) {
      const dx = velocity.current.x * dt
      const dz = velocity.current.z * dt
      p.x += dx
      p.z += dz
      c.target.x += dx
      c.target.z += dz
    }

    // Límites de navegación y colisión con el suelo
    if (!summit && !tourRef.current) {
      p.x = THREE.MathUtils.clamp(p.x, NAV_BOUNDS.minX, NAV_BOUNDS.maxX)
      p.z = THREE.MathUtils.clamp(p.z, NAV_BOUNDS.minZ, NAV_BOUNDS.maxZ)
      c.target.x = THREE.MathUtils.clamp(c.target.x, NAV_BOUNDS.minX, NAV_BOUNDS.maxX)
      c.target.z = THREE.MathUtils.clamp(c.target.z, NAV_BOUNDS.minZ, NAV_BOUNDS.maxZ)
    }
    if (heightField) {
      const floor = heightField.sampleWorld(p.x, p.z) + (summit ? 0.015 : 0.12)
      if (p.y < floor) p.y = floor
    }

    // Telemetría en tiempo real (sin disparar re-renders)
    telemetry.altitudeM = worldYToElevation(p.y)
    const gps = worldToLatLon(c.target.x, c.target.z)
    telemetry.lat = gps.lat
    telemetry.lon = gps.lon
    camera.getWorldDirection(dir)
    telemetry.headingDeg = (THREE.MathUtils.radToDeg(Math.atan2(dir.x, -dir.z)) + 360) % 360
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      target={INITIAL_VIEW.target.toArray()}
      enableDamping
      screenSpacePanning={false}
      mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
      touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
    />
  )
}
