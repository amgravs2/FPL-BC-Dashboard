// Manager config — keyed by stable real name (never changes)
// Colors and initials are permanent; team names and IDs are season-specific
// and come from the API, not hardcoded here.

export const MANAGER_PROFILES = {
  'Aaron Graves':     { initials: 'AG', color: 'var(--color-ag)' },
  'Steven Grosso':    { initials: 'SG', color: 'var(--color-sg)' },
  'Jacob Dulle':      { initials: 'JD', color: 'var(--color-jd)' },
  'Jace Huggins':     { initials: 'JH', color: 'var(--color-jh)' },
  'Robert Morse':     { initials: 'RM', color: 'var(--color-rm)' },
  'Kamil Matejewski': { initials: 'KM', color: 'var(--color-km)' },
};

/**
 * Build a teamId → manager lookup from the season summary API response.
 * Call this once per season load and pass the result down as context/prop.
 *
 * Each summary row has: { team_id, first_name, last_name, team_name, ... }
 */
export function buildManagerMap(summaryRows) {
  const map = {};
  summaryRows.forEach(row => {
    const fullName = `${row.first_name} ${row.last_name}`;
    const profile  = MANAGER_PROFILES[fullName] ?? { initials: row.first_name.slice(0, 2).toUpperCase(), color: '#888' };
    map[row.team_id] = {
      ...profile,
      first:     row.player_first_name,
      last:      row.row.player_last_name,
      team_name: row.team_name,   // season-specific team name
      team_id:   row.team_id,     // season-specific internal_team_id
    };
  });
  return map;
}

/**
 * Safely get a manager from the map, with fallback.
 */
export function getManager(managerMap, teamId) {
  return managerMap?.[teamId] ?? {
    initials: '??', first: 'Unknown', last: '',
    team_name: '', color: '#888', team_id: teamId,
  };
}

export const API_BASE = process.env.REACT_APP_API_URL || 'https://fpl-bc-claude.onrender.com';
