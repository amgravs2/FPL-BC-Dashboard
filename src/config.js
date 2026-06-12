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
 * Each summary row from /query/season/{id}/summary has:
 *   { team_id, first_name, last_name, team_name, ... }
 */
export function buildManagerMap(summaryRows) {
  const map = {};
  summaryRows.forEach(row => {
    // API returns player_first_name / player_last_name from fantasy_teams table
    const firstName = row.first_name  ?? row.player_first_name ?? '';
    const lastName  = row.last_name   ?? row.player_last_name  ?? '';
    const fullName  = `${firstName} ${lastName}`.trim();
    const profile   = MANAGER_PROFILES[fullName]
      ?? { initials: firstName.slice(0, 2).toUpperCase(), color: '#888' };
    map[row.team_id] = {
      ...profile,
      first:     firstName,
      last:      lastName,
      team_name: row.team_name ?? '',
      team_id:   row.team_id,
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
