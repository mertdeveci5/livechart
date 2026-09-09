import React from 'react'

// --- Design tokens (alphafrontend / tlmc system) ---
export const PRIMARY = '#548eff'
export const CHART_1 = '#83bdff'
export const CHART_4 = '#4074fb'
export const CHART_5 = '#3257ee'
export const MUTED_BG = '#ecedef'
export const MUTED_FG = '#71717b'
export const BORDER = '#e4e4e7'
export const FG = '#09090b'
export const MONO = '"SF Mono", Menlo, monospace'

export function HeroMark() {
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

export function Wordmark({ children }: { children: React.ReactNode }) {
  return (
    <h1
      style={{
        fontSize: 38,
        fontWeight: 700,
        letterSpacing: '-0.02em',
        marginBottom: 8,
      }}
    >
      {children}
      <span style={{ color: PRIMARY }}>.</span>
    </h1>
  )
}

export function Section({
  label,
  id,
  children,
}: {
  label: string
  id?: string
  children: React.ReactNode
}) {
  return (
    <div id={id} style={{ padding: '40px 0 8px', scrollMarginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <span style={{ fontSize: 15, color: PRIMARY, flexShrink: 0 }}>{label}.</span>
        <div style={{ flexGrow: 1, borderBottom: `1px solid ${BORDER}`, marginLeft: 16 }} />
      </div>
      {children}
    </div>
  )
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 768, margin: '0 auto', padding: '64px 24px 64px' }}>{children}</div>
  )
}

export function Footer() {
  return (
    <p style={{ fontSize: 13, color: MUTED_FG, marginTop: 40 }}>
      Fork of{' '}
      <a href="https://github.com/benjitaylor/liveline" style={{ color: MUTED_FG }}>
        liveline
      </a>{' '}
      by Benji Taylor · MIT ·{' '}
      <a href="https://github.com/mertdeveci5/livechart" style={{ color: MUTED_FG }}>
        GitHub
      </a>
    </p>
  )
}

export function CodeBlock({ children }: { children: string }) {
  return (
    <pre
      style={{
        fontFamily: MONO,
        fontSize: 12.5,
        lineHeight: 1.65,
        background: MUTED_BG,
        borderRadius: 8,
        padding: '14px 16px',
        overflowX: 'auto',
        color: '#3f3f46',
        margin: '12px 0 0',
      }}
    >
      {children}
    </pre>
  )
}

/** Inline install/command chip */
export function Chip({ children }: { children: string }) {
  return (
    <div
      style={{
        display: 'inline-block',
        fontFamily: MONO,
        fontSize: 13,
        background: MUTED_BG,
        borderRadius: 8,
        padding: '8px 14px',
        color: '#3f3f46',
      }}
    >
      {children}
    </div>
  )
}
