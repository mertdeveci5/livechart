import type { LivelinePalette } from '../types'

export interface GaugeDrawOptions {
  /** Normalized value 0–1 (already smoothed by the engine) */
  t: number
  /** Reveal progress 0–1 — arc sweeps in */
  chartReveal: number
  /** Formatted center value text */
  valueText: string
  minText: string
  maxText: string
  now_ms: number
  /** Show pulsing ring on the arc tip dot */
  showPulse: boolean
}

// Arc geometry — classic 240° gauge with the gap at the bottom
const START_ANGLE = (Math.PI * 5) / 6   // 150°
const SWEEP = (Math.PI * 4) / 3         // 240°

/**
 * Draw a radial gauge for a single live value.
 * Track + value arc with rounded caps, live dot at the arc tip,
 * center value text, min/max labels at the arc ends.
 */
export function drawGauge(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pad: { top: number; right: number; bottom: number; left: number },
  palette: LivelinePalette,
  opts: GaugeDrawOptions,
): void {
  const chartW = w - pad.left - pad.right
  const chartH = h - pad.top - pad.bottom
  const cx = pad.left + chartW / 2
  // Center sits slightly below middle so the arc + center text balance
  const cy = pad.top + chartH * 0.56
  const radius = Math.max(24, Math.min(chartW, chartH * 1.15) * 0.42)
  const trackW = Math.max(6, radius * 0.11)

  const reveal = opts.chartReveal
  if (reveal < 0.01) return

  // Smoothstep for reveal ramp
  const ramp = (start: number, end: number) => {
    const t = Math.max(0, Math.min(1, (reveal - start) / (end - start)))
    return t * t * (3 - 2 * t)
  }

  const valueAngle = START_ANGLE + SWEEP * opts.t * ramp(0, 0.85)

  // 1. Track
  const trackAlpha = ramp(0.1, 0.5)
  if (trackAlpha > 0.01) {
    ctx.save()
    ctx.globalAlpha = trackAlpha
    ctx.beginPath()
    ctx.arc(cx, cy, radius, START_ANGLE, START_ANGLE + SWEEP)
    ctx.strokeStyle = palette.gridLine
    ctx.lineWidth = trackW
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.restore()
  }

  // 2. Value arc
  if (opts.t > 0.001 && ramp(0, 0.85) > 0.01) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, radius, START_ANGLE, valueAngle)
    ctx.strokeStyle = palette.line
    ctx.lineWidth = trackW
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.restore()
  }

  // 3. Live dot at the arc tip
  const dotAlpha = ramp(0.5, 0.9)
  if (dotAlpha > 0.01 && opts.t > 0.001) {
    const dx = cx + Math.cos(valueAngle) * radius
    const dy = cy + Math.sin(valueAngle) * radius
    const dotR = trackW * 0.55
    ctx.save()
    ctx.globalAlpha = dotAlpha
    // Pulse ring
    if (opts.showPulse) {
      const pulse = (opts.now_ms % 2000) / 2000
      const ringR = dotR + pulse * dotR * 2.2
      ctx.beginPath()
      ctx.arc(dx, dy, ringR, 0, Math.PI * 2)
      ctx.strokeStyle = palette.line
      ctx.lineWidth = 1.5
      ctx.globalAlpha = dotAlpha * (1 - pulse) * 0.5
      ctx.stroke()
      ctx.globalAlpha = dotAlpha
    }
    ctx.beginPath()
    ctx.arc(dx, dy, dotR, 0, Math.PI * 2)
    ctx.fillStyle = palette.line
    ctx.fill()
    ctx.restore()
  }

  // 4. Center value text
  const textAlpha = ramp(0.4, 0.8)
  if (textAlpha > 0.01) {
    ctx.save()
    ctx.globalAlpha = textAlpha
    ctx.font = `600 ${Math.max(18, radius * 0.32)}px "SF Mono", Menlo, monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = palette.tooltipText
    ctx.fillText(opts.valueText, cx, cy)
    ctx.restore()
  }

  // 5. Min/max labels at the arc ends
  const labelAlpha = ramp(0.3, 0.7)
  if (labelAlpha > 0.01) {
    const labelR = radius + trackW * 1.6
    ctx.save()
    ctx.globalAlpha = labelAlpha
    ctx.font = palette.labelFont
    ctx.fillStyle = palette.gridLabel
    ctx.textBaseline = 'top'
    const startX = cx + Math.cos(START_ANGLE) * labelR
    const startY = cy + Math.sin(START_ANGLE) * labelR
    const endX = cx + Math.cos(START_ANGLE + SWEEP) * labelR
    const endY = cy + Math.sin(START_ANGLE + SWEEP) * labelR
    ctx.textAlign = 'left'
    ctx.fillText(opts.minText, startX, startY)
    ctx.textAlign = 'right'
    ctx.fillText(opts.maxText, endX, endY)
    ctx.restore()
  }
}
