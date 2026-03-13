import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { HomePage } from '@/pages/HomePage';
import { TournamentNewPage } from '@/pages/TournamentNewPage';
import { TournamentDetailPage } from '@/pages/TournamentDetailPage';
import { RoundDetailPage } from '@/pages/RoundDetailPage';
import { MatchScorePage } from '@/pages/MatchScorePage';
import { DataPage } from '@/pages/DataPage';
import { PrintPage } from '@/pages/PrintPage';
import { GuidePage } from '@/pages/GuidePage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">読み込み中...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">読み込み中...</div>;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
            <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/tournament/new" element={<ProtectedRoute><TournamentNewPage /></ProtectedRoute>} />
            <Route path="/tournament/:id" element={<ProtectedRoute><TournamentDetailPage /></ProtectedRoute>} />
            <Route path="/tournament/:id/round/:num" element={<ProtectedRoute><RoundDetailPage /></ProtectedRoute>} />
            <Route path="/tournament/:id/match/:mid" element={<ProtectedRoute><MatchScorePage /></ProtectedRoute>} />
            <Route path="/tournament/:id/print" element={<ProtectedRoute><PrintPage /></ProtectedRoute>} />
            <Route path="/guide" element={<ProtectedRoute><GuidePage /></ProtectedRoute>} />
            <Route path="/data" element={<ProtectedRoute><DataPage /></ProtectedRoute>} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
