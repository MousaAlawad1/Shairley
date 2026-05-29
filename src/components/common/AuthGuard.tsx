// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/components/common/AuthGuard.tsx
// PURPOSE: Route guard with session recovery. Shows a reconnection UI
//          instead of immediately redirecting to login.
// ═══════════════════════════════════════════════════════════════════════════════

import { type ReactNode, useState, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PageLoader } from '@/components/common/PageLoader';
import { RefreshCw, LogIn } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading, sessionExpired, recoverSession, logout } = useAuth();
  const location = useLocation();
  const [recovering, setRecovering] = useState(false);

  const handleRecover = useCallback(async () => {
    setRecovering(true);
    const success = await recoverSession();
    setRecovering(false);
    if (!success) {
      // If recovery fails, user will see the expired UI still
    }
  }, [recoverSession]);

  const handleLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  // Still loading initial session
  if (loading) {
    return <PageLoader label="جاري التحقق من الجلسة..." />;
  }

  // Session expired — show recovery UI
  if (sessionExpired && user) {
    return (
      <div className="min-h-screen bg-ink text-fg-1 flex items-center justify-center p-6" dir="rtl">
        <div className="w-full max-w-sm text-center">
          <div className="glass-card p-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-brass/30 bg-brass/10">
              <RefreshCw className={`h-6 w-6 text-brass-ring ${recovering ? 'animate-spin' : ''}`} />
            </div>
            <h2 className="text-xl font-semibold tracking-tight mb-2">انقطع الاتصال</h2>
            <p className="text-sm text-fg-3 mb-6">
              يبدو أن جلستك انتهت. يمكنك إعادة الاتصال أو تسجيل الدخول مجدداً.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleRecover}
                disabled={recovering}
                className="btn-primary w-full !py-3"
              >
                {recovering ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    جاري إعادة الاتصال...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    إعادة الاتصال
                  </>
                )}
              </button>
              <button
                onClick={handleLogout}
                className="btn-secondary w-full !py-3"
              >
                <LogIn className="h-4 w-4" />
                تسجيل الدخول مجدداً
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated at all
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}