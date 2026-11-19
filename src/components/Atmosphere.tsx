import { useEffect, useMemo, useRef, type ComponentRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Sky } from '@react-three/drei'
import * as THREE from 'three'
import {
  PRESETS,
  atmosphere,
  setSeasonMode,
  setTimeOfDay,
  sunDirection,
  type SeasonMode,
  type TimeOfDay,
} from '../lib/atmosphere'

/** Bruma baja: el cielo se funde con el color de niebla justo en el horizonte. */
const hazeFragment = /* glsl */ `
  uniform vec3 uColor;
  varying vec3 vDir;
  void main() {
    float a = (1.0 - smoothstep(0.0, 0.09, vDir.y)) * 0.97;
    gl_FragColor = vec4(uColor, a);
  }
`

const FOG_NEAR = 70
const FOG_FAR = 320

interface AtmosphereProps {
  timeOfDay: TimeOfDay
  seasonMode: SeasonMode
}

/**
 * Cielo, niebla, suelo infinito y bruma del horizonte, animados por la hora del día y estación.
 * El suelo plano extiende el terreno más allá del DEM para que nunca se vea su borde.
 */
export function Atmosphere({ timeOfDay, seasonMode }: AtmosphereProps) {
  const scene = useThree((s) => s.scene)
  const skyRef = useRef<ComponentRef<typeof Sky>>(null)
  const hazeRef = useRef<THREE.Mesh>(null)
  const groundMaterial = useRef<THREE.MeshBasicMaterial>(null)
  const sun = useMemo(() => new THREE.Vector3(), [])
  const hazeMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Vector3() } },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: hazeFragment,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        fog: false,
      }),
    [],
  )

  useEffect(() => {
    setTimeOfDay(timeOfDay)
  }, [timeOfDay])

  useEffect(() => {
    setSeasonMode(seasonMode)
  }, [seasonMode])

  useEffect(() => () => hazeMaterial.dispose(), [hazeMaterial])

  useFrame(({ camera }) => {
    sunDirection(atmosphere.az, atmosphere.el, sun)

    const sky = skyRef.current
    if (sky) {
      const u = (sky.material as THREE.ShaderMaterial).uniforms
      u.sunPosition.value.copy(sun).multiplyScalar(1000)
      u.rayleigh.value = atmosphere.rayleigh
      u.turbidity.value = atmosphere.turbidity
    }

    // Los colores del horizonte están en espacio de pantalla (sRGB)
    const { hazeR: r, hazeG: g, hazeB: b } = atmosphere
    if (scene.fog) scene.fog.color.setRGB(r, g, b, THREE.SRGBColorSpace)
    groundMaterial.current?.color.setRGB(r, g, b, THREE.SRGBColorSpace)
    hazeMaterial.uniforms.uColor.value.set(r, g, b)
    hazeRef.current?.position.copy(camera.position)
  })

  const dawn = PRESETS.dawn
  return (
    <>
      <fog attach="fog" args={['#b8cde0', FOG_NEAR, FOG_FAR]} />
      <Sky
        ref={skyRef}
        distance={4000}
        sunPosition={sunDirection(dawn.az, dawn.el).multiplyScalar(1000).toArray()}
        turbidity={dawn.turbidity}
        rayleigh={dawn.rayleigh}
      />

      <mesh rotation-x={-Math.PI / 2} position={[0, -0.03, 0]}>
        <circleGeometry args={[1700, 64]} />
        <meshBasicMaterial ref={groundMaterial} fog={false} />
      </mesh>

      <mesh ref={hazeRef} material={hazeMaterial} frustumCulled={false} renderOrder={1}>
        <sphereGeometry args={[1800, 48, 24]} />
      </mesh>
    </>
  )
}
