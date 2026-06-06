import React, { useState } from 'react';
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
  const [view, setView] = useState('board'); // 'board' | 'value' | 'busts'

  const { data, loading, error } = useApi(`/query/season/${seasonId}/draft`, [seasonId]);

  if (loading) return <Loading />;
  if (error)   return <ErrorMsg message={error} />;
  if (!data)   return null;

  const { picks, value_picks, busts } = data;
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

  return (
    <div className="fade-up">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>Draft Scorecard</h1>
        <p style={{ color: 'var(--text-secondary)' }}>How did each pick perform across the season?</p>
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
        {[['board', 'Draft Board'], ['value', '💎 Value Picks'], ['busts', '💸 Busts']].map(([v, label]) => (
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
                    const pct  = maxPts > 0 ? pick.season_points / maxPts : 0;
                    const col  = posColor[pick.position] || 'var(--text-muted)';
                    return (
                      <td key={tid} style={{ padding: '0.4rem 0.5rem' }}>
                        <div style={{
                          background: 'var(--bg-raised)',
                          border: `1px solid var(--border)`,
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
                            <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.2, marginBottom: '0.2rem' }}>{pick.player_name.split(' ').pop()}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: col }}>{pick.position}</span>
                              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', fontWeight: 600, color: pct > 0.7 ? 'var(--gold-bright)' : pct > 0.4 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{pick.season_points}</span>
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
        </div>
      )}

      {view === 'value' && (
        <div>
          <SectionHeader title="Value Picks" sub="Highest scoring players across the draft" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {value_picks.map((p, i) => {
              const m   = getManager(managerMap, p.team_id);
              const col = posColor[p.position] || 'var(--text-muted)';
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2rem 40px 1fr auto auto', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 6, borderLeft: `3px solid ${col}` }}>
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
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: 'var(--text-muted)' }}>pts</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === 'busts' && (
        <div>
          <SectionHeader title="Biggest Busts" sub="Top-6-round picks who underperformed" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {busts.map((p, i) => {
              const m   = getManager(managerMap, p.team_id);
              const col = posColor[p.position] || 'var(--text-muted)';
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2rem 40px 1fr auto auto', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 6, borderLeft: '3px solid var(--red)' }}>
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
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: 'var(--text-muted)' }}>pts</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}