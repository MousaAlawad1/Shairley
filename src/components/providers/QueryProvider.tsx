// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/components/providers/QueryProvider.tsx
// PURPOSE: TanStack Query provider with global auth-error detection
// ═══════════════════════════════════════════════════════════════════════════════

import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { emitAuthExpired } from '@/components/providers/AuthProvider';

// ─── Auth Error Detection ─────────────────────────────────────────────────────

function isAuthError(error: unknown): boolean {
  if (!error) return false;
  const err = error as any;
  if (err.isAuthError === true) return true;
  const msg = (err.message || '').toLowerCase();
  return (
    msg.includes('jwt') ||
    msg.includes('يجب تسجيل الدخول') ||
    msg.includes('انتهت الجلسة') ||
    msg.includes('not authenticated')
  );
}

// ─── Query Client Configuration ───────────────────────────────────────────────

function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (isAuthError(error)) {
          emitAuthExpired();
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        if (isAuthError(error)) {
          emitAuthExpired();
        }
      },
    }),
    defaultOptions: {
      queries: {
        // Time before unused query data is garbage collected (5 minutes)
        gcTime: 5 * 60 * 1000,

        // Time before data becomes stale (1 minute)
        staleTime: 5 * 60 * 1000, // 5 minutes cache for files

        // Retry failed requests — but NOT auth errors
        retry: (failureCount, error) => {
          if (isAuthError(error)) return false;
          return failureCount < 3;
        },

        // Exponential backoff
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

        // Refetch on window focus in production too (session recovery)
        refetchOnWindowFocus: true,

        // Refetch when network reconnects
        refetchOnReconnect: true,
      },
      mutations: {
        // Retry mutations once — but NOT auth errors
        retry: (failureCount, error) => {
          if (isAuthError(error)) return false;
          return failureCount < 1;
        },
      },
    },
  });
}

// ─── Provider Component ───────────────────────────────────────────────────────

interface QueryProviderProps {
  children: ReactNode;
}

export default function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const queryKeys = {
  workspaces: {
    all: ['workspaces'] as const,
    list: () => [...queryKeys.workspaces.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.workspaces.all, 'detail', id] as const,
    members: (id: string) => [...queryKeys.workspaces.all, 'members', id] as const,
    files: (id: string) => [...queryKeys.workspaces.all, 'files', id] as const,
    activity: (id: string) => [...queryKeys.workspaces.all, 'activity', id] as const,
    storage: (id: string) => [...queryKeys.workspaces.all, 'storage', id] as const,
  },
  files: {
    all: ['files'] as const,
    detail: (workspaceId: string, fileId: string) =>
      [...queryKeys.files.all, workspaceId, fileId] as const,
    versions: (workspaceId: string, fileId: string) =>
      [...queryKeys.files.all, 'versions', workspaceId, fileId] as const,
    comments: (workspaceId: string, fileId: string) =>
      [...queryKeys.files.all, 'comments', workspaceId, fileId] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: () => [...queryKeys.notifications.all, 'list'] as const,
    unread: () => [...queryKeys.notifications.all, 'unread'] as const,
  },
  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
  },
} as const;