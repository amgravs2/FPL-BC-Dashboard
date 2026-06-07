import React from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useManagerMap } from '../ManagerContext';
import { getManager } from '../config';

/* ── Avatar ── */
export function Avatar({ teamId, size = 36 }) {
  const managerMap = useManagerMap();
  const m = getManager(managerMap, teamId);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `${m.color}22`,
      border: `2px solid ${m.color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: size * 0.33,
      fontWeight: 600,
      color: m.color,
      flexShrink: 0,
      letterSpacing: '-0.03em',
    }}>
      {m.initials}
    </div>
  );
}

/* ── Result badge ── */
export function ResultBadge({ result }) {
  const map = { w: 'win', l: 'loss', d: 'draw' };
  const label = { w: 'W', l: 'L', d: 'D' };
  return <span className={`badge badge--${map[result] ?? 'draw'}`}>{label[result] ?? result}</span>;
}

/* ── Stat card ── */
export function StatCard({ label, value, sub, accent }) {
  return (
    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
      {accent && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: accent,
        }} />
      )}
      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace", marginBottom: '0.4rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '2rem', fontFamily: "'Playfair Display', serif", fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{sub}</div>}
    </div>
  );
}

/* ── Loading spinner ── */
export function Loading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 40, height: 40, border: '2px solid var(--border-gold)',
          borderTopColor: 'var(--gold-bright)', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem',
        }} />
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem' }}>Loading...</span>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ── Error ── */
export function ErrorMsg({ message }) {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--red-bright)' }}>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', marginBottom: '0.5rem' }}>Something went wrong</div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem', color: 'var(--text-muted)' }}>{message}</div>
    </div>
  );
}

/* ── Section header ── */
export function SectionHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h2 style={{ fontSize: '1.6rem', color: 'var(--text-primary)' }}>{title}</h2>
      {sub && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>{sub}</p>}
      <div style={{ marginTop: '0.75rem', height: 1, background: 'linear-gradient(90deg, var(--gold-muted), transparent)' }} />
    </div>
  );
}

/* ── Nav ── */
const NAV_ITEMS = [
  { to: '/',           label: 'Overview' },
  { to: '/draft',      label: 'Draft' },
  { to: '/players',    label: 'Players' },
  { to: '/transfers',  label: 'Transfers' },
  { to: '/records',    label: 'Records' },
  { to: '/alltime',    label: 'All Time' },
];

export function Nav({ seasonId, seasons }) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const activeSeason = searchParams.get('season') || seasonId;

  return (
    <nav style={{
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-gold)',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      {/* Top bar */}
      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 56,
      }}>
        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 48, height: 48,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><img src="/logo-02.png" alt="CHFC" style={{ width: 48, height: 48, objectFit: 'contain' }} /></div>
          <span style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.1rem', fontWeight: 700,
            color: 'var(--gold-bright)',
            letterSpacing: '-0.01em',
          }}>Breakfast Club</span>
        </Link>

        {/* Season picker */}
        {seasons && seasons.length > 0 && (
          <select
            value={activeSeason}
            onChange={e => {
              const url = new URL(window.location);
              url.searchParams.set('season', e.target.value);
              window.location = url.toString();
            }}
            style={{
              background: 'var(--bg-raised)',
              border: '1px solid var(--border-gold)',
              color: 'var(--text-primary)',
              padding: '0.3rem 0.75rem',
              borderRadius: 4,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            {seasons.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Page nav */}
      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem',
        display: 'flex', gap: '0',
        borderTop: '1px solid var(--border)',
        overflowX: 'auto',
      }}>
        {NAV_ITEMS.map(item => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={`${item.to}?season=${activeSeason}`}
              style={{
                padding: '0.6rem 1.1rem',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.78rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                textDecoration: 'none',
                color: active ? 'var(--gold-bright)' : 'var(--text-secondary)',
                borderBottom: active ? '2px solid var(--gold-bright)' : '2px solid transparent',
                transition: 'color 0.15s, border-color 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/* ── Page wrapper ── */
export function Page({ children }) {
  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem' }}>
      {children}
    </main>
  );
}
