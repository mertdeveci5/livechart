import { describe, it, expect } from 'vitest'
import { computeDepthProfile, depthCumAt } from '../depth'

const book = {
  bids: [[100, 2], [99, 5], [98, 3]] as [number, number][],
  asks: [[101, 4], [102, 6], [103, 2]] as [number, number][],
}

describe('computeDepthProfile', () => {
  it('accumulates bids from best price downward', () => {
    const p = computeDepthProfile(book)!
    // ascending by price; cum includes all bids >= that price
    expect(p.bids).toEqual([[98, 10], [99, 7], [100, 2]])
  })

  it('accumulates asks from best price upward', () => {
    const p = computeDepthProfile(book)!
    expect(p.asks).toEqual([[101, 4], [102, 10], [103, 12]])
  })

  it('computes mid price from best bid/ask', () => {
    expect(computeDepthProfile(book)!.midPrice).toBe(100.5)
  })

  it('covers the full price span with margin', () => {
    const p = computeDepthProfile(book)!
    expect(p.minPrice).toBeLessThan(98)
    expect(p.maxPrice).toBeGreaterThan(103)
  })

  it('takes maxCum from the larger side', () => {
    expect(computeDepthProfile(book)!.maxCum).toBe(12)
  })

  it('returns null for an empty book', () => {
    expect(computeDepthProfile({ bids: [], asks: [] })).toBeNull()
  })

  it('handles a one-sided book', () => {
    const p = computeDepthProfile({ bids: [[100, 2], [99, 3]], asks: [] })!
    expect(p.midPrice).toBe(100)
    expect(p.maxCum).toBe(5)
    expect(p.asks).toEqual([])
  })
})

describe('depthCumAt', () => {
  const levels: [number, number][] = [[98, 10], [99, 7], [100, 2]]

  it('interpolates between levels', () => {
    expect(depthCumAt(levels, 99.5)).toBeCloseTo(4.5)
  })

  it('clamps to the ends', () => {
    expect(depthCumAt(levels, 90)).toBe(10)
    expect(depthCumAt(levels, 110)).toBe(2)
  })

  it('returns 0 for empty levels', () => {
    expect(depthCumAt([], 100)).toBe(0)
  })
})
