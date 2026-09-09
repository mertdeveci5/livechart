import React, { useState, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { Liveline } from 'liveline'
import type { LivelinePoint, CandlePoint, BarPoint } from 'liveline'

// --- Design tokens (alphafrontend / tlmc system) ---
const PRIMARY = '#548eff'
const CHART_1 = '#83bdff'
const CHART_4 = '#4074fb'
const CHART_5 = '#3257ee'
const MUTED_BG = '#ecedef'
const MUTED_FG = '#71717b'
const BORDER = '#e4e4e7'
const SERIF = "'Source Serif 4', Georgia, serif"

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

/** Tick stream aggregated into OHLC candles. */
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

/** Volume-style bars — each tick adds to the current bucket. */
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

/** Slowly oscillating gauge value (0–100). */
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

// --- Hero mark ---

function HeroMark() {
  return (
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: 12,
        background: MUTED_BG,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
      }}
    >
      <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
        <defs>
          <linearGradient id="heroFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PRIMARY} stopOpacity="0.25" />
            <stop offset="100%" stopColor={PRIMARY} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M4 30 C8 30 9 22 13 22 C17 22 18 26 21 26 C24 26 25 14 29 14 C32 14 33 18 36 18 L36 36 L4 36 Z"
          fill="url(#heroFill)"
        />
        <path
          d="M4 30 C8 30 9 22 13 22 C17 22 18 26 21 26 C24 26 25 14 29 14 C32 14 33 18 36 18"
          stroke={PRIMARY}
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="36" cy="18" r="3" fill={PRIMARY} />
        <circle cx="36" cy="18" r="3" fill="none" stroke={PRIMARY} strokeWidth="1.5" opacity="0.4">
          <animate attributeName="r" values="3;7" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0" dur="1.6s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  )
}

// --- Section (alphafrontend LandingSection pattern) ---

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '40px 0 8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <span style={{ fontSize: 15, color: PRIMARY, flexShrink: 0 }}>{label}.</span>
        <div style={{ flexGrow: 1, borderBottom: `1px solid ${BORDER}`, marginLeft: 16 }} />
      </div>
      {children}
    </div>
  )
}

// --- Chart card: borderless muted surface, white well, label below ---

function Card({ label, children }: { label: string; children: React.ReactNode }) {
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
      <div style={{ fontSize: 14, color: '#3f3f46', marginTop: 12 }}>{label}</div>
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
          d="M16 4 A12 12 0 1 1 4 16 L16 16 Z"
          stroke={MUTED_FG}
          strokeWidth="1.5"
          strokeLinejoin="round"
          opacity="0.5"
        />
        <path
          d="M16 16 L16 4 A12 12 0 0 1 27.8 10"
          stroke={MUTED_FG}
          strokeWidth="1.5"
          strokeLinejoin="round"
          opacity="0.25"
        />
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
      data={[]}
      value={0}
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
      data={[]}
      value={0}
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
      data={[]}
      value={0}
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
      data={[]}
      value={value}
      min={0}
      max={100}
      color={CHART_5}
      theme="light"
      formatValue={(v) => `${v.toFixed(0)}%`}
    />
  )
}

// --- Page ---

function App() {
  return (
    <div style={{ maxWidth: 768, margin: '0 auto', padding: '64px 24px 64px' }}>
      <HeroMark />
      <h1
        style={{
          fontFamily: SERIF,
          fontSize: 38,
          fontWeight: 500,
          letterSpacing: '-0.01em',
          marginBottom: 8,
        }}
      >
        Livechart<span style={{ color: PRIMARY }}>.</span>
      </h1>
      <p style={{ fontSize: 17, lineHeight: 1.6, color: MUTED_FG, maxWidth: 560, marginBottom: 20 }}>
        Real-time animated charts for React. Line, multi-series, candlestick, bars, and gauge —
        canvas-rendered at 60fps, zero dependencies, one accent color.
      </p>
      <div
        style={{
          display: 'inline-block',
          fontFamily: '"SF Mono", Menlo, monospace',
          fontSize: 13,
          background: MUTED_BG,
          borderRadius: 8,
          padding: '8px 14px',
          color: '#3f3f46',
        }}
      >
        pnpm add livechart-react
      </div>

      <Section label="Line">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Card label="Line">
            <ClassicChart />
          </Card>
          <Card label="Multi-series">
            <MultiSeriesChart />
          </Card>
          <Card label="Momentum">
            <MomentumChart />
          </Card>
          <Card label="Dashboard">
            <DashboardChart />
          </Card>
        </div>
      </Section>

      <Section label="Beyond line">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Card label="Candlestick">
            <CandlestickChart />
          </Card>
          <Card label="Bars">
            <BarsChart />
          </Card>
          <Card label="Gauge">
            <GaugeChart />
          </Card>
          <PlaceholderCard label="Donut — up next" />
        </div>
      </Section>

      <p style={{ fontSize: 13, color: MUTED_FG, marginTop: 40 }}>
        Fork of{' '}
        <a href="https://github.com/benjitaylor/liveline" style={{ color: MUTED_FG }}>liveline</a>
        {' '}by Benji Taylor · MIT ·{' '}
        <a href="https://github.com/mertdeveci5/livechart" style={{ color: MUTED_FG }}>GitHub</a>
      </p>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
