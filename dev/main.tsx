import React, { useState, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { Liveline } from 'liveline'
import type { LivelinePoint } from 'liveline'

// --- tlmc design tokens ---
const PRIMARY = '#548eff'
const CHART_1 = '#83bdff'
const CHART_4 = '#4074fb'
const CHART_5 = '#3257ee'
const BORDER = '#e4e4e7'
const MUTED = '#71717b'

// --- Live data hook ---

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
    // Seed history so the chart doesn't start empty
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

// --- Hero mark ---

function HeroMark() {
  return (
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: 14,
        background: '#fff',
        border: `1px solid ${BORDER}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
      }}
    >
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
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

// --- Chart card ---

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        aspectRatio: '1 / 1',
        background: '#fff',
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ fontSize: 12, color: MUTED, marginBottom: 8, fontWeight: 500 }}>{label}</div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{children}</div>
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

// --- Page ---

function App() {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '96px 24px 64px' }}>
      <HeroMark />
      <h1 style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 12 }}>
        Livechart
      </h1>
      <p style={{ fontSize: 16, lineHeight: 1.6, color: MUTED, marginBottom: 48, maxWidth: 560 }}>
        Real-time animated charts for React. Canvas-rendered at 60fps, zero dependencies,
        one accent color. Fork of liveline, extended with more chart types in the same vein.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
        }}
      >
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

      <p style={{ fontSize: 13, color: MUTED, marginTop: 48 }}>
        Fork of{' '}
        <a href="https://github.com/benjitaylor/liveline" style={{ color: MUTED }}>liveline</a>
        {' '}by Benji Taylor · MIT ·{' '}
        <a href="https://github.com/mertdeveci5/livechart" style={{ color: MUTED }}>GitHub</a>
      </p>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
