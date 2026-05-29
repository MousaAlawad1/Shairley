// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/components/workspace/ActivityLog.tsx
// PURPOSE: Activity/audit log component — Premium motion edition
// ═══════════════════════════════════════════════════════════════════════════════

import { motion } from 'framer-motion';
import { Search, Activity } from 'lucide-react';
import { AuditLog, PaginationMeta } from '@/types';
import Pagination from '@/components/common/Pagination';
import { staggerContainer, staggerItemFade, spring } from '@/lib/motion';

interface ActivityLogProps {
  logs: AuditLog[];
  pagination: PaginationMeta;
  loading: boolean;
  onPageChange: (page: number) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  actionFilter: string;
  onActionFilterChange: (action: string) => void;
}

export default function ActivityLog({
  logs,
  pagination,
  loading,
  onPageChange,
  searchQuery,
  onSearchChange,
  actionFilter,
  onActionFilterChange,
}: ActivityLogProps) {
  
  const activityActions = Array.from(new Set(logs.map((log) => log.action))).sort((a, b) => 
    a.localeCompare(b, 'ar')
  );

  const filteredLogs = logs.filter((log) => {
    const matchesAction = actionFilter === 'all' ? true : log.action === actionFilter;
    const searchTarget = `${log.action} ${log.details || ''} ${log.user_name}`.toLowerCase();
    const matchesSearch = searchTarget.includes(searchQuery.toLowerCase());
    return matchesAction && matchesSearch;
  });

  return (
    <div className="space-y-3">
      {/* Filters Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring.smooth}
        className="rounded-2xl border border-line/70 bg-surface-2/60 p-4 flex flex-wrap gap-3 items-center justify-between backdrop-blur"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-3" />
            <input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ابحث في السجل..."
              className="field !w-64 !pr-10"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => onActionFilterChange(e.target.value)}
            className="rounded-xl border border-line-strong bg-surface-1/80 px-3 py-2 text-sm text-fg-1 focus:outline-none focus:border-brand-accent/70"
          >
            <option value="all">كل الأنشطة</option>
            {activityActions.map((action) => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
        </div>

        <p className="text-xs text-fg-3">
          عرض {filteredLogs.length} من أصل {logs.length} نشاط
        </p>
      </motion.div>

      {/* Loading State */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-surface-2/80 border border-line/70 rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-surface-3 rounded w-1/3 mb-3 skeleton-shimmer" />
              <div className="h-3 bg-surface-3 rounded w-2/3 mb-2 skeleton-shimmer" />
              <div className="h-3 bg-surface-3 rounded w-1/4 skeleton-shimmer" />
            </div>
          ))}
        </div>
      ) : filteredLogs.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={spring.smooth}
          className="text-center py-12 text-fg-4"
        >
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>لا يوجد نشاط بعد</p>
        </motion.div>
      ) : (
        <>
          {/* Logs List */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="space-y-2"
          >
            {filteredLogs.map((log) => (
              <motion.div
                key={log.id}
                variants={staggerItemFade}
                whileHover={{ x: -2 }}
                transition={spring.snappy}
                className="bg-surface-2/80 border border-line/70 rounded-xl p-4 hover:border-brand-accent/20 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-fg-1">{log.action}</p>
                    {log.details && (
                      <p className="text-xs text-fg-3 mt-0.5">{log.details}</p>
                    )}
                    <p className="text-xs text-fg-4/70 mt-0.5">{log.user_name}</p>
                  </div>
                  <span className="text-xs text-fg-4 shrink-0">
                    {new Date(log.created_at).toLocaleDateString('ar')}
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-4">
              <Pagination
                pagination={pagination}
                onPageChange={onPageChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}