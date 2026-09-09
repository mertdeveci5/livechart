import type { LivelinePoint, BarPoint } from '../types'

/**
 * Compute visible Y range from data points + current value.
 * Returns { min, max } with margin applied.
 */
export function computeRange(
  visible: LivelinePoint[],
  currentValue: number,
  referenceValue?: number,
  exaggerate?: boolean,
): { min: number; max: number } {
  let targetMin = Infinity
  let targetMax = -Infinity

  for (const p of visible) {
    if (p.value < targetMin) targetMin = p.value
    if (p.value > targetMax) targetMax = p.value
  }

  if (currentValue < targetMin) targetMin = currentValue
  if (currentValue > targetMax) targetMax = currentValue

  // Include reference line so it's always visible
  if (referenceValue !== undefined) {
    if (referenceValue < targetMin) targetMin = referenceValue
    if (referenceValue > targetMax) targetMax = referenceValue
  }

  const rawRange = targetMax - targetMin
  const marginFactor = exaggerate ? 0.01 : 0.12
  const minRange = rawRange * (exaggerate ? 0.02 : 0.1) || (exaggerate ? 0.04 : 0.4)

  if (rawRange < minRange) {
    const mid = (targetMin + targetMax) / 2
    targetMin = mid - minRange / 2
    targetMax = mid + minRange / 2
  } else {
    const margin = rawRange * marginFactor
    targetMin -= margin
    targetMax += margin
  }

  return { min: targetMin, max: targetMax }
}

/**
 * Compute visible Y range for bar charts — anchored to the zero baseline.
 * Bars always include 0 so heights stay proportional; supports negative values.
 */
export function computeBarsRange(
  visible: BarPoint[],
  liveValue?: number,
): { min: number; max: number } {
  let min = 0
  let max = 0
  for (const b of visible) {
    if (b.value < min) min = b.value
    if (b.value > max) max = b.value
  }
  if (liveValue !== undefined) {
    if (liveValue < min) min = liveValue
    if (liveValue > max) max = liveValue
  }
  if (max - min < 0.001) {
    // Flat data — give a nominal range above zero (or below if negative)
    if (min < 0) max = 0
    else max = 1
  }
  // Margin above the tallest bar (and below the deepest negative bar)
  const range = max - min
  const margin = range * 0.1
  if (max > 0) max += margin
  if (min < 0) min -= margin
  return { min, max }
}

/** Normalize a gauge value to 0–1 progress between min and max. */
export function normalizeGaugeValue(value: number, min: number, max: number): number {
  const span = max - min
  if (span <= 0) return 0
  const t = (value - min) / span
  return t < 0 ? 0 : t > 1 ? 1 : t
}
