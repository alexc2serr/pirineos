import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { worldYToElevation } from '../data/pyrenees'
import type { HeightField } from '../lib/heightField'
import { replayState, type ReplayTarget } from '../lib/replayState'
import { buildRoutePoints } from '../lib/routes'

const HIKING_DURATION_S = 11.0
const CELEBRATION_DURATION_S = 3.2

interface HikerAnimation3DProps {
  target: ReplayTarget
  heightField: HeightField
  runId: number
  onComplete: () => void
}

/**
 * Montañero 3D estilizado ("monigote cozy") que recorre la ruta activa paso a paso,
 * ilumina la estela en dorado detrás de sí y es seguido por una cámara dron cinematográfica.
 */
export function HikerAnimation3D({ target, heightField, runId, onComplete }: HikerAnimation3DProps) {
  const camera = useThree((s) => s.camera)

  const hikerRef = useRef<THREE.Group>(null)
  const leftLegRef = useRef<THREE.Mesh>(null)
  const rightLegRef = useRef<THREE.Mesh>(null)
  const leftArmRef = useRef<THREE.Group>(null)
  const rightArmRef = useRef<THREE.Group>(null)

  const elapsedRef = useRef(0)
  const completedRef = useRef(false)
  const orbitAngleRef = useRef(0)
  const lookTargetRef = useRef(new THREE.Vector3())
  const scratch = useRef({
    pos: new THREE.Vector3(),
    ahead: new THREE.Vector3(),
    tangent: new THREE.Vector3(),
    side: new THREE.Vector3(),
    desiredCam: new THREE.Vector3(),
    desiredLook: new THREE.Vector3(),
  })

  // Construye la curva 3D adherida al relieve real y la geometría de estela dorada
  const { points, curve, trailGeo, trailHaloGeo, totalIndexCount } = useMemo(() => {
    const pts = buildRoutePoints(target.route, heightField)
    if (pts.length < 2) {
      return {
        points: [] as THREE.Vector3[],
        curve: null,
        trailGeo: null,
        trailHaloGeo: null,
        totalIndexCount: 0,
      }
    }
    const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal')
    const main = new THREE.TubeGeometry(c, 180, 0.022, 6, false)
    const halo = new THREE.TubeGeometry(c, 180, 0.036, 6, false)
    const count = main.index ? main.index.count : 0
    main.setDrawRange(0, 0)
    halo.setDrawRange(0, 0)
    return {
      points: pts,
      curve: c,
      trailGeo: main,
      trailHaloGeo: halo,
      totalIndexCount: count,
    }
  }, [target.route, heightField])

  useEffect(
    () => () => {
      trailGeo?.dispose()
      trailHaloGeo?.dispose()
    },
    [trailGeo, trailHaloGeo],
  )

  // Inicializa posición de cámara y estado compartido al arrancar (o reiniciar) la animación
  useEffect(() => {
    if (!curve || points.length < 2) return
    elapsedRef.current = 0
    completedRef.current = false

    const start = points[0]
    const tangent = curve.getTangentAt(0.01).setY(0)
    if (tangent.lengthSq() < 1e-6) tangent.set(0, 0, -1)
    tangent.normalize()
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x)

    const initCam = start
      .clone()
      .addScaledVector(tangent, -1.9)
      .addScaledVector(side, 0.95)
    initCam.y = Math.max(start.y + 1.05, heightField.sampleWorld(initCam.x, initCam.z) + 0.55)
    camera.position.copy(initCam)
    lookTargetRef.current.copy(start).setY(start.y + 0.14)
    camera.lookAt(lookTargetRef.current)

    replayState.active = true
    replayState.phase = 'hiking'
    replayState.progress = 0
    replayState.currentAltitudeM = worldYToElevation(start.y)
    replayState.currentDistanceKm = 0
    replayState.celebrationT = 0
  }, [curve, points, heightField, camera, runId])

  useFrame((_, rawDt) => {
    if (!curve || !hikerRef.current || points.length < 2) return
    const dt = Math.min(rawDt, 0.05)
    elapsedRef.current += dt

    const { pos, ahead, tangent, side, desiredCam, desiredLook } = scratch.current
    const t = elapsedRef.current

    if (t < HIKING_DURATION_S) {
      // Suavizado sutil en el arranque y la llegada a cumbre
      const linear = Math.min(1, t / HIKING_DURATION_S)
      const progress = linear < 0.08
        ? (linear / 0.08) * (linear / 0.08) * 0.08
        : linear > 0.92
          ? 1 - ((1 - linear) / 0.08) * ((1 - linear) / 0.08) * 0.08
          : linear

      curve.getPointAt(progress, pos)
      const groundY = heightField.sampleWorld(pos.x, pos.z) + 0.045
      pos.y = Math.max(pos.y, groundY)

      // Balanceo rítmico de caminata
      const walkCycle = t * 11
      const bob = Math.abs(Math.sin(walkCycle)) * 0.028
      hikerRef.current.position.set(pos.x, pos.y + bob, pos.z)

      // Orientación tangente a la ruta
      curve.getPointAt(Math.min(1, progress + 0.015), ahead)
      ahead.y = hikerRef.current.position.y
      if (ahead.distanceToSquared(hikerRef.current.position) > 1e-6) {
        hikerRef.current.lookAt(ahead)
      }

      // Movimiento alterno de piernas y bastones
      const swing = Math.sin(walkCycle) * 0.45
      if (leftLegRef.current) leftLegRef.current.rotation.x = swing
      if (rightLegRef.current) rightLegRef.current.rotation.x = -swing
      if (leftArmRef.current) leftArmRef.current.rotation.x = -swing * 0.85
      if (rightArmRef.current) rightArmRef.current.rotation.x = swing * 0.85

      // Ilumina la estela recorrida detrás del montañero
      const drawCount = Math.floor(progress * totalIndexCount)
      trailGeo?.setDrawRange(0, drawCount)
      trailHaloGeo?.setDrawRange(0, drawCount)

      // Cámara dron de seguimiento suave
      curve.getTangentAt(progress, tangent)
      tangent.y = 0
      if (tangent.lengthSq() < 1e-6) tangent.set(0, 0, -1)
      tangent.normalize()
      side.set(-tangent.z, 0, tangent.x)

      desiredCam
        .copy(pos)
        .addScaledVector(tangent, -2.0)
        .addScaledVector(side, 0.95)
      desiredCam.y = Math.max(pos.y + 1.1, heightField.sampleWorld(desiredCam.x, desiredCam.z) + 0.55)

      desiredLook.copy(pos).addScaledVector(tangent, 0.55)
      desiredLook.y += 0.12

      const smooth = 1 - Math.exp(-dt * 4.2)
      camera.position.lerp(desiredCam, smooth)
      lookTargetRef.current.lerp(desiredLook, smooth)
      camera.lookAt(lookTargetRef.current)

      // Guardar ángulo inicial para la órbita final de celebración
      orbitAngleRef.current = Math.atan2(camera.position.x - pos.x, camera.position.z - pos.z)

      // Actualizar telemetría en vivo
      replayState.phase = 'hiking'
      replayState.progress = progress
      replayState.currentAltitudeM = worldYToElevation(pos.y - 0.045)
      replayState.currentDistanceKm = progress * target.route.distanceKm
      replayState.celebrationT = 0
    } else {
      // Celebración en la cima + giro orbital suave
      const celElapsed = t - HIKING_DURATION_S
      const celT = Math.min(1, celElapsed / CELEBRATION_DURATION_S)
      const summit = points[points.length - 1]
      const summitY = Math.max(summit.y, heightField.sampleWorld(summit.x, summit.z) + 0.045)

      // Estela 100% iluminada
      trailGeo?.setDrawRange(0, totalIndexCount)
      trailHaloGeo?.setDrawRange(0, totalIndexCount)

      // Pequeño salto de alegría expresivo y bien visible en la cumbre
      const jump = Math.abs(Math.sin(celElapsed * Math.PI * 2.4)) * 0.2
      hikerRef.current.position.set(summit.x, summitY + jump, summit.z)
      hikerRef.current.rotation.y += dt * 1.35

      // Brazos arriba agitando los bastones de celebración
      const cheer = Math.sin(celElapsed * Math.PI * 4.8) * 0.32
      if (leftLegRef.current) leftLegRef.current.rotation.x = jump * 1.8
      if (rightLegRef.current) rightLegRef.current.rotation.x = -jump * 1.8
      if (leftArmRef.current) leftArmRef.current.rotation.x = -2.45 + cheer
      if (rightArmRef.current) rightArmRef.current.rotation.x = -2.45 - cheer

      // Plano cercano y rasante en la cima: encuadra al montañero saltando y el horizonte de picos detrás
      orbitAngleRef.current += dt * 0.42
      const radius = 0.88
      desiredCam.set(
        summit.x + Math.sin(orbitAngleRef.current) * radius,
        summitY + 0.3,
        summit.z + Math.cos(orbitAngleRef.current) * radius,
      )
      desiredCam.y = Math.max(desiredCam.y, heightField.sampleWorld(desiredCam.x, desiredCam.z) + 0.18)
      desiredLook.set(summit.x, summitY + 0.28, summit.z)

      const smooth = 1 - Math.exp(-dt * 4.0)
      camera.position.lerp(desiredCam, smooth)
      lookTargetRef.current.lerp(desiredLook, smooth)
      camera.lookAt(lookTargetRef.current)

      replayState.progress = 1
      replayState.currentAltitudeM = target.elevation
      replayState.currentDistanceKm = target.route.distanceKm
      replayState.celebrationT = celT

      if (celT >= 1 && !completedRef.current) {
        completedRef.current = true
        replayState.phase = 'done'
        onComplete()
      } else if (!completedRef.current) {
        replayState.phase = 'celebrating'
      }
    }
  })

  if (points.length < 2 || !trailGeo || !trailHaloGeo) return null

  return (
    <group>
      {/* Iluminación cálida cozy local para que el personaje tenga volumen y colores vivos */}
      <hemisphereLight args={['#fff4db', '#334155', 1.15]} />
      <directionalLight position={[60, 80, 40]} intensity={1.6} color="#ffe7ba" />

      {/* Ruta pendiente (tenue y elegante) */}
      <Line points={points} color="#0f172a" lineWidth={6} transparent opacity={0.45} />
      <Line points={points} color="#e2e8f0" lineWidth={2.5} transparent opacity={0.5} dashed dashSize={0.14} gapSize={0.18} />

      {/* Estela dorada recorrida detrás del montañero */}
      <mesh geometry={trailHaloGeo} renderOrder={2}>
        <meshBasicMaterial color="#020617" transparent opacity={0.65} />
      </mesh>
      <mesh geometry={trailGeo} renderOrder={3}>
        <meshBasicMaterial color="#fbbf24" />
      </mesh>

      {/* Monigote Montañero Cozy */}
      <group ref={hikerRef} scale={0.22}>
        {/* Aura cálida en el suelo bajo sus pies */}
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
          <circleGeometry args={[0.58, 24]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.35} depthWrite={false} />
        </mesh>
        <pointLight position={[0, 0.5, 0]} color="#fbbf24" intensity={2.2} distance={3.5} />

        {/* Piernas / botas */}
        <mesh ref={leftLegRef} position={[-0.14, 0.22, 0]}>
          <capsuleGeometry args={[0.085, 0.22, 6, 10]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
        <mesh ref={rightLegRef} position={[0.14, 0.22, 0]}>
          <capsuleGeometry args={[0.085, 0.22, 6, 10]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>

        {/* Chaqueta alpina cálida (naranja/mostaza) */}
        <mesh position={[0, 0.62, 0]}>
          <capsuleGeometry args={[0.24, 0.34, 8, 14]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.55} />
        </mesh>

        {/* Bufanda / cuello crema */}
        <mesh position={[0, 0.9, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.18, 0.065, 8, 16]} />
          <meshStandardMaterial color="#fef3c7" roughness={0.9} />
        </mesh>

        {/* Mochila de trekking a la espalda (-Z) */}
        <group position={[0, 0.68, -0.26]}>
          <mesh>
            <boxGeometry args={[0.36, 0.48, 0.22]} />
            <meshStandardMaterial color="#15803d" roughness={0.75} />
          </mesh>
          {/* Tapa mostaza */}
          <mesh position={[0, 0.24, 0]}>
            <boxGeometry args={[0.38, 0.1, 0.24]} />
            <meshStandardMaterial color="#d97706" roughness={0.7} />
          </mesh>
          {/* Esterilla enrollada */}
          <mesh position={[0, -0.26, -0.02]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.075, 0.075, 0.42, 12]} />
            <meshStandardMaterial color="#fde68a" roughness={0.85} />
          </mesh>
        </group>

        {/* Cabeza */}
        <mesh position={[0, 1.15, 0]}>
          <sphereGeometry args={[0.21, 16, 14]} />
          <meshStandardMaterial color="#fed7aa" roughness={0.65} />
        </mesh>

        {/* Ojos simpáticos (+Z es el frente) */}
        <mesh position={[-0.07, 1.16, 0.18]}>
          <sphereGeometry args={[0.028, 8, 8]} />
          <meshBasicMaterial color="#0f172a" />
        </mesh>
        <mesh position={[0.07, 1.16, 0.18]}>
          <sphereGeometry args={[0.028, 8, 8]} />
          <meshBasicMaterial color="#0f172a" />
        </mesh>

        {/* Gorro de lana rojo con pompón crema */}
        <mesh position={[0, 1.24, -0.01]}>
          <sphereGeometry args={[0.22, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
          <meshStandardMaterial color="#dc2626" roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.24, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.21, 0.045, 8, 18]} />
          <meshStandardMaterial color="#fef3c7" roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.5, -0.02]}>
          <sphereGeometry args={[0.085, 12, 10]} />
          <meshStandardMaterial color="#fef3c7" roughness={0.95} />
        </mesh>

        {/* Brazo izquierdo + bastón de senderismo */}
        <group ref={leftArmRef} position={[-0.31, 0.78, 0]}>
          <mesh position={[0, -0.15, 0.05]} rotation-x={0.25}>
            <capsuleGeometry args={[0.075, 0.24, 6, 10]} />
            <meshStandardMaterial color="#ea580c" roughness={0.6} />
          </mesh>
          <mesh position={[-0.03, -0.45, 0.22]} rotation-x={0.25}>
            <cylinderGeometry args={[0.018, 0.014, 0.78, 8]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.5} roughness={0.3} />
          </mesh>
        </group>

        {/* Brazo derecho + bastón de senderismo */}
        <group ref={rightArmRef} position={[0.31, 0.78, 0]}>
          <mesh position={[0, -0.15, 0.05]} rotation-x={0.25}>
            <capsuleGeometry args={[0.075, 0.24, 6, 10]} />
            <meshStandardMaterial color="#ea580c" roughness={0.6} />
          </mesh>
          <mesh position={[0.03, -0.45, 0.22]} rotation-x={0.25}>
            <cylinderGeometry args={[0.018, 0.014, 0.78, 8]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.5} roughness={0.3} />
          </mesh>
        </group>
      </group>
    </group>
  )
}
