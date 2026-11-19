import { replayState, type ReplayTarget } from '../lib/replayState'

export interface RecordedVideo {
  url: string
  blob: Blob
  filename: string
  mimeType: string
}

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function pickBestMimeType(): { mimeType: string; ext: 'mp4' | 'webm' } {
  if (typeof MediaRecorder === 'undefined') {
    return { mimeType: 'video/webm', ext: 'webm' }
  }
  const candidates: { mimeType: string; ext: 'mp4' | 'webm' }[] = [
    { mimeType: 'video/mp4;codecs=avc1.42E01E', ext: 'mp4' },
    { mimeType: 'video/mp4;codecs=avc1', ext: 'mp4' },
    { mimeType: 'video/mp4', ext: 'mp4' },
    { mimeType: 'video/webm;codecs=vp9', ext: 'webm' },
    { mimeType: 'video/webm;codecs=vp8', ext: 'webm' },
    { mimeType: 'video/webm', ext: 'webm' },
  ]
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c.mimeType)) return c
  }
  return { mimeType: '', ext: 'webm' }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.closePath()
}

export function triggerVideoDownload(video: RecordedVideo) {
  const a = document.createElement('a')
  a.href = video.url
  a.download = video.filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/**
 * Compositor 2D + MediaRecorder: captura el canvas WebGL 3D a 60 FPS, incrusta el HUD de
 * progreso en vivo y la tarjeta resumen cozy de cumbre, y exporta a MP4 (o WebM VP9).
 */
export class CozyVideoRecorder {
  private webglCanvas: HTMLCanvasElement
  private target: ReplayTarget
  private compCanvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private recorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private rafId = 0
  private running = false
  private mimeType: string
  private ext: 'mp4' | 'webm'

  constructor(webglCanvas: HTMLCanvasElement, target: ReplayTarget) {
    this.webglCanvas = webglCanvas
    this.target = target

    // Limitamos a 1920x1080 manteniendo relación de aspecto para grabación fluida a 60fps
    const scale = Math.min(1, 1920 / Math.max(1, webglCanvas.width), 1080 / Math.max(1, webglCanvas.height))
    const w = Math.max(640, Math.round((webglCanvas.width * scale) / 2) * 2)
    const h = Math.max(360, Math.round((webglCanvas.height * scale) / 2) * 2)

    this.compCanvas = document.createElement('canvas')
    this.compCanvas.width = w
    this.compCanvas.height = h
    const ctx = this.compCanvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D no disponible para composición de vídeo')
    this.ctx = ctx

    const picked = pickBestMimeType()
    this.mimeType = picked.mimeType
    this.ext = picked.ext
  }

  start(): boolean {
    if (typeof MediaRecorder === 'undefined' || !this.compCanvas.captureStream) return false
    this.chunks = []
    this.running = true

    const drawLoop = () => {
      if (!this.running) return
      this.drawFrame()
      this.rafId = requestAnimationFrame(drawLoop)
    }
    this.drawFrame()
    this.rafId = requestAnimationFrame(drawLoop)

    const stream = this.compCanvas.captureStream(60)
    const options: MediaRecorderOptions = { videoBitsPerSecond: 7_500_000 }
    if (this.mimeType) options.mimeType = this.mimeType

    this.recorder = new MediaRecorder(stream, options)
    this.recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data)
    }
    this.recorder.start(150)
    return true
  }

  stop(): Promise<RecordedVideo | null> {
    this.running = false
    cancelAnimationFrame(this.rafId)

    const rec = this.recorder
    if (!rec || rec.state === 'inactive') return Promise.resolve(null)

    return new Promise((resolve) => {
      rec.onstop = () => {
        const type = this.mimeType || 'video/webm'
        const blob = new Blob(this.chunks, { type })
        const url = URL.createObjectURL(blob)
        const filename = `ruta-${slugify(this.target.name)}.${this.ext}`
        resolve({ url, blob, filename, mimeType: type })
      }
      rec.stop()
    })
  }

  cancel() {
    this.running = false
    cancelAnimationFrame(this.rafId)
    if (this.recorder && this.recorder.state !== 'inactive') {
      this.recorder.onstop = null
      this.recorder.stop()
    }
    this.chunks = []
  }

  private drawFrame() {
    const { ctx, compCanvas, webglCanvas, target } = this
    const w = compCanvas.width
    const h = compCanvas.height
    const s = Math.min(w / 1280, h / 720)

    // 1. Frame 3D del canvas WebGL
    ctx.drawImage(webglCanvas, 0, 0, w, h)

    // 2. Viñeta cinematográfica cálida muy sutil
    const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.38, w * 0.5, h * 0.5, Math.max(w, h) * 0.72)
    vig.addColorStop(0, 'rgba(15, 23, 42, 0)')
    vig.addColorStop(1, 'rgba(12, 18, 32, 0.32)')
    ctx.fillStyle = vig
    ctx.fillRect(0, 0, w, h)

    // 3. Marca de agua sutil "PIRINEOS 3D"
    ctx.save()
    ctx.font = `600 ${Math.round(13 * s)}px "JetBrains Mono", monospace`
    ctx.fillStyle = 'rgba(255, 248, 235, 0.72)'
    ctx.textAlign = 'left'
    ctx.fillText('PIRINEOS 3D · RELIVE COZY', Math.round(28 * s), h - Math.round(24 * s))
    ctx.restore()

    // 4. Barra de progreso superior durante la caminata
    if (replayState.phase === 'hiking') {
      const hasStage = Boolean(replayState.currentStageLabel)
      const barW = Math.round(450 * s)
      const barH = Math.round((hasStage ? 82 : 64) * s)
      const bx = (w - barW) / 2
      const by = Math.round(26 * s)

      ctx.save()
      roundRect(ctx, bx, by, barW, barH, 16 * s)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.76)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)'
      ctx.lineWidth = Math.max(1, 1.5 * s)
      ctx.stroke()

      ctx.fillStyle = '#fef3c7'
      ctx.font = `600 ${Math.round(14 * s)}px "Plus Jakarta Sans", sans-serif`
      ctx.textAlign = 'left'
      ctx.fillText(target.name, bx + 18 * s, by + 25 * s)

      const pct = Math.round(replayState.progress * 100)
      const alt = Math.round(replayState.currentAltitudeM).toLocaleString('es-ES')
      const dist = replayState.currentDistanceKm.toFixed(1)
      ctx.fillStyle = '#fde68a'
      ctx.font = `500 ${Math.round(12 * s)}px "JetBrains Mono", monospace`
      ctx.textAlign = 'right'
      ctx.fillText(`${alt} m · ${dist} km · ${pct}%`, bx + barW - 18 * s, by + 25 * s)

      // Barra dorada
      const trackX = bx + 18 * s
      const trackY = by + 40 * s
      const trackW = barW - 36 * s
      const trackH = 8 * s
      roundRect(ctx, trackX, trackY, trackW, trackH, 4 * s)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.14)'
      ctx.fill()

      roundRect(ctx, trackX, trackY, Math.max(8 * s, trackW * replayState.progress), trackH, 4 * s)
      const grad = ctx.createLinearGradient(trackX, 0, trackX + trackW, 0)
      grad.addColorStop(0, '#f59e0b')
      grad.addColorStop(1, '#fde68a')
      ctx.fillStyle = grad
      ctx.fill()

      if (hasStage) {
        ctx.fillStyle = '#bae6fd'
        ctx.font = `600 ${Math.round(11 * s)}px "JetBrains Mono", monospace`
        ctx.textAlign = 'center'
        ctx.fillText(replayState.currentStageLabel, bx + barW / 2, by + 68 * s)
      }
      ctx.restore()
    }

    // 5. Tarjeta resumen cozy compacta (a la derecha en horizontal o abajo en vertical para dejar visible al montañero)
    if (replayState.phase === 'celebrating' || replayState.phase === 'done') {
      const alpha = replayState.phase === 'done' ? 1 : Math.min(1, replayState.celebrationT * 2.5)
      const isLandscape = w >= h
      const cardW = Math.round((isLandscape ? 380 : Math.min(w * 0.88, 380)) * (isLandscape ? s : 1))
      const cardH = Math.round(230 * (isLandscape ? s : Math.min(w / 420, 1)))
      const cs = isLandscape ? s : Math.min(w / 420, 1)
      const cx = isLandscape ? w - cardW - Math.round(36 * s) : (w - cardW) / 2
      const cy = isLandscape ? (h - cardH) / 2 : h - cardH - Math.round(32 * cs)

      ctx.save()
      ctx.globalAlpha = alpha

      ctx.shadowColor = 'rgba(15, 23, 42, 0.55)'
      ctx.shadowBlur = 28 * cs
      ctx.shadowOffsetY = 10 * cs

      roundRect(ctx, cx, cy, cardW, cardH, 20 * cs)
      const bg = ctx.createLinearGradient(cx, cy, cx, cy + cardH)
      bg.addColorStop(0, 'rgba(254, 249, 239, 0.96)')
      bg.addColorStop(1, 'rgba(247, 237, 219, 0.96)')
      ctx.fillStyle = bg
      ctx.fill()
      ctx.shadowColor = 'transparent'

      ctx.strokeStyle = 'rgba(180, 83, 9, 0.35)'
      ctx.lineWidth = Math.max(1.5, 2 * cs)
      ctx.stroke()

      const badgeText =
        target.kind === 'trek'
          ? '¡TRAVESÍA COMPLETADA!'
          : target.kind === 'peak'
            ? '¡CUMBRE ALCANZADA!'
            : '¡REFUGIO ALCANZADO!'
      const badgeW = 175 * cs
      const badgeH = 24 * cs
      roundRect(ctx, cx + (cardW - badgeW) / 2, cy + 16 * cs, badgeW, badgeH, 12 * cs)
      ctx.fillStyle = '#0f172a'
      ctx.fill()
      ctx.fillStyle = '#fbbf24'
      ctx.font = `700 ${Math.round(10 * cs)}px "JetBrains Mono", monospace`
      ctx.textAlign = 'center'
      ctx.fillText(badgeText, cx + cardW / 2, cy + 32 * cs)

      ctx.fillStyle = '#0f172a'
      ctx.font = `700 ${Math.round(21 * cs)}px "Cinzel", Georgia, serif`
      ctx.fillText(target.name, cx + cardW / 2, cy + 70 * cs)

      ctx.fillStyle = '#b45309'
      ctx.font = `700 ${Math.round(14 * cs)}px "JetBrains Mono", monospace`
      ctx.fillText(`${target.elevation.toLocaleString('es-ES')} m · ${target.massif}`, cx + cardW / 2, cy + 94 * cs)

      const metrics = [
        { label: 'DURACIÓN', value: target.route.estimatedTime },
        { label: 'DISTANCIA', value: `${target.route.distanceKm.toLocaleString('es-ES')} km` },
        { label: 'DESNIVEL', value: `+${target.route.elevationGain.toLocaleString('es-ES')} m` },
      ]
      const colW = (cardW - 36 * cs) / 3
      metrics.forEach((m, i) => {
        const mx = cx + 18 * cs + colW * i + colW / 2
        const my = cy + 114 * cs
        roundRect(ctx, cx + 18 * cs + colW * i + 3 * cs, my, colW - 6 * cs, 50 * cs, 10 * cs)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.06)'
        ctx.fill()

        ctx.fillStyle = '#64748b'
        ctx.font = `600 ${Math.round(8.5 * cs)}px "JetBrains Mono", monospace`
        ctx.fillText(m.label, mx, my + 18 * cs)

        ctx.fillStyle = '#0f172a'
        ctx.font = `700 ${Math.round(13 * cs)}px "JetBrains Mono", monospace`
        ctx.fillText(m.value, mx, my + 38 * cs)
      })

      ctx.fillStyle = '#475569'
      ctx.font = `500 ${Math.round(10.5 * cs)}px "Plus Jakarta Sans", sans-serif`
      ctx.fillText(`Salida: ${target.originLabel}`, cx + cardW / 2, cy + 190 * cs)

      ctx.fillStyle = 'rgba(120, 53, 15, 0.55)'
      ctx.font = `600 ${Math.round(9 * cs)}px "JetBrains Mono", monospace`
      ctx.fillText('PIRINEOS 3D', cx + cardW / 2, cy + 212 * cs)

      ctx.restore()
    }
  }
}
