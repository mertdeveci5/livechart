import React, { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import {
  MUTED_FG, BORDER, CHART_5, MONO,
  HeroMark, Wordmark, Section, PageShell, Footer, CodeBlock, Chip,
} from './site'

function Props({ rows }: { rows: [string, string, string][] }) {
  return (
    <div style={{ marginTop: 14, borderTop: `1px solid ${BORDER}` }}>
      {rows.map(([name, type, desc]) => (
        <div
          key={name}
          style={{
            display: 'flex',
            gap: 14,
            padding: '9px 0',
            borderBottom: `1px solid ${BORDER}`,
            fontSize: 13.5,
            lineHeight: 1.5,
          }}
        >
          <code
            style={{
              fontFamily: MONO,
              fontSize: 12.5,
              color: CHART_5,
              width: 148,
              flexShrink: 0,
              fontWeight: 500,
            }}
          >
            {name}
          </code>
          <code
            style={{
              fontFamily: MONO,
              fontSize: 11.5,
              color: MUTED_FG,
              width: 168,
              flexShrink: 0,
            }}
          >
            {type}
          </code>
          <span style={{ color: '#3f3f46' }}>{desc}</span>
        </div>
      ))}
    </div>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 15, lineHeight: 1.65, color: '#3f3f46', maxWidth: 640 }}>{children}</p>
  )
}

function App() {
  // Scroll to hash anchors after React renders (browser tries before content exists)
  useEffect(() => {
    if (window.location.hash) {
      const el = document.querySelector(window.location.hash)
      if (el) el.scrollIntoView()
    }
  }, [])

  return (
    <PageShell>
      <a href="index.html" className="lc-link" style={{ fontSize: 13.5, textDecoration: 'none', display: 'inline-block', marginBottom: 28 }}>
        ← Live charts
      </a>
      <HeroMark />
      <Wordmark>Docs</Wordmark>
      <p style={{ fontSize: 17, lineHeight: 1.6, color: MUTED_FG, maxWidth: 560 }}>
        One component, seven chart modes. Feed it streaming data — Livechart handles
        interpolation, morphing, and theming.
      </p>

      <Section label="Get started" id="get-started">
        <Chip>pnpm add livechart-react</Chip>
        <P>
          Peer dependency: <code style={{ fontFamily: MONO, fontSize: 13 }}>react &gt;=18</code>.
          The component fills its parent — set a height on the container. Pass a growing
          array of points and the latest value; Livechart interpolates smoothly between updates.
        </P>
        <CodeBlock>{`import { Liveline } from 'livechart-react'
import type { LivelinePoint } from 'livechart-react'

function Chart() {
  const [data, setData] = useState<LivelinePoint[]>([])
  const [value, setValue] = useState(0)

  // Feed data from a WebSocket, polling, etc.
  // Each point: { time: unixSeconds, value: number }

  return (
    <div style={{ height: 300 }}>
      <Liveline data={data} value={value} color="#3b82f6" theme="dark" />
    </div>
  )
}`}</CodeBlock>
        <P>
          Only line, multi-series, and scatter use <code style={{ fontFamily: MONO, fontSize: 13 }}>data</code>/<code style={{ fontFamily: MONO, fontSize: 13 }}>value</code> —
          the other modes take their own data props, so you never pass dummy props.
        </P>
      </Section>

      <Section label="Line" id="line">
        <P>
          The default. Streaming points rendered as a monotone spline with gradient fill,
          a pulsing live dot, a badge tracking the tip, and momentum coloring.
        </P>
        <Props
          rows={[
            ['data', 'LivelinePoint[]', 'Streaming { time, value } points'],
            ['value', 'number', 'Latest value — smoothly interpolated'],
            ['momentum', "boolean | 'up' | 'down' | 'flat'", 'Dot glow + arrows; true = auto-detect'],
            ['fill', 'boolean', 'Gradient under the curve (default true)'],
            ['badge', 'boolean', 'Value pill tracking the chart tip (default true)'],
            ['exaggerate', 'boolean', 'Tight Y-axis — small moves fill the chart'],
            ['degen', 'boolean | DegenOptions', 'Burst particles + chart shake on swings'],
            ['showValue', 'boolean', 'Large live value overlay, 60fps DOM update'],
          ]}
        />
        <CodeBlock>{`<Liveline data={data} value={value} color="#3b82f6" theme="dark" />

// Crypto-style — momentum + degen + tight range
<Liveline data={data} value={value} color="#f7931a"
  exaggerate degen showValue valueMomentumColor />

// Dashboard — time windows, no badge
<Liveline data={data} value={value} badge={false} showValue
  windows={[{ label: '15s', secs: 15 }, { label: '1m', secs: 60 }]} />`}</CodeBlock>
      </Section>

      <Section label="Multi-series" id="multi-series">
        <P>
          Multiple overlapping lines sharing the same axes. Toggle chips appear automatically
          with 2+ series — hidden series fade out and the Y-axis adjusts.
        </P>
        <Props
          rows={[
            ['series', 'LivelineSeries[]', '{ id, data, value, color, label? }[]'],
            ['onSeriesToggle', '(id, visible) => void', 'Called when a series chip is clicked'],
            ['seriesToggleCompact', 'boolean', 'Dots only in toggle chips, no labels'],
          ]}
        />
        <CodeBlock>{`<Liveline
  series={[
    { id: 'yes', data: yesData, value: yesValue, color: '#3b82f6', label: 'Yes' },
    { id: 'no', data: noData, value: noValue, color: '#ef4444', label: 'No' },
  ]}
/>`}</CodeBlock>
      </Section>

      <Section label="Candlestick" id="candlestick">
        <P>
          OHLC candles with bull/bear coloring, a smoothly lerped live candle, and an
          optional morph into line mode — bodies collapse to close price as the line extends.
        </P>
        <Props
          rows={[
            ['candles', 'CandlePoint[]', 'Committed OHLC bars { time, open, high, low, close }'],
            ['candleWidth', 'number', 'Seconds per candle'],
            ['liveCandle', 'CandlePoint', 'Current in-progress candle, updated every tick'],
            ['lineMode', 'boolean', 'Morph candles into a line display'],
            ['lineData', 'LivelinePoint[]', 'Tick-level data for the density transition'],
            ['onModeChange', '(mode) => void', 'Renders the built-in line/candle toggle'],
          ]}
        />
        <CodeBlock>{`<Liveline
  mode="candle"
  candles={candles}
  candleWidth={60}
  liveCandle={liveCandle}
  color="#f7931a"
  formatValue={(v) => '$' + v.toLocaleString()}
/>`}</CodeBlock>
      </Section>

      <Section label="Bars" id="bars">
        <P>
          Live bucketed bars anchored to a zero baseline — volume-style. Bars slide with the
          time window, the live bar grows each tick, and the badge tracks it. Negative values
          draw below the baseline.
        </P>
        <Props
          rows={[
            ['bars', 'BarPoint[]', 'Committed buckets { time, value }'],
            ['barWidth', 'number', 'Seconds per bucket'],
            ['liveBar', 'BarPoint', 'Current in-progress bar, updated every tick'],
          ]}
        />
        <CodeBlock>{`<Liveline
  mode="bars"
  bars={bars}
  barWidth={2}
  liveBar={liveBar}
  window={30}
  formatValue={(v) => v.toFixed(0)}
/>`}</CodeBlock>
      </Section>

      <Section label="Stacked bars" id="stacked">
        <P>
          Multiple bar series stacked from the zero baseline. All series share bucket times.
          Scrubbing snaps to the bucket and shows every series value; the badge tracks the
          live bucket total.
        </P>
        <Props
          rows={[
            ['stacks', 'StackSeries[]', '{ id, bars, liveBar?, color?, label? }[]'],
            ['barWidth', 'number', 'Seconds per bucket (shared by all series)'],
          ]}
        />
        <CodeBlock>{`<Liveline
  mode="stacked"
  barWidth={2}
  stacks={[
    { id: 'a', label: 'Alpha', bars: aBars, liveBar: aLive, color: '#548eff' },
    { id: 'b', label: 'Beta', bars: bBars, liveBar: bLive, color: '#4074fb' },
  ]}
/>`}</CodeBlock>
      </Section>

      <Section label="Combo" id="combo">
        <P>
          Line over volume bars — the classic trading layout. The line keeps everything from
          line mode (badge, momentum, scrub tooltip); bars render as a subdued underlay
          scaled to the bottom third of the chart.
        </P>
        <Props
          rows={[
            ['data', 'LivelinePoint[]', 'Line points (price, rate, …)'],
            ['value', 'number', 'Latest line value'],
            ['bars', 'BarPoint[]', 'Volume buckets { time, value }'],
            ['barWidth', 'number', 'Seconds per bucket'],
            ['liveBar', 'BarPoint', 'Current in-progress bucket'],
          ]}
        />
        <CodeBlock>{`<Liveline
  mode="combo"
  data={priceTicks}
  value={price}
  bars={volumeBars}
  barWidth={2}
  liveBar={liveVolume}
/>`}</CodeBlock>
      </Section>

      <Section label="Gauge" id="gauge">
        <P>
          A radial 240° arc for a single live value. Rounded caps, a live dot with pulse at
          the arc tip, center value, and min/max labels. Loading shows a breathing arc.
        </P>
        <Props
          rows={[
            ['value', 'number', 'Current value — arc sweeps to it smoothly'],
            ['min', 'number', 'Gauge minimum (default 0)'],
            ['max', 'number', 'Gauge maximum (default 100)'],
          ]}
        />
        <CodeBlock>{`<Liveline
  mode="gauge"
  value={cpuPercent}
  min={0}
  max={100}
  formatValue={(v) => \`\${v.toFixed(0)}%\`}
/>`}</CodeBlock>
      </Section>

      <Section label="Donut" id="donut">
        <P>
          Live proportions. Arc fractions lerp as values change — the ring never tears.
          Hovering a segment expands it, dims its siblings, and swaps the center readout
          to its value and label. Segments enter and exit with fades.
        </P>
        <Props
          rows={[
            ['segments', 'DonutSegment[]', '{ id, value, label?, color? }[]'],
            ['formatValue', '(v) => string', 'Formats the center total and hover readout'],
          ]}
        />
        <CodeBlock>{`<Liveline
  mode="donut"
  segments={[
    { id: 'yes', value: yesShares, label: 'Yes', color: '#3b82f6' },
    { id: 'no', value: noShares, label: 'No', color: '#ef4444' },
  ]}
  formatValue={(v) => v.toFixed(0)}
/>`}</CodeBlock>
      </Section>

      <Section label="Scatter" id="scatter">
        <P>
          Sparse events as unconnected dots — same data props as line mode. Dots pop in on
          birth, and scrubbing snaps magnetically to the nearest dot with a ring highlight.
        </P>
        <Props
          rows={[
            ['data', 'LivelinePoint[]', 'Streaming { time, value } events'],
            ['value', 'number', 'Latest value — gets the pulsing dot'],
            ['dotSize', 'number', 'Dot radius in px (default 3.5)'],
          ]}
        />
        <CodeBlock>{`<Liveline
  mode="scatter"
  data={trades}
  value={lastTrade}
  window={60}
  dotSize={4}
/>`}</CodeBlock>
      </Section>

      <Section label="Depth" id="depth">
        <P>
          Cumulative orderbook depth over price — bid and ask areas meeting at mid price.
          Levels lerp as the book changes, the price axis rescales smoothly, and hovering
          shows price and cumulative size. Reuses the same orderbook prop as the line-mode
          orderbook overlay.
        </P>
        <Props
          rows={[
            ['orderbook', 'OrderbookData', '{ bids: [price, size][], asks: [price, size][] }'],
            ['formatValue', '(v) => string', 'Price formatter for axis + tooltip'],
          ]}
        />
        <CodeBlock>{`<Liveline
  mode="depth"
  orderbook={{ bids, asks }}
  formatValue={(v) => '$' + v.toFixed(1)}
/>`}</CodeBlock>
      </Section>

      <Section label="Radar" id="radar">
        <P>
          Live multi-axis metrics as a spider polygon. Radii lerp as values change, hovering
          a vertex shows its value. Needs at least three metrics.
        </P>
        <Props
          rows={[
            ['metrics', 'RadarMetric[]', '{ label, value, max? }[] — max defaults to the max prop'],
            ['max', 'number', 'Shared max for metrics without their own (default 100)'],
          ]}
        />
        <CodeBlock>{`<Liveline
  mode="radar"
  metrics={[
    { label: 'Speed', value: 72 },
    { label: 'Quality', value: 85 },
    { label: 'Uptime', value: 64 },
  ]}
  formatValue={(v) => v.toFixed(0)}
/>`}</CodeBlock>
      </Section>

      <Section label="Shared props" id="shared">
        <P>Every mode supports these unless noted otherwise.</P>
        <Props
          rows={[
            ['theme', "'light' | 'dark'", 'Color scheme (default dark)'],
            ['color', 'string', 'Accent color — full palette derived from it'],
            ['window', 'number', 'Visible time window in seconds (time-based modes)'],
            ['windows', 'WindowOption[]', 'Time horizon buttons [{ label, secs }]'],
            ['loading', 'boolean', 'Breathing animation that morphs into data'],
            ['paused', 'boolean', 'Freeze scrolling; resume catches up smoothly'],
            ['emptyText', 'string', 'Text shown when there is no data'],
            ['scrub', 'boolean', 'Crosshair scrubbing on hover (default true)'],
            ['formatValue', '(v) => string', 'Value label formatter'],
            ['formatTime', '(t) => string', 'Time axis formatter'],
            ['lerpSpeed', 'number', 'Interpolation speed 0–1 (default 0.08)'],
            ['referenceLine', 'ReferenceLine', 'Horizontal reference { value, label? }'],
            ['padding', 'Padding', 'Chart padding override'],
            ['onHover', '(point | null) => void', 'Hover callback with { time, value, x, y }'],
          ]}
        />
      </Section>

      <Footer />
    </PageShell>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
