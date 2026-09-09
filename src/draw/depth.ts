import type { ChartLayout, LivelinePalette } from '../types'

const GREEN: [number, number, number] = [34, 197, 94]
const RED: [number, number, number] = [239, 68, 68]

export interface DepthDrawOptions {
  /** [price, lerpedCum] ascending by price */
  bids: [number, number][]
  asks: [number, number][]
  midPrice: number
  chartReveal: number
  hoverPrice: number | null
  hoverCum: number | null
  hoverSide: 'bid' | 'ask' | null
  scrubAmount: number
  formatValue: (v: number) => string
  formatSize: (v: number) => string
}

function rgba(c: [number, number, number], a: number): string {
  return `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`
}

/** One cumulative depth area — gradient fill + stroke, heights scaled by reveal. */
function drawSide(
  ctx: CanvasRenderingContext2D,
  layout: ChartLayout,
  levels: [number, number][],
  color: [number, number, number],
  zeroY: number,
  heightScale: number,
  scrubDim: number,
) {
  if (levels.length < 1) return
  const { toX, toY, pad, chartH } = layout

  const pts: [number, number][] = levels.map(([p, c]) => [
    toX(p),
    zeroY + (toY(c) - zeroY) * heightScale,
  ])

  // Fill
  const grad = ctx.createLinearGradient(0, pad.top, 0, zeroY)
  grad.addColorStop(0, rgba(color, 0.22 * (1 - scrubDim * 0.5)))
  grad.addColorStop(1, rgba(color, 0.02))
  ctx.beginPath()
  ctx.moveTo(pts[0][0], zeroY)
  for (const [x, y] of pts) ctx.lineTo(x, y)
  ctx.lineTo(pts[pts.length - 1][0], zeroY)
  ctx.closePath()
  ctx.fillStyle = grad
  ctx.fill()

  // Stroke
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
  ctx.strokeStyle = rgba(color, 1 - scrubDim * 0.4)
  ctx.lineWidth = 2
  ctx.lineJoin = 'round'
  ctx.stroke()
}

/** Price axis — nice-interval labels along the bottom. */
function drawPriceAxis(
  ctx: CanvasRenderingContext2D,
  layout: ChartLayout,
  palette: LivelinePalette,
  formatValue: (v: number) => string,
  alpha: number,
) {
  const { pad, chartW, h, leftEdge, rightEdge } = layout
  const range = rightEdge - leftEdge
  if (range <= 0 || alpha < 0.01) return

  // Nice interval targeting ~5 labels
  const raw = range / 4
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const norm = raw / mag
  const interval = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.font = palette.labelFont
  ctx.fillStyle = palette.gridLabel
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  const y = h - pad.bottom + 16
  const first = Math.ceil(leftEdge / interval) * interval
  for (let p = first; p <= rightEdge + interval * 0.001; p += interval) {
    ctx.fillText(formatValue(p), pad.left + ((p - leftEdge) / range) * chartW, y)
  }
  ctx.restore()
}

/**
 * Draw the depth chart — cumulative bid/ask areas meeting at mid price.
 * layout.toX maps price→px (price occupies the layout's time slots).
 */
export function drawDepth(
  ctx: CanvasRenderingContext2D,
  layout: ChartLayout,
  palette: LivelinePalette,
  opts: DepthDrawOptions,
): void {
  const { w, h, pad, chartW, chartH } = layout
  const reveal = opts.chartReveal
  const ramp = (start: number, end: number) => {
    const t = Math.max(0, Math.min(1, (reveal - start) / (end - start)))
    return t * t * (3 - 2 * t)
  }

  const heightScale = ramp(0, 0.85)
  const zeroY = Math.max(pad.top, Math.min(pad.top + chartH, layout.toY(0)))
  const areaAlpha = reveal < 1 ? 0.15 + 0.85 * reveal : 1
  const scrubDim = opts.scrubAmount

  // Areas
  if (areaAlpha > 0.01 && heightScale > 0.01) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(pad.left - 1, pad.top, chartW + 2, chartH)
    ctx.clip()
    ctx.globalAlpha = areaAlpha
    drawSide(ctx, layout, opts.bids, GREEN, zeroY, heightScale, scrubDim)
    drawSide(ctx, layout, opts.asks, RED, zeroY, heightScale, scrubDim)
    ctx.restore()
  }

  // Mid-price dashed vertical
  const midX = layout.toX(opts.midPrice)
  const midAlpha = ramp(0.3, 0.7)
  if (midAlpha > 0.01 && midX >= pad.left && midX <= pad.left + chartW) {
    ctx.save()
    ctx.globalAlpha = midAlpha
    ctx.setLineDash([4, 4])
    ctx.strokeStyle = palette.dashLine
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(midX, pad.top)
    ctx.lineTo(midX, pad.top + chartH)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
  }

  // Price axis
  drawPriceAxis(ctx, layout, palette, opts.formatValue, ramp(0.25, 0.6))

  // Baseline hairline
  const baseAlpha = ramp(0.25, 0.6)
  if (baseAlpha > 0.01) {
    ctx.save()
    ctx.globalAlpha = baseAlpha
    ctx.strokeStyle = palette.gridLine
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(pad.left, zeroY + 0.5)
    ctx.lineTo(pad.left + chartW, zeroY + 0.5)
    ctx.stroke()
    ctx.restore()
  }

  // Hover crosshair — vertical line + "price · size" tooltip
  if (
    opts.hoverPrice !== null && opts.hoverCum !== null &&
    opts.scrubAmount > 0.01 && reveal > 0.7
  ) {
    const hoverX = layout.toX(opts.hoverPrice)
    if (hoverX >= pad.left && hoverX <= pad.left + chartW) {
      const color = opts.hoverSide === 'ask' ? RED : GREEN
      const alpha = opts.scrubAmount

      ctx.save()
      ctx.globalAlpha = alpha * 0.5
      ctx.strokeStyle = palette.crosshairLine
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(hoverX, pad.top)
      ctx.lineTo(hoverX, pad.top + chartH)
      ctx.stroke()
      ctx.restore()

      // Dot on the curve
      const dotY = zeroY + (layout.toY(opts.hoverCum) - zeroY) * heightScale
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.beginPath()
      ctx.arc(hoverX, dotY, 3.5, 0, Math.PI * 2)
      ctx.fillStyle = rgba(color, 1)
      ctx.fill()
      ctx.restore()

      // Tooltip
      const text = `${opts.formatValue(opts.hoverPrice)} · ${opts.formatSize(opts.hoverCum)}`
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.font = palette.valueFont
      const tw = ctx.measureText(text).width
      const tx = Math.max(pad.left + 4, Math.min(hoverX - tw / 2, pad.left + chartW - tw - 4))
      const ty = pad.top + 14
      const bg = palette.bgRgb
      ctx.strokeStyle = `rgb(${bg[0]},${bg[1]},${bg[2]})`
      ctx.lineWidth = 4
      ctx.lineJoin = 'round'
      ctx.strokeText(text, tx, ty)
      ctx.fillStyle = rgba(color, 1)
      ctx.fillText(text, tx, ty)
      ctx.restore()
    }
  }
}
