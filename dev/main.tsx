import React, { useState, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { Liveline } from 'liveline'
import type { LivelinePoint, CandlePoint, BarPoint, DonutSegment } from 'liveline'
import {
  PRIMARY, CHART_1, CHART_4, CHART_5, MUTED_BG, MUTED_FG, BORDER,
  HeroMark, Wordmark, Section, PageShell, Footer, Chip,
} from './site'

// --- Live data hooks ---

type Volatility = 'calm' | 'normal' | 'spiky'

const VOL_SCALE: Record<Volatility, number> = { calm: 0.15, normal: 0.8, spiky: 3 }

function nextPoint(prev: number, time: number, vol: Volatility): LivelinePoint {
  const scale = VOL_SCALE[vol]
  const spike = vol === 'spiky' && Math.random() < 0.08 ? (Math.random() - 0.5) * scale * 3 : 0
  return { time, value: prev + (Math.random() - 0.48) * scale + spike }
}

function useLiveData(vol: Volatility = 'normal', tickMs = 100, base = 100) {
  const [data, setData] = useState<LivelinePoint[]>([])
  const [value, setValue] = useState(base)
  const stateRef = useRef({ data: [] as LivelinePoint[], value: base })

  useEffect(() => {
    const now = Date.now() / 1000
    const seed: LivelinePoint[] = []
    let v = base
    for (let t = now - 60; t < now; t += tickMs / 1000) {
      v = nextPoint(v, t, vol).value
      seed.push({ time: t, value: v })
    }
    stateRef.current = { data: seed, value: v }
    setData(seed)
    setValue(v)

    const id = setInterval(() => {
      const s = stateRef.current
      const p = nextPoint(s.value, Date.now() / 1000, vol)
      const next = [...s.data, p].slice(-1200)
      stateRef.current = { data: next, value: p.value }
      setData(next)
      setValue(p.value)
    }, tickMs)
    return () => clearInterval(id)
  }, [vol, tickMs, base])

  return { data, value }
}

function useMultiLiveData(count: number, vol: Volatility = 'normal', tickMs = 100) {
  const streams = Array.from({ length: count }, (_, i) => useLiveData(vol, tickMs, 100 + i * 20))
  return streams
}

function useScatterData(base = 100) {
  const [data, setData] = useState<LivelinePoint[]>([])
  const [value, setValue] = useState(base)

  useEffect(() => {
    let v = base
    const now = Date.now() / 1000
    const seed: LivelinePoint[] = []
    for (let t = now - 45; t < now; t += 0.25 + Math.random() * 0.55) {
      v += (Math.random() - 0.5) * 3
      seed.push({ time: t, value: v })
    }
    v = seed[seed.length - 1].value
    const ref = { data: seed, value: v }
    setData(seed)
    setValue(v)

    let timeout: ReturnType<typeof setTimeout>
    const tick = () => {
      ref.value += (Math.random() - 0.5) * 3
      const p = { time: Date.now() / 1000, value: ref.value }
      ref.data = [...ref.data, p].slice(-400)
      setData(ref.data)
      setValue(ref.value)
      timeout = setTimeout(tick, 200 + Math.random() * 450)
    }
    timeout = setTimeout(tick, 300)
    return () => clearTimeout(timeout)
  }, [base])

  return { data, value }
}

function useDonutData(tickMs = 900) {
  const [segments, setSegments] = useState<DonutSegment[]>([
    { id: 'alpha', value: 34, label: 'Alpha', color: PRIMARY },
    { id: 'beta', value: 26, label: 'Beta', color: CHART_4 },
    { id: 'gamma', value: 22, label: 'Gamma', color: CHART_1 },
    { id: 'delta', value: 18, label: 'Delta', color: CHART_5 },
  ])

  useEffect(() => {
    const id = setInterval(() => {
      setSegments((prev) =>
        prev.map((s) => ({
          ...s,
          value: Math.max(6, s.value + (Math.random() - 0.5) * 8),
        })),
      )
    }, tickMs)
    return () => clearInterval(id)
  }, [tickMs])

  return segments
}

function useCandleData(tickMs = 250, candleWidth = 5) {
  const [state, setState] = useState<{ candles: CandlePoint[]; live: CandlePoint | null }>({
    candles: [],
    live: null,
  })

  useEffect(() => {
    let value = 100
    const now = Date.now() / 1000
    const candles: CandlePoint[] = []
    let slot = Math.floor((now - 90) / candleWidth) * candleWidth
    let o = value, hi = value, lo = value, c = value
    for (let t = now - 90; t < now; t += tickMs / 1000) {
      value += (Math.random() - 0.48) * 0.8
      if (t >= slot + candleWidth) {
        candles.push({ time: slot, open: o, high: hi, low: lo, close: c })
        slot = Math.floor(t / candleWidth) * candleWidth
        o = value; hi = value; lo = value; c = value
      } else {
        c = value
        if (c > hi) hi = c
        if (c < lo) lo = c
      }
    }
    const ref = {
      candles,
      live: { time: slot, open: o, high: hi, low: lo, close: c } as CandlePoint,
      value,
    }
    setState({ candles: [...ref.candles], live: { ...ref.live } })

    const id = setInterval(() => {
      const t = Date.now() / 1000
      ref.value += (Math.random() - 0.48) * 0.8
      const v = ref.value
      const s = Math.floor(t / candleWidth) * candleWidth
      if (s > ref.live.time) {
        ref.candles = [...ref.candles, ref.live].slice(-60)
        ref.live = { time: s, open: v, high: v, low: v, close: v }
      } else {
        ref.live = {
          ...ref.live,
          close: v,
          high: Math.max(ref.live.high, v),
          low: Math.min(ref.live.low, v),
        }
      }
      setState({ candles: ref.candles, live: ref.live })
    }, tickMs)
    return () => clearInterval(id)
  }, [tickMs, candleWidth])

  return state
}

function useBarsData(tickMs = 100, barWidth = 2) {
  const [state, setState] = useState<{ bars: BarPoint[]; live: BarPoint | null }>({
    bars: [],
    live: null,
  })

  useEffect(() => {
    const now = Date.now() / 1000
    const bars: BarPoint[] = []
    for (let t = Math.floor((now - 60) / barWidth) * barWidth; t < now; t += barWidth) {
      bars.push({ time: t, value: 10 + Math.random() * 40 + (Math.random() < 0.1 ? 40 : 0) })
    }
    const ref = {
      bars,
      live: { time: Math.floor(now / barWidth) * barWidth, value: Math.random() * 10 } as BarPoint,
    }
    setState({ bars: [...ref.bars], live: { ...ref.live } })

    const id = setInterval(() => {
      const t = Date.now() / 1000
      const s = Math.floor(t / barWidth) * barWidth
      if (s > ref.live.time) {
        ref.bars = [...ref.bars, ref.live].slice(-60)
        ref.live = { time: s, value: 2 + Math.random() * 6 }
      } else {
        const spike = Math.random() < 0.02 ? 15 : 0
        ref.live = { ...ref.live, value: ref.live.value + Math.random() * 3 + spike }
      }
      setState({ bars: ref.bars, live: ref.live })
    }, tickMs)
    return () => clearInterval(id)
  }, [tickMs, barWidth])

  return state
}

function useGaugeData(tickMs = 200) {
  const [value, setValue] = useState(62)

  useEffect(() => {
    const id = setInterval(() => {
      setValue((v) => {
        const target = 55 + Math.sin(Date.now() / 9000) * 28
        return Math.max(2, Math.min(98, v + (target - v) * 0.04 + (Math.random() - 0.5) * 4))
      })
    }, tickMs)
    return () => clearInterval(id)
  }, [tickMs])

  return value
}

// --- Chart card: borderless muted surface, white well, linked label below ---

function Card({ label, href, children }: { label: string; href: string; children: React.ReactNode }) {
  return (
    <div
      className="lc-card"
      style={{
        aspectRatio: '1 / 1',
        background: MUTED_BG,
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          background: '#fff',
          borderRadius: 8,
          padding: 12,
        }}
      >
        {children}
      </div>
      <a href={href} className="lc-link" style={{ fontSize: 14, marginTop: 12, textDecoration: 'none' }}>
        {label} <span style={{ fontSize: 12 }}>→</span>
      </a>
    </div>
  )
}

function PlaceholderCard({ label }: { label: string }) {
  return (
    <div
      style={{
        aspectRatio: '1 / 1',
        borderRadius: 12,
        border: `1.5px dashed ${BORDER}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path
          d="M6 20 C10 20 11 12 16 12 C21 12 22 18 26 18"
          stroke={MUTED_FG}
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path d="M6 26 L26 26" stroke={MUTED_FG} strokeWidth="1.5" strokeLinecap="round" opacity="0.25" />
        <path d="M6 20 L6 26 L26 26 L26 18" fill={MUTED_FG} opacity="0.08" />
      </svg>
      <div style={{ fontSize: 14, color: MUTED_FG }}>{label}</div>
    </div>
  )
}

// --- Variants ---

function ClassicChart() {
  const { data, value } = useLiveData('normal')
  return <Liveline data={data} value={value} color={PRIMARY} theme="light" window={30} />
}

function MultiSeriesChart() {
  const [a, b, c] = useMultiLiveData(3)
  return (
    <Liveline
      theme="light"
      window={30}
      series={[
        { id: 'a', data: a.data, value: a.value, color: PRIMARY, label: 'Alpha' },
        { id: 'b', data: b.data, value: b.value, color: CHART_4, label: 'Beta' },
        { id: 'c', data: c.data, value: c.value, color: CHART_1, label: 'Gamma' },
      ]}
    />
  )
}

function MomentumChart() {
  const { data, value } = useLiveData('spiky')
  return (
    <Liveline
      data={data}
      value={value}
      color={CHART_5}
      theme="light"
      window={30}
      exaggerate
      degen
      showValue
      valueMomentumColor
    />
  )
}

function DashboardChart() {
  const { data, value } = useLiveData('calm')
  return (
    <Liveline
      data={data}
      value={value}
      color={CHART_4}
      theme="light"
      badge={false}
      showValue
      windows={[
        { label: '15s', secs: 15 },
        { label: '30s', secs: 30 },
        { label: '1m', secs: 60 },
      ]}
    />
  )
}

function CandlestickChart() {
  const { candles, live } = useCandleData(250, 5)
  return (
    <Liveline
      mode="candle"
      candles={candles}
      candleWidth={5}
      liveCandle={live ?? undefined}
      color={PRIMARY}
      theme="light"
      window={60}
    />
  )
}

function BarsChart() {
  const { bars, live } = useBarsData(100, 2)
  return (
    <Liveline
      mode="bars"
      bars={bars}
      barWidth={2}
      liveBar={live ?? undefined}
      color={CHART_4}
      theme="light"
      window={30}
      formatValue={(v) => v.toFixed(0)}
    />
  )
}

function GaugeChart() {
  const value = useGaugeData(200)
  return (
    <Liveline
      mode="gauge"
      value={value}
      min={0}
      max={100}
      color={CHART_5}
      theme="light"
      formatValue={(v) => `${v.toFixed(0)}%`}
    />
  )
}

function DonutChart() {
  const segments = useDonutData(900)
  return (
    <Liveline
      mode="donut"
      segments={segments}
      theme="light"
      formatValue={(v) => v.toFixed(0)}
    />
  )
}

function ScatterChart() {
  const { data, value } = useScatterData()
  return (
    <Liveline
      mode="scatter"
      data={data}
      value={value}
      color={PRIMARY}
      theme="light"
      window={30}
    />
  )
}

// --- Page ---

function App() {
  return (
    <PageShell>
      <HeroMark />
      <Wordmark>Livechart</Wordmark>
      <p style={{ fontSize: 17, lineHeight: 1.6, color: MUTED_FG, maxWidth: 560, marginBottom: 20 }}>
        Real-time animated charts for React. Line, multi-series, candlestick, bars, gauge,
        donut, and scatter — canvas-rendered at 60fps, zero dependencies, one accent color.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Chip>pnpm add livechart-react</Chip>
        <a href="docs.html" className="lc-link" style={{ fontSize: 14, textDecoration: 'none' }}>
          Docs →
        </a>
      </div>

      <Section label="Line" id="line">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Card label="Line" href="docs.html#line">
            <ClassicChart />
          </Card>
          <Card label="Multi-series" href="docs.html#multi-series">
            <MultiSeriesChart />
          </Card>
          <Card label="Momentum" href="docs.html#line">
            <MomentumChart />
          </Card>
          <Card label="Dashboard" href="docs.html#line">
            <DashboardChart />
          </Card>
        </div>
      </Section>

      <Section label="Beyond line" id="beyond-line">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Card label="Candlestick" href="docs.html#candlestick">
            <CandlestickChart />
          </Card>
          <Card label="Bars" href="docs.html#bars">
            <BarsChart />
          </Card>
          <Card label="Gauge" href="docs.html#gauge">
            <GaugeChart />
          </Card>
          <Card label="Donut" href="docs.html#donut">
            <DonutChart />
          </Card>
          <Card label="Scatter" href="docs.html#scatter">
            <ScatterChart />
          </Card>
          <PlaceholderCard label="Depth — up next" />
        </div>
      </Section>

      <Footer />
    </PageShell>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
