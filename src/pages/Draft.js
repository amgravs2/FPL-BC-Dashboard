import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { getManager } from '../config';
import { useManagerMap } from '../ManagerContext';
import { Loading, ErrorMsg, SectionHeader, Avatar } from '../components/UI';

const MAX_ROUND = 15;

export default function DraftPage() {
  const managerMap = useManagerMap();
  const [searchParams] = useSearchParams();
  const seasonId       = searchParams.get('season') || 1;
  const [view, setView] = useState('board'); // 'board' | 'value' | 'busts' | 'rounds' | 'dna'

  const { data, loading, error } = useApi(`/query/season/${seasonId}/draft`, [seasonId]);

  if (loading) return <Loading />;
  if (error)   return <ErrorMsg message={error} />;
  if (!data)   return null;

  const { picks, value_picks, busts, round_medians, composition, dna } = data;
  const TEAM_IDS = [...new Set(picks.map(p => p.team_id))];

  // Max points among all picks for bar scaling
  const maxPts = Math.max(...picks.map(p => p.season_points));

  // Build round × manager grid
  const grid = {};
  for (let r = 1; r <= MAX_ROUND; r++) {
    grid[r] = {};
    TEAM_IDS.forEach(tid => { grid[r][tid] = null; });
  }
  picks.forEach(p => {
    if (grid[p.round]) grid[p.round][p.team_id] = p;
  });

  // Sort team IDs by draft order (pick order in round 1)
  const round1 = picks.filter(p => p.round === 1).sort((a, b) => a.overall_pick - b.overall_pick);
  const orderedTeams = round1.map(p => p.team_id);

  const posColor = { GKP: '#7eb8d4', DEF: '#5a9e64', MID: '#d4a843', FWD: '#c07a5a' };

  // Pre-compute total points per manager for the board footer
  const totalByTeam = {};
  orderedTeams.forEach(tid => {
    totalByTeam[tid] = picks.filter(p => p.team_id === tid).reduce((s, p) => s + p.season_points, 0);
  });
  const maxTotal = Math.max(...Object.values(totalByTeam));

  return (
    <div className="fade-up">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>Draft Scorecard</h1>
        <p style={{ color: 'var(--text-secondary)' }}>How did each pick perform across the season?</p>
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
        {[['board', 'Draft Board'], ['value', '💎 Value Picks'], ['busts', '💸 Busts'], ['rounds', '📊 Round Analysis'], ['dna', '🧬 Draft DNA']].map(([v, label]) => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: '0.4rem 1rem', borderRadius: 4, cursor: 'pointer',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            background: view === v ? 'var(--gold-dim)' : 'var(--bg-raised)',
            border: `1px solid ${view === v ? 'var(--gold-mid)' : 'var(--border)'}`,
            color: view === v ? 'var(--gold-bright)' : 'var(--text-secondary)',
          }}>{label}</button>
        ))}
      </div>

      {/* ── DRAFT BOARD ── */}
      {view === 'board' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-gold)' }}>
                <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', width: 60 }}>Round</th>
                {orderedTeams.map(tid => {
                  const m = getManager(managerMap, tid);
                  return (
                    <th key={tid} style={{ padding: '0.6rem 0.5rem', textAlign: 'center', minWidth: 130 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                        <Avatar teamId={tid} size={22} />
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem', color: m.color }}>{m.initials}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: MAX_ROUND }, (_, i) => i + 1).map(round => (
                <tr key={round} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.4rem 0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>{round}</td>
                  {orderedTeams.map(tid => {
                    const pick = grid[round]?.[tid];
                    if (!pick) return <td key={tid} style={{ padding: '0.4rem 0.5rem' }} />;
                    const pct = maxPts > 0 ? pick.season_points / maxPts : 0;
                    const col = posColor[pick.position] || 'var(--text-muted)';
                    return (
                      <td key={tid} style={{ padding: '0.4rem 0.5rem' }}>
                        <div style={{
                          background: 'var(--bg-raised)',
                          border: '1px solid var(--border)',
                          borderLeft: `3px solid ${col}`,
                          borderRadius: 4, padding: '0.4rem 0.5rem',
                          position: 'relative', overflow: 'hidden',
                        }}>
                          {/* Points bar */}
                          <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            height: `${pct * 100}%`, maxHeight: '100%',
                            background: `${col}18`,
                          }} />
                          <div style={{ position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.1rem' }}>
                              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: 'var(--text-muted)' }}>#{pick.overall_pick}</span>
                              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', fontWeight: 600, color: pick.value_score > 20 ? 'var(--green-bright)' : pick.value_score < -20 ? 'var(--red-bright)' : pct > 0.7 ? 'var(--gold-bright)' : 'var(--text-primary)' }}>{pick.season_points}</span>
                            </div>
                            <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.2, marginBottom: '0.2rem', textAlign: 'center', width: '100%' }}>{pick.player_name.split(' ').pop()}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: col }}>{pick.position}</span>
                              {pick.value_score !== undefined && (
                                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: pick.value_score > 0 ? 'var(--green-bright)' : 'var(--red-bright)' }}>
                                  {pick.value_score > 0 ? '+' : ''}{pick.value_score}
                                </span>
                              )}
                            </div>
                            {pick.was_auto && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: 'var(--red-bright)', marginTop: '0.15rem' }}>AUTO</div>}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total Draft Points footer */}
          <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: `60px ${orderedTeams.map(() => '1fr').join(' ')}`, borderTop: '1px solid var(--border-gold)', paddingTop: '0.75rem' }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingLeft: '0.75rem', display: 'flex', alignItems: 'center' }}>Total</div>
            {orderedTeams.map(tid => (
              <div key={tid} style={{ textAlign: 'center', padding: '0.25rem 0.5rem' }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', fontWeight: 700, color: totalByTeam[tid] === maxTotal ? 'var(--gold-bright)' : 'var(--text-primary)' }}>{totalByTeam[tid]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── VALUE PICKS ── */}
      {view === 'value' && (
        <div>
          <SectionHeader title="Value Picks" sub="Highest scoring players across the draft" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {value_picks.map((p, i) => {
              const m   = getManager(managerMap, p.team_id);
              const col = posColor[p.position] || 'var(--text-muted)';
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2rem 40px 1fr auto', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 6, borderLeft: `3px solid ${col}` }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', color: 'var(--gold-bright)', textAlign: 'center' }}>{i + 1}</div>
                  <Avatar teamId={p.team_id} size={32} />
                  <div>
                    <div style={{ color: 'var(--text-primary)', fontFamily: "'Crimson Pro', serif", fontSize: '1rem' }}>{p.player_name}</div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      <span style={{ color: col }}>{p.position}</span> · Pick #{p.overall_pick} · {m.initials}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', fontWeight: 700, color: 'var(--gold-bright)' }}>{p.season_points}</div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: p.value_score > 0 ? 'var(--green-bright)' : 'var(--red-bright)' }}>
                      {p.value_score > 0 ? '+' : ''}{p.value_score} vs median
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── BUSTS ── */}
      {view === 'busts' && (
        <div>
          <SectionHeader title="Biggest Busts" sub="Top-6-round picks who underperformed" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {busts.map((p, i) => {
              const m   = getManager(managerMap, p.team_id);
              const col = posColor[p.position] || 'var(--text-muted)';
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2rem 40px 1fr auto', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 6, borderLeft: '3px solid var(--red)' }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', color: 'var(--red-bright)', textAlign: 'center' }}>{i + 1}</div>
                  <Avatar teamId={p.team_id} size={32} />
                  <div>
                    <div style={{ color: 'var(--text-primary)', fontFamily: "'Crimson Pro', serif", fontSize: '1rem' }}>{p.player_name}</div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      <span style={{ color: col }}>{p.position}</span> · Pick #{p.overall_pick} · {m.initials}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', fontWeight: 700, color: 'var(--red-bright)' }}>{p.season_points}</div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: p.value_score > 0 ? 'var(--green-bright)' : 'var(--red-bright)' }}>
                      {p.value_score > 0 ? '+' : ''}{p.value_score} vs median
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ROUND ANALYSIS ── */}
      {view === 'rounds' && round_medians && (
        <div>
          <SectionHeader title="Round Analysis" sub="Median points scored by draft round — green = above median, red = below" />
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={round_medians} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" strokeOpacity={0.3} />
              <XAxis dataKey="round" tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }} tickLine={false} label={{ value: 'Round', position: 'insideBottom', offset: -2, fill: 'var(--text-muted)', fontSize: 10 }} />
              <YAxis tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-gold)', borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' }}
                formatter={(v, n) => [v, n === 'median' ? 'Median pts' : n]} labelFormatter={l => `Round ${l}`} />
              <ReferenceLine y={round_medians.reduce((s, r) => s + r.median, 0) / round_medians.length} stroke="var(--gold-muted)" strokeDasharray="4 2" />
              <Bar dataKey="median" fill="var(--gold-mid)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="max" fill="var(--green)" radius={[3, 3, 0, 0]} opacity={0.5} />
              <Bar dataKey="min" fill="var(--red)" radius={[3, 3, 0, 0]} opacity={0.5} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', marginTop: '1rem' }}>
            {round_medians.map(r => (
              <div key={r.round} className="card" style={{ textAlign: 'center', padding: '0.75rem 0.5rem' }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Round {r.round}</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', fontWeight: 700, color: 'var(--gold-bright)' }}>{r.median}</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{r.min}–{r.max}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DRAFT DNA ── */}
      {view === 'dna' && dna && (() => {
        const { round_pair_counts, mean_round_rows, club_bias } = dna;

        // Top clubs by total picks league-wide (for bias chart)
        const clubTotals = {};
        picks.forEach(p => { clubTotals[p.pl_team] = (clubTotals[p.pl_team] || 0) + 1; });
        const topClubs = Object.entries(clubTotals).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c]) => c);

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* Chart 1 — Position picks by round pair */}
            <div>
              <SectionHeader title="When Positions Get Drafted" sub="Count of picks by position across round pairs — league-wide" />
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={round_pair_counts} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" strokeOpacity={0.3} />
                  <XAxis dataKey="group" tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }} tickLine={false} />
                  <YAxis tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-gold)', borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' }} />
                  <Bar dataKey="GKP" fill={posColor.GKP} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="DEF" fill={posColor.DEF} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="MID" fill={posColor.MID} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="FWD" fill={posColor.FWD} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', marginTop: '0.5rem' }}>
                {['GKP', 'DEF', 'MID', 'FWD'].map(pos => (
                  <div key={pos} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: posColor[pos] }} />
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: 'var(--text-muted)' }}>{pos}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 2 — Mean draft round per position per manager */}
            <div>
              <SectionHeader title="Draft Tendencies" sub="Average round each manager drafts each position" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {mean_round_rows.sort((a, b) => (a.GKP || 15) - (b.GKP || 15)).map(row => {
                  const m = getManager(managerMap, row.team_id);
                  return (
                    <div key={row.team_id} style={{ display: 'grid', gridTemplateColumns: '3rem 1fr', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: m.color, textAlign: 'right' }}>{m.initials}</span>
                      <div style={{ position: 'relative', height: 28 }}>
                        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'var(--border)', transform: 'translateY(-50%)' }} />
                        {['GKP', 'DEF', 'MID', 'FWD'].map(pos => {
                          const rnd = row[pos];
                          if (!rnd) return null;
                          const left = `${((rnd - 1) / 14) * 100}%`;
                          return (
                            <div key={pos} title={`${pos}: Rd ${rnd}`} style={{
                              position: 'absolute', top: '50%', left,
                              transform: 'translate(-50%, -50%)',
                              width: 10, height: 10, borderRadius: '50%',
                              background: posColor[pos],
                              border: '1px solid var(--bg-base)',
                              cursor: 'default',
                            }} />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {/* X-axis labels */}
                <div style={{ display: 'grid', gridTemplateColumns: '3rem 1fr', gap: '0.75rem' }}>
                  <div />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    {[1, 3, 5, 7, 9, 11, 13, 15].map(r => (
                      <span key={r} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: 'var(--text-muted)' }}>{r}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Chart 3 — Club bias: attack vs defence per manager */}
            <div>
              <SectionHeader title="Club Bias" sub="Top clubs drafted — split by attack (MID+FWD) vs defence (GKP+DEF)" />
              {club_bias.map(({ team_id, clubs }) => {
                const m = getManager(managerMap, team_id);
                const rows = topClubs
                  .map(club => ({ club, ...(clubs[club] || { attack: 0, defence: 0 }) }))
                  .filter(r => r.attack + r.defence > 0);
                if (!rows.length) return null;
                return (
                  <div key={team_id} style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: m.color, marginBottom: '0.4rem' }}>{m.initials}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      {rows.map(({ club, attack, defence }) => (
                        <div key={club} style={{ display: 'grid', gridTemplateColumns: '3.5rem 1fr', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'right' }}>{club}</span>
                          <div style={{ display: 'flex', height: 14, borderRadius: 3, overflow: 'hidden', background: 'var(--bg-hover)' }}>
                            {attack > 0 && <div style={{ flex: attack, background: posColor.MID, opacity: 0.85 }} title={`Attack: ${attack}`} />}
                            {defence > 0 && <div style={{ flex: defence, background: posColor.DEF, opacity: 0.85 }} title={`Defence: ${defence}`} />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: posColor.MID }} />
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: 'var(--text-muted)' }}>Attack (MID+FWD)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: posColor.DEF }} />
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: 'var(--text-muted)' }}>Defence (GKP+DEF)</span>
                </div>
              </div>
            </div>

          </div>
        );
      })()}

    </div>
  );
}
