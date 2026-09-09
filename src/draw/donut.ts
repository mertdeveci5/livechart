import type { LivelinePalette } from '../types'

export interface DonutSegmentDraw {
  id: string
  /** Lerped sweep fraction 0–1 (already normalized across segments) */
  frac: number
  /** Visibility alpha 0–1 (enter/exit fades) */
  alpha: number
  /** Hover expansion 0–1 */
  expand: number
  color: string
}

export interface DonutDrawOptions {
  segments: DonutSegmentDraw[]
  /** Center primary text (formatted total, or hovered segment value) */
  centerText: string
  /** Center secondary text (e.g. hovered segment label) */
  centerLabel?: string
  chartReveal: number
  now_ms: number
  /** Dim all non-hovered segments to this id (null = no hover) */
  hoveredId: string | null
}

const TAU = Math.PI * 2
const START = -Math.PI / 2
/** Angular gap between segments, radians */
const GAP = 0.035

/**
 * Draw a live donut — segments as round-capped arcs with small gaps,
 * lerped sweep fractions, hover expansion + sibling dimming,
 * mono center text. Pure drawing; all smoothing happens in the engine.
 */
export function drawDonut(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pad: { top: number; right: number; bottom: number; left: number },
  palette: LivelinePalette,
  opts: DonutDrawOptions,
): void {
  const chartW = w - pad.left - pad.right
  const chartH = h - pad.top - pad.bottom
  const cx = pad.left + chartW / 2
  const cy = pad.top + chartH / 2
  const radius = Math.max(32, Math.min(chartW, chartH) * 0.38)
  const thickness = Math.max(10, radius * 0.26)

  const reveal = opts.chartReveal
  const ramp = (start: number, end: number) => {
    const t = Math.max(0, Math.min(1, (reveal - start) / (end - start)))
    return t * t * (3 - 2 * t)
  }

  // Segments sweep in with the reveal
  const sweep = ramp(0, 0.85)
  let acc = START

  for (const seg of opts.segments) {
    const span = seg.frac * TAU * sweep
    const a0 = acc
    acc += seg.frac * TAU * sweep
    if (span < 0.002 || seg.alpha < 0.01) continue

    const dimmed = opts.hoveredId !== null && opts.hoveredId !== seg.id
    const alpha = seg.alpha * (dimmed ? 0.3 : 1)
    if (alpha < 0.01) continue

    const r = radius + seg.expand * thickness * 0.18
    const lw = thickness * (1 + seg.expand * 0.1)
    const g0 = a0 + Math.min(GAP / 2, span / 4)
    const g1 = a0 + span - Math.min(GAP / 2, span / 4)
    if (g1 - g0 < 0.002) continue

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.beginPath()
    ctx.arc(cx, cy, r, g0, g1)
    ctx.strokeStyle = seg.color
    ctx.lineWidth = lw
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.restore()
  }

  // Center text
  const textAlpha = ramp(0.35, 0.75)
  if (textAlpha > 0.01 && opts.centerText) {
    ctx.save()
    ctx.globalAlpha = textAlpha
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const mainSize = Math.max(16, radius * 0.3)
    ctx.font = `600 ${mainSize}px "SF Mono", Menlo, monospace`
    ctx.fillStyle = palette.tooltipText
    const labelGap = opts.centerLabel ? mainSize * 0.42 : 0
    ctx.fillText(opts.centerText, cx, cy - labelGap)
    if (opts.centerLabel) {
      ctx.font = `500 ${Math.max(10, radius * 0.11)}px "SF Mono", Menlo, monospace`
      ctx.fillStyle = palette.gridLabel
      ctx.fillText(opts.centerLabel, cx, cy + labelGap + mainSize * 0.32)
    }
    ctx.restore()
  }
}

/**
 * Donut loading state — a breathing ring segment sweeping around the circle.
 */
export function drawDonutLoading(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pad: { top: number; right: number; bottom: number; left: number },
  palette: LivelinePalette,
  now_ms: number,
  alpha: number,
): void {
  if (alpha < 0.01) return
  const chartW = w - pad.left - pad.right
  const chartH = h - pad.top - pad.bottom
  const cx = pad.left + chartW / 2
  const cy = pad.top + chartH / 2
  const radius = Math.max(32, Math.min(chartW, chartH) * 0.38)
  const thickness = Math.max(10, radius * 0.26)

  const breath = 0.35 + (Math.sin(now_ms * 0.002) * 0.5 + 0.5) * 0.3
  const rot = now_ms * 0.0006

  ctx.save()
  ctx.globalAlpha = alpha * 0.7
  ctx.beginPath()
  ctx.arc(cx, cy, radius, START + rot, START + rot + TAU * breath)
  ctx.strokeStyle = palette.gridLabel
  ctx.lineWidth = thickness
  ctx.lineCap = 'round'
  ctx.stroke()
  ctx.restore()
}

/**
 * Donut empty state — faint track ring + center text.
 */
export function drawDonutEmpty(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pad: { top: number; right: number; bottom: number; left: number },
  palette: LivelinePalette,
  alpha: number,
  emptyText?: string,
): void {
  if (alpha < 0.01) return
  const chartW = w - pad.left - pad.right
  const chartH = h - pad.top - pad.bottom
  const cx = pad.left + chartW / 2
  const cy = pad.top + chartH / 2
  const radius = Math.max(32, Math.min(chartW, chartH) * 0.38)
  const thickness = Math.max(10, radius * 0.26)

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, TAU)
  ctx.strokeStyle = palette.gridLine
  ctx.lineWidth = thickness
  ctx.stroke()

  ctx.font = `500 ${Math.max(10, radius * 0.11)}px "SF Mono", Menlo, monospace`
  ctx.fillStyle = palette.gridLabel
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(emptyText ?? 'No data to display', cx, cy)
  ctx.restore()
}
