import React from 'react';
import { BrowserRouter, Routes, Route, useSearchParams } from 'react-router-dom';
import { Nav, Page } from './components/UI';
import { useApi } from './hooks/useApi';
import { ManagerProvider } from './ManagerContext';
import OverviewPage from './pages/Overview';
import ManagerPage  from './pages/Manager';
import DraftPage    from './pages/Draft';
import { PlayersPage, TransfersPage, RecordsPage, AllTimePage } from './pages/OtherPages';
import ToolsPage from './pages/Tools';
import './index.css';

function AppContent() {
  const [searchParams] = useSearchParams();
  const { data: seasons, loading: seasonsLoading } = useApi('/query/seasons');

  // Wait for seasons to load before resolving seasonId.
  // Falling back to 1 while loading caused every season-scoped API call
  // to 404 after the season ID renumber (25/26 is now id=6, not id=1).
  const seasonId = searchParams.get('season')
    || (seasons && seasons.length > 0 ? seasons[0].id : null);

  // Don't render season-dependent routes until we have a valid season ID.
  if (seasonsLoading || !seasonId) {
    return (
      <>
        <Nav seasonId={null} seasons={null} />
        <Page>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '4rem', color: 'var(--text-muted)',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 40, height: 40,
                border: '2px solid var(--border-gold)',
                borderTopColor: 'var(--gold-bright)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 1rem',
              }} />
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8rem' }}>
                Loading...
              </span>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </Page>
      </>
    );
  }

  return (
    <ManagerProvider seasonId={seasonId}>
      <Nav seasonId={seasonId} seasons={seasons} />
      <Page>
        <Routes>
          <Route path="/"                element={<OverviewPage />} />
          <Route path="/manager/:teamId" element={<ManagerPage />} />
          <Route path="/draft"           element={<DraftPage />} />
          <Route path="/players"         element={<PlayersPage />} />
          <Route path="/transfers"       element={<TransfersPage />} />
          <Route path="/records"         element={<RecordsPage />} />
          <Route path="/alltime"         element={<AllTimePage />} />
          <Route path="/tools"           element={<ToolsPage />} />
        </Routes>
      </Page>
    </ManagerProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
