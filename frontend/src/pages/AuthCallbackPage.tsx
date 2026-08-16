import * as React from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '@/context/auth-context';

export function AuthCallbackPage() {
  const { refresh, user, loading } = useAuth();
  const [checked, setChecked] = React.useState(false);

  React.useEffect(() => {
    refresh().finally(() => setChecked(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!checked || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <Navigate to={user ? '/' : '/login'} replace />;
}
