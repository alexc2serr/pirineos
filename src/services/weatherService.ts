export type AlpineConditionLevel = 'optimal' | 'caution' | 'winter' | 'severe'

export interface DailyForecast {
  date: string
  dayLabel: string
  weatherCode: number
  icon: string
  tempMin: number
  tempMax: number
  precipProbMax: number
  windGustMax: number
}

export interface MountainWeather {
  temperature: number
  apparentTemperature: number
  windSpeed: number
  windGusts: number
  weatherCode: number
  isDay: boolean
  icon: string
  description: string
  freezingLevelM: number | null
  todayPrecipProb: number
  condition: {
    level: AlpineConditionLevel
    label: string
  }
  daily: DailyForecast[]
  fetchedAt: number
}

const CACHE_TTL_MS = 15 * 60 * 1000
const cache = new Map<string, { data: MountainWeather; expiresAt: number }>()

function describeWmo(code: number, isDay = true): { label: string; icon: string } {
  if (code === 0) return { label: isDay ? 'Despejado' : 'Noche despejada', icon: isDay ? '☀️' : '🌙' }
  if (code === 1) return { label: 'Mayormente despejado', icon: isDay ? '🌤️' : '🌙' }
  if (code === 2) return { label: 'Parcialmente nublado', icon: '⛅' }
  if (code === 3) return { label: 'Cubierto', icon: '☁️' }
  if (code === 45 || code === 48) return { label: 'Niebla / Cencellada', icon: '🌫️' }
  if (code >= 51 && code <= 57) return { label: 'Llovizna', icon: '🌦️' }
  if (code >= 61 && code <= 67) return { label: 'Lluvia', icon: '🌧️' }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return { label: 'Nevadas', icon: '❄️' }
  }
  if (code >= 80 && code <= 82) return { label: 'Chubascos', icon: '🌦️' }
  if (code >= 95) return { label: 'Tormenta eléctrica', icon: '⛈️' }
  return { label: 'Variable', icon: '⛅' }
}

function computeCondition(
  temp: number,
  apparent: number,
  windSpeed: number,
  windGusts: number,
  code: number,
): { level: AlpineConditionLevel; label: string } {
  if (code >= 95 || windGusts >= 75) {
    return { level: 'severe', label: 'Condiciones adversas / Alerta' }
  }
  if (windGusts >= 50 || windSpeed >= 35) {
    return { level: 'caution', label: 'Viento fuerte en cresta' }
  }
  if (temp <= -5 || apparent <= -10 || (code >= 71 && code <= 77) || code === 85 || code === 86) {
    return { level: 'winter', label: 'Alta montaña invernal / Frío intenso' }
  }
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
    return { level: 'caution', label: 'Inestable / Precipitación' }
  }
  return { level: 'optimal', label: 'Óptima' }
}

function dayLabelFor(index: number, isoDate: string): string {
  if (index === 0) return 'Hoy'
  if (index === 1) return 'Mañana'
  const d = new Date(`${isoDate}T12:00:00`)
  const name = d.toLocaleDateString('es-ES', { weekday: 'short' })
  return name.charAt(0).toUpperCase() + name.slice(1).replace('.', '')
}

interface OpenMeteoResponse {
  current?: {
    time?: string
    temperature_2m?: number
    apparent_temperature?: number
    wind_speed_10m?: number
    wind_gusts_10m?: number
    weather_code?: number
    is_day?: number
  }
  hourly?: {
    time?: string[]
    freezing_level_height?: (number | null)[]
  }
  daily?: {
    time?: string[]
    weather_code?: number[]
    temperature_2m_max?: number[]
    temperature_2m_min?: number[]
    precipitation_probability_max?: (number | null)[]
    wind_gusts_10m_max?: number[]
  }
}

/**
 * Consulta la meteorología real de alta montaña en Open-Meteo ajustada a la altitud
 * exacta del pico o refugio, con caché en memoria de 15 minutos.
 */
export async function fetchMountainWeather(
  cacheKey: string,
  lat: number,
  lon: number,
  elevation: number,
  signal?: AbortSignal,
): Promise<MountainWeather> {
  const key = `${cacheKey}:${lat.toFixed(3)},${lon.toFixed(3)},${Math.round(elevation)}`
  const cached = cache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }

  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    elevation: String(Math.round(elevation)),
    current: 'temperature_2m,apparent_temperature,wind_speed_10m,wind_gusts_10m,weather_code,is_day',
    hourly: 'freezing_level_height',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_gusts_10m_max',
    forecast_days: '3',
    timezone: 'Europe/Madrid',
  })

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, { signal })
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`)
  const json = (await res.json()) as OpenMeteoResponse

  const cur = json.current ?? {}
  const temp = cur.temperature_2m ?? 0
  const apparent = cur.apparent_temperature ?? temp
  const windSpeed = cur.wind_speed_10m ?? 0
  const windGusts = cur.wind_gusts_10m ?? windSpeed
  const weatherCode = cur.weather_code ?? 0
  const isDay = (cur.is_day ?? 1) === 1
  const wmo = describeWmo(weatherCode, isDay)

  // Localiza la isoterma 0 °C (freezing_level_height) más cercana a la hora actual
  let freezingLevelM: number | null = null
  const hourlyTimes = json.hourly?.time ?? []
  const hourlyFreeze = json.hourly?.freezing_level_height ?? []
  if (hourlyTimes.length > 0 && hourlyFreeze.length > 0) {
    const curHourPrefix = (cur.time ?? '').slice(0, 13)
    let idx = curHourPrefix ? hourlyTimes.findIndex((t) => t.startsWith(curHourPrefix)) : 0
    if (idx < 0) idx = 0
    const raw = hourlyFreeze[idx]
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      freezingLevelM = Math.round(raw)
    }
  }

  const dailyTimes = json.daily?.time ?? []
  const daily: DailyForecast[] = dailyTimes.slice(0, 3).map((date, i) => {
    const code = json.daily?.weather_code?.[i] ?? 0
    return {
      date,
      dayLabel: dayLabelFor(i, date),
      weatherCode: code,
      icon: describeWmo(code, true).icon,
      tempMin: Math.round(json.daily?.temperature_2m_min?.[i] ?? 0),
      tempMax: Math.round(json.daily?.temperature_2m_max?.[i] ?? 0),
      precipProbMax: Math.round(json.daily?.precipitation_probability_max?.[i] ?? 0),
      windGustMax: Math.round(json.daily?.wind_gusts_10m_max?.[i] ?? 0),
    }
  })

  const data: MountainWeather = {
    temperature: Number(temp.toFixed(1)),
    apparentTemperature: Math.round(apparent),
    windSpeed: Math.round(windSpeed),
    windGusts: Math.round(windGusts),
    weatherCode,
    isDay,
    icon: wmo.icon,
    description: wmo.label,
    freezingLevelM,
    todayPrecipProb: daily[0]?.precipProbMax ?? 0,
    condition: computeCondition(temp, apparent, windSpeed, windGusts, weatherCode),
    daily,
    fetchedAt: Date.now(),
  }

  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS })
  return data
}
