import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { getManager } from '../config';
import { useManagerMap } from '../ManagerContext';
import { Loading, ErrorMsg, SectionHeader, Avatar, StatCard } from '../components/UI';

/* ══════════════════════════════════════════
   SHARED UTILITIES
══════════════════════════════════════════ */

const posColor = { GKP: '#7eb8d4', DEF: '#5a9e64', MID: '#d4a843', FWD: '#c07a5a' };

function fdrColor(fdr) {
  if (fdr <= 2) return { bg: '#0d2b0d', border: '#2d6b2d', text: '#6bcf6b' };
  if (fdr === 3) return { bg: '#2b2200', border: '#6b5500', text: '#d4a843' };
  if (fdr === 4) return { bg: '#2b0d0d', border: '#6b2020', text: '#e06060' };
  return { bg: '#1a0505', border: '#8b1515', text: '#c03030' };
}

/* ── Availability flag icon ── */
function AvailabilityFlag({ status, chance, news }) {
  if (!status || status === 'a') return null;

  let icon = '⚑';
  let color = '#d4a843';
  let title = news || status;

  if (status === 'd') { icon = '?'; color = '#d4a843'; }   // doubtful
  if (status === 'i') { icon = '✚'; color = '#e06060'; }   // injured
  if (status === 's') { icon = '⊘'; color = '#e06060'; }   // suspended
  if (status === 'u') { icon = '✗'; color = '#888';    }   // unavailable
  if (chance !== null && chance !== undefined) {
    if (chance === 0)   { icon = '✗'; color = '#e06060'; }
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

/* ── FDR squares: next 5 GWs ──
   pos-aware: GKP/DEF → opponent ATK strength; MID/FWD → opponent DEF strength
*/
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
          ? (isHome ? f.team_h_defence_fdr : f.team_a_defence_fdr)   // opp attack → how hard to keep CS
          : (isHome ? f.team_h_attack_fdr  : f.team_a_attack_fdr);   // opp defence → how hard to score
        const col    = fdrColor(fdr || 3);

        return (
          <div
            key={i}
            title={`GW${f.gw}: ${opp?.name || oppId} (${isHome ? 'H' : 'A'}) — FDR ${fdr}`}
            style={{
              background: col.bg,
              border: `1px solid ${col.border}`,
              borderRadius: 3,
              padding: '1px 4px',
              fontSize: '0.58rem',
              color: col.text,
              fontFamily: "'IBM Plex Mono', monospace",
              whiteSpace: 'nowrap',
              lineHeight: 1.6,
              minWidth: 34,
              textAlign: 'center',
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
  const label = allSelected
    ? 'All Clubs'
    : selected.length === 1
    ? selected[0]
    : `${selected.length} clubs`;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '0.4rem 0.75rem',
          background: 'var(--bg-raised)',
          border: `1px solid ${allSelected ? 'var(--border)' : 'var(--gold-mid)'}`,
          borderRadius: 4,
          color: allSelected ? 'var(--text-secondary)' : 'var(--gold-bright)',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.8rem',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          minWidth: 120,
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
          minWidth: 180, maxHeight: 300, overflowY: 'auto',
          padding: '0.4rem 0',
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
                onClick={() => {
                  onChange(active ? selected.filter(s => s !== t) : [...selected, t]);
                }}
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

/* ── GW Stats Expanded Panel (replaces historic) ── */
function GwStatsPanel({ playerId, seasonId, colSpan }) {
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
      No GW data for this season — run /sync/stats/{gw} or /sync/element-summaries to populate
    </td>
  );

  const headers = ['GW', 'Pts', 'G', 'A', 'CS', 'Sv', 'DC', 'Bon', 'Min', '🟨', '🟥', 'Owner'];

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
                  <td style={{ padding: '0.25rem 0.5rem', textAlign: 'center', color: row.total_points >= 8 ? '#6bcf6b' : row.total_points === 0 ? 'var(--text-muted)' : 'var(--text-primary)', fontWeight: row.total_points >= 8 ? 700 : 400 }}>{row.total_points}</td>
                  <td style={{ padding: '0.25rem 0.5rem', textAlign: 'center', color: row.goals > 0 ? '#d4a843' : 'var(--text-muted)' }}>{row.goals || '—'}</td>
                  <td style={{ padding: '0.25rem 0.5rem', textAlign: 'center', color: row.assists > 0 ? '#d4a843' : 'var(--text-muted)' }}>{row.assists || '—'}</td>
                  <td style={{ padding: '0.25rem 0.5rem', textAlign: 'center', color: row.clean_sheets > 0 ? '#7eb8d4' : 'var(--text-muted)' }}>{row.clean_sheets > 0 ? '✓' : '—'}</td>
                  <td style={{ padding: '0.25rem 0.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{row.saves || '—'}</td>
                  <td style={{ padding: '0.25rem 0.5rem', textAlign: 'center', color: row.defensive_contribution > 0 ? '#5a9e64' : 'var(--text-muted)' }}>{row.defensive_contribution || '—'}</td>
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

  const [search, setSearch]           = useState('');
  const [posFilter, setPosFilter]     = useState('ALL');
  const [teamFilter, setTeamFilter]   = useState([]);   // array of short_names
  const [sort, setSort]               = useState('total_points');
  const [expandedPlayer, setExpandedPlayer] = useState(null);

  const { data, loading, error }     = useApi(`/query/season/${seasonId}/players`, [seasonId]);
  const { data: fixtureData }        = useApi(`/query/season/${seasonId}/fixtures-upcoming`, [seasonId]);

  if (loading) return <Loading />;
  if (error)   return <ErrorMsg message={error} />;

  const positions = ['ALL', 'GKP', 'DEF', 'MID', 'FWD'];

  // Build fixtures/teamMap for FDR
  const fixtures = fixtureData?.fixtures || [];
  const teamMap  = {};
  (fixtureData?.teams || []).forEach(t => { teamMap[t.id] = t; });

  // Unique PL teams for the dropdown (use full name for display, filter by full name or short)
  const allPlTeams = [...new Set((data || []).map(p => p.pl_team_full || p.pl_team))].filter(Boolean).sort();

  // Filter + sort
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
    { key: 'total_points',          label: 'Pts'   },
    { key: 'goals',                 label: 'G'     },
    { key: 'assists',               label: 'A'     },
    { key: 'clean_sheets',          label: 'CS'    },
    { key: 'saves',                 label: 'Sv'    },
    { key: 'defensive_contribution',label: 'DC'    },
    { key: 'bonus',                 label: 'Bon'   },
    { key: 'yellow_cards',          label: '🟨'   },
    { key: 'red_cards',             label: '🟥'   },
    { key: 'minutes',               label: 'Min'   },
    { key: 'blank_gws',             label: 'Blank' },
  ];

  // Total columns: rank(1) + name(1) + pos(1) + owner(1) + fdr(1) + stats(11) + drill(1) = 17
  const TOTAL_COLS = 17;

  return (
    <div className="fade-up">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>Player Stats</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          All players ranked by season performance · expand ▾ for GW breakdown
        </p>
      </div>

      {/* Filters */}
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

        {/* Position pills */}
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {positions.map(pos => (
            <button key={pos} onClick={() => setPosFilter(pos)} style={{
              padding: '0.35rem 0.7rem', borderRadius: 4, cursor: 'pointer',
              fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem',
              background: posFilter === pos
                ? (pos === 'ALL' ? 'var(--gold-dim)' : `${posColor[pos]}33`)
                : 'var(--bg-raised)',
              border: `1px solid ${posFilter === pos ? (posColor[pos] || 'var(--gold-mid)') : 'var(--border)'}`,
              color: posFilter === pos ? (posColor[pos] || 'var(--gold-bright)') : 'var(--text-secondary)',
            }}>
              {pos}
            </button>
          ))}
        </div>

        {/* Club dropdown */}
        <TeamFilterDropdown
          teams={allPlTeams}
          selected={teamFilter}
          onChange={setTeamFilter}
        />
      </div>

      {/* Table */}
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
              const ownerM  = player.owner_team_id ? getManager(managerMap, player.owner_team_id) : null;
              const col     = posColor[player.position] || 'var(--text-muted)';
              const isExp   = expandedPlayer === player.player_id;

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
                    {/* Rank */}
                    <td style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.72rem' }}>{i + 1}</td>

                    {/* Name + club + flags */}
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ color: 'var(--text-primary)', fontFamily: "'Crimson Pro', serif", fontSize: '0.95rem' }}>
                          {player.web_name}
                        </div>
                        <AvailabilityFlag
                          status={player.status}
                          chance={player.chance_of_playing_next_round}
                          news={player.news}
                        />
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: 2, transition: 'transform 0.2s', transform: isExp ? 'rotate(180deg)' : 'none' }}>▾</div>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        {player.pl_team_full || player.pl_team}
                      </div>
                    </td>

                    {/* Position badge */}
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: col, border: `1px solid ${col}44`, padding: '0.1rem 0.3rem', borderRadius: 2 }}>
                        {player.position}
                      </span>
                    </td>

                    {/* Owner avatar */}
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                      {ownerM ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Avatar teamId={player.owner_team_id} size={22} />
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>FA</span>
                      )}
                    </td>

                    {/* FDR squares */}
                    <td style={{ padding: '0.4rem 0.5rem' }} onClick={e => e.stopPropagation()}>
                      <FdrSquares
                        playerTeamId={player.pl_team_id}
                        position={player.position}
                        fixtures={fixtures}
                        teamMap={teamMap}
                      />
                    </td>

                    {/* Stats */}
                    {COLS.map(c => (
                      <td
                        key={c.key}
                        style={{
                          padding: '0.5rem 0.4rem', textAlign: 'center',
                          color: sort === c.key ? 'var(--text-primary)' : 'var(--text-secondary)',
                          fontWeight: sort === c.key ? 600 : 400,
                        }}
                      >
                        {player[c.key] ?? '—'}
                      </td>
                    ))}

                    {/* Drill-through link */}
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/players/${player.player_id}?season=${seasonId}`); }}
                        title="Player drill-through"
                        style={{
                          background: 'transparent', border: '1px solid var(--border)',
                          borderRadius: 4, color: 'var(--text-muted)', cursor: 'pointer',
                          padding: '2px 6px', fontSize: '0.7rem',
                          transition: 'border-color 0.15s, color 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold-mid)'; e.currentTarget.style.color = 'var(--gold-bright)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                      >
                        ↗
                      </button>
                    </td>
                  </tr>

                  {/* Expanded GW stats row */}
                  {isExp && (
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <GwStatsPanel
                        playerId={player.player_id}
                        seasonId={seasonId}
                        colSpan={TOTAL_COLS}
                      />
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

      {/* Legend */}
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
  const { playerId }       = useParams();
  const [searchParams]     = useSearchParams();
  const navigate           = useNavigate();
  const seasonId           = searchParams.get('season') || 1;
  const managerMap         = useManagerMap();

  const [expandedSeason, setExpandedSeason] = useState(null);
  const [drillTab, setDrillTab]             = useState('overview'); // 'overview' | 'opponents' | 'ownership'

  const { data, loading, error } = useApi(`/query/player/${playerId}/drill`, [playerId]);

  if (loading) return <Loading />;
  if (error)   return <ErrorMsg message={error} />;
  if (!data)   return null;

  const { player, season_history, gw_stats, ownership_history, vs_opponents } = data;
  const posCol = posColor[player.position] || 'var(--text-muted)';

  // Group GW stats by season
  const gwBySeason = {};
  gw_stats.forEach(r => {
    if (!gwBySeason[r.season_name]) gwBySeason[r.season_name] = [];
    gwBySeason[r.season_name].push(r);
  });

  // Group ownership by season — supports from_gw/to_gw ranges (new table)
  // and legacy per-GW rows (gameweek_lineups fallback)
  const ownBySeason = {};
  ownership_history.forEach(r => {
    if (!ownBySeason[r.season_name]) ownBySeason[r.season_name] = [];
    ownBySeason[r.season_name].push(r);
  });

  // Build per-season ownership summary. New format has from_gw/to_gw ranges.
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
      {/* Back button */}
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

      {/* Player header */}
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
        {/* Season totals quick stats from most recent season_history */}
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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[
          ['overview',   '📊 Season History'],
          ['opponents',  '🆚 vs Opponents'],
          ['ownership',  '👑 Ownership History'],
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

      {/* ── Overview: season history + expandable GW breakdown ── */}
      {drillTab === 'overview' && (
        <div className="card">
          <SectionHeader title="Season History" sub="Expand any season for GW-by-GW breakdown" />
          {season_history.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem' }}>
              No historical season data yet.
            </p>
          )}
          {season_history.map(s => {
            const isExp = expandedSeason === s.season;
            const gwRows = gwBySeason[s.season] || [];
            return (
              <div key={s.season} style={{ marginBottom: '0.5rem', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                {/* Season row */}
                <div
                  onClick={() => setExpandedSeason(isExp ? null : s.season)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '8rem repeat(8, 1fr) 1rem',
                    gap: '0.5rem', alignItems: 'center',
                    padding: '0.6rem 1rem',
                    background: isExp ? 'var(--bg-raised)' : 'var(--bg-card)',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
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

                {/* Expanded GW table */}
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

      {/* ── vs Opponents ── */}
      {drillTab === 'opponents' && (
        <div className="card">
          <SectionHeader title="Performance vs Opponents" sub="Aggregated across all recorded fixtures" />
          {vs_opponents.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem' }}>
              No fixture history data available.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-gold)' }}>
                    {['Opponent', 'Apps', 'Pts', 'G', 'A', 'CS', 'Bon', 'Min', 'Pts/App'].map(h => (
                      <th key={h} style={{ padding: '0.4rem 0.5rem', textAlign: h === 'Opponent' ? 'left' : 'center', color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vs_opponents.map(opp => (
                    <tr
                      key={opp.opponent_id}
                      style={{ borderBottom: '1px solid var(--border)' }}
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

      {/* ── Ownership History ── */}
      {drillTab === 'ownership' && (
        <div className="card">
          <SectionHeader title="Ownership History" sub="Who owned this player each season & GW across all seasons" />
          {Object.keys(ownBySeason).length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem' }}>
              No ownership data available.
            </p>
          ) : (
            Object.entries(ownBySeason)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([season, rows]) => {
                const summaries = ownSummaryBySeason[season] || [];
                return (
                  <div key={season} style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem', color: 'var(--gold-bright)', marginBottom: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.4rem' }}>
                      {season}
                    </div>
                    {/* Per-owner summary */}
                    {summaries.map(s => {
                      const m = getManager(managerMap, s.team_id);
                      const totalGws = s.spans.reduce((acc, sp) => acc + (sp.to - sp.from + 1), 0);
                      const spanLabel = s.spans.map(sp =>
                        sp.from === sp.to ? `GW${sp.from}` : `GW${sp.from}–${sp.to}`
                      ).join(', ');
                      return (
                        <div key={s.team_id} style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem',
                          padding: '0.5rem 0', borderBottom: '1px solid var(--border)',
                        }}>
                          <Avatar teamId={s.team_id} size={24} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                              {s.owner} <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>({s.team_name})</span>
                            </div>
                            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                              {spanLabel} · {totalGws} gw{totalGws !== 1 ? 's' : ''}
                            </div>
                            {/* Ownership span bar — 38 GW timeline */}
                            <div style={{ marginTop: 4, position: 'relative', height: 8, background: 'var(--bg-raised)', borderRadius: 4, overflow: 'hidden' }}>
                              {s.spans.map((sp, i) => (
                                <div key={i} style={{
                                  position: 'absolute',
                                  left: `${((sp.from - 1) / 38) * 100}%`,
                                  width: `${((sp.to - sp.from + 1) / 38) * 100}%`,
                                  height: '100%',
                                  background: m.color || 'var(--gold-mid)',
                                  borderRadius: 2,
                                  opacity: 0.8,
                                }} />
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   OTHER PAGES (unchanged below — keep these)
══════════════════════════════════════════ */

export function TransfersPage() {
  const managerMap = useManagerMap();
  const [searchParams] = useSearchParams();
  const seasonId = searchParams.get('season') || 1;
  const { data, loading, error } = useApi(`/query/season/${seasonId}/transfers`, [seasonId]);

  if (loading) return <Loading />;
  if (error)   return <ErrorMsg message={error} />;

  const { all_transfers, best_transfer, worst_transfer, manager_summary } = data || {};

  return (
    <div className="fade-up">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>Transfers</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Waiver and trade analytics for the season</p>
      </div>

      {/* Manager summary */}
      {manager_summary?.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <SectionHeader title="Manager Transfer Summary" sub="Net points gained/lost through transfers" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {[...manager_summary].sort((a,b) => b.net_delta - a.net_delta).map((m, i) => {
              const mgr = getManager(managerMap, m.team_id);
              const isPos = m.net_delta >= 0;
              const maxAbs = Math.max(...manager_summary.map(x => Math.abs(x.net_delta)));
              const pct = maxAbs > 0 ? Math.abs(m.net_delta) / maxAbs : 0;
              return (
                <div key={m.manager} style={{ display: 'grid', gridTemplateColumns: '2rem 1fr auto', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>{i + 1}</div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <Avatar teamId={m.team_id} size={20} />
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{m.manager}</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: 'var(--text-muted)' }}>{m.total_moves} moves</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--bg-hover)', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${pct * 100}%`, background: isPos ? 'var(--green-bright)' : 'var(--red-bright)', borderRadius: 2 }} />
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', fontWeight: 700, color: isPos ? 'var(--green-bright)' : 'var(--red-bright)', minWidth: 50, textAlign: 'right' }}>
                    {isPos ? '+' : ''}{m.net_delta}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Best / worst */}
      {(best_transfer || worst_transfer) && (
        <div className="grid-2" style={{ marginBottom: '2rem' }}>
          {best_transfer && (
            <div className="card">
              <SectionHeader title="Best Transfer" sub="Highest net points gained" />
              <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                {best_transfer.player_in} <span style={{ color: 'var(--green-bright)' }}>+{best_transfer.delta}</span>
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {best_transfer.manager} · GW{best_transfer.gw} · out: {best_transfer.player_out}
              </div>
            </div>
          )}
          {worst_transfer && (
            <div className="card">
              <SectionHeader title="Worst Transfer" sub="Highest net points lost" />
              <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                {worst_transfer.player_in} <span style={{ color: 'var(--red-bright)' }}>{worst_transfer.delta}</span>
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {worst_transfer.manager} · GW{worst_transfer.gw} · out: {worst_transfer.player_out}
              </div>
            </div>
          )}
        </div>
      )}

      {/* All transfers table */}
      {all_transfers?.length > 0 && (
        <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
          <div style={{ padding: '1rem 1.25rem 0.5rem' }}>
            <SectionHeader title="All Transfers" sub="Sorted by net impact" />
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-gold)', background: 'var(--bg-raised)' }}>
                {['Manager', 'GW', 'Type', 'In', 'Out', 'Impact'].map(h => (
                  <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: h === 'Impact' ? 'right' : 'left', color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {all_transfers.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '0.4rem 0.75rem', color: 'var(--text-secondary)' }}>{t.manager}</td>
                  <td style={{ padding: '0.4rem 0.75rem', color: 'var(--text-muted)' }}>GW{t.gw}</td>
                  <td style={{ padding: '0.4rem 0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{t.kind}</td>
                  <td style={{ padding: '0.4rem 0.75rem', color: 'var(--text-primary)' }}>{t.player_in}</td>
                  <td style={{ padding: '0.4rem 0.75rem', color: 'var(--text-muted)' }}>{t.player_out}</td>
                  <td style={{ padding: '0.4rem 0.75rem', textAlign: 'right', color: t.delta >= 0 ? 'var(--green-bright)' : 'var(--red-bright)', fontWeight: 600 }}>
                    {t.delta >= 0 ? '+' : ''}{t.delta}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function RecordsPage() {
  const [searchParams] = useSearchParams();
  const seasonId = searchParams.get('season') || 1;
  const { data, loading, error } = useApi(`/query/season/${seasonId}/records`, [seasonId]);

  if (loading) return <Loading />;
  if (error)   return <ErrorMsg message={error} />;
  if (!data)   return null;

  const { highest_score, lowest_score, biggest_margin, most_points_in_loss, closest_match, longest_win_streak, longest_loss_streak, bench_points } = data;

  return (
    <div className="fade-up">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>Season Records</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Notable highs, lows, and streaks</p>
      </div>

      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        {highest_score && <StatCard label="Highest Score" value={highest_score.points} sub={`${highest_score.manager} · GW${highest_score.gw}`} accent="var(--green-bright)" />}
        {lowest_score  && <StatCard label="Lowest Score"  value={lowest_score.points}  sub={`${lowest_score.manager} · GW${lowest_score.gw}`}  accent="var(--red-bright)"   />}
        {biggest_margin && <StatCard label="Biggest Margin" value={biggest_margin.margin} sub={`${biggest_margin.winner} def. ${biggest_margin.loser} · GW${biggest_margin.gw}`} accent="var(--gold-mid)" />}
        {most_points_in_loss && <StatCard label="Heartbreak Loss" value={most_points_in_loss.points_for} sub={`${most_points_in_loss.manager} scored but lost · GW${most_points_in_loss.gw}`} accent="var(--color-km)" />}
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

  const managers = h2h
    ? [...new Set(h2h.map(r => r.manager))].sort()
    : [];

  return (
    <div className="fade-up">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>All Time</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Records and H2H across every season</p>
      </div>

      {records && (
        <div className="grid-2" style={{ marginBottom: '2rem' }}>
          {records.highest_score_ever && <StatCard label="Highest Score Ever" value={records.highest_score_ever.points} sub={`${records.highest_score_ever.manager} · ${records.highest_score_ever.season} GW${records.highest_score_ever.gw}`} accent="var(--green-bright)" />}
          {records.lowest_score_ever  && <StatCard label="Lowest Score Ever"  value={records.lowest_score_ever.points}  sub={`${records.lowest_score_ever.manager} · ${records.lowest_score_ever.season} GW${records.lowest_score_ever.gw}`}  accent="var(--red-bright)"   />}
          {records.biggest_margin_ever && <StatCard label="Biggest Margin Ever" value={records.biggest_margin_ever.margin} sub={`${records.biggest_margin_ever.winner} · ${records.biggest_margin_ever.season} GW${records.biggest_margin_ever.gw}`} accent="var(--gold-mid)" />}
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
                    const entry = records.historic_finishes.find(r => r.manager === mgr && r.season === season);
                    const finish = entry?.finish;
                    const color = finish === 1 ? 'var(--gold-bright)' : finish === 2 ? '#c0c0c0' : finish === 3 ? '#cd7f32' : 'var(--text-muted)';
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
