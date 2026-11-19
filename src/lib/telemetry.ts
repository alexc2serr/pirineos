/** Estado telemétrico en tiempo real (mutado desde `useFrame` sin re-renders de React). */
export const telemetry = {
  altitudeM: 2800,
  lat: 42.64,
  lon: 0.55,
  headingDeg: 210,
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'] as const

export function compassLabel(deg: number): string {
  const norm = ((deg % 360) + 360) % 360
  return COMPASS[Math.round(norm / 45) % 8]
}
