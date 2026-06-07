import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { useApi } from '../hooks/useApi';
import { getManager } from '../config';
import { useManagerMap } from '../ManagerContext';
import { Loading, ErrorMsg, SectionHeader, Avatar, ResultBadge, StatCard } from '../components/UI';

function PositionBreakdown({ data, color }) {
  const managerMap = useManagerMap();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
      {data.map(pos => (
        <div key={pos.position} className="card" style={{ borderTop: `2px solid ${color}` }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>{pos.position}</div>
          <div style={{ fontSize: '1.6rem', fontFamily: "'Playfair Display', serif", fontWeight: 700, color }}>{pos.points}</div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            {pos.goals > 0        && <span>⚽ {pos.goals} goals</span>}
            {pos.assists > 0      && <span>🎯 {pos.assists} assists</span>}
            {pos.clean_sheets > 0 && <span>🧤 {pos.clean_sheets} clean sheets</span>}
            {pos.saves > 0        && <span>🦺 {pos.saves} saves</span>}
            {pos.bonus > 0        && <span>⭐ {pos.bonus} bonus</span>}
            {pos.tackles > 0      && <span>🛡️ {pos.tackles} tackles</span>}
            {pos.recoveries > 0   && <span>🔄 {pos.recoveries} recoveries</span>}
            {pos.cbi > 0          && <span>✋ {pos.cbi} clearances/blocks/interceptions</span>}
            {pos.yellow_cards > 0 && <span>🟨 {pos.yellow_cards} yellows</span>}
            {pos.red_cards > 0    && <span>🟥 {pos.red_cards} reds</span>}
            {pos.penalties_saved > 0  && <span>🥅 {pos.penalties_saved} pens saved</span>}
            {pos.penalties_missed > 0 && <span>❌ {pos.penalties_missed} pens missed</span>}
            {pos.own_goals > 0    && <span>😬 {pos.own_goals} own goals</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function WeeklyChart({ weekly, color }) {
  const managerMap = useManagerMap();
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={weekly} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" strokeOpacity={0.3} />
        <XAxis dataKey="gw" tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9 }} tickLine={false} />
        <YAxis tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-gold)', borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' }}
          formatter={(v) => [v, 'Points']}
          labelFormatter={(l) => `GW ${l}`}
        />
        <Bar dataKey="points_for" radius={[2, 2, 0, 0]}>
          {weekly.map((entry, i) => (
            <Cell key={i} fill={entry.result === 'w' ? color : entry.result === 'd' ? 'var(--draw)' : 'var(--bg-raised)'} fillOpacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function H2HTable({ h2h }) {
  const managerMap = useManagerMap();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {h2h.map(opp => {
        const m = getManager(managerMap, opp.opponent_id);
        const total = opp.wins + opp.draws + opp.losses;
        const winPct = total > 0 ? Math.round((opp.wins / total) * 100) : 0;
        return (
          <div key={opp.opponent_id} style={{
            display: 'grid', gridTemplateColumns: '40px 1fr auto auto auto',
            alignItems: 'center', gap: '0.75rem',
            padding: '0.6rem 0.75rem',
            background: 'var(--bg-raised)', border: '1px solid var(--border)',
            borderRadius: 4,
          }}>
            <Avatar teamId={opp.opponent_id} size={28} />
            <div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: m.color, fontSize: '0.85rem' }}>{m.initials}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: "'Crimson Pro', serif" }}>{m.team}</div>
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem', textAlign: 'center' }}>
              <span style={{ color: 'var(--green-bright)' }}>{opp.wins}</span>
              <span style={{ color: 'var(--text-muted)' }}>–{opp.draws}–</span>
              <span style={{ color: 'var(--red-bright)' }}>{opp.losses}</span>
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
              {opp.points_for}–{opp.points_against}
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: winPct >= 50 ? 'var(--green-bright)' : 'var(--red-bright)', minWidth: 36, textAlign: 'right' }}>
              {winPct}%
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ManagerPage() {
  const managerMap = useManagerMap();
  const { teamId }        = useParams();
  const [searchParams]    = useSearchParams();
  const seasonId          = searchParams.get('season') || 1;
  const { data, loading, error } = useApi(`/query/season/${seasonId}/manager/${teamId}`, [seasonId, teamId]);

  if (loading) return <Loading />;
  if (error)   return <ErrorMsg message={error} />;
  if (!data)   return null;

  const m       = getManager(managerMap, parseInt(teamId));
  const weekly  = data.weekly || [];
  const wins    = weekly.filter(w => w.result === 'w').length;
  const draws   = weekly.filter(w => w.result === 'd').length;
  const losses  = weekly.filter(w => w.result === 'l').length;
  const totalPts = weekly.length > 0 ? Math.max(...weekly.map(w => w.cumulative_points)) : 0;
  const avgPts  = weekly.length > 0 ? Math.round(weekly.reduce((s, w) => s + w.points_for, 0) / weekly.length) : 0;
  const bestGw  = weekly.reduce((best, w) => w.points_for > (best?.points_for ?? 0) ? w : best, null);
  const worstGw = weekly.reduce((worst, w) => w.points_for < (worst?.points_for ?? 999) ? w : worst, null);
  const acceptedTransfers = (data.transfers || []).filter(t => t.result === 'a');

  return (
    <div className="fade-up">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2rem', padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-gold)', borderRadius: 8, borderLeft: `4px solid ${m.color}` }}>
        <Avatar teamId={parseInt(teamId)} size={56} />
        <div>
          <h1 style={{ fontSize: '2rem', color: m.color }}>{m.initials}</h1>
          <div style={{ color: 'var(--text-secondary)', fontFamily: "'Crimson Pro', serif", fontSize: '1rem' }}>{m.first} {m.last} · {m.team}</div>
          <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.5rem' }}>
            <span className="badge badge--win">{wins}W</span>
            <span className="badge badge--draw">{draws}D</span>
            <span className="badge badge--loss">{losses}L</span>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', fontWeight: 700, color: 'var(--gold-bright)', lineHeight: 1 }}>{totalPts}</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>League Points</div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        <StatCard label="Avg Pts/GW"  value={avgPts}              sub="per gameweek"     accent={m.color} />
        <StatCard label="Best Week"   value={bestGw?.points_for}  sub={`GW ${bestGw?.gw}`} accent="var(--green-bright)" />
        <StatCard label="Worst Week"  value={worstGw?.points_for} sub={`GW ${worstGw?.gw}`} accent="var(--red-bright)" />
        <StatCard label="Transfers"   value={acceptedTransfers.length} sub="accepted"    accent="var(--color-km)" />
      </div>

      {/* Weekly bar chart */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <SectionHeader title="Weekly Scores" sub="Green = win · grey = loss · gold = draw" />
        <WeeklyChart weekly={weekly} color={m.color} />
      </div>

      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        {/* Points by position */}
        <div className="card">
          <SectionHeader title="Points by Position" />
          {data.by_position?.length > 0
            ? <PositionBreakdown data={data.by_position} color={m.color} />
            : <p style={{ color: 'var(--text-muted)' }}>No lineup data available</p>}
        </div>

        {/* H2H */}
        <div className="card">
          <SectionHeader title="Head to Head" sub="This season" />
          <H2HTable h2h={data.h2h || []} />
        </div>
      </div>

      {/* Transfers */}
      <div className="card">
        <SectionHeader title="Transfer Activity" sub="Accepted waivers and trades" />
        {acceptedTransfers.length === 0
          ? <p style={{ color: 'var(--text-muted)' }}>No transfers this season</p>
          : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-gold)' }}>
                    {['GW', 'Type', 'In', 'Out'].map(h => (
                      <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {acceptedTransfers.map((tx, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)' }}>{tx.gw}</td>
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <span className={`badge ${tx.kind === 'w' ? 'badge--draw' : 'badge--win'}`}>{tx.kind === 'w' ? 'Waiver' : 'Trade'}</span>
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem', color: 'var(--green-bright)' }}>↑ {tx.player_in}</td>
                      <td style={{ padding: '0.5rem 0.75rem', color: 'var(--red-bright)' }}>↓ {tx.player_out}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  );
}
