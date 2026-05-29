import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { AuthGuard } from '@/components/common/AuthGuard';
import AppNavbar from '@/components/layout/AppNavbar';
import QueryProvider from '@/components/providers/QueryProvider';
import { PageLoader } from '@/components/common/PageLoader';

// Lazy loaded pages
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const DevelopersPage = lazy(() => import('@/pages/DevelopersPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const WorkspacePage = lazy(() => import('@/pages/WorkspacePage'));
const ViewerPage = lazy(() => import('@/pages/ViewerPage'));
const JoinPage = lazy(() => import('@/pages/JoinPage'));
const AuthCallback = lazy(() => import('@/pages/AuthCallback'));
const AuthErrorPage = lazy(() => import('@/pages/AuthError'));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
const BlogRoutes = lazy(() => import('@/blog-routes'));

function PageFallback() {
  return <PageLoader label="جاري التحميل..." />;
}

/** Standard app shell — floating navbar + footer */
function WithNavbar({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ink text-fg-1 flex flex-col">
      <AppNavbar />
      <main className="flex-1 pt-24">
        {children}
      </main>
      <footer className="border-t border-[hsl(var(--line))] py-6 mt-auto">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between text-xs text-fg-4">
            <p>&copy; 2026 Shairley</p>
            <p>منصة عمل سحابية لمشاركة الملفات والتعاون</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Public pages — show the same floating navbar (no footer wrapper here;
 *  public pages like LandingPage bring their own footer). */
function WithoutNavbar({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ink text-fg-1">
      <AppNavbar />
      <main className="pt-24">
        {children}
      </main>
    </div>
  );
}

/** Bare layout — fullscreen / technical pages (viewer, auth callback,
 *  auth error). No navbar so the page can use the entire viewport. */
function BareLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ink text-fg-1">
      {children}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryProvider>
          <BrowserRouter>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<WithoutNavbar><LandingPage /></WithoutNavbar>} />
                <Route path="/login" element={<WithoutNavbar><LoginPage /></WithoutNavbar>} />

                {/* Protected Routes */}
                <Route path="/profile" element={<AuthGuard><WithNavbar><ProfilePage /></WithNavbar></AuthGuard>} />
                <Route path="/developers" element={<WithNavbar><DevelopersPage /></WithNavbar>} />
                <Route path="/dashboard" element={<AuthGuard><WithNavbar><DashboardPage /></WithNavbar></AuthGuard>} />
                <Route path="/workspace/:id" element={<AuthGuard><WithNavbar><WorkspacePage /></WithNavbar></AuthGuard>} />

                {/* Viewer — fullscreen, no navbar */}
                <Route path="/workspace/:id/view/:fileId" element={<AuthGuard><ViewerPage /></AuthGuard>} />

                {/* Auth Routes — bare / transient flows */}
                <Route path="/join/:token" element={<WithoutNavbar><JoinPage /></WithoutNavbar>} />
                <Route path="/auth/callback" element={<BareLayout><AuthCallback /></BareLayout>} />
                <Route path="/auth/error" element={<BareLayout><AuthErrorPage /></BareLayout>} />
                <Route path="/auth/reset-password" element={<WithoutNavbar><ResetPasswordPage /></WithoutNavbar>} />

                {/* Blog */}
                <Route path="/blog/*" element={<BlogRoutes />} />

                {/* Catch All */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </QueryProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;