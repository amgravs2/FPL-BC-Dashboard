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
  const { data: seasons } = useApi('/query/seasons');

  // Default to first (most recent) season if none selected
  const seasonId = searchParams.get('season') || seasons?.[0]?.id || 1;

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
