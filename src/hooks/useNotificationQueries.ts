// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/hooks/useNotificationQueries.ts
// PURPOSE: TanStack Query hooks for notifications
// ═══════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseNotificationsService } from '@/services/api-services';
import { queryKeys } from '@/components/providers/QueryProvider';

// ─── Query Hooks ──────────────────────────────────────────────────────────────

/**
 * Fetch notifications list
 */
export function useNotifications(options?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: [...queryKeys.notifications.list(), options],
    queryFn: () => supabaseNotificationsService.list(options),
  });
}

/**
 * Fetch unread notifications count
 */
export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: queryKeys.notifications.unread(),
    queryFn: async () => {
      const result = await supabaseNotificationsService.list({ 
        limit: 1, 
        unreadOnly: true 
      });
      return result.unreadCount;
    },
    // Poll for new notifications every 30 seconds
    refetchInterval: 30 * 1000,
    staleTime: 10 * 1000,
  });
}

// ─── Mutation Hooks ────────────────────────────────────────────────────────────

/**
 * Mark notification as read
 */
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (notificationId: string) => 
      supabaseNotificationsService.markAsRead(notificationId),
    onSuccess: () => {
      // Invalidate both lists
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread() });
    },
  });
}

/**
 * Mark all notifications as read
 */
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => supabaseNotificationsService.markAllAsRead(),
    onSuccess: () => {
      // Invalidate both lists
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread() });
    },
  });
}