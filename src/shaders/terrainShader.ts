import * as THREE from 'three'
import { VERTICAL_EXAGGERATION } from '../data/pyrenees'

export const terrainVertexShader = /* glsl */ `
  #include <fog_pars_vertex>
  attribute float aShadow0;
  attribute float aShadow1;
  attribute float aShadow2;
  attribute float aEdge;
  varying vec3 vNormalW;
  varying float vElevation;
  varying vec3 vShadow;
  varying float vEdge;

  void main() {
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vElevation = position.y / ${VERTICAL_EXAGGERATION.toFixed(3)} * 1000.0;
    vShadow = vec3(aShadow0, aShadow1, aShadow2);
    vEdge = aEdge;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`

export const terrainFragmentShader = /* glsl */ `
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uShadowW;
  uniform vec3 uHaze;        // color de bruma en espacio de pantalla (sRGB)
  uniform float uAmbient;
  uniform float uContourStep;
  #include <fog_pars_fragment>
  varying vec3 vNormalW;
  varying float vElevation;
  varying vec3 vShadow;
  varying float vEdge;

  float contour(float elev, float step, float width) {
    float v = elev / step;
    float d = abs(fract(v - 0.5) - 0.5) / fwidth(v);
    return 1.0 - smoothstep(0.0, width, d);
  }

  void main() {
    vec3 n = normalize(vNormalW);
    float slope = 1.0 - n.y;
    float h = vElevation;

    vec3 forestDeep  = vec3(0.045, 0.125, 0.085);
    vec3 forestSlate = vec3(0.13, 0.21, 0.19);
    vec3 meadow      = vec3(0.26, 0.35, 0.20);
    vec3 granite     = vec3(0.42, 0.41, 0.41);
    vec3 limestone   = vec3(0.66, 0.60, 0.52);
    vec3 darkRock    = vec3(0.12, 0.115, 0.125);
    vec3 snow        = vec3(1.0);

    vec3 low = mix(forestDeep, forestSlate, smoothstep(200.0, 1500.0, h));
    low = mix(low, meadow, smoothstep(1300.0, 1850.0, h) * (1.0 - smoothstep(0.18, 0.4, slope)));
    low = mix(low, forestSlate * 0.8, smoothstep(0.35, 0.6, slope));

    float rockVar = 0.5 + 0.5 * sin(h * 0.012 + n.x * 7.0 + n.z * 6.0);
    vec3 rock = mix(granite, limestone, rockVar);
    rock = mix(rock, darkRock, smoothstep(0.35, 0.75, slope));

    vec3 base = mix(low, rock, smoothstep(1650.0, 2050.0, h));

    float snowMaxSlope = mix(0.30, 0.52, smoothstep(2300.0, 3000.0, h));
    float snowAmount = smoothstep(2300.0, 2650.0, h)
                     * (1.0 - smoothstep(snowMaxSlope - 0.12, snowMaxSlope, slope));
    base = mix(base, snow, snowAmount);

    // Iluminación: la sombra proyectada se mezcla entre los tres mapas precalculados
    float shadow = dot(vShadow, uShadowW);
    float diffuse = clamp(dot(n, normalize(uSunDir)), 0.0, 1.0);
    float lit = diffuse * shadow;

    vec3 shadowTint = vec3(0.10, 0.16, 0.34);
    vec3 skyFill = mix(vec3(0.06, 0.09, 0.18), vec3(0.22, 0.32, 0.55), n.y * 0.5 + 0.5);

    vec3 irradiance = (shadowTint * 0.55 + skyFill * 0.55) * uAmbient
                    + uSunColor * pow(lit, 0.85) * 1.45;
    vec3 color = base * irradiance;

    // La nieve soleada toma el color de la luz (dorado al atardecer)
    color = mix(color, mix(vec3(1.0), uSunColor, 0.55), snowAmount * smoothstep(0.35, 0.9, lit) * 0.6);
    color = mix(color, color * vec3(0.78, 0.88, 1.15), (1.0 - lit) * 0.5);

    float minor = contour(h, uContourStep, 1.2) * 0.07;
    float major = contour(h, uContourStep * 5.0, 1.6) * 0.16;
    color = mix(color, vec3(0.03, 0.05, 0.08), minor + major);

    color = pow(color, vec3(0.92));
    color = clamp(mix(vec3(dot(color, vec3(0.299, 0.587, 0.114))), color, 1.12), 0.0, 1.0);

    // Disolución en los extremos del mapa
    color = mix(uHaze, color, smoothstep(0.05, 0.7, vEdge));

    gl_FragColor = vec4(color, 1.0);

    // Niebla propia: mezcla contra el mismo color de pantalla que el horizonte
    // (el chunk estándar usa el color lineal de la escena y quedaba más oscuro).
    #ifdef USE_FOG
      float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
      gl_FragColor.rgb = mix(gl_FragColor.rgb, uHaze, fogFactor);
    #endif
  }
`

export function createTerrainMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uSunColor: { value: new THREE.Vector3(1, 1, 1) },
        uShadowW: { value: new THREE.Vector3(1, 0, 0) },
        uHaze: { value: new THREE.Vector3(0.7, 0.8, 0.9) },
        uAmbient: { value: 1 },
        uContourStep: { value: 100 },
      },
    ]),
    vertexShader: terrainVertexShader,
    fragmentShader: terrainFragmentShader,
    fog: true,
  })
}
