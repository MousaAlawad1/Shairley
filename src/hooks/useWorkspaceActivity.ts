// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/hooks/useWorkspaceActivity.ts
// PURPOSE: Custom hook for workspace activity log state & logic
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import { supabaseWorkspaceService } from '@/services/api-services';
import { AuditLog, PaginationMeta } from '@/types';

const ACTIVITY_LIMIT = 10;

const emptyPagination: PaginationMeta = {
  page: 1,
  limit: ACTIVITY_LIMIT,
  total: 0,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

export function useWorkspaceActivity(workspaceId: string | undefined) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [activityPagination, setActivityPagination] = useState<PaginationMeta>(emptyPagination);
  const [activityPage, setActivityPage] = useState(1);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activitySearchQuery, setActivitySearchQuery] = useState('');
  const [activityActionFilter, setActivityActionFilter] = useState('all');
  const [activityError, setActivityError] = useState('');

  const loadActivity = useCallback(async () => {
    if (!workspaceId) return;
    setActivityLoading(true);
    try {
      const result = await supabaseWorkspaceService.getActivity(workspaceId, {
        page: activityPage,
        limit: ACTIVITY_LIMIT,
      });
      setLogs(result.data);
      setActivityPagination(result.pagination);
      setActivityError('');
    } catch (err: unknown) {
      setActivityError(err instanceof Error ? err.message : 'تعذر تحميل سجل النشاط');
    } finally {
      setActivityLoading(false);
    }
  }, [workspaceId, activityPage]);

  return {
    logs,
    activityPagination,
    activityPage,
    setActivityPage,
    activityLoading,
    activitySearchQuery,
    setActivitySearchQuery,
    activityActionFilter,
    setActivityActionFilter,
    activityError,
    loadActivity,
  };
}
