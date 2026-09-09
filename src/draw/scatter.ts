import type { ChartLayout, LivelinePalette, LivelinePoint } from '../types'
import { drawDot } from './dot'

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

/**
 * Draw streamed points as unconnected dots — liveline's dot language
 * applied to sparse data. Dots pop in over ~250ms after birth, dim
 * spatially away from the scrub cursor, and the live value gets the
 * standard pulsing dot. Returns the live dot position for badge/pulse.
 */
export function drawScatter(
  ctx: CanvasRenderingContext2D,
  layout: ChartLayout,
  palette: LivelinePalette,
  visible: LivelinePoint[],
  smoothValue: number,
  now: number,
  dotSize: number,
  scrubX: number | null,
  scrubDim: number,
  hoveredTime: number | null,
  reveal: number,
  now_ms: number,
  showPulse: boolean,
): [number, number] | null {
  if (visible.length === 0) return null

  const { toX, toY, pad, chartW } = layout
  const [ar, ag, ab] = parseRgb(palette.line)
  const padL = pad.left
  const padR = pad.left + chartW

  // Reveal ramp — dots fade in staggered with the grid
  const dotAlpha = reveal < 1
    ? Math.max(0, Math.min(1, (reveal - 0.2) / 0.5))
    : 1
  if (dotAlpha < 0.01) return null

  for (const p of visible) {
    const x = toX(p.time)
    if (x < padL - dotSize || x > padR + dotSize) continue
    const y = toY(p.value)

    // Pop-in: scale radius by age (points older than the window skip this)
    const age = now - p.time
    const birth = age < 0.25 ? Math.max(0.3, age / 0.25) : 1
    const r = dotSize * birth

    // Scrub dimming — spatial falloff from cursor
    let alpha = 0.85
    if (scrubX !== null && scrubDim > 0.01) {
      const dist = Math.abs(x - scrubX)
      const dim = dist < 40 ? 1 : Math.max(0.2, 1 - (dist - 40) / (chartW * 0.35))
      alpha *= 1 - (1 - dim) * scrubDim
    }

    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${ar},${ag},${ab},${(alpha * dotAlpha).toFixed(3)})`
    ctx.fill()

    // Hovered dot — accent ring highlight
    if (hoveredTime !== null && p.time === hoveredTime) {
      ctx.beginPath()
      ctx.arc(x, y, r + 3, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(${ar},${ag},${ab},${(0.6 * dotAlpha).toFixed(3)})`
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
  }

  // Live dot — same pulsing dot as line mode
  const liveX = toX(now)
  const liveY = toY(smoothValue)
  if (liveX >= padL && liveX <= padR && reveal > 0.3) {
    const liveAlpha = (reveal - 0.3) / 0.7
    ctx.save()
    ctx.globalAlpha = liveAlpha
    drawDot(ctx, liveX, liveY, palette, showPulse, scrubX !== null ? scrubDim : 0, now_ms)
    ctx.restore()
    return [liveX, liveY]
  }
  return null
}
