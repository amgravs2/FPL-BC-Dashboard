import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { getManager } from '../config';
import { useManagerMap } from '../ManagerContext';
import { Loading, ErrorMsg, SectionHeader, Avatar, StatCard } from '../components/UI';

/* ══════════════════════════════════════════
   PLAYERS PAGE
══════════════════════════════════════════ */
export function PlayersPage() {
  const managerMap = useManagerMap();
  const [searchParams] = useSearchParams();
  const seasonId       = searchParams.get('season') || 1;
  const [search, setSearch]   = useState('');
  const [posFilter, setPosFilter] = useState('ALL');
  const [sort, setSort]       = useState('total_points');

  const { data, loading, error } = useApi(`/query/season/${seasonId}/players`, [seasonId]);

  if (loading) return <Loading />;
  if (error)   return <ErrorMsg message={error} />;

  const positions = ['ALL', 'GKP', 'DEF', 'MID', 'FWD'];
  const posColor  = { GKP: '#7eb8d4', DEF: '#5a9e64', MID: '#d4a843', FWD: '#c07a5a' };

  const filtered = (data || [])
    .filter(p => posFilter === 'ALL' || p.position === posFilter)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.pl_team?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b[sort] - a[sort]);

  const COLS = [
    { key: 'total_points', label: 'Pts' },
    { key: 'goals',        label: 'G' },
    { key: 'assists',      label: 'A' },
    { key: 'clean_sheets', label: 'CS' },
    { key: 'saves',        label: 'Sv' },
    { key: 'bonus',        label: 'Bon' },
    { key: 'yellow_cards', label: '🟨' },
    { key: 'red_cards',    label: '🟥' },
    { key: 'minutes',      label: 'Min' },
    { key: 'blank_gws',    label: 'Blank' },
  ];

  return (
    <div className="fade-up">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>Player Stats</h1>
        <p style={{ color: 'var(--text-secondary)' }}>All players ranked by season performance</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search player or club..."
          style={{
            background: 'var(--bg-raised)', border: '1px solid var(--border)',
            color: 'var(--text-primary)', padding: '0.4rem 0.75rem',
            borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem',
            outline: 'none', flex: '1', minWidth: 200,
          }}
        />
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {positions.map(pos => (
            <button key={pos} onClick={() => setPosFilter(pos)} style={{
              padding: '0.35rem 0.7rem', borderRadius: 4, cursor: 'pointer',
              fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem',
              background: posFilter === pos ? (posColor[pos] || 'var(--gold-dim)') + '33' : 'var(--bg-raised)',
              border: `1px solid ${posFilter === pos ? (posColor[pos] || 'var(--gold-mid)') : 'var(--border)'}`,
              color: posFilter === pos ? (posColor[pos] || 'var(--gold-bright)') : 'var(--text-secondary)',
            }}>{pos}</button>
          ))}
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-gold)' }}>
              <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>#</th>
              <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Player</th>
              <th style={{ padding: '0.5rem 0.5rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.7rem' }}>Pos</th>
              <th style={{ padding: '0.5rem 0.5rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.7rem' }}>Owner</th>
              {COLS.map(c => (
                <th key={c.key} onClick={() => setSort(c.key)} style={{
                  padding: '0.5rem 0.5rem', textAlign: 'center', cursor: 'pointer',
                  color: sort === c.key ? 'var(--gold-bright)' : 'var(--text-muted)',
                  fontWeight: sort === c.key ? 600 : 400, fontSize: '0.7rem',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  userSelect: 'none',
                }}>
                  {c.label}{sort === c.key ? ' ↓' : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map((player, i) => {
              const col = posColor[player.position] || 'var(--text-muted)';
              const ownerM = player.owner_team_id ? getManager(managerMap, player.owner_team_id) : null;
              return (
                <tr key={player.player_id}
                  style={{ borderBottom: expandedPlayer === player.player_id ? 'none' : '1px solid var(--border)', transition: 'background 0.1s', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = expandedPlayer === player.player_id ? 'var(--bg-raised)' : 'transparent'}
                  onClick={() => setExpandedPlayer(expandedPlayer === player.player_id ? null : player.player_id)}
                >
                  <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>{i + 1}</td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{ color: 'var(--text-primary)', fontFamily: "'Crimson Pro', serif", fontSize: '0.95rem' }}>{player.name}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', transition: 'transform 0.2s', transform: expandedPlayer === player.player_id ? 'rotate(180deg)' : 'none' }}>▾</div>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{player.pl_team}</div>
                  </td>
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: col, border: `1px solid ${col}44`, padding: '0.1rem 0.35rem', borderRadius: 2 }}>{player.position}</span>
                  </td>
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                    {ownerM ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Avatar teamId={player.owner_team_id} size={22} />
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>FA</span>
                    )}
                  </td>
                  {COLS.map(c => (
                    <td key={c.key} style={{ padding: '0.5rem', textAlign: 'center', color: sort === c.key ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: sort === c.key ? 600 : 400 }}>
                      {player[c.key] ?? 0}
                    </td>
                  ))}
                </tr>
                {expandedPlayer === player.player_id && (
                  <tr style={{ background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
                    <PlayerHistoryPanel playerId={player.player_id} />
                  </tr>
                )}
              );
            })}
          </tbody>
        </table>
      </div>
      {filtered.length > 100 && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', marginTop: '1rem' }}>
          Showing top 100 of {filtered.length} players
        </p>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   TRANSFERS PAGE
══════════════════════════════════════════ */
export function TransfersPage() {
  const managerMap = useManagerMap();
  const [searchParams] = useSearchParams();
  const seasonId       = searchParams.get('season') || 1;
  const [view, setView] = useState('summary');

  const { data, loading, error } = useApi(`/query/season/${seasonId}/transfers`, [seasonId]);

  if (loading) return <Loading />;
  if (error)   return <ErrorMsg message={error} />;
  if (!data)   return null;

  const [mgrFilter, setMgrFilter] = useState('ALL');
  const [posFilter, setPosFilter] = useState('ALL');
  const { all_transfers, best_transfer, worst_transfer, manager_summary } = data;

  const managers = [...new Set(all_transfers.map(t => t.manager))];
  const positions = ['ALL', 'GKP', 'DEF', 'MID', 'FWD'];
  const posColor  = { GKP: '#7eb8d4', DEF: '#5a9e64', MID: '#d4a843', FWD: '#c07a5a' };

  // We'd need player position data in transfers to filter by position
  // For now filter by manager only
  const filteredTransfers = all_transfers.filter(t =>
    (mgrFilter === 'ALL' || t.manager === mgrFilter)
  );

  return (
    <div className="fade-up">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>Transfer Analytics</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Who made the best moves? Delta = points gained vs points lost after transfer GW</p>
      </div>

      {/* Toggle */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
        {[['summary', 'Manager Summary'], ['all', 'All Transfers']].map(([v, l]) => (
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

      {view === 'summary' && (
        <div>
          {/* Season best/worst */}
          {(best_transfer || worst_transfer) && (
            <div className="grid-2" style={{ marginBottom: '2rem' }}>
              {best_transfer && (
                <div className="card" style={{ borderLeft: '3px solid var(--green-bright)' }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>🏆 Best Transfer</div>
                  <div style={{ color: 'var(--green-bright)', fontFamily: "'Playfair Display', serif", fontSize: '1.1rem' }}>+{best_transfer.delta} pts</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    {best_transfer.player_in} ← {best_transfer.player_out}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    GW{best_transfer.gw} · {best_transfer.manager}
                  </div>
                </div>
              )}
              {worst_transfer && (
                <div className="card" style={{ borderLeft: '3px solid var(--red-bright)' }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>💸 Worst Transfer</div>
                  <div style={{ color: 'var(--red-bright)', fontFamily: "'Playfair Display', serif", fontSize: '1.1rem' }}>{worst_transfer.delta} pts</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    {worst_transfer.player_in} ← {worst_transfer.player_out}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    GW{worst_transfer.gw} · {worst_transfer.manager}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Manager cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[...manager_summary].sort((a, b) => b.net_delta - a.net_delta).map(mgr => {
              const m = getManager(managerMap, mgr.team_id);
              return (
                <div key={mgr.manager} style={{
                  display: 'grid', gridTemplateColumns: '40px 1fr auto auto auto',
                  alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem',
                  background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 6,
                  borderLeft: `3px solid ${mgr.net_delta >= 0 ? 'var(--green)' : 'var(--red)'}`,
                }}>
                  <Avatar teamId={mgr.team_id} size={32} />
                  <div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: m.color }}>{m.initials}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{mgr.total_moves} transfers</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', fontWeight: 700, color: mgr.net_delta >= 0 ? 'var(--green-bright)' : 'var(--red-bright)' }}>
                      {mgr.net_delta >= 0 ? '+' : ''}{mgr.net_delta}
                    </div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: 'var(--text-muted)' }}>net delta</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === 'all' && (
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: 'var(--text-muted)' }}>Manager:</span>
            {['ALL', ...managers].map(m => (
              <button key={m} onClick={() => setMgrFilter(m)} style={{
                padding: '0.25rem 0.6rem', borderRadius: 4, cursor: 'pointer',
                fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem',
                background: mgrFilter === m ? 'var(--gold-dim)' : 'var(--bg-raised)',
                border: `1px solid ${mgrFilter === m ? 'var(--gold-mid)' : 'var(--border)'}`,
                color: mgrFilter === m ? 'var(--gold-bright)' : 'var(--text-secondary)',
              }}>{m}</button>
            ))}
          </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-gold)' }}>
                {['Mgr', 'GW', 'Type', 'In', 'Out', 'In Pts After', 'Out Pts After', 'Delta'].map(h => (
                  <th key={h} style={{ padding: '0.5rem 0.6rem', textAlign: h === 'In' || h === 'Out' ? 'left' : 'center', color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTransfers.map((tx, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '0.4rem 0.6rem' }}>
                    <Avatar teamId={tx.team_id} size={22} />
                  </td>
                  <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center', color: 'var(--text-muted)' }}>{tx.gw}</td>
                  <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center' }}>
                    <span className={`badge ${tx.kind === 'w' ? 'badge--draw' : 'badge--win'}`}>{tx.kind === 'w' ? 'W' : 'T'}</span>
                  </td>
                  <td style={{ padding: '0.4rem 0.6rem', color: 'var(--green-bright)', fontFamily: "'Crimson Pro', serif" }}>{tx.player_in}</td>
                  <td style={{ padding: '0.4rem 0.6rem', color: 'var(--red-bright)', fontFamily: "'Crimson Pro', serif" }}>{tx.player_out}</td>
                  <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center', color: 'var(--text-primary)' }}>{tx.points_in_after}</td>
                  <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{tx.points_out_after}</td>
                  <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center', fontWeight: 700, color: tx.delta >= 0 ? 'var(--green-bright)' : 'var(--red-bright)' }}>
                    {tx.delta >= 0 ? '+' : ''}{tx.delta}
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

/* ══════════════════════════════════════════
   RECORDS PAGE
══════════════════════════════════════════ */
export function RecordsPage() {
  const managerMap = useManagerMap();
  const [searchParams] = useSearchParams();
  const seasonId       = searchParams.get('season') || 1;

  const { data, loading, error } = useApi(`/query/season/${seasonId}/records`, [seasonId]);

  if (loading) return <Loading />;
  if (error)   return <ErrorMsg message={error} />;
  if (!data)   return null;

  const { highest_score, lowest_score, biggest_margin, most_points_in_loss,
          closest_match, longest_win_streak, longest_loss_streak, bench_points } = data;

  return (
    <div className="fade-up">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>Season Records</h1>
        <p style={{ color: 'var(--text-secondary)' }}>The highs, the lows, the moments of glory and despair</p>
      </div>

      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        {/* Highest score */}
        {highest_score && (
          <div className="card" style={{ borderLeft: '3px solid var(--gold-bright)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>🏆</div>
              <div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 700, color: 'var(--gold-bright)', lineHeight: 1 }}>{highest_score.points}</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.2rem' }}>Highest Score</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>GW{highest_score.gw} · {highest_score.manager}</div>
              </div>
            </div>
          </div>
        )}
        {/* Lowest score */}
        {lowest_score && (
          <div className="card" style={{ borderLeft: '3px solid var(--red-bright)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>💀</div>
              <div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 700, color: 'var(--red-bright)', lineHeight: 1 }}>{lowest_score.points}</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.2rem' }}>Lowest Score</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>GW{lowest_score.gw} · {lowest_score.manager}</div>
              </div>
            </div>
          </div>
        )}
        {/* Biggest margin */}
        {biggest_margin && (
          <div className="card" style={{ borderLeft: '3px solid var(--green-bright)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>⚡</div>
              <div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 700, color: 'var(--green-bright)', lineHeight: 1 }}>+{biggest_margin.margin}</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.2rem' }}>Biggest Margin</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>{biggest_margin.winner} {biggest_margin.winner_points}–{biggest_margin.loser_points} {biggest_margin.loser} · GW{biggest_margin.gw}</div>
              </div>
            </div>
          </div>
        )}
        {/* Most pts in loss */}
        {most_points_in_loss && (
          <div className="card" style={{ borderLeft: '3px solid var(--color-jh)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>😤</div>
              <div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 700, color: 'var(--color-jh)', lineHeight: 1 }}>{most_points_in_loss.points_for}</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.2rem' }}>Most Pts in a Loss</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>{most_points_in_loss.manager} lost {most_points_in_loss.points_for}–{most_points_in_loss.points_against} · GW{most_points_in_loss.gw}</div>
              </div>
            </div>
          </div>
        )}
        {/* Closest match */}
        {closest_match && (
          <div className="card" style={{ borderLeft: '3px solid var(--gold-muted)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>🤏</div>
              <div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 700, color: 'var(--gold-bright)', lineHeight: 1 }}>+{closest_match.margin}</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.2rem' }}>Closest Match</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>{closest_match.winner} {closest_match.winner_points}–{closest_match.loser_points} {closest_match.loser} · GW{closest_match.gw}</div>
              </div>
            </div>
          </div>
        )}
        {/* Win streak */}
        {longest_win_streak && (
          <div className="card" style={{ borderLeft: '3px solid var(--green)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>🔥</div>
              <div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 700, color: 'var(--green-bright)', lineHeight: 1 }}>{longest_win_streak.length}W</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.2rem' }}>Longest Win Streak</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>{longest_win_streak.manager} · GW{longest_win_streak.start_gw}–{longest_win_streak.end_gw}</div>
              </div>
            </div>
          </div>
        )}
        {/* Loss streak */}
        {longest_loss_streak && (
          <div className="card" style={{ borderLeft: '3px solid var(--red)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>📉</div>
              <div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 700, color: 'var(--red-bright)', lineHeight: 1 }}>{longest_loss_streak.length}L</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.2rem' }}>Longest Loss Streak</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>{longest_loss_streak.manager} · GW{longest_loss_streak.start_gw}–{longest_loss_streak.end_gw}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bench points */}
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

  // Build H2H matrix from manager names
  const managers = h2h ? [...new Set(h2h.map(r => r.manager))] : [];

  return (
    <div className="fade-up">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>All Time</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Cross-season records and history</p>
      </div>

      {/* Historic finishes */}
      {records?.historic_finishes?.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <SectionHeader title="Historic League Finishes" />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-gold)' }}>
                  <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.7rem', textTransform: 'uppercase' }}>Manager</th>
                  {[...new Set(records.historic_finishes.map(r => r.season))].map(s => (
                    <th key={s} style={{ padding: '0.5rem 0.75rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.7rem', textTransform: 'uppercase' }}>{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {managers.map(mgr => {
                  const finishes = records.historic_finishes.filter(r => r.manager === mgr);
                  const seasons  = [...new Set(records.historic_finishes.map(r => r.season))];
                  return (
                    <tr key={mgr} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-primary)', fontFamily: "'Crimson Pro', serif" }}>{mgr}</td>
                      {seasons.map(s => {
                        const f = finishes.find(r => r.season === s);
                        const medals = ['🥇', '🥈', '🥉'];
                        return (
                          <td key={s} style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                            {f ? (
                              <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: f.finish <= 3 ? 'var(--gold-bright)' : 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                {medals[f.finish - 1] || f.finish}
                              </span>
                            ) : <span style={{ color: 'var(--text-muted)' }}>–</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* H2H matrix */}
      {h2h && managers.length > 0 && (
        <div className="card">
          <SectionHeader title="Head to Head Matrix" sub="All-time W–D–L between every pair" />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '0.4rem 0.6rem', color: 'var(--text-muted)', fontWeight: 400 }} />
                  {managers.map(m => (
                    <th key={m} style={{ padding: '0.4rem 0.6rem', color: 'var(--text-muted)', fontWeight: 400, textAlign: 'center', fontSize: '0.7rem' }}>{m.split(' ')[0]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {managers.map(mgr => (
                  <tr key={mgr} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.4rem 0.75rem', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>{mgr.split(' ')[0]}</td>
                    {managers.map(opp => {
                      if (mgr === opp) return (
                        <td key={opp} style={{ padding: '0.4rem 0.6rem', background: 'var(--bg-raised)', textAlign: 'center', color: 'var(--border-gold)' }}>—</td>
                      );
                      const rec = h2h.find(r => r.manager === mgr && r.opponent === opp);
                      if (!rec) return <td key={opp} style={{ padding: '0.4rem 0.6rem', textAlign: 'center', color: 'var(--text-muted)' }}>–</td>;
                      return (
                        <td key={opp} style={{ padding: '0.4rem 0.6rem', textAlign: 'center' }}>
                          <span style={{ color: 'var(--green-bright)' }}>{rec.wins}</span>
                          <span style={{ color: 'var(--text-muted)' }}>–{rec.draws}–</span>
                          <span style={{ color: 'var(--red-bright)' }}>{rec.losses}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
