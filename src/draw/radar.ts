import type { LivelinePalette } from '../types'

export interface RadarAxisDraw {
  label: string
  /** Lerped value fraction 0–1 */
  frac: number
  /** Visibility alpha (enter/exit) */
  alpha: number
  /** Hover expansion 0–1 */
  expand: number
  valueText: string
}

export interface RadarDrawOptions {
  axes: RadarAxisDraw[]
  chartReveal: number
  now_ms: number
  hoveredIdx: number | null
}

const TAU = Math.PI * 2

function polygonPoint(cx: number, cy: number, r: number, i: number, n: number): [number, number] {
  const a = -Math.PI / 2 + (i / n) * TAU
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]
}

/** Shared geometry — used by the engine for hover hit-testing. */
export function radarGeometry(
  w: number,
  h: number,
  pad: { top: number; right: number; bottom: number; left: number },
) {
  const chartW = w - pad.left - pad.right
  const chartH = h - pad.top - pad.bottom
  const cx = pad.left + chartW / 2
  const cy = pad.top + chartH / 2
  const radius = Math.max(32, Math.min(chartW, chartH) * 0.36)
  return { cx, cy, radius }
}

/**
 * Draw a radar/spider chart — polygon rings, spokes, axis labels,
 * accent value polygon with vertex dots. Pure drawing; engine lerps fracs.
 */
export function drawRadar(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pad: { top: number; right: number; bottom: number; left: number },
  palette: LivelinePalette,
  opts: RadarDrawOptions,
): void {
  const n = opts.axes.length
  if (n < 3) return
  const { cx, cy, radius } = radarGeometry(w, h, pad)
  const reveal = opts.chartReveal
  const ramp = (start: number, end: number) => {
    const t = Math.max(0, Math.min(1, (reveal - start) / (end - start)))
    return t * t * (3 - 2 * t)
  }

  // 1. Rings (4 concentric polygons) + spokes
  const gridAlpha = ramp(0.1, 0.55)
  if (gridAlpha > 0.01) {
    ctx.save()
    ctx.globalAlpha = gridAlpha
    ctx.strokeStyle = palette.gridLine
    ctx.lineWidth = 1
    for (let ring = 1; ring <= 4; ring++) {
      const r = (radius * ring) / 4
      ctx.beginPath()
      for (let i = 0; i <= n; i++) {
        const [x, y] = polygonPoint(cx, cy, r, i % n, n)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    for (let i = 0; i < n; i++) {
      const [x, y] = polygonPoint(cx, cy, radius, i, n)
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(x, y)
      ctx.stroke()
    }
    ctx.restore()
  }

  // 2. Value polygon — scale from center with reveal
  const scale = ramp(0, 0.85)
  const fillAlpha = ramp(0.2, 0.7)
  if (scale > 0.01) {
    const pts = opts.axes.map((a, i) => {
      const r = radius * Math.max(0, Math.min(1, a.frac)) * scale
      return polygonPoint(cx, cy, r, i, n)
    })

    // Fill
    if (fillAlpha > 0.01) {
      ctx.save()
      ctx.globalAlpha = fillAlpha
      const grad = ctx.createLinearGradient(0, cy - radius, 0, cy + radius)
      grad.addColorStop(0, palette.fillTop)
      grad.addColorStop(1, palette.fillBottom)
      ctx.beginPath()
      ctx.moveTo(pts[0][0], pts[0][1])
      for (let i = 1; i < n; i++) ctx.lineTo(pts[i][0], pts[i][1])
      ctx.closePath()
      ctx.fillStyle = grad
      ctx.fill()
      ctx.restore()
    }

    // Stroke
    const strokeAlpha = ramp(0.1, 0.6)
    if (strokeAlpha > 0.01) {
      ctx.save()
      ctx.globalAlpha = strokeAlpha
      ctx.beginPath()
      ctx.moveTo(pts[0][0], pts[0][1])
      for (let i = 1; i < n; i++) ctx.lineTo(pts[i][0], pts[i][1])
      ctx.closePath()
      ctx.strokeStyle = palette.line
      ctx.lineWidth = 2
      ctx.lineJoin = 'round'
      ctx.stroke()
      ctx.restore()
    }

    // 3. Vertex dots (+ hover ring + value text)
    const dotAlpha = ramp(0.4, 0.8)
    if (dotAlpha > 0.01) {
      for (let i = 0; i < n; i++) {
        const a = opts.axes[i]
        const r = 3 + a.expand * 1.5
        ctx.save()
        ctx.globalAlpha = dotAlpha * a.alpha
        ctx.beginPath()
        ctx.arc(pts[i][0], pts[i][1], r, 0, TAU)
        ctx.fillStyle = palette.line
        ctx.fill()
        if (a.expand > 0.01) {
          ctx.beginPath()
          ctx.arc(pts[i][0], pts[i][1], r + 4, 0, TAU)
          ctx.strokeStyle = palette.line
          ctx.lineWidth = 1.5
          ctx.globalAlpha = dotAlpha * a.alpha * a.expand * 0.7
          ctx.stroke()
          // Value text above the dot
          ctx.globalAlpha = dotAlpha * a.alpha * a.expand
          ctx.font = palette.valueFont
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          const bg = palette.bgRgb
          ctx.strokeStyle = `rgb(${bg[0]},${bg[1]},${bg[2]})`
          ctx.lineWidth = 4
          ctx.lineJoin = 'round'
          ctx.strokeText(a.valueText, pts[i][0], pts[i][1] - r - 6)
          ctx.fillStyle = palette.tooltipText
          ctx.fillText(a.valueText, pts[i][0], pts[i][1] - r - 6)
        }
        ctx.restore()
      }
    }
  }

  // 4. Axis labels
  const labelAlpha = ramp(0.3, 0.65)
  if (labelAlpha > 0.01) {
    ctx.save()
    ctx.globalAlpha = labelAlpha
    ctx.font = palette.labelFont
    ctx.fillStyle = palette.gridLabel
    ctx.textBaseline = 'middle'
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / n) * TAU
      const lx = cx + Math.cos(a) * (radius + 14)
      const ly = cy + Math.sin(a) * (radius + 14)
      const cos = Math.cos(a)
      ctx.textAlign = cos > 0.3 ? 'left' : cos < -0.3 ? 'right' : 'center'
      ctx.fillText(opts.axes[i].label, lx, ly)
    }
    ctx.restore()
  }
}

/** Radar loading — breathing rings. */
export function drawRadarLoading(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pad: { top: number; right: number; bottom: number; left: number },
  palette: LivelinePalette,
  now_ms: number,
  alpha: number,
  sides = 6,
) {
  if (alpha < 0.01) return
  const { cx, cy, radius } = radarGeometry(w, h, pad)
  const breath = 0.5 + Math.sin(now_ms * 0.002) * 0.3
  ctx.save()
  ctx.globalAlpha = alpha * breath
  ctx.strokeStyle = palette.gridLabel
  ctx.lineWidth = 1.5
  for (let ring = 1; ring <= 3; ring++) {
    const r = (radius * ring) / 3
    ctx.beginPath()
    for (let i = 0; i <= sides; i++) {
      const [x, y] = polygonPoint(cx, cy, r, i % sides, sides)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  ctx.restore()
}

/** Radar empty — faint rings + center text. */
export function drawRadarEmpty(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pad: { top: number; right: number; bottom: number; left: number },
  palette: LivelinePalette,
  alpha: number,
  emptyText?: string,
) {
  if (alpha < 0.01) return
  const { cx, cy, radius } = radarGeometry(w, h, pad)
  ctx.save()
  ctx.globalAlpha = alpha * 0.5
  ctx.strokeStyle = palette.gridLine
  ctx.lineWidth = 1
  for (let ring = 1; ring <= 3; ring++) {
    ctx.beginPath()
    ctx.arc(cx, cy, (radius * ring) / 3, 0, TAU)
    ctx.stroke()
  }
  ctx.globalAlpha = alpha
  ctx.font = `500 11px "SF Mono", Menlo, monospace`
  ctx.fillStyle = palette.gridLabel
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(emptyText ?? 'No data to display', cx, cy)
  ctx.restore()
}
