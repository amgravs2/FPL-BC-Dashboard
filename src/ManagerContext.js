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
    <ManagerContext.Provider value={managerMap}>
      {children}
    </ManagerContext.Provider>
  );
}

export function useManagerMap() {
  return useContext(ManagerContext);
}
