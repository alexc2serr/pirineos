import { useEffect, useState } from 'react'
import {
  fetchMountainWeather,
  type AlpineConditionLevel,
  type MountainWeather,
} from '../../services/weatherService'

interface MountainWeatherCardProps {
  cacheKey: string
  lat: number
  lon: number
  elevation: number
}

const CONDITION_BADGE: Record<AlpineConditionLevel, string> = {
  optimal: 'border-emerald-300/35 bg-emerald-400/15 text-emerald-200',
  caution: 'border-amber-300/40 bg-amber-400/20 text-amber-200',
  winter: 'border-sky-300/40 bg-sky-400/20 text-sky-200',
  severe: 'border-rose-300/45 bg-rose-500/25 text-rose-200',
}

/** Widget compacto de meteorología de alta montaña en tiempo real (Open-Meteo). */
export function MountainWeatherCard({ cacheKey, lat, lon, elevation }: MountainWeatherCardProps) {
  const [weather, setWeather] = useState<MountainWeather | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(false)

    fetchMountainWeather(cacheKey, lat, lon, elevation, controller.signal)
      .then((data) => {
        setWeather(data)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(true)
        setLoading(false)
      })

    return () => controller.abort()
  }, [cacheKey, lat, lon, elevation])

  return (
    <section className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-mono text-[10px] tracking-[0.22em] text-white/50">
          METEO EN COTA ({elevation.toLocaleString('es-ES')} M)
        </h3>
        {weather && !loading && (
          <span
            className={`rounded-full border px-2 py-0.5 font-mono text-[9.5px] font-medium ${CONDITION_BADGE[weather.condition.level]}`}
          >
            {weather.condition.label}
          </span>
        )}
      </div>

      {loading && (
        <div className="mt-3 space-y-2.5 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-8 w-28 rounded-lg bg-white/10" />
            <div className="h-5 w-24 rounded-lg bg-white/10" />
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <div className="h-12 rounded-lg bg-white/10" />
            <div className="h-12 rounded-lg bg-white/10" />
            <div className="h-12 rounded-lg bg-white/10" />
          </div>
          <div className="h-10 rounded-lg bg-white/10" />
        </div>
      )}

      {!loading && error && (
        <p className="mt-2 font-mono text-[11px] text-white/50">
          No se pudo obtener la previsión de Open-Meteo en este momento.
        </p>
      )}

      {!loading && weather && (
        <>
          {/* Temperatura actual y estado del cielo */}
          <div className="mt-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-3xl leading-none" aria-hidden>
                {weather.icon}
              </span>
              <div>
                <p className="font-mono text-2xl font-semibold leading-none text-white">
                  {weather.temperature.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  °C
                </p>
                <p className="mt-1 font-mono text-[10px] text-white/55">
                  Sensación {weather.apparentTemperature}°C
                </p>
              </div>
            </div>
            <p className="text-right text-xs font-medium text-white/80">{weather.description}</p>
          </div>

          {/* 3 métricas clave de montaña */}
          <div className="mt-3 grid grid-cols-3 gap-1.5 font-mono">
            <div className="rounded-lg border border-white/10 bg-slate-950/45 px-2 py-2 text-center">
              <span className="block text-[8.5px] tracking-[0.14em] text-white/45">VIENTO / RACHAS</span>
              <span className="mt-0.5 block text-[11px] font-semibold text-white">
                {weather.windSpeed}/{weather.windGusts}
                <span className="ml-0.5 text-[9px] text-white/55">km/h</span>
              </span>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-950/45 px-2 py-2 text-center">
              <span className="block text-[8.5px] tracking-[0.14em] text-white/45">COTA 0 °C</span>
              <span className="mt-0.5 block text-[11px] font-semibold text-sky-200">
                {weather.freezingLevelM !== null ? `${weather.freezingLevelM.toLocaleString('es-ES')} m` : '—'}
              </span>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-950/45 px-2 py-2 text-center">
              <span className="block text-[8.5px] tracking-[0.14em] text-white/45">PRECIP. HOY</span>
              <span className="mt-0.5 block text-[11px] font-semibold text-amber-200">
                {weather.todayPrecipProb}%
              </span>
            </div>
          </div>

          {/* Mini previsión 3 días */}
          {weather.daily.length > 0 && (
            <div className="mt-2.5 grid grid-cols-3 gap-1.5 border-t border-white/10 pt-2.5 font-mono">
              {weather.daily.map((d) => (
                <div
                  key={d.date}
                  className="flex flex-col items-center rounded-lg bg-white/[0.03] px-1.5 py-1.5 text-center"
                >
                  <span className="text-[9.5px] font-medium text-white/60">{d.dayLabel}</span>
                  <span className="my-0.5 text-base leading-none" aria-hidden>
                    {d.icon}
                  </span>
                  <span className="text-[10px] font-semibold text-white">
                    {d.tempMin}° / {d.tempMax}°
                  </span>
                  <span className="text-[9px] text-white/45">{d.windGustMax} km/h</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}
