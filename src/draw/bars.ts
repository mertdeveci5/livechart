import type { ChartLayout, LivelinePalette, BarPoint } from '../types'

/** Parse "#rrggbb" or "rgb(r,g,b)" to [r,g,b]. */
function parseRgb(color: string): [number, number, number] {
  const hex = color.match(/^#([0-9a-f]{6})$/i)
  if (hex) {
    const h = hex[1]
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
  }
  const rgb = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (rgb) return [+rgb[1], +rgb[2], +rgb[3]]
  return [128, 128, 128]
}

/** Rounded-top rect path (rounds the end away from the baseline). */
function barPath(
  ctx: CanvasRenderingContext2D,
  x: number, yTop: number, w: number, h: number, r: number, roundTop: boolean,
) {
  const rr = Math.min(r, w / 2, h)
  if (rr <= 0.5) {
    ctx.rect(x, yTop, w, h)
    return
  }
  const yBottom = yTop + h
  if (roundTop) {
    ctx.moveTo(x, yBottom)
    ctx.lineTo(x, yTop + rr)
    ctx.arcTo(x, yTop, x + rr, yTop, rr)
    ctx.lineTo(x + w - rr, yTop)
    ctx.arcTo(x + w, yTop, x + w, yTop + rr, rr)
    ctx.lineTo(x + w, yBottom)
  } else {
    ctx.moveTo(x, yTop)
    ctx.lineTo(x + w, yTop)
    ctx.lineTo(x + w, yBottom - rr)
    ctx.arcTo(x + w, yBottom, x + w - rr, yBottom, rr)
    ctx.lineTo(x + rr, yBottom)
    ctx.arcTo(x, yBottom, x, yBottom - rr, rr)
    ctx.lineTo(x, yTop)
  }
  ctx.closePath()
}

/**
 * Draw live-updating bar buckets anchored to the zero baseline.
 * Respects incoming ctx.globalAlpha for cross-fade/reveal support.
 *
 * - Committed bars: accent color, slightly translucent
 * - Live bar: full alpha + subtle brightness pulse
 * - Scrub: bars away from the cursor dim spatially
 * - heightScale (0–1): reveal morph — bars grow from the baseline
 */
export function drawBars(
  ctx: CanvasRenderingContext2D,
  layout: ChartLayout,
  palette: LivelinePalette,
  bars: BarPoint[],
  barWidthSecs: number,
  liveTime: number,
  now_ms: number,
  scrubX: number | null,
  scrubDim: number,
  liveAlpha = 1,
  heightScale = 1,
) {
  if (bars.length === 0) return

  const { toX, toY, pad, chartW, chartH } = layout
  const pxPerSec = chartW / (layout.rightEdge - layout.leftEdge)
  const slotW = barWidthSecs * pxPerSec
  const bodyW = Math.max(1, slotW * 0.72)
  const half = bodyW / 2
  const radius = bodyW > 8 ? 2.5 : bodyW > 4 ? 1.5 : 0
  const padL = pad.left
  const padR = pad.left + chartW

  // Baseline (zero line) in screen space, clamped into the chart area
  const zeroY = Math.max(pad.top, Math.min(pad.top + chartH, toY(0)))

  const [ar, ag, ab] = parseRgb(palette.line)
  const livePulse = 0.1 + Math.sin(now_ms * 0.004) * 0.06

  // Baseline hairline
  ctx.save()
  ctx.strokeStyle = palette.gridLine
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(padL, zeroY + 0.5)
  ctx.lineTo(padR, zeroY + 0.5)
  ctx.stroke()
  ctx.restore()

  for (const b of bars) {
    const cx = toX(b.time + barWidthSecs / 2)
    if (cx + half < padL || cx - half > padR) continue

    const isLive = b.time === liveTime
    const valueY = toY(b.value)
    // Reveal morph — scale bar height toward the baseline.
    // Live bar additionally grows in on birth (no pop when a bucket rolls over).
    const birthScale = isLive ? 0.2 + 0.8 * liveAlpha : 1
    const topRaw = zeroY + (valueY - zeroY) * heightScale * birthScale
    const h = Math.abs(zeroY - topRaw)
    if (h < 0.5) continue
    const yTop = Math.min(zeroY, topRaw)
    const roundTop = b.value >= 0

    // Scrub dimming — smooth spatial falloff from cursor
    let alpha = isLive ? 0.3 + 0.7 * liveAlpha : 0.85
    if (scrubX !== null && scrubDim > 0.01) {
      const dist = Math.abs(cx - scrubX)
      const fadeRange = slotW * 3
      const dim = dist < fadeRange
        ? 1
        : Math.max(0.25, 1 - (dist - fadeRange) / (chartW * 0.4))
      alpha *= 1 - (1 - dim) * scrubDim
    }
    if (isLive) alpha = Math.min(1, alpha + livePulse)

    ctx.beginPath()
    barPath(ctx, cx - half, yTop, bodyW, h, radius, roundTop)
    ctx.fillStyle = `rgba(${ar},${ag},${ab},${alpha.toFixed(3)})`
    ctx.fill()
  }
}
