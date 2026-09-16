import { Route, Routes } from 'react-router';

import AnalyticsPage from './features/analytics/AnalyticsPage';
import CalendarPage from './features/calendar/CalendarPage';
import DashboardPage from './features/dashboard/DashboardPage';
import GoalsPage from './features/goals/GoalsPage';
import SessionDetailPage from './features/sessions/SessionDetailPage';
import SessionsPage from './features/sessions/SessionsPage';
import StudyPage from './features/sessions/StudyPage';
import SubjectsPage from './features/subjects/SubjectsPage';
import { AppShell } from './shared/components/layout/AppShell';
import NotFoundPage from './shared/components/NotFoundPage';
import SRSPage from '@/features/srs/SRSPage';

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/review" element={<SRSPage />} />
        <Route path="/subjects" element={<SubjectsPage />} />
        <Route path="/study/:method" element={<StudyPage />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/sessions/:id" element={<SessionDetailPage />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  );
}
