import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useApi } from '../hooks/useApi';
import { getManager } from '../config';
import { useManagerMap } from '../ManagerContext';
import { Loading, ErrorMsg, SectionHeader, Avatar, ResultBadge, StatCard } from '../components/UI';

const MEDAL = ['🥇', '🥈', '🥉'];

/* ── Standings Table ── */
function StandingsTable({ data, seasonId }) {
  const managerMap = useManagerMap();
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-gold)' }}>
            {['#', 'Manager', 'W', 'D', 'L', 'PF', 'PA', 'PD', 'Pts'].map(h => (
              <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: h === 'Manager' ? 'left' : 'center', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            const m = getManager(managerMap, row.team_id);
            return (
              <tr key={row.team_id} style={{
                borderBottom: '1px solid var(--border)',
                transition: 'background 0.15s',
                cursor: 'pointer',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}

              >
                <td style={{ padding: '0.75rem', textAlign: 'center', color: i < 3 ? 'var(--gold-bright)' : 'var(--text-muted)' }}>
                  {MEDAL[i] || row.rank}
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Avatar teamId={row.team_id} size={28} />
                    <div>
                      <div style={{ color: m.color, fontWeight: 600 }}>{m.initials}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: "'Crimson Pro', serif" }}>{row.team_name}</div>
                    </div>
                  </div>
                </td>
                {[row.wins, row.draws, row.losses].map((v, j) => (
                  <td key={j} style={{ padding: '0.75rem', textAlign: 'center', color: j === 0 ? 'var(--green-bright)' : j === 2 ? 'var(--red-bright)' : 'var(--text-secondary)' }}>{v}</td>
                ))}
                <td style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-primary)' }}>{row.points_for}</td>
                <td style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{row.points_against}</td>
                <td style={{ padding: '0.75rem', textAlign: 'center', color: (row.points_for - row.points_against) >= 0 ? 'var(--green-bright)' : 'var(--red-bright)', fontWeight: 600 }}>
                  {row.points_for - row.points_against >= 0 ? '+' : ''}{row.points_for - row.points_against}
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                  <span style={{ color: 'var(--gold-bright)', fontWeight: 700, fontSize: '1rem' }}>{row.league_points}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Animated Points Chart ── */
function PointsChart({ data }) {
  const managerMap = useManagerMap();
  const [frame, setFrame]     = useState(0);
  const [playing, setPlaying] = useState(false);
  const intervalRef           = useRef(null);
  const animRef               = useRef(null);

  const gwMax   = data.length > 0 ? Math.max(...data.map(d => d.gw)) : 38;
  const teamIds = [...new Set(data.map(d => d.team_id))];

  // Pre-build full dataset
  const byGw = [];
  for (let gw = 1; gw <= gwMax; gw++) {
    const point = { gw };
    teamIds.forEach(tid => {
      const row = data.find(d => d.gw === gw && d.team_id === tid);
      if (row) point[tid] = row.cumulative_points;
    });
    byGw.push(point);
  }

  const visible = byGw.slice(0, frame + 1);

  // Smoother animation using requestAnimationFrame with 300ms per GW
  useEffect(() => {
    if (!playing) return;
    let lastTime = null;
    const MS_PER_GW = 300;

    const step = (timestamp) => {
      if (!lastTime) lastTime = timestamp;
      const elapsed = timestamp - lastTime;
      if (elapsed >= MS_PER_GW) {
        lastTime = timestamp;
        setFrame(f => {
          if (f >= gwMax - 1) { setPlaying(false); return f; }
          return f + 1;
        });
      }
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [playing, gwMax]);

  const handlePlay = () => {
    if (frame >= gwMax - 1) setFrame(0);
    setPlaying(true);
  };

  // Get last known value for each team (for end markers)
  const lastPoints = {};
  teamIds.forEach(tid => {
    const last = [...visible].reverse().find(p => p[tid] !== undefined);
    if (last) lastPoints[tid] = last[tid];
  });

  // Sort teams by current points for ranking label
  const ranked = [...teamIds].sort((a, b) => (lastPoints[b] ?? 0) - (lastPoints[a] ?? 0));

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const sorted = [...payload].sort((a, b) => b.value - a.value);
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-gold)', borderRadius: 6, padding: '0.75rem 1rem', minWidth: 140 }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>GW {label}</div>
        {sorted.map(p => {
          const m = getManager(managerMap, parseInt(p.dataKey));
          return (
            <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.2rem' }}>
              <span style={{ color: m.color, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem' }}>{m.initials}</span>
              <span style={{ color: 'var(--text-primary)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem', fontWeight: 600 }}>{p.value}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // Custom dot — only show initials circle at the current frame tip, nothing on trail
  const CustomDot = ({ cx, cy, dataKey, index }) => {
    // Only render on the very last visible point
    if (index !== visible.length - 1) return null;
    const tid = parseInt(dataKey);
    const m   = getManager(managerMap, tid);
    if (visible[visible.length - 1]?.[tid] === undefined) return null;
    return (
      <g key={`dot-${tid}`}>
        <circle cx={cx} cy={cy} r={13} fill={m.color} opacity={0.15} />
        <circle cx={cx} cy={cy} r={9} fill="var(--bg-card)" stroke={m.color} strokeWidth={2} />
        <text x={cx} y={cy + 3} textAnchor="middle" fill={m.color}
          style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, fontWeight: 700 }}>
          {m.initials}
        </text>
      </g>
    );
  };

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <button
          onClick={playing ? () => setPlaying(false) : handlePlay}
          style={{
            background: playing ? 'var(--bg-raised)' : 'var(--gold-dim)',
            border: '1px solid var(--gold-mid)',
            color: 'var(--gold-bright)',
            padding: '0.4rem 1rem',
            borderRadius: 4,
            cursor: 'pointer',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {playing ? '⏸ Pause' : frame >= gwMax - 1 ? '↺ Replay' : '▶ Play'}
        </button>
        <input
          type="range" min={0} max={gwMax - 1} value={frame}
          onChange={e => { setPlaying(false); setFrame(+e.target.value); }}
          style={{ flex: 1, accentColor: 'var(--gold-bright)' }}
        />
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: 40 }}>
          GW {frame + 1}
        </span>
      </div>

      {/* Live rankings strip */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {ranked.map((tid, i) => {
          const m = getManager(managerMap, tid);
          return (
            <div key={tid} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.2rem 0.6rem', background: 'var(--bg-raised)', border: `1px solid ${m.color}44`, borderRadius: 20 }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: 'var(--text-muted)' }}>{i + 1}</span>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: m.color }} />
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: m.color }}>{m.initials}</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{lastPoints[tid] ?? 0}</span>
            </div>
          );
        })}
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={visible} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" strokeOpacity={0.4} />
          <XAxis dataKey="gw" stroke="var(--text-muted)" tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }} tickLine={false} label={{ value: 'Gameweek', position: 'insideBottom', offset: -2, fill: 'var(--text-muted)', fontSize: 10 }} />
          <YAxis stroke="var(--text-muted)" tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          {teamIds.map(tid => {
            const m = getManager(managerMap, tid);
            return (
              <Line
                key={tid}
                type="monotone"
                dataKey={tid.toString()}
                stroke={m.color}
                strokeWidth={2.5}
                dot={<CustomDot />}
                activeDot={{ r: 4, fill: m.color }}
                isAnimationActive={false}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Lineup Panel ── */
function LineupPanel({ seasonId, teamId, gw }) {
  const { data, loading } = useApi(`/query/season/${seasonId}/lineup/${teamId}/${gw}`, [seasonId, teamId, gw]);
  const posColor = { GKP: '#7eb8d4', DEF: '#5a9e64', MID: '#d4a843', FWD: '#c07a5a' };

  if (loading) return <div style={{ padding: '1rem', color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' }}>Loading lineup...</div>;
  if (!data) return null;

  const PlayerRow = ({ p }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto auto', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: posColor[p.pos] || 'var(--text-muted)', textAlign: 'center', border: `1px solid ${posColor[p.pos] || 'var(--border)'}44`, borderRadius: 2, padding: '0 2px' }}>{p.pos}</span>
      <span style={{ fontFamily: "'Crimson Pro', serif", fontSize: '0.9rem', color: 'var(--text-primary)' }}>
        {p.web_name}
        {p.is_captain && <span style={{ marginLeft: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: 'var(--gold-bright)' }}>©</span>}
        {p.is_vice_captain && <span style={{ marginLeft: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: 'var(--text-muted)' }}>vc</span>}
      </span>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
        {p.goals > 0 && `⚽×${p.goals} `}{p.assists > 0 && `🎯×${p.assists} `}{p.bonus > 0 && `⭐${p.bonus}`}
      </span>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem', fontWeight: 600, color: p.points > 0 ? 'var(--text-primary)' : 'var(--text-muted)', minWidth: 24, textAlign: 'right' }}>
        {p.is_captain ? p.points * (p.multiplier || 2) : p.points}
      </span>
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', padding: '1rem 1.25rem', background: 'var(--bg-deep)', borderTop: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Starting XI</div>
        {data.starters.map((p, i) => <PlayerRow key={i} p={p} />)}
      </div>
      <div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Bench</div>
        {data.bench.map((p, i) => <PlayerRow key={i} p={p} />)}
      </div>
    </div>
  );
}

/* ── Results Grid ── */
function ResultsGrid({ data, seasonId }) {
  const managerMap = useManagerMap();
  const [gw, setGw]         = useState(Math.max(...data.map(d => d.gw)));
  const [expanded, setExpanded] = useState({});
  const gwData = data.filter(d => d.gw === gw);
  const maxGw  = Math.max(...data.map(d => d.gw));

  const toggleExpand = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div>
      {/* GW selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '0.5rem' }}>GW</span>
        {Array.from({ length: maxGw }, (_, i) => i + 1).map(g => (
          <button key={g} onClick={() => { setGw(g); setExpanded({}); }} style={{
            width: 28, height: 28,
            background: gw === g ? 'var(--gold-dim)' : 'var(--bg-raised)',
            border: `1px solid ${gw === g ? 'var(--gold-mid)' : 'var(--border)'}`,
            color: gw === g ? 'var(--gold-bright)' : 'var(--text-secondary)',
            borderRadius: 4, cursor: 'pointer',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem',
          }}>{g}</button>
        ))}
      </div>

      {/* Matches */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {gwData.map((match, i) => {
          const m1      = getManager(managerMap, match.entry_1_id);
          const m2      = getManager(managerMap, match.entry_2_id);
          const winner  = match.entry_1_points > match.entry_2_points ? 1
                        : match.entry_2_points > match.entry_1_points ? 2 : 0;
          const key     = `${match.entry_1_id}-${match.entry_2_id}`;
          const isOpen  = expanded[key];

          return (
            <div key={i} style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
              {/* Match row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', cursor: 'pointer' }}
                onClick={() => toggleExpand(key)}>
                {/* Team 1 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'flex-end' }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: m1.color, fontWeight: winner === 1 ? 700 : 400, fontSize: '0.9rem' }}>{m1.initials}</span>
                  <Avatar teamId={match.entry_1_id} size={28} />
                </div>
                {/* Score */}
                <div style={{ textAlign: 'center', fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                  <span style={{ color: winner === 1 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{match.entry_1_points}</span>
                  <span style={{ color: 'var(--text-muted)', margin: '0 0.3rem', fontSize: '0.9rem' }}>—</span>
                  <span style={{ color: winner === 2 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{match.entry_2_points}</span>
                </div>
                {/* Team 2 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Avatar teamId={match.entry_2_id} size={28} />
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: m2.color, fontWeight: winner === 2 ? 700 : 400, fontSize: '0.9rem' }}>{m2.initials}</span>
                </div>
                {/* Chevron */}
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</div>
              </div>
              {/* Expandable lineups */}
              {isOpen && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                  <div style={{ borderRight: '1px solid var(--border)' }}>
                    <div style={{ padding: '0.5rem 1rem', background: `${m1.color}18`, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: m1.color }}>{m1.initials} lineup</div>
                    <LineupPanel seasonId={seasonId} teamId={match.entry_1_fpl_id} gw={gw} />
                  </div>
                  <div>
                    <div style={{ padding: '0.5rem 1rem', background: `${m2.color}18`, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: m2.color }}>{m2.initials} lineup</div>
                    <LineupPanel seasonId={seasonId} teamId={match.entry_2_fpl_id} gw={gw} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Overview Page ── */
export default function OverviewPage() {
  const managerMap = useManagerMap();
  const [searchParams] = useSearchParams();
  const seasonId = searchParams.get('season') || 1;

  const { data: summary, loading: l1, error: e1 } = useApi(`/query/season/${seasonId}/summary`, [seasonId]);
  const { data: chart,   loading: l2, error: e2 } = useApi(`/query/season/${seasonId}/standings-chart`, [seasonId]);
  const { data: results, loading: l3, error: e3 } = useApi(`/query/season/${seasonId}/results-grid`, [seasonId]);

  if (l1 || l2 || l3) return <Loading />;
  if (e1 || e2 || e3) return <ErrorMsg message={e1 || e2 || e3} />;

  const leader = summary?.[0];
  const leaderM = leader ? getManager(managerMap, leader.team_id) : null;
  const totalGws = chart ? Math.max(...chart.map(d => d.gw)) : 0;
  const highScoreRow = chart ? chart.reduce((best, d) => d.points_for > (best?.points_for ?? 0) ? d : best, null) : null;
  const highScore = highScoreRow?.points_for ?? 0;
  const highScoreM = highScoreRow ? getManager(managerMap, highScoreRow.team_id) : null;

  return (
    <div className="fade-up">
      {/* Hero */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '0.25rem' }}>
          <h1 style={{ fontSize: '2.5rem', color: 'var(--text-primary)' }}>Season Overview</h1>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem', color: 'var(--gold-muted)', border: '1px solid var(--border-gold)', padding: '0.15rem 0.5rem', borderRadius: 3 }}>25/26</span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
          {totalGws} gameweeks complete · The Breakfast Club Draft League
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid-4" style={{ marginBottom: '2.5rem' }}>
        <StatCard label="League Leader" value={leaderM?.initials} sub={`${leader?.league_points} pts`} accent={leaderM?.color} />
        <StatCard label="Top Score" value={highScore} sub={`${highScoreM?.initials ?? ''} · GW${highScoreRow?.gw ?? ''}`} accent="var(--gold-bright)" />
        <StatCard label="Gameweeks" value={totalGws} sub="of 38 complete" accent="var(--green-bright)" />
        <StatCard label="Managers" value={summary?.length} sub="in the league" accent="var(--color-rm)" />
      </div>

      {/* Standings */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <SectionHeader title="League Table" sub="Click a manager to view their profile" />
        <StandingsTable data={summary} seasonId={seasonId} />
      </div>

      {/* Animated chart */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <SectionHeader title="Points Race" sub="Cumulative league points over the season" />
        {chart && <PointsChart data={chart} />}
      </div>

      {/* Results grid */}
      <div className="card">
        <SectionHeader title="Gameweek Results" sub="Head-to-head results by week" />
        {results && <ResultsGrid data={results} seasonId={seasonId} />}
      </div>
    </div>
  );
}
