import { Navigate, Route, Routes } from 'react-router-dom';

import { useAuth } from '@/context/auth-context';
import { AuthCallbackPage } from '@/pages/AuthCallbackPage';
import { DataRoomsPage } from '@/pages/DataRoomsPage';
import { FolderPage } from '@/pages/FolderPage';
import { LoginPage } from '@/pages/LoginPage';
import { PublicSharePage } from '@/pages/PublicSharePage';
import { SharedWithMePage } from '@/pages/SharedWithMePage';
import { SignupPage } from '@/pages/SignupPage';

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <FullscreenSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function FullscreenSpinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/share/:token" element={<PublicSharePage />} />
      <Route path="/share/:token/folders/:folderId" element={<PublicSharePage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <DataRoomsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/shared-with-me"
        element={
          <RequireAuth>
            <SharedWithMePage />
          </RequireAuth>
        }
      />
      <Route
        path="/rooms/:roomId/folders/:folderId"
        element={
          <RequireAuth>
            <FolderPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
