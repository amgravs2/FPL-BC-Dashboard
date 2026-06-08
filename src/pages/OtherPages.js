import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell, ReferenceLine,
} from 'recharts';
import { useApi }                    from '../hooks/useApi';
import { getManager }                from '../config';
import { useManagerMap }             from '../ManagerContext';
import { Loading, ErrorMsg, SectionHeader, Avatar, StatCard } from '../components/UI';

/* ══════════════════════════════════════════
   SHARED UTILITIES
══════════════════════════════════════════ */

const posColor  = { GKP: '#7eb8d4', DEF: '#5a9e64', MID: '#d4a843', FWD: '#c07a5a' };
const POS_COLOR = posColor; // alias used in Transfers section
const POSITIONS = ['ALL', 'GKP', 'DEF', 'MID', 'FWD'];

function fdrColor(fdr) {
  if (fdr <= 2) return { bg: '#0d2b0d', border: '#2d6b2d', text: '#6bcf6b' };
  if (fdr === 3) return { bg: '#2b2200', border: '#6b5500', text: '#d4a843' };
  if (fdr === 4) return { bg: '#2b0d0d', border: '#6b2020', text: '#e06060' };
  return { bg: '#1a0505', border: '#8b1515', text: '#c03030' };
}

/* ── Availability flag icon ── */
function AvailabilityFlag({ status, chance, news }) {
  if (!status || status === 'a') return null;

  let icon  = '⚑';
  let color = '#d4a843';
  let title = news || status;

  if (status === 'd') { icon = '?';    color = '#d4a843'; }
  if (status === 'i') { icon = '✚';   color = '#e06060'; }
  if (status === 's') { icon = '⊘';   color = '#e06060'; }
  if (status === 'u') { icon = '✗';   color = '#888';    }
  if (chance !== null && chance !== undefined) {
    if (chance === 0)      { icon = '✗';   color = '#e06060'; }
    else if (chance <= 25) { icon = '25%'; color = '#e06060'; }
    else if (chance <= 50) { icon = '50%'; color = '#d4a843'; }
    else if (chance <= 75) { icon = '75%'; color = '#d4a843'; }
  }

  return (
    <span
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: `${color}22`, border: `1px solid ${color}66`,
        borderRadius: 3, padding: '0 3px', fontSize: '0.6rem',
        color, fontFamily: "'IBM Plex Mono', monospace",
        cursor: 'help', minWidth: 16, height: 16, marginLeft: 4,
      }}
    >
      {icon}
    </span>
  );
}

/* ── FDR squares ── */
function FdrSquares({ playerTeamId, position, fixtures, teamMap }) {
  if (!fixtures || !teamMap) return null;

  const isDefensive = position === 'GKP' || position === 'DEF';
  const next5 = fixtures
    .filter(f => f.team_h === playerTeamId || f.team_a === playerTeamId)
    .slice(0, 5);

  if (!next5.length) return <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>—</span>;

  return (
    <div style={{ display: 'flex', gap: 2, flexWrap: 'nowrap' }}>
      {next5.map((f, i) => {
        const isHome = f.team_h === playerTeamId;
        const oppId  = isHome ? f.team_a : f.team_h;
        const opp    = teamMap[oppId];
        const fdr    = isDefensive
          ? (isHome ? f.team_h_defence_fdr : f.team_a_defence_fdr)
          : (isHome ? f.team_h_attack_fdr  : f.team_a_attack_fdr);
        const col    = fdrColor(fdr || 3);

        return (
          <div
            key={i}
            title={`GW${f.gw}: ${opp?.name || oppId} (${isHome ? 'H' : 'A'}) — FDR ${fdr}`}
            style={{
              background: col.bg, border: `1px solid ${col.border}`,
              borderRadius: 3, padding: '1px 4px', fontSize: '0.58rem',
              color: col.text, fontFamily: "'IBM Plex Mono', monospace",
              whiteSpace: 'nowrap', lineHeight: 1.6, minWidth: 34, textAlign: 'center',
            }}
          >
            {opp?.short_name || '?'} {isHome ? 'H' : 'A'}
          </div>
        );
      })}
    </div>
  );
}

/* ── Team dropdown multi-select ── */
function TeamFilterDropdown({ teams, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const allSelected = selected.length === 0;
  const label = allSelected ? 'All Clubs'
    : selected.length === 1 ? selected[0]
    : `${selected.length} clubs`;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '0.4rem 0.75rem', background: 'var(--bg-raised)',
          border: `1px solid ${allSelected ? 'var(--border)' : 'var(--gold-mid)'}`,
          borderRadius: 4, color: allSelected ? 'var(--text-secondary)' : 'var(--gold-bright)',
          fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 120,
        }}
      >
        {label}
        <span style={{ marginLeft: 'auto', fontSize: '0.65rem', opacity: 0.7 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '110%', left: 0, zIndex: 100,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 6, boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          minWidth: 180, maxHeight: 300, overflowY: 'auto', padding: '0.4rem 0',
        }}>
          <button
            onClick={() => { onChange([]); setOpen(false); }}
            style={{
              width: '100%', textAlign: 'left', padding: '0.35rem 0.75rem',
              background: allSelected ? 'var(--bg-hover)' : 'transparent',
              border: 'none', color: 'var(--text-primary)',
              fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem', cursor: 'pointer',
            }}
          >
            ✓ All Clubs
          </button>
          <div style={{ height: 1, background: 'var(--border)', margin: '0.3rem 0' }} />
          {teams.sort().map(t => {
            const active = selected.includes(t);
            return (
              <button
                key={t}
                onClick={() => onChange(active ? selected.filter(s => s !== t) : [...selected, t])}
                style={{
                  width: '100%', textAlign: 'left', padding: '0.3rem 0.75rem',
                  background: active ? 'var(--bg-hover)' : 'transparent',
                  border: 'none',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}
              >
                <span style={{ width: 12, color: 'var(--gold-mid)' }}>{active ? '✓' : ''}</span>
                {t}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── GW Stats Expanded Panel ── */
function GwStatsPanel({ playerId, seasonId, colSpan, position }) {
  const { data, loading } = useApi(
    `/query/season/${seasonId}/player/${playerId}/gw-stats`,
    [playerId, seasonId]
  );

  if (loading) return (
    <td colSpan={colSpan} style={{ padding: '0.75rem', color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' }}>
      Loading GW stats…
    </td>
  );
  if (!data?.length) return (
    <td colSpan={colSpan} style={{ padding: '0.75rem', color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' }}>
      No GW data for this season — run /sync/stats/&#123;gw&#125; or /sync/element-summaries to populate
    </td>
  );

  const headers = ['GW', 'Opp', 'Pts', 'G', 'A', 'CS', 'Sv', 'DC', 'Bon', 'Min', '🟨', '🟥', 'Owner'];

  return (
    <td colSpan={colSpan} style={{ padding: 0 }}>
      <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-deep)', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
          Current Season — GW Breakdown
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-gold)' }}>
                {headers.map(h => (
                  <th key={h} style={{ padding: '0.25rem 0.5rem', textAlign: h === 'GW' || h === 'Owner' ? 'left' : 'center', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map(row => (
                <tr key={row.gw} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '0.25rem 0.5rem', color: 'var(--text-secondary)' }}>GW{row.gw}</td>
                  <td style={{ padding: '0.25rem 0.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.68rem', whiteSpace: 'nowrap' }}>
                    {row.opponent_short ? `${row.opponent_short} ${row.was_home ? 'H' : 'A'}` : '—'}
                  </td>
                  <td style={{ padding: '0.25rem 0.5rem', textAlign: 'center', color: row.total_points >= 8 ? '#6bcf6b' : row.total_points === 0 ? 'var(--text-muted)' : 'var(--text-primary)', fontWeight: row.total_points >= 8 ? 700 : 400 }}>{row.total_points}</td>
                  <td style={{ padding: '0.25rem 0.5rem', textAlign: 'center', color: row.goals > 0 ? '#d4a843' : 'var(--text-muted)' }}>{row.goals || '—'}</td>
                  <td style={{ padding: '0.25rem 0.5rem', textAlign: 'center', color: row.assists > 0 ? '#d4a843' : 'var(--text-muted)' }}>{row.assists || '—'}</td>
                  <td style={{ padding: '0.25rem 0.5rem', textAlign: 'center', color: row.clean_sheets > 0 ? '#7eb8d4' : 'var(--text-muted)' }}>
                    {position === 'FWD' ? <span style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>n/a</span> : row.clean_sheets > 0 ? '✓' : '—'}
                  </td>
                  <td style={{ padding: '0.25rem 0.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{row.saves || '—'}</td>
                  <td style={{ padding: '0.25rem 0.5rem', textAlign: 'center', color: row.defensive_contribution > 0 ? '#5a9e64' : 'var(--text-muted)' }}>
                    {(position === 'GKP' || position === 'FWD') ? <span style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>n/a</span> : row.defensive_contribution || '—'}
                  </td>
                  <td style={{ padding: '0.25rem 0.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{row.bonus || '—'}</td>
                  <td style={{ padding: '0.25rem 0.5rem', textAlign: 'center', color: row.minutes === 0 ? 'var(--text-muted)' : 'var(--text-secondary)' }}>{row.minutes}</td>
                  <td style={{ padding: '0.25rem 0.5rem', textAlign: 'center', color: row.yellow_cards > 0 ? '#d4a843' : 'var(--text-muted)' }}>{row.yellow_cards || '—'}</td>
                  <td style={{ padding: '0.25rem 0.5rem', textAlign: 'center', color: row.red_cards > 0 ? '#e06060' : 'var(--text-muted)' }}>{row.red_cards || '—'}</td>
                  <td style={{ padding: '0.25rem 0.5rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{row.owner_this_gw || <span style={{ color: 'var(--text-muted)' }}>FA</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </td>
  );
}

/* ══════════════════════════════════════════
   PLAYERS PAGE
══════════════════════════════════════════ */
export function PlayersPage() {
  const managerMap = useManagerMap();
  const navigate   = useNavigate();
  const [searchParams] = useSearchParams();
  const seasonId = searchParams.get('season') || 1;

  const [search,          setSearch]          = useState('');
  const [posFilter,       setPosFilter]       = useState('ALL');
  const [teamFilter,      setTeamFilter]      = useState([]);
  const [sort,            setSort]            = useState('total_points');
  const [expandedPlayer,  setExpandedPlayer]  = useState(null);

  const { data, loading, error } = useApi(`/query/season/${seasonId}/players`, [seasonId]);
  const { data: fixtureData }    = useApi(`/query/season/${seasonId}/fixtures-upcoming`, [seasonId]);

  if (loading) return <Loading />;
  if (error)   return <ErrorMsg message={error} />;

  const positions = ['ALL', 'GKP', 'DEF', 'MID', 'FWD'];

  const fixtures = fixtureData?.fixtures || [];
  const teamMap  = {};
  (fixtureData?.teams || []).forEach(t => { teamMap[t.id] = t; });

  const allPlTeams = [...new Set((data || []).map(p => p.pl_team_full || p.pl_team))].filter(Boolean).sort();

  const filtered = (data || [])
    .filter(p => posFilter === 'ALL' || p.position === posFilter)
    .filter(p => {
      if (!teamFilter.length) return true;
      return teamFilter.includes(p.pl_team_full) || teamFilter.includes(p.pl_team);
    })
    .filter(p => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        p.name?.toLowerCase().includes(q) ||
        p.web_name?.toLowerCase().includes(q) ||
        p.pl_team?.toLowerCase().includes(q) ||
        p.pl_team_full?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => (b[sort] ?? 0) - (a[sort] ?? 0));

  const COLS = [
    { key: 'total_points',           label: 'Pts'   },
    { key: 'avg_pts_5gw',            label: 'Avg5'  },
    { key: 'goals',                  label: 'G'     },
    { key: 'assists',                label: 'A'     },
    { key: 'clean_sheets',           label: 'CS'    },
    { key: 'saves',                  label: 'Sv'    },
    { key: 'defensive_contribution', label: 'DC'    },
    { key: 'bonus',                  label: 'Bon'   },
    { key: 'yellow_cards',           label: '🟨'   },
    { key: 'red_cards',              label: '🟥'   },
    { key: 'minutes',                label: 'Min'   },
    { key: 'blank_gws',              label: 'Blank' },
  ];

  const TOTAL_COLS = 18;

  return (
    <div className="fade-up">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>Player Stats</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          All players ranked by season performance · expand ▾ for GW breakdown
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search player or club…"
          style={{
            background: 'var(--bg-raised)', border: '1px solid var(--border)',
            color: 'var(--text-primary)', padding: '0.4rem 0.75rem',
            borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem',
            outline: 'none', flex: '1', minWidth: 220,
          }}
        />
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {positions.map(pos => (
            <button key={pos} onClick={() => setPosFilter(pos)} style={{
              padding: '0.35rem 0.7rem', borderRadius: 4, cursor: 'pointer',
              fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem',
              background: posFilter === pos ? (pos === 'ALL' ? 'var(--gold-dim)' : `${posColor[pos]}33`) : 'var(--bg-raised)',
              border: `1px solid ${posFilter === pos ? (posColor[pos] || 'var(--gold-mid)') : 'var(--border)'}`,
              color: posFilter === pos ? (posColor[pos] || 'var(--gold-bright)') : 'var(--text-secondary)',
            }}>
              {pos}
            </button>
          ))}
        </div>
        <TeamFilterDropdown teams={allPlTeams} selected={teamFilter} onChange={setTeamFilter} />
      </div>

      <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-gold)', background: 'var(--bg-raised)' }}>
              <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', color: 'var(--text-muted)', width: 36 }}>#</th>
              <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', color: 'var(--text-muted)' }}>Player</th>
              <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', color: 'var(--text-muted)', width: 52 }}>Pos</th>
              <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', color: 'var(--text-muted)', width: 40 }}>Own</th>
              <th style={{ padding: '0.6rem 0.5rem', textAlign: 'left', color: 'var(--text-muted)', minWidth: 200 }}>
                FDR <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>next 5</span>
              </th>
              {COLS.map(c => (
                <th
                  key={c.key}
                  onClick={() => setSort(c.key)}
                  style={{
                    padding: '0.6rem 0.4rem', textAlign: 'center', cursor: 'pointer',
                    color: sort === c.key ? 'var(--gold-bright)' : 'var(--text-muted)',
                    borderBottom: sort === c.key ? '2px solid var(--gold-mid)' : '2px solid transparent',
                    minWidth: 38, userSelect: 'none',
                  }}
                  title={`Sort by ${c.label}`}
                >
                  {c.label}
                </th>
              ))}
              <th style={{ padding: '0.6rem 0.4rem', textAlign: 'center', color: 'var(--text-muted)', width: 36 }}>↗</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((player, i) => {
              const ownerM = player.owner_team_id ? getManager(managerMap, player.owner_team_id) : null;
              const col    = posColor[player.position] || 'var(--text-muted)';
              const isExp  = expandedPlayer === player.player_id;

              return (
                <React.Fragment key={player.player_id}>
                  <tr
                    style={{
                      borderBottom: isExp ? 'none' : '1px solid var(--border)',
                      background: isExp ? 'var(--bg-raised)' : 'transparent',
                      transition: 'background 0.1s', cursor: 'pointer',
                    }}
                    onMouseEnter={e => { if (!isExp) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { if (!isExp) e.currentTarget.style.background = 'transparent'; }}
                    onClick={() => setExpandedPlayer(isExp ? null : player.player_id)}
                  >
                    <td style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.72rem' }}>{i + 1}</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ color: 'var(--text-primary)', fontFamily: "'Crimson Pro', serif", fontSize: '0.95rem' }}>
                          {player.web_name}
                        </div>
                        <AvailabilityFlag status={player.status} chance={player.chance_of_playing_next_round} news={player.news} />
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: 2, transition: 'transform 0.2s', transform: isExp ? 'rotate(180deg)' : 'none' }}>▾</div>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        {player.pl_team_full || player.pl_team}
                      </div>
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: col, border: `1px solid ${col}44`, padding: '0.1rem 0.3rem', borderRadius: 2 }}>
                        {player.position}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                      {ownerM ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Avatar teamId={player.owner_team_id} size={22} />
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>FA</span>
                      )}
                    </td>
                    <td style={{ padding: '0.4rem 0.5rem' }} onClick={e => e.stopPropagation()}>
                      <FdrSquares playerTeamId={player.pl_team_id} position={player.position} fixtures={fixtures} teamMap={teamMap} />
                    </td>
                    {COLS.map(c => (
                      <td key={c.key} style={{ padding: '0.5rem 0.4rem', textAlign: 'center', color: sort === c.key ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: sort === c.key ? 600 : 400 }}>
                        {player[c.key] ?? '—'}
                      </td>
                    ))}
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/players/${player.player_id}?season=${seasonId}`); }}
                        title="Player drill-through"
                        style={{
                          background: 'transparent', border: '1px solid var(--border)',
                          borderRadius: 4, color: 'var(--text-muted)', cursor: 'pointer',
                          padding: '2px 6px', fontSize: '0.7rem', transition: 'border-color 0.15s, color 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold-mid)'; e.currentTarget.style.color = 'var(--gold-bright)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                      >
                        ↗
                      </button>
                    </td>
                  </tr>

                  {isExp && (
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <GwStatsPanel playerId={player.player_id} seasonId={seasonId} colSpan={TOTAL_COLS} position={player.position} />
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={TOTAL_COLS} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem' }}>
                  No players match the current filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '1rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: 'var(--text-muted)' }}>
          DC = Defensive Contribution (new 25/26)
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', gap: '0.75rem' }}>
          <span>FDR: GKP/DEF = opp. attack · MID/FWD = opp. defence</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {[2, 3, 4, 5].map(d => {
            const c = fdrColor(d);
            return (
              <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 14, height: 10, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 2 }} />
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: c.text }}>
                  {d <= 2 ? 'Easy' : d === 3 ? 'Med' : d === 4 ? 'Hard' : 'BGW'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   PLAYER DRILL-THROUGH PAGE
══════════════════════════════════════════ */
export function PlayerDrillPage() {
  const { playerId }   = useParams();
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const seasonId       = searchParams.get('season') || 1;
  const managerMap     = useManagerMap();

  const [expandedSeason, setExpandedSeason] = useState(null);
  const [drillTab,       setDrillTab]       = useState('overview');

  const { data, loading, error } = useApi(`/query/player/${playerId}/drill`, [playerId]);

  if (loading) return <Loading />;
  if (error)   return <ErrorMsg message={error} />;
  if (!data)   return null;

  const { player, season_history, gw_stats, ownership_history, vs_opponents } = data;
  const posCol = posColor[player.position] || 'var(--text-muted)';

  const gwBySeason = {};
  gw_stats.forEach(r => {
    if (!gwBySeason[r.season_name]) gwBySeason[r.season_name] = [];
    gwBySeason[r.season_name].push(r);
  });

  const ownBySeason = {};
  ownership_history.forEach(r => {
    if (!ownBySeason[r.season_name]) ownBySeason[r.season_name] = [];
    ownBySeason[r.season_name].push(r);
  });

  const ownSummaryBySeason = {};
  Object.entries(ownBySeason).forEach(([season, rows]) => {
    const owners = {};
    rows.forEach(r => {
      const key = r.team_id;
      if (!owners[key]) owners[key] = { owner: r.owner, team_name: r.team_name, team_id: r.team_id, spans: [] };
      if (r.from_gw !== undefined && r.from_gw !== null) {
        owners[key].spans.push({ from: r.from_gw, to: r.to_gw || 38 });
      } else if (r.gw !== undefined) {
        owners[key].spans.push({ from: r.gw, to: r.gw });
      }
    });
    ownSummaryBySeason[season] = Object.values(owners);
  });

  return (
    <div className="fade-up">
      <button
        onClick={() => navigate(`/players?season=${seasonId}`)}
        style={{
          background: 'transparent', border: '1px solid var(--border)',
          borderRadius: 4, color: 'var(--text-muted)', cursor: 'pointer',
          padding: '0.35rem 0.75rem', fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.75rem', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '0.4rem',
        }}
      >
        ← Back to Players
      </button>

      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: '1.5rem',
        marginBottom: '2rem', padding: '1.5rem',
        background: 'var(--bg-card)', border: `1px solid ${posCol}44`,
        borderLeft: `4px solid ${posCol}`, borderRadius: 8,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '2rem', margin: 0 }}>{player.name}</h1>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem', color: posCol, border: `1px solid ${posCol}44`, padding: '0.15rem 0.5rem', borderRadius: 3 }}>
              {player.position}
            </span>
            <AvailabilityFlag status={player.status} chance={player.chance_of_playing_next_round} news={player.news} />
          </div>
          <div style={{ color: 'var(--text-secondary)', fontFamily: "'Crimson Pro', serif", fontSize: '1rem', marginTop: '0.25rem' }}>
            {player.pl_team_full}
          </div>
          {player.news && (
            <div style={{ marginTop: '0.5rem', padding: '0.4rem 0.75rem', background: '#d4a84322', border: '1px solid #d4a84344', borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', color: '#d4a843' }}>
              ⚑ {player.news}
            </div>
          )}
        </div>
        {season_history[0] && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', minWidth: 280 }}>
            {[
              { label: 'Season Pts', value: season_history[0].total_points },
              { label: 'Goals',      value: season_history[0].goals },
              { label: 'Assists',    value: season_history[0].assists },
              { label: 'CS',         value: season_history[0].clean_sheets },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', padding: '0.5rem', background: 'var(--bg-raised)', borderRadius: 4 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', fontWeight: 700, color: 'var(--gold-bright)', lineHeight: 1 }}>{s.value ?? '—'}</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 2, textTransform: 'uppercase' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[
          ['overview',  '📊 Season History'],
          ['opponents', '🆚 vs Opponents'],
          ['ownership', '👑 Ownership History'],
        ].map(([tab, label]) => (
          <button key={tab} onClick={() => setDrillTab(tab)} style={{
            padding: '0.4rem 1rem', borderRadius: 4, cursor: 'pointer',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem',
            background: drillTab === tab ? 'var(--gold-dim)' : 'var(--bg-raised)',
            border: `1px solid ${drillTab === tab ? 'var(--gold-mid)' : 'var(--border)'}`,
            color: drillTab === tab ? 'var(--gold-bright)' : 'var(--text-secondary)',
          }}>{label}</button>
        ))}
      </div>

      {drillTab === 'overview' && (
        <div className="card">
          <SectionHeader title="Season History" sub="Expand any season for GW-by-GW breakdown" />
          {season_history.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem' }}>No historical season data yet.</p>
          )}
          {season_history.map(s => {
            const isExp  = expandedSeason === s.season;
            const gwRows = gwBySeason[s.season] || [];
            return (
              <div key={s.season} style={{ marginBottom: '0.5rem', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                <div
                  onClick={() => setExpandedSeason(isExp ? null : s.season)}
                  style={{
                    display: 'grid', gridTemplateColumns: '8rem repeat(8, 1fr) 1rem',
                    gap: '0.5rem', alignItems: 'center', padding: '0.6rem 1rem',
                    background: isExp ? 'var(--bg-raised)' : 'var(--bg-card)',
                    cursor: 'pointer', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!isExp) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { if (!isExp) e.currentTarget.style.background = 'var(--bg-card)'; }}
                >
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem', color: 'var(--text-primary)' }}>{s.season}</div>
                  {[
                    { label: 'Pts', value: s.total_points, highlight: true },
                    { label: 'G',   value: s.goals },
                    { label: 'A',   value: s.assists },
                    { label: 'CS',  value: s.clean_sheets },
                    { label: 'Sv',  value: s.saves },
                    { label: 'Bon', value: s.bonus },
                    { label: 'Min', value: s.minutes },
                  ].map(col => (
                    <div key={col.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{col.label}</div>
                      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1rem', fontWeight: col.highlight ? 700 : 400, color: col.highlight ? 'var(--gold-bright)' : 'var(--text-secondary)' }}>
                        {col.value ?? '—'}
                      </div>
                    </div>
                  ))}
                  <div style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.75rem', transition: 'transform 0.2s', transform: isExp ? 'rotate(180deg)' : 'none' }}>▾</div>
                </div>
                {isExp && gwRows.length > 0 && (
                  <div style={{ background: 'var(--bg-deep)', borderTop: '1px solid var(--border)', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-gold)' }}>
                          {['GW', 'Pts', 'G', 'A', 'CS', 'Sv', 'DC', 'Bon', 'Min', '🟨', '🟥'].map(h => (
                            <th key={h} style={{ padding: '0.3rem 0.5rem', textAlign: h === 'GW' ? 'left' : 'center', color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {gwRows.map(r => (
                          <tr key={r.gw} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '0.25rem 0.5rem', color: 'var(--text-secondary)' }}>GW{r.gw}</td>
                            <td style={{ padding: '0.25rem 0.5rem', textAlign: 'center', color: r.total_points >= 8 ? '#6bcf6b' : 'var(--text-primary)', fontWeight: r.total_points >= 8 ? 700 : 400 }}>{r.total_points}</td>
                            <td style={{ padding: '0.25rem 0.5rem', textAlign: 'center', color: r.goals > 0 ? '#d4a843' : 'var(--text-muted)' }}>{r.goals || '—'}</td>
                            <td style={{ padding: '0.25rem 0.5rem', textAlign: 'center', color: r.assists > 0 ? '#d4a843' : 'var(--text-muted)' }}>{r.assists || '—'}</td>
                            <td style={{ padding: '0.25rem 0.5rem', textAlign: 'center', color: r.clean_sheets > 0 ? '#7eb8d4' : 'var(--text-muted)' }}>{r.clean_sheets > 0 ? '✓' : '—'}</td>
                            <td style={{ padding: '0.25rem 0.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{r.saves || '—'}</td>
                            <td style={{ padding: '0.25rem 0.5rem', textAlign: 'center', color: r.defensive_contribution > 0 ? '#5a9e64' : 'var(--text-muted)' }}>{r.defensive_contribution || '—'}</td>
                            <td style={{ padding: '0.25rem 0.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{r.bonus || '—'}</td>
                            <td style={{ padding: '0.25rem 0.5rem', textAlign: 'center', color: r.minutes === 0 ? 'var(--text-muted)' : 'var(--text-secondary)' }}>{r.minutes}</td>
                            <td style={{ padding: '0.25rem 0.5rem', textAlign: 'center', color: r.yellow_cards > 0 ? '#d4a843' : 'var(--text-muted)' }}>{r.yellow_cards || '—'}</td>
                            <td style={{ padding: '0.25rem 0.5rem', textAlign: 'center', color: r.red_cards > 0 ? '#e06060' : 'var(--text-muted)' }}>{r.red_cards || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {isExp && gwRows.length === 0 && (
                  <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-deep)', borderTop: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' }}>
                    No GW data in this system for {s.season}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {drillTab === 'opponents' && (
        <div className="card">
          <SectionHeader title="Performance vs Opponents" sub="Aggregated across all recorded fixtures" />
          {vs_opponents.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem' }}>No fixture history data available.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-gold)' }}>
                    {['Opponent', 'Apps', 'Pts', 'G', 'A', 'CS', 'Sv', 'Bon', 'Min', 'Pts/App'].map(h => (
                      <th key={h} style={{ padding: '0.4rem 0.5rem', textAlign: h === 'Opponent' ? 'left' : 'center', color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vs_opponents.map(opp => (
                    <tr key={opp.opponent_id} style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '0.4rem 0.5rem', color: 'var(--text-primary)' }}>
                        <span style={{ fontWeight: 500 }}>{opp.opponent_short}</span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem', fontSize: '0.7rem' }}>{opp.opponent_full}</span>
                      </td>
                      <td style={{ padding: '0.4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{opp.appearances}</td>
                      <td style={{ padding: '0.4rem', textAlign: 'center', color: 'var(--gold-bright)', fontWeight: 600 }}>{opp.total_points}</td>
                      <td style={{ padding: '0.4rem', textAlign: 'center', color: opp.goals > 0 ? '#d4a843' : 'var(--text-muted)' }}>{opp.goals || '—'}</td>
                      <td style={{ padding: '0.4rem', textAlign: 'center', color: opp.assists > 0 ? '#d4a843' : 'var(--text-muted)' }}>{opp.assists || '—'}</td>
                      <td style={{ padding: '0.4rem', textAlign: 'center', color: opp.clean_sheets > 0 ? '#7eb8d4' : 'var(--text-muted)' }}>{opp.clean_sheets || '—'}</td>
                      <td style={{ padding: '0.4rem', textAlign: 'center', color: opp.saves > 0 ? '#7eb8d4' : 'var(--text-muted)' }}>{opp.saves || '—'}</td>
                      <td style={{ padding: '0.4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{opp.bonus || '—'}</td>
                      <td style={{ padding: '0.4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{opp.minutes}</td>
                      <td style={{ padding: '0.4rem', textAlign: 'center', color: 'var(--gold-mid)', fontWeight: 500 }}>
                        {opp.appearances ? (opp.total_points / opp.appearances).toFixed(1) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {drillTab === 'ownership' && (
        <div className="card">
          <SectionHeader title="Ownership History" sub="Points scored per GW · coloured by who owned the player that week" />
          {Object.keys(ownBySeason).length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem' }}>
              No ownership data available. Run /sync/ownership to populate.
            </p>
          ) : (
            Object.entries(ownBySeason)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([season, rows]) => {
                const gwStats = gwBySeason[season] || [];
                if (!gwStats.length) return null;

                const ownerColors = {};
                (ownSummaryBySeason[season] || []).forEach(s => {
                  const m = getManager(managerMap, s.team_id);
                  ownerColors[s.team_id] = m?.color || '#888';
                });
                const FA_COLOR = '#555';

                const getOwnerAtGw = gw => {
                  for (const r of rows) {
                    const from = r.from_gw ?? r.gw;
                    const to   = r.to_gw   ?? r.gw;
                    if (gw >= from && gw <= to) return r;
                  }
                  return null;
                };

                const chartData = gwStats.map(g => {
                  const ownerRow = getOwnerAtGw(g.gw);
                  return {
                    gw:     g.gw,
                    pts:    g.total_points,
                    owner:  ownerRow?.owner || 'Free Agent',
                    teamId: ownerRow?.team_id || null,
                    color:  ownerRow ? (ownerColors[ownerRow.team_id] || '#888') : FA_COLOR,
                  };
                });

                const legendEntries = [];
                const seen = new Set();
                chartData.forEach(d => {
                  if (!seen.has(d.owner)) { seen.add(d.owner); legendEntries.push({ owner: d.owner, color: d.color }); }
                });

                const maxPts  = Math.max(...chartData.map(d => d.pts), 1);
                const CHART_H = 110;

                return (
                  <div key={season} style={{ marginBottom: '2rem' }}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem', color: 'var(--gold-bright)', marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.4rem' }}>
                      {season}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                      {legendEntries.map(e => (
                        <div key={e.owner} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: e.color }} />
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{e.owner}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: CHART_H + (chartData.length <= 20 ? 18 : 0), padding: '0 4px', borderBottom: '1px solid var(--border)' }}>
                      {chartData.map(d => {
                        const barH = d.pts > 0 ? Math.max(Math.round((d.pts / maxPts) * CHART_H), 4) : 1;
                        return (
                          <div key={d.gw} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                            <div
                              title={`GW${d.gw} · ${d.pts} pts · ${d.owner}`}
                              style={{ width: '100%', height: barH, background: d.color, borderRadius: '2px 2px 0 0', opacity: d.pts === 0 ? 0.15 : 0.85, flexShrink: 0 }}
                            />
                            {chartData.length <= 20 && (
                              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.5rem', color: 'var(--text-muted)', transform: 'rotate(-45deg)', transformOrigin: 'top center', marginTop: 2, height: 14, flexShrink: 0 }}>
                                {d.gw}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {chartData.length > 20 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                        {[1, 10, 20, 30, 38].map(gw => (
                          <span key={gw} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: 'var(--text-muted)' }}>GW{gw}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSFERS SECTION — drop these into OtherPages.js, replacing the existing
// transfers sub-components, TransfersPage, and TransferStatsPage exports.
//
// New in this version:
//   • Archived injury flags (sourced from player_status_history)
//   • Smart Score: FDR fixture swap quality badge on each transfer expand
//   • Hit rate column in manager summary
//   • TransferStatsPage: hit rate by position, avg delta by position,
//     regret leaderboard, manager scorecard (hit rate + smart score)
// ─────────────────────────────────────────────────────────────────────────────

/* ══════════════════════════════════════════
   TRANSFERS — shared sub-components
══════════════════════════════════════════ */

// FDR color scale (same as Players + Tools pages)
function fdrColor(fdr) {
  if (!fdr) return { bg: 'var(--bg-raised)', border: 'var(--border)', text: 'var(--text-muted)' };
  if (fdr <= 2) return { bg: '#0d2b0d', border: '#2d6b2d', text: '#6bcf6b' };
  if (fdr === 3) return { bg: '#2b2200', border: '#6b5500', text: '#d4a843' };
  if (fdr === 4) return { bg: '#2b0d0d', border: '#6b2020', text: '#e06060' };
  return { bg: '#1a0505', border: '#8b1515', text: '#c03030' };
}

function FdrPip({ fdr, label }) {
  const c = fdrColor(Math.round(fdr));
  return (
    <span
      title={`Avg FDR next 3 GWs: ${fdr}`}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: c.bg, border: `1px solid ${c.border}`,
        borderRadius: 3, padding: '1px 5px',
        fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem',
        color: c.text, whiteSpace: 'nowrap', marginLeft: '0.3rem',
      }}
    >
      {label} {fdr?.toFixed(1)}
    </span>
  );
}

function SmartScoreBadge({ score }) {
  if (score === null || score === undefined) return (
    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: 'var(--text-muted)' }}>—</span>
  );
  const good  = score > 0.3;
  const bad   = score < -0.3;
  const color = good ? 'var(--green-bright)' : bad ? 'var(--red-bright)' : 'var(--text-muted)';
  const label = good ? '▲ Smart' : bad ? '▼ Reactive' : '≈ Neutral';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color,
    }}>
      {label} <span style={{ opacity: 0.7 }}>({score > 0 ? '+' : ''}{score.toFixed(1)})</span>
    </span>
  );
}

function FlagBadge({ flag, archived }) {
  if (!flag) return null;
  const color = flag.level === '25%' ? 'var(--red-bright)'
    : flag.level === '50%' ? '#e08c3a'
    : flag.level === '75%' ? '#d4a843'
    : '#aaa';
  return (
    <span
      title={`${archived ? '📁 Archived flag at transfer time' : '⚡ Current flag'}: ${flag.news || flag.level}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
        marginLeft: '0.4rem', fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '0.65rem', color, cursor: 'help',
        border: `1px solid ${color}55`, borderRadius: 3, padding: '0 3px',
        opacity: archived ? 1 : 0.75,
      }}
    >
      {archived ? '📁' : '⚑'} {flag.level}
    </span>
  );
}

function PosBadge({ pos }) {
  if (!pos) return null;
  return (
    <span style={{
      display: 'inline-block', fontFamily: "'IBM Plex Mono', monospace",
      fontSize: '0.6rem', color: POS_COLOR[pos] || 'var(--text-muted)',
      border: `1px solid ${(POS_COLOR[pos] || '#888') + '55'}`,
      borderRadius: 3, padding: '0 3px', marginLeft: '0.3rem',
    }}>{pos}</span>
  );
}

function TeamTag({ team }) {
  if (!team) return null;
  return (
    <span style={{
      display: 'inline-block', fontFamily: "'IBM Plex Mono', monospace",
      fontSize: '0.6rem', color: 'var(--text-muted)',
      border: '1px solid var(--border)', borderRadius: 3,
      padding: '0 3px', marginLeft: '0.3rem',
    }}>{team}</span>
  );
}

function TransferChart({ transfer }) {
  const chartData = useMemo(() => {
    const pts = transfer.chart_gw_points || {};
    return Object.keys(pts)
      .map(Number)
      .sort((a, b) => a - b)
      .map(gw => ({
        gw: `GW${gw}`,
        [transfer.web_name_in]:  pts[gw].in,
        [transfer.web_name_out]: pts[gw].out,
      }));
  }, [transfer]);

  const deltaColor = d => d > 0 ? 'var(--green-bright)' : d < 0 ? 'var(--red-bright)' : 'var(--text-muted)';

  return (
    <td colSpan={99} style={{ padding: '1.25rem 1.5rem', background: 'var(--bg-base)' }}>
      {/* Summary row */}
      <div style={{ display: 'flex', gap: '2rem', marginBottom: '0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', flexWrap: 'wrap' }}>
        <div><span style={{ color: 'var(--text-muted)' }}>Pts after (in): </span><span style={{ color: 'var(--green-bright)', fontWeight: 600 }}>{transfer.points_in_after}</span></div>
        <div><span style={{ color: 'var(--text-muted)' }}>Pts after (out): </span><span style={{ color: 'var(--red-bright)', fontWeight: 600 }}>{transfer.points_out_after}</span></div>
        <div><span style={{ color: 'var(--text-muted)' }}>Delta: </span><span style={{ fontWeight: 600, color: deltaColor(transfer.delta) }}>{transfer.delta > 0 ? '+' : ''}{transfer.delta}</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Fixture swap: </span>
          <SmartScoreBadge score={transfer.smart_score} />
        </div>
      </div>

      {/* FDR context */}
      {(transfer.fdr_in !== null || transfer.fdr_out !== null) && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Avg FDR next 3:</span>
          {transfer.fdr_in  !== null && <FdrPip fdr={transfer.fdr_in}  label={`↑ ${transfer.web_name_in}`} />}
          {transfer.fdr_out !== null && <FdrPip fdr={transfer.fdr_out} label={`↓ ${transfer.web_name_out}`} />}
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: 'var(--text-muted)' }}>
            ({transfer.pos_in} — {transfer.pos_in === 'GKP' || transfer.pos_in === 'DEF' ? 'opp. attack' : 'opp. defence'})
          </span>
        </div>
      )}

      {/* Archived flag notes */}
      {(transfer.flag_in || transfer.flag_out) && (
        <div style={{ marginBottom: '0.75rem', padding: '0.4rem 0.75rem', background: '#d4a84311', border: '1px solid #d4a84333', borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem' }}>
          <span style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>📁 FLAG AT TRANSFER TIME:</span>
          {transfer.flag_in  && <span style={{ color: '#d4a843', marginRight: '1rem' }}>↑ {transfer.web_name_in}: {transfer.flag_in.level}{transfer.flag_in.news ? ` — ${transfer.flag_in.news}` : ''}</span>}
          {transfer.flag_out && <span style={{ color: '#d4a843' }}>↓ {transfer.web_name_out}: {transfer.flag_out.level}{transfer.flag_out.news ? ` — ${transfer.flag_out.news}` : ''}</span>}
        </div>
      )}

      {/* GW chart */}
      {chartData.length > 0 ? (
        <>
          <div style={{ marginBottom: '0.4rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Points per GW after transfer
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="gw" tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fill: 'var(--text-muted)' }} />
              <Tooltip contentStyle={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' }} labelStyle={{ color: 'var(--text-muted)' }} />
              <Legend wrapperStyle={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem' }} />
              <Line type="monotone" dataKey={transfer.web_name_in}  stroke="var(--green-bright)" strokeWidth={2} dot={{ r: 3 }} name={`↑ ${transfer.web_name_in}`} />
              <Line type="monotone" dataKey={transfer.web_name_out} stroke="var(--red-bright)"   strokeWidth={2} dot={{ r: 3 }} name={`↓ ${transfer.web_name_out}`} />
            </LineChart>
          </ResponsiveContainer>
        </>
      ) : (
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          No gameweek data available yet.
        </div>
      )}
    </td>
  );
}

function SortTh({ label, sortKey, sort, dir, onSort, style: extraStyle = {} }) {
  const active = sort === sortKey;
  return (
    <th onClick={() => onSort(sortKey)} style={{
      padding: '0.5rem 0.75rem', textAlign: 'left', cursor: 'pointer',
      color: active ? 'var(--gold-bright)' : 'var(--text-muted)',
      fontWeight: active ? 600 : 400, fontSize: '0.7rem',
      fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase',
      letterSpacing: '0.08em', userSelect: 'none', whiteSpace: 'nowrap',
      ...extraStyle,
    }}>
      {label} {active ? (dir === 'desc' ? '↓' : '↑') : ''}
    </th>
  );
}

/* ══════════════════════════════════════════
   TRANSFERS PAGE
══════════════════════════════════════════ */
export function TransfersPage() {
  const managerMap     = useManagerMap();
  const [searchParams] = useSearchParams();
  const seasonId       = searchParams.get('season') || 1;

  const [view,      setView]      = useState('all');
  const [mgrFilter, setMgrFilter] = useState('ALL');
  const [posFilter, setPosFilter] = useState('ALL');
  const [sort,      setSort]      = useState('gw');
  const [sortDir,   setSortDir]   = useState('desc');
  const [expanded,  setExpanded]  = useState(null);

  const { data, loading, error } = useApi(`/query/season/${seasonId}/transfers`, [seasonId]);

  if (loading) return <Loading />;
  if (error)   return <ErrorMsg message={error} />;
  if (!data)   return null;

  const { all_transfers, best_transfer, worst_transfer, manager_summary } = data;
  const managers = ['ALL', ...new Set(all_transfers.map(t => t.manager))];

  const filtered = all_transfers
    .filter(t =>
      (mgrFilter === 'ALL' || t.manager === mgrFilter) &&
      (posFilter === 'ALL' || t.pos_in === posFilter || t.pos_out === posFilter)
    )
    .sort((a, b) => {
      let va = a[sort], vb = b[sort];
      if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb || '').toLowerCase(); }
      if (va == null) va = -Infinity;
      if (vb == null) vb = -Infinity;
      return sortDir === 'desc' ? (vb > va ? 1 : -1) : (va > vb ? 1 : -1);
    });

  function handleSort(key) {
    if (sort === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSort(key); setSortDir('desc'); }
  }

  const deltaColor = d => d > 0 ? 'var(--green-bright)' : d < 0 ? 'var(--red-bright)' : 'var(--text-muted)';

  return (
    <div className="fade-up">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>Transfer Analytics</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Delta = points scored by player_in vs player_out after the transfer gameweek ·
          Smart Score = fixture quality of the swap (FDR-based, position-aware)
        </p>
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[['all', 'All Transfers'], ['summary', 'Manager Summary']].map(([v, l]) => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: '0.4rem 1rem', borderRadius: 4, cursor: 'pointer',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            background: view === v ? 'var(--gold-dim)' : 'var(--bg-raised)',
            border: `1px solid ${view === v ? 'var(--gold-mid)' : 'var(--border)'}`,
            color: view === v ? 'var(--gold-bright)' : 'var(--text-secondary)',
          }}>{l}</button>
        ))}
      </div>

      {/* Best / Worst callouts */}
      {(best_transfer || worst_transfer) && (
        <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
          {best_transfer && (
            <div className="card" style={{ borderLeft: '3px solid var(--green-bright)' }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>🏆 Best Transfer</div>
              <div style={{ color: 'var(--green-bright)', fontFamily: "'Playfair Display', serif", fontSize: '1.1rem' }}>+{best_transfer.delta} pts</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>↑ {best_transfer.web_name_in} <PosBadge pos={best_transfer.pos_in} /> <TeamTag team={best_transfer.team_in} /></div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>↓ {best_transfer.web_name_out} <PosBadge pos={best_transfer.pos_out} /> <TeamTag team={best_transfer.team_out} /></div>
              <div style={{ color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', marginTop: '0.25rem' }}>GW{best_transfer.gw} · {best_transfer.manager}</div>
            </div>
          )}
          {worst_transfer && (
            <div className="card" style={{ borderLeft: '3px solid var(--red-bright)' }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>💸 Worst Transfer</div>
              <div style={{ color: 'var(--red-bright)', fontFamily: "'Playfair Display', serif", fontSize: '1.1rem' }}>{worst_transfer.delta} pts</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>↑ {worst_transfer.web_name_in} <PosBadge pos={worst_transfer.pos_in} /> <TeamTag team={worst_transfer.team_in} /></div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>↓ {worst_transfer.web_name_out} <PosBadge pos={worst_transfer.pos_out} /> <TeamTag team={worst_transfer.team_out} /></div>
              <div style={{ color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', marginTop: '0.25rem' }}>GW{worst_transfer.gw} · {worst_transfer.manager}</div>
            </div>
          )}
        </div>
      )}

      {/* ── ALL TRANSFERS ── */}
      {view === 'all' && (
        <div className="card" style={{ padding: 0 }}>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Filter:</span>
            <select value={mgrFilter} onChange={e => setMgrFilter(e.target.value)} style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '0.3rem 0.6rem', borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', cursor: 'pointer' }}>
              {managers.map(m => <option key={m} value={m}>{m === 'ALL' ? 'All Managers' : m}</option>)}
            </select>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {POSITIONS.map(p => (
                <button key={p} onClick={() => setPosFilter(p)} style={{
                  padding: '0.25rem 0.6rem', borderRadius: 4, cursor: 'pointer',
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem',
                  background: posFilter === p ? (POS_COLOR[p] || 'var(--gold-dim)') + '33' : 'var(--bg-raised)',
                  border: `1px solid ${posFilter === p ? (POS_COLOR[p] || 'var(--gold-mid)') : 'var(--border)'}`,
                  color: posFilter === p ? (POS_COLOR[p] || 'var(--gold-bright)') : 'var(--text-secondary)',
                }}>{p}</button>
              ))}
            </div>
            <span style={{ marginLeft: 'auto', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {filtered.length} transfer{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-gold)' }}>
                  <th style={{ width: 32 }} />
                  <SortTh label="GW"      sortKey="gw"           sort={sort} dir={sortDir} onSort={handleSort} />
                  <SortTh label="Manager" sortKey="manager"       sort={sort} dir={sortDir} onSort={handleSort} />
                  <SortTh label="Type"    sortKey="kind"          sort={sort} dir={sortDir} onSort={handleSort} />
                  <SortTh label="↑ In"    sortKey="web_name_in"   sort={sort} dir={sortDir} onSort={handleSort} />
                  <SortTh label="↓ Out"   sortKey="web_name_out"  sort={sort} dir={sortDir} onSort={handleSort} />
                  <SortTh label="Delta"   sortKey="delta"         sort={sort} dir={sortDir} onSort={handleSort} style={{ textAlign: 'right' }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <React.Fragment key={t.id}>
                    <tr
                      style={{ borderBottom: expanded === t.id ? 'none' : '1px solid var(--border)', cursor: 'pointer', background: expanded === t.id ? 'var(--bg-raised)' : 'transparent' }}
                      onClick={() => setExpanded(prev => prev === t.id ? null : t.id)}
                    >
                      <td style={{ padding: '0.5rem 0 0.5rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.7rem' }}>{expanded === t.id ? '▼' : '▶'}</td>
                      <td style={{ padding: '0.5rem 0.6rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>GW{t.gw}</td>
                      <td style={{ padding: '0.5rem 0.6rem', color: 'var(--text-secondary)' }}>{t.manager}</td>
                      <td style={{ padding: '0.5rem 0.6rem' }}>
                        <span className={`badge ${t.kind === 'w' ? 'badge--draw' : 'badge--win'}`}>{t.kind === 'w' ? 'Waiver' : 'Free Agent'}</span>
                      </td>
                      <td style={{ padding: '0.5rem 0.6rem', color: 'var(--green-bright)', whiteSpace: 'nowrap' }}>
                        ↑ {t.web_name_in}<PosBadge pos={t.pos_in} /><TeamTag team={t.team_in} /><FlagBadge flag={t.flag_in} archived={t.flag_in_archived} />
                      </td>
                      <td style={{ padding: '0.5rem 0.6rem', color: 'var(--red-bright)', whiteSpace: 'nowrap' }}>
                        ↓ {t.web_name_out}<PosBadge pos={t.pos_out} /><TeamTag team={t.team_out} /><FlagBadge flag={t.flag_out} archived={t.flag_out_archived} />
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 600, color: deltaColor(t.delta) }}>{t.delta > 0 ? '+' : ''}{t.delta}</td>
                    </tr>
                    {expanded === t.id && (
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <TransferChart transfer={t} />
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No transfers match the current filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MANAGER SUMMARY ── */}
      {view === 'summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[...manager_summary].sort((a, b) => b.net_delta - a.net_delta).map(mgr => {
            const m = getManager(managerMap, mgr.team_id);
            return (
              <div key={mgr.manager} style={{
                display: 'grid', gridTemplateColumns: '40px 1fr auto auto auto auto',
                alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem',
                background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 6,
                borderLeft: `3px solid ${mgr.net_delta >= 0 ? 'var(--green-bright)' : 'var(--red-bright)'}`,
              }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: m?.color || 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Playfair Display', serif", fontSize: '0.9rem', color: '#fff' }}>
                  {mgr.manager[0]}
                </div>
                <div>
                  <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: '1rem', color: 'var(--text-primary)' }}>{mgr.manager}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: 'var(--text-muted)' }}>{mgr.total_moves} transfer{mgr.total_moves !== 1 ? 's' : ''}</div>
                </div>
                {/* Net delta */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>NET DELTA</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: mgr.net_delta >= 0 ? 'var(--green-bright)' : 'var(--red-bright)' }}>{mgr.net_delta > 0 ? '+' : ''}{mgr.net_delta}</div>
                </div>
                {/* Hit rate */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>HIT RATE</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: mgr.hit_rate >= 50 ? 'var(--green-bright)' : 'var(--red-bright)' }}>{mgr.hit_rate}%</div>
                </div>
                {mgr.best_transfer && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>BEST</div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: 'var(--green-bright)' }}>+{mgr.best_transfer.delta}</div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: 'var(--text-muted)' }}>{mgr.best_transfer.web_name_in}</div>
                  </div>
                )}
                {mgr.worst_transfer && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>WORST</div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: 'var(--red-bright)' }}>{mgr.worst_transfer.delta}</div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: 'var(--text-muted)' }}>{mgr.worst_transfer.web_name_in}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


/* ══════════════════════════════════════════
   TRANSFER STATS PAGE
══════════════════════════════════════════ */
export function TransferStatsPage() {
  const [searchParams] = useSearchParams();
  const managerMap     = useManagerMap();
  const seasonId       = searchParams.get('season') || 1;

  const { data, loading, error } = useApi(`/query/season/${seasonId}/transfer-stats`, [seasonId]);

  if (loading) return <Loading />;
  if (error)   return <ErrorMsg message={error} />;
  if (!data)   return null;

  const { by_position, by_team, by_manager, by_gw, busiest_gw, regret_board } = data;

  const posChartData     = by_position.map(p => ({ pos: p.position, In: p.in || 0, Out: p.out || 0 }));
  const teamChartDataIn  = by_team.slice(0, 10).map(t => ({ team: t.pl_team, Attack: t.in.attack,  Defense: t.in.defense  }));
  const teamChartDataOut = by_team.slice(0, 10).map(t => ({ team: t.pl_team, Attack: t.out.attack, Defense: t.out.defense }));
  const gwChartData      = by_gw.map(g => ({ gw: `GW${g.gw}`, Transfers: g.count }));

  // Hit rate bar chart data
  const hitRateData = by_position.map(p => ({
    pos:      p.position,
    'Hit %':  p.hit_rate || 0,
    'Avg Δ':  p.avg_delta || 0,
  }));

  // Manager scorecard data (sorted by net_delta)
  const mgrScorecardData = [...by_manager].sort((a, b) => b.net_delta - a.net_delta);

  const TT = {
    contentStyle: { background: 'var(--bg-raised)', border: '1px solid var(--border)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' },
    labelStyle:   { color: 'var(--text-muted)' },
  };

  return (
    <div className="fade-up">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>Transfer Stats</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Patterns, hit rates, and fixture intelligence across all accepted transfers</p>
      </div>

      {/* Busiest GW callout */}
      {busiest_gw && (
        <div className="card" style={{ borderLeft: '3px solid var(--gold-bright)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>🔥 Most Active Gameweek</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', color: 'var(--gold-bright)' }}>GW{busiest_gw.gw}</div>
          </div>
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Transfers</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', color: 'var(--text-primary)' }}>{busiest_gw.count}</div>
          </div>
        </div>
      )}

      {/* ── Manager scorecard ───────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <SectionHeader title="Manager Transfer Scorecard" sub="Net delta, hit rate, and total moves" />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-gold)' }}>
                {['Manager', 'Moves', 'Net Δ', 'Hit Rate', '+ Moves', '− Moves'].map(h => (
                  <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: h === 'Manager' ? 'left' : 'right', color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.7rem', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mgrScorecardData.map(mgr => {
                const m = Object.values(managerMap || {}).find(x => x.name === mgr.manager);
                return (
                  <tr key={mgr.manager} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: m?.color || 'var(--border)', flexShrink: 0 }} />
                      {mgr.manager}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>{mgr.count}</td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 600, color: mgr.net_delta >= 0 ? 'var(--green-bright)' : 'var(--red-bright)' }}>
                      {mgr.net_delta > 0 ? '+' : ''}{mgr.net_delta}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>
                      {/* Hit rate bar */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <div style={{ width: 60, height: 6, background: 'var(--bg-hover)', borderRadius: 3 }}>
                          <div style={{ height: '100%', width: `${mgr.hit_rate}%`, background: mgr.hit_rate >= 50 ? 'var(--green-bright)' : 'var(--red-bright)', borderRadius: 3 }} />
                        </div>
                        <span style={{ color: mgr.hit_rate >= 50 ? 'var(--green-bright)' : 'var(--red-bright)', minWidth: 36, textAlign: 'right' }}>{mgr.hit_rate}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: 'var(--green-bright)' }}>{mgr.positive_moves}</td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: 'var(--red-bright)' }}>{mgr.count - mgr.positive_moves}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Hit rate + avg delta by position ────────────────────────────────── */}
      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <SectionHeader title="Hit Rate by Position" sub="% of transfers with positive delta (player IN)" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hitRateData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="pos" tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis domain={[0, 100]} tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fill: 'var(--text-muted)' }} unit="%" />
              <Tooltip {...TT} formatter={v => `${v}%`} />
              <ReferenceLine y={50} stroke="var(--border-gold)" strokeDasharray="4 2" />
              <Bar dataKey="Hit %" radius={[3, 3, 0, 0]}>
                {hitRateData.map((entry, i) => (
                  <Cell key={i} fill={entry['Hit %'] >= 50 ? 'var(--green-bright)' : 'var(--red-bright)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <SectionHeader title="Avg Delta by Position" sub="Average points gained per transfer (player IN position)" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hitRateData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="pos" tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fill: 'var(--text-muted)' }} />
              <Tooltip {...TT} />
              <ReferenceLine y={0} stroke="var(--border-gold)" strokeDasharray="4 2" />
              <Bar dataKey="Avg Δ" radius={[3, 3, 0, 0]}>
                {hitRateData.map((entry, i) => (
                  <Cell key={i} fill={entry['Avg Δ'] >= 0 ? 'var(--green-bright)' : 'var(--red-bright)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Volume: positions ────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <SectionHeader title="Transfer Volume by Position" sub="IN and OUT counts" />
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={posChartData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="pos" tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fill: 'var(--text-muted)' }} />
            <YAxis tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fill: 'var(--text-muted)' }} allowDecimals={false} />
            <Tooltip {...TT} />
            <Legend wrapperStyle={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem' }} />
            <Bar dataKey="In"  fill="var(--green-bright)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Out" fill="var(--red-bright)"   radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Team IN/OUT ──────────────────────────────────────────────────────── */}
      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <SectionHeader title="Teams — Transferred IN" sub="Attack (MID+FWD) vs Defence (GKP+DEF)" />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={teamChartDataIn} layout="vertical" margin={{ top: 4, right: 16, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fill: 'var(--text-muted)' }} allowDecimals={false} />
              <YAxis type="category" dataKey="team" tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fill: 'var(--text-muted)' }} width={36} />
              <Tooltip {...TT} />
              <Legend wrapperStyle={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem' }} />
              <Bar dataKey="Attack"  stackId="a" fill="#d4a843" />
              <Bar dataKey="Defense" stackId="a" fill="#7eb8d4" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <SectionHeader title="Teams — Transferred OUT" sub="Attack (MID+FWD) vs Defence (GKP+DEF)" />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={teamChartDataOut} layout="vertical" margin={{ top: 4, right: 16, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fill: 'var(--text-muted)' }} allowDecimals={false} />
              <YAxis type="category" dataKey="team" tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fill: 'var(--text-muted)' }} width={36} />
              <Tooltip {...TT} />
              <Legend wrapperStyle={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem' }} />
              <Bar dataKey="Attack"  stackId="a" fill="#c07a5a" />
              <Bar dataKey="Defense" stackId="a" fill="#5a9e64" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Regret board ─────────────────────────────────────────────────────── */}
      {regret_board?.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <SectionHeader title="😬 Regret Board" sub="Transfers where the dropped player outscored the pickup — top 10" />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-gold)' }}>
                  {['#', 'Manager', 'GW', '↑ In', '↓ Out', 'Pts In', 'Pts Out', 'Regret'].map((h, i) => (
                    <th key={h} style={{ padding: '0.4rem 0.6rem', textAlign: i >= 5 ? 'right' : 'left', color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.7rem', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {regret_board.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '0.4rem 0.6rem', color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td style={{ padding: '0.4rem 0.6rem', color: 'var(--text-secondary)' }}>{r.manager}</td>
                    <td style={{ padding: '0.4rem 0.6rem', color: 'var(--text-muted)' }}>GW{r.gw}</td>
                    <td style={{ padding: '0.4rem 0.6rem', color: 'var(--green-bright)', whiteSpace: 'nowrap' }}>
                      {r.player_in} <PosBadge pos={r.pos_in} />
                    </td>
                    <td style={{ padding: '0.4rem 0.6rem', color: 'var(--red-bright)', whiteSpace: 'nowrap' }}>
                      {r.player_out} <PosBadge pos={r.pos_out} />
                    </td>
                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', color: 'var(--text-secondary)' }}>{r.pts_in}</td>
                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', color: 'var(--text-secondary)' }}>{r.pts_out}</td>
                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontWeight: 700, color: 'var(--red-bright)' }}>−{r.pts_out - r.pts_in}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── GW activity ─────────────────────────────────────────────────────── */}
      <div className="card">
        <SectionHeader title="Transfer Activity by Gameweek" sub="Busiest and quietest weeks of the season" />
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={gwChartData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="gw" tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fill: 'var(--text-muted)' }} interval={1} />
            <YAxis tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fill: 'var(--text-muted)' }} allowDecimals={false} />
            <Tooltip {...TT} />
            <Bar dataKey="Transfers" radius={[3, 3, 0, 0]}>
              {gwChartData.map((entry, i) => (
                <Cell key={i} fill={busiest_gw && entry.gw === `GW${busiest_gw.gw}` ? 'var(--gold-bright)' : 'var(--gold-dim)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
/* ══════════════════════════════════════════
   RECORDS PAGE
══════════════════════════════════════════ */
export function RecordsPage() {
  const [searchParams] = useSearchParams();
  const seasonId = searchParams.get('season') || 1;
  const { data, loading, error } = useApi(`/query/season/${seasonId}/records`, [seasonId]);

  if (loading) return <Loading />;
  if (error)   return <ErrorMsg message={error} />;
  if (!data)   return null;

  const { highest_score, lowest_score, biggest_margin, most_points_in_loss, longest_win_streak, longest_loss_streak, bench_points } = data;

  return (
    <div className="fade-up">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>Season Records</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Notable highs, lows, and streaks</p>
      </div>

      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        {highest_score     && <StatCard label="Highest Score"   value={highest_score.points}       sub={`${highest_score.manager} · GW${highest_score.gw}`}                                            accent="var(--green-bright)" />}
        {lowest_score      && <StatCard label="Lowest Score"    value={lowest_score.points}        sub={`${lowest_score.manager} · GW${lowest_score.gw}`}                                              accent="var(--red-bright)"   />}
        {biggest_margin    && <StatCard label="Biggest Margin"  value={biggest_margin.margin}      sub={`${biggest_margin.winner} def. ${biggest_margin.loser} · GW${biggest_margin.gw}`}              accent="var(--gold-mid)"     />}
        {most_points_in_loss && <StatCard label="Heartbreak Loss" value={most_points_in_loss.points_for} sub={`${most_points_in_loss.manager} scored but lost · GW${most_points_in_loss.gw}`}         accent="var(--color-km)"     />}
      </div>

      {(longest_win_streak || longest_loss_streak) && (
        <div className="grid-2" style={{ marginBottom: '2rem' }}>
          {longest_win_streak && (
            <div className="card">
              <SectionHeader title="Longest Win Streak" />
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', fontWeight: 700, color: 'var(--green-bright)' }}>{longest_win_streak.length} wins</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {longest_win_streak.manager} · GW{longest_win_streak.start_gw}–{longest_win_streak.end_gw}
              </div>
            </div>
          )}
          {longest_loss_streak && (
            <div className="card">
              <SectionHeader title="Longest Loss Streak" />
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', fontWeight: 700, color: 'var(--red-bright)' }}>{longest_loss_streak.length} losses</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {longest_loss_streak.manager} · GW{longest_loss_streak.start_gw}–{longest_loss_streak.end_gw}
              </div>
            </div>
          )}
        </div>
      )}

      {bench_points?.length > 0 && (
        <div className="card">
          <SectionHeader title="Points Left on Bench" sub="Total points scored by benched players" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {bench_points.map((row, i) => {
              const pct = row.bench_points / bench_points[0].bench_points;
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2rem 1fr auto', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>{i + 1}</div>
                  <div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>{row.manager}</div>
                    <div style={{ height: 4, background: 'var(--bg-hover)', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${pct * 100}%`, background: 'var(--gold-mid)', borderRadius: 2, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', minWidth: 40, textAlign: 'right' }}>{row.bench_points}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   ALL TIME PAGE
══════════════════════════════════════════ */
export function AllTimePage() {
  const { data: h2h,     loading: l1 } = useApi('/query/alltime/h2h');
  const { data: records, loading: l2 } = useApi('/query/alltime/records');

  if (l1 || l2) return <Loading />;

  const managers = h2h ? [...new Set(h2h.map(r => r.manager))].sort() : [];

  return (
    <div className="fade-up">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>All Time</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Records and H2H across every season</p>
      </div>

      {records && (
        <div className="grid-2" style={{ marginBottom: '2rem' }}>
          {records.highest_score_ever  && <StatCard label="Highest Score Ever"  value={records.highest_score_ever.points}        sub={`${records.highest_score_ever.manager} · ${records.highest_score_ever.season} GW${records.highest_score_ever.gw}`}   accent="var(--green-bright)" />}
          {records.lowest_score_ever   && <StatCard label="Lowest Score Ever"   value={records.lowest_score_ever.points}         sub={`${records.lowest_score_ever.manager} · ${records.lowest_score_ever.season} GW${records.lowest_score_ever.gw}`}     accent="var(--red-bright)"   />}
          {records.biggest_margin_ever && <StatCard label="Biggest Margin Ever" value={records.biggest_margin_ever.margin}       sub={`${records.biggest_margin_ever.winner} · ${records.biggest_margin_ever.season} GW${records.biggest_margin_ever.gw}`} accent="var(--gold-mid)"     />}
        </div>
      )}

      {records?.historic_finishes?.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem', overflowX: 'auto', padding: 0 }}>
          <div style={{ padding: '1rem 1.25rem 0.5rem' }}>
            <SectionHeader title="Historic League Finishes" sub="Final position each season" />
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-gold)', background: 'var(--bg-raised)' }}>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: 'var(--text-muted)' }}>Manager</th>
                {[...new Set(records.historic_finishes.map(r => r.season))].sort().map(s => (
                  <th key={s} style={{ padding: '0.5rem 0.4rem', textAlign: 'center', color: 'var(--text-muted)', minWidth: 70 }}>{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...new Set(records.historic_finishes.map(r => r.manager))].sort().map(mgr => (
                <tr key={mgr} style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '0.4rem 0.75rem', color: 'var(--text-primary)' }}>{mgr}</td>
                  {[...new Set(records.historic_finishes.map(r => r.season))].sort().map(season => {
                    const entry  = records.historic_finishes.find(r => r.manager === mgr && r.season === season);
                    const finish = entry?.finish;
                    const color  = finish === 1 ? 'var(--gold-bright)' : finish === 2 ? '#c0c0c0' : finish === 3 ? '#cd7f32' : 'var(--text-muted)';
                    return (
                      <td key={season} style={{ padding: '0.4rem', textAlign: 'center', color, fontWeight: finish <= 3 ? 700 : 400 }}>
                        {finish ? `${finish}${finish === 1 ? 'st' : finish === 2 ? 'nd' : finish === 3 ? 'rd' : 'th'}` : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {h2h?.length > 0 && (
        <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
          <div style={{ padding: '1rem 1.25rem 0.5rem' }}>
            <SectionHeader title="All-Time H2H" sub="W–D–L across all seasons" />
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-gold)', background: 'var(--bg-raised)' }}>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: 'var(--text-muted)' }}>vs</th>
                {managers.map(m => <th key={m} style={{ padding: '0.5rem 0.4rem', textAlign: 'center', color: 'var(--text-muted)', minWidth: 70 }}>{m}</th>)}
              </tr>
            </thead>
            <tbody>
              {managers.map(rowMgr => (
                <tr key={rowMgr} style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '0.4rem 0.75rem', color: 'var(--text-primary)', fontWeight: 600 }}>{rowMgr}</td>
                  {managers.map(colMgr => {
                    if (rowMgr === colMgr) return <td key={colMgr} style={{ padding: '0.4rem', textAlign: 'center', background: 'var(--bg-raised)', color: 'var(--text-muted)' }}>—</td>;
                    const record = h2h.find(r => r.manager === rowMgr && r.opponent === colMgr);
                    if (!record) return <td key={colMgr} style={{ padding: '0.4rem', textAlign: 'center', color: 'var(--text-muted)' }}>—</td>;
                    return (
                      <td key={colMgr} style={{ padding: '0.4rem', textAlign: 'center' }}>
                        <span style={{ color: 'var(--green-bright)' }}>{record.wins}</span>
                        <span style={{ color: 'var(--text-muted)' }}>–{record.draws}–</span>
                        <span style={{ color: 'var(--red-bright)' }}>{record.losses}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
