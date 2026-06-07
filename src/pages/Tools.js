import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useManagerMap } from '../ManagerContext';
import { getManager } from '../config';
import { Loading, ErrorMsg, SectionHeader, Avatar } from '../components/UI';

const NEXT_GWS = 6;

// FDR color scale
function fdrColor(fdr) {
  if (fdr <= 2) return { bg: '#1a3a1a', text: '#5a9e64', label: 'Easy' };
  if (fdr === 3) return { bg: '#3a3a1a', text: '#d4a843', label: 'Med' };
  if (fdr === 4) return { bg: '#3a1a1a', text: '#c05555', label: 'Hard' };
  return { bg: '#2a0a0a', text: '#8b2020', label: 'BGW' };
}

/* ── Fixture Difficulty Grid ── */
function FixtureDifficultyGrid({ fixtures, players, teams, currentGw }) {
  const [selectedPos, setSelectedPos] = useState('ALL');
  const [selectedTeam, setSelectedTeam] = useState('ALL');
  const posColor = { GKP: '#7eb8d4', DEF: '#5a9e64', MID: '#d4a843', FWD: '#c07a5a' };

  const gws = Array.from({ length: NEXT_GWS }, (_, i) => currentGw + i);

  // Build team → upcoming fixtures map
  const teamFixtures = {};
  gws.forEach(gw => {
    fixtures.filter(f => f.gw === gw).forEach(f => {
      if (!teamFixtures[f.team_h]) teamFixtures[f.team_h] = {};
      if (!teamFixtures[f.team_a]) teamFixtures[f.team_a] = {};
      teamFixtures[f.team_h][gw] = { opponent: f.team_a, home: true, difficulty: f.team_h_difficulty || 3 };
      teamFixtures[f.team_a][gw] = { opponent: f.team_h, home: false, difficulty: f.team_a_difficulty || 3 };
    });
  });

  const teamMap = {};
  teams.forEach(t => { teamMap[t.id] = t; });

  // Filter players
  const filteredPlayers = players.filter(p =>
    (selectedPos === 'ALL' || p.position === selectedPos) &&
    (selectedTeam === 'ALL' || p.pl_team === selectedTeam)
  ).slice(0, 30);

  const plTeams = [...new Set(players.map(p => p.pl_team))].sort();
  const positions = ['ALL', 'GKP', 'DEF', 'MID', 'FWD'];

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {positions.map(pos => (
            <button key={pos} onClick={() => setSelectedPos(pos)} style={{
              padding: '0.3rem 0.6rem', borderRadius: 4, cursor: 'pointer',
              fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem',
              background: selectedPos === pos ? (posColor[pos] || 'var(--gold-dim)') + '33' : 'var(--bg-raised)',
              border: `1px solid ${selectedPos === pos ? (posColor[pos] || 'var(--gold-mid)') : 'var(--border)'}`,
              color: selectedPos === pos ? (posColor[pos] || 'var(--gold-bright)') : 'var(--text-secondary)',
            }}>{pos}</button>
          ))}
        </div>
        <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)} style={{
          background: 'var(--bg-raised)', border: '1px solid var(--border)',
          color: 'var(--text-primary)', padding: '0.3rem 0.6rem',
          borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem',
        }}>
          <option value="ALL">All Clubs</option>
          {plTeams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-gold)' }}>
              <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.7rem', textTransform: 'uppercase' }}>Player</th>
              <th style={{ padding: '0.5rem 0.5rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.7rem' }}>Pos</th>
              <th style={{ padding: '0.5rem 0.5rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.7rem' }}>Club</th>
              <th style={{ padding: '0.5rem 0.5rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.7rem' }}>Pts</th>
              {gws.map(gw => (
                <th key={gw} style={{ padding: '0.5rem 0.5rem', textAlign: 'center', color: 'var(--gold-bright)', fontWeight: 600, fontSize: '0.7rem', minWidth: 52 }}>GW{gw}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredPlayers.map(player => {
              const col = posColor[player.position] || 'var(--text-muted)';
              return (
                <tr key={player.player_id} style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '0.5rem 0.75rem' }}>
                    <div style={{ color: 'var(--text-primary)', fontFamily: "'Crimson Pro', serif" }}>{player.name}</div>
                    {player.owner && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Owned: {player.owner}</div>}
                  </td>
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                    <span style={{ color: col, fontSize: '0.7rem', border: `1px solid ${col}44`, padding: '0 3px', borderRadius: 2 }}>{player.position}</span>
                  </td>
                  <td style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{player.pl_team}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 600, color: 'var(--text-primary)' }}>{player.total_points}</td>
                  {gws.map(gw => {
                    // Find team id from pl_team name
                    const team = teams.find(t => t.short_name === player.pl_team || t.name === player.pl_team);
                    const fix  = team ? teamFixtures[team.id]?.[gw] : null;
                    const opp  = fix ? (teams.find(t => t.id === fix.opponent)) : null;
                    const fdr  = fdrColor(fix?.difficulty || 3);
                    return (
                      <td key={gw} style={{ padding: '0.25rem', textAlign: 'center' }}>
                        {fix ? (
                          <div style={{
                            background: fdr.bg,
                            border: `1px solid ${fdr.text}44`,
                            borderRadius: 4, padding: '0.2rem 0.3rem',
                            fontSize: '0.65rem', color: fdr.text,
                            fontWeight: 600,
                          }}>
                            <div>{opp?.short_name || '?'}</div>
                            <div style={{ fontSize: '0.55rem', opacity: 0.8 }}>{fix.home ? 'H' : 'A'}</div>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>BGW</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* FDR legend */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        {[2, 3, 4, 5].map(d => {
          const fdr = fdrColor(d);
          return (
            <div key={d} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: 20, height: 14, background: fdr.bg, border: `1px solid ${fdr.text}44`, borderRadius: 2 }} />
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: fdr.text }}>{fdr.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Matchup Preview ── */
function MatchupPreview({ matches, teams, players, currentGw, managerMap, seasonId }) {
  const [selectedMatch, setSelectedMatch] = useState(null);
  const currentMatches = matches.filter(m => m.gw === currentGw);

  return (
    <div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Select a matchup to compare rosters and upcoming fixtures side by side.
      </p>

      {/* Match selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
        {currentMatches.map((match, i) => {
          const m1 = getManager(managerMap, match.entry_1_id);
          const m2 = getManager(managerMap, match.entry_2_id);
          const isSelected = selectedMatch?.entry_1_id === match.entry_1_id;
          return (
            <button key={i} onClick={() => setSelectedMatch(isSelected ? null : match)} style={{
              display: 'grid', gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem',
              background: isSelected ? 'var(--gold-dim)' : 'var(--bg-raised)',
              border: `1px solid ${isSelected ? 'var(--gold-mid)' : 'var(--border)'}`,
              borderRadius: 6, cursor: 'pointer', textAlign: 'center',
            }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: m1.color, fontWeight: 600, textAlign: 'right' }}>{m1.initials}</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: 'var(--text-muted)' }}>vs</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: m2.color, fontWeight: 600, textAlign: 'left' }}>{m2.initials}</span>
            </button>
          );
        })}
      </div>

      {selectedMatch && (
        <MatchupDetail match={selectedMatch} managerMap={managerMap} seasonId={seasonId} currentGw={currentGw} />
      )}
    </div>
  );
}

function MatchupDetail({ match, managerMap, seasonId, currentGw }) {
  const m1 = getManager(managerMap, match.entry_1_id);
  const m2 = getManager(managerMap, match.entry_2_id);
  const { data: lineup1 } = useApi(`/query/season/${seasonId}/lineup/${match.entry_1_id}/${currentGw - 1}`, [match.entry_1_id, currentGw]);
  const { data: lineup2 } = useApi(`/query/season/${seasonId}/lineup/${match.entry_2_id}/${currentGw - 1}`, [match.entry_2_id, currentGw]);
  const posColor = { GKP: '#7eb8d4', DEF: '#5a9e64', MID: '#d4a843', FWD: '#c07a5a' };

  const TeamColumn = ({ lineup, manager }) => {
    if (!lineup) return <div style={{ padding: '1rem', color: 'var(--text-muted)' }}>Loading...</div>;
    const all = [...(lineup.starters || []), ...(lineup.bench || [])];
    return (
      <div>
        <div style={{ padding: '0.5rem 0.75rem', background: `${manager.color}18`, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: manager.color, fontWeight: 600, marginBottom: '0.5rem' }}>
          {manager.initials} · {manager.team_name}
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: 'var(--text-muted)', padding: '0 0.75rem', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Starting XI</div>
        {lineup.starters.map((p, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '26px 1fr auto', gap: '0.4rem', padding: '0.25rem 0.75rem', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: posColor[p.pos], border: `1px solid ${posColor[p.pos]}44`, borderRadius: 2, textAlign: 'center', padding: '0 2px', fontFamily: "'IBM Plex Mono', monospace" }}>{p.pos}</span>
            <span style={{ fontFamily: "'Crimson Pro', serif", fontSize: '0.85rem', color: 'var(--text-primary)' }}>
              {p.web_name}{p.is_captain && <span style={{ color: 'var(--gold-bright)', marginLeft: 3, fontSize: '0.65rem' }}>©</span>}
            </span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.points}</span>
          </div>
        ))}
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: 'var(--text-muted)', padding: '0.4rem 0.75rem 0.25rem', textTransform: 'uppercase' }}>Bench</div>
        {lineup.bench.map((p, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '26px 1fr auto', gap: '0.4rem', padding: '0.2rem 0.75rem', opacity: 0.6, alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: posColor[p.pos], fontFamily: "'IBM Plex Mono', monospace" }}>{p.pos}</span>
            <span style={{ fontFamily: "'Crimson Pro', serif", fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{p.web_name}</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.points}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="card">
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>
        GW{currentGw} Matchup — showing last GW rosters
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ borderRight: '1px solid var(--border)' }}>
          <TeamColumn lineup={lineup1} manager={m1} />
        </div>
        <div>
          <TeamColumn lineup={lineup2} manager={m2} />
        </div>
      </div>
    </div>
  );
}

/* ── Tools Page ── */
export default function ToolsPage() {
  const [searchParams] = useSearchParams();
  const managerMap = useManagerMap();
  const seasonId   = searchParams.get('season') || 1;
  const [activeTab, setActiveTab] = useState('fixtures');

  const { data: players,  loading: l1 } = useApi(`/query/season/${seasonId}/players`, [seasonId]);
  const { data: summary,  loading: l2 } = useApi(`/query/season/${seasonId}/summary`, [seasonId]);
  const { data: chart,    loading: l3 } = useApi(`/query/season/${seasonId}/standings-chart`, [seasonId]);
  const { data: results,  loading: l4 } = useApi(`/query/season/${seasonId}/results-grid`, [seasonId]);

  // Get current GW from chart data
  const currentGw = chart ? Math.max(...chart.map(d => d.gw)) + 1 : 1;

  // We need fixtures and teams — fetch from backend
  const { data: fixtureData } = useApi(`/query/season/${seasonId}/fixtures-upcoming`, [seasonId]);

  if (l1 || l2) return <Loading />;

  const teams  = fixtureData?.teams  || [];
  const fixtures = fixtureData?.fixtures || [];
  const matches  = results || [];

  return (
    <div className="fade-up">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>In-Season Tools</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Live planning tools for the active season · GW{currentGw}</p>
      </div>

      {/* Tab selector */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
        {[['fixtures', '📅 Fixture Difficulty'], ['matchup', '⚔️ Matchup Preview']].map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '0.4rem 1rem', borderRadius: 4, cursor: 'pointer',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            background: activeTab === tab ? 'var(--gold-dim)' : 'var(--bg-raised)',
            border: `1px solid ${activeTab === tab ? 'var(--gold-mid)' : 'var(--border)'}`,
            color: activeTab === tab ? 'var(--gold-bright)' : 'var(--text-secondary)',
          }}>{label}</button>
        ))}
      </div>

      {activeTab === 'fixtures' && (
        <div className="card">
          <SectionHeader title="Fixture Difficulty" sub={`Next ${NEXT_GWS} gameweeks · sorted by season points`} />
          {players && fixtureData ? (
            <FixtureDifficultyGrid
              fixtures={fixtures}
              players={players}
              teams={teams}
              currentGw={currentGw}
            />
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem' }}>
              Fixture data requires a new backend endpoint — add <code>/query/season/{'{id}'}/fixtures-upcoming</code> to queries.py
            </div>
          )}
        </div>
      )}

      {activeTab === 'matchup' && (
        <div className="card">
          <SectionHeader title="Matchup Preview" sub={`GW${currentGw} fixtures — rosters from last GW`} />
          <MatchupPreview
            matches={matches}
            teams={teams}
            players={players || []}
            currentGw={currentGw}
            managerMap={managerMap}
            seasonId={seasonId}
          />
        </div>
      )}
    </div>
  );
}
