import React, { createContext, useContext, useState, useEffect } from 'react';
import { buildManagerMap } from './config';
import { API_BASE } from './config';

const ManagerContext = createContext({});

export function ManagerProvider({ seasonId, children }) {
  const [managerMap, setManagerMap] = useState({});

  useEffect(() => {
    if (!seasonId) return;
    fetch(`${API_BASE}/query/season/${seasonId}/summary`)
      .then(r => r.json())
      .then(data => setManagerMap(buildManagerMap(data)))
      .catch(() => {});
  }, [seasonId]);

  return (
    <ManagerContext.Provider value={{ managerMap, seasonId }}>
      {children}
    </ManagerContext.Provider>
  );
}

export function useManagerMap() {
  return useContext(ManagerContext).managerMap;
}

// New hook — gives any page the resolved seasonId without re-deriving it from the URL.
// This ensures all pages use the same season that App.js resolved after /query/seasons loaded,
// preventing the || 1 fallback from firing with a stale hardcoded season ID.
export function useSeasonId() {
  return useContext(ManagerContext).seasonId;
}
