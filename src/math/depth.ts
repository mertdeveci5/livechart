import type { OrderbookData } from '../types'

export interface DepthProfile {
  /** Cumulative bid levels, ascending by price — cum decreases toward mid */
  bids: [number, number][]
  /** Cumulative ask levels, ascending by price — cum increases away from mid */
  asks: [number, number][]
  midPrice: number
  minPrice: number
  maxPrice: number
  maxCum: number
}

/**
 * Compute a cumulative depth profile from raw orderbook levels.
 * At price p on the bid side, cum = total size of bids at price >= p;
 * on the ask side, cum = total size of asks at price <= p.
 * The curves meet low at mid price — the classic depth-chart valley.
 */
export function computeDepthProfile(book: OrderbookData): DepthProfile | null {
  const bidsDesc = [...book.bids].sort((a, b) => b[0] - a[0])
  const asksAsc = [...book.asks].sort((a, b) => a[0] - b[0])
  if (bidsDesc.length === 0 && asksAsc.length === 0) return null

  let cum = 0
  const cumBids: [number, number][] = bidsDesc.map(([p, s]): [number, number] => [p, (cum += s)]).reverse()
  cum = 0
  const cumAsks: [number, number][] = asksAsc.map(([p, s]): [number, number] => [p, (cum += s)])

  const bestBid = bidsDesc.length > 0 ? bidsDesc[0][0] : NaN
  const bestAsk = asksAsc.length > 0 ? asksAsc[0][0] : NaN
  const worstBid = bidsDesc.length > 0 ? bidsDesc[bidsDesc.length - 1][0] : NaN
  const worstAsk = asksAsc.length > 0 ? asksAsc[asksAsc.length - 1][0] : NaN

  // Mid price — mean of best bid/ask; one-sided books use the best level
  const midPrice = isFinite(bestBid) && isFinite(bestAsk)
    ? (bestBid + bestAsk) / 2
    : isFinite(bestBid) ? bestBid : bestAsk

  // Price range with a 2% margin on each side; one-sided books mirror the span
  const bidSpan = isFinite(bestBid) && isFinite(worstBid) ? bestBid - worstBid : 0
  const askSpan = isFinite(bestAsk) && isFinite(worstAsk) ? worstAsk - bestAsk : 0
  const minPrice = isFinite(worstBid) ? worstBid : midPrice - (askSpan || midPrice * 0.01)
  const maxPrice = isFinite(worstAsk) ? worstAsk : midPrice + (bidSpan || midPrice * 0.01)
  const span = Math.max(maxPrice - minPrice, 1e-9)

  const maxCum = Math.max(
    cumBids.length > 0 ? cumBids[0][1] : 0,
    cumAsks.length > 0 ? cumAsks[cumAsks.length - 1][1] : 0,
  )

  return {
    bids: cumBids,
    asks: cumAsks,
    midPrice,
    minPrice: minPrice - span * 0.02,
    maxPrice: maxPrice + span * 0.02,
    maxCum,
  }
}

/** Linear-interpolated cumulative size at a price within one side's levels. */
export function depthCumAt(levels: [number, number][], price: number): number {
  if (levels.length === 0) return 0
  if (price <= levels[0][0]) return levels[0][1]
  if (price >= levels[levels.length - 1][0]) return levels[levels.length - 1][1]
  let lo = 0
  let hi = levels.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (levels[mid][0] <= price) lo = mid
    else hi = mid
  }
  const [p1, c1] = levels[lo]
  const [p2, c2] = levels[hi]
  const span = p2 - p1
  if (span === 0) return c1
  const t = (price - p1) / span
  return c1 + (c2 - c1) * t
}
