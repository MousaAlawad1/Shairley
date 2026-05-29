// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/pages/DashboardPage.tsx
// PURPOSE: Dashboard — Enterprise SaaS layout
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus,
  FolderOpen,
  Users,
  HardDrive,
  Loader2,
  Search,
  LayoutGrid,
  List,
  Trash2,
  Activity,
  X,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabaseWorkspaceService } from '@/services/api-services';
import { fileService } from '@/services/supabase-services';
import { Workspace, WorkspaceActivity } from '@/types';

type ViewMode = 'grid' | 'list';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newIsCourse, setNewIsCourse] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [creating, setCreating] = useState(false);
  const [storageMap, setStorageMap] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [recentActivity, setRecentActivity] = useState<WorkspaceActivity[]>([]);

  const loadWorkspaces = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      // 1. Load workspace list first — show immediately
      const workspaceList = await supabaseWorkspaceService.listForCurrentUser();
      setWorkspaces(workspaceList);
      setLoading(false);

      // 2. Load storage + activity lazily in background (non-blocking)
      const [storageResults, recentLogs] = await Promise.all([
        Promise.allSettled(
          workspaceList.map(async (workspace) => {
            const storage = await supabaseWorkspaceService.getStorage(workspace.id);
            return [workspace.id, storage.used] as const;
          })
        ),
        supabaseWorkspaceService.getRecentActivity(6),
      ]);
      const storageEntries = storageResults
        .filter((r): r is PromiseFulfilledResult<readonly [string, number]> => r.status === 'fulfilled')
        .map((r) => r.value);
      setStorageMap(Object.fromEntries(storageEntries));
      setRecentActivity(recentLogs);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل مساحات العمل');
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadWorkspaces(); }, [loadWorkspaces]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError('');
    try {
      await supabaseWorkspaceService.create(
        newName.trim(),
        newDesc.trim(),
        newIsCourse ? (newSubject.trim() || newName.trim()) : null,
      );
      setNewName(''); setNewDesc(''); setNewSubject(''); setNewIsCourse(false); setShowCreate(false);
      await loadWorkspaces();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر إنشاء مساحة العمل');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (workspaceId: string) => {
    if (deleting) return;
    setDeleting(true);
    setError('');
    try {
      await supabaseWorkspaceService.deleteWorkspace(workspaceId);
      setDeleteConfirm(null);
      await loadWorkspaces();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر حذف مساحة العمل');
    } finally {
      setDeleting(false);
    }
  };

  const filteredWorkspaces = workspaces.filter((workspace) =>
    workspace.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    workspace.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ownedWorkspacesCount = workspaces.filter((workspace) => workspace.owner_id === user?.id).length;
  const totalUsedStorage = Object.values(storageMap).reduce((sum, value) => sum + value, 0);

  return (
    <div dir="rtl" className="min-h-screen">
      <main className="container mx-auto px-6 py-8">

        {/* ═══ HEADER ═══ */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-fg-1">
            مرحباً، {user?.user_metadata?.full_name || 'مستخدم'}
          </h1>
          <p className="mt-1 text-sm text-fg-3">إليك نظرة سريعة على مساحات عملك.</p>
        </div>

        {/* ═══ STATS ═══ */}
        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          <div className="p-5 rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--surface-2))]">
            <p className="text-xs font-medium text-fg-4 uppercase tracking-wider">إجمالي المساحات</p>
            <p className="mt-2 text-2xl font-semibold text-fg-1">{workspaces.length}</p>
          </div>
          <div className="p-5 rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--surface-2))]">
            <p className="text-xs font-medium text-fg-4 uppercase tracking-wider">المساحات المملوكة</p>
            <p className="mt-2 text-2xl font-semibold text-fg-1">{ownedWorkspacesCount}</p>
          </div>
          <div className="p-5 rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--surface-2))]">
            <p className="text-xs font-medium text-fg-4 uppercase tracking-wider">التخزين المستخدم</p>
            <p className="mt-2 text-2xl font-semibold text-fg-1">{fileService.formatSize(totalUsedStorage)}</p>
          </div>
        </div>

        {/* ═══ TOOLBAR ═══ */}
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-4" />
              <input
                type="text"
                placeholder="بحث في المساحات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="field !py-2 !pr-10 !pl-9 w-60"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-4 hover:text-fg-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex rounded-md border border-[hsl(var(--line))] overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-[hsl(var(--surface-3))] text-fg-1' : 'text-fg-4 hover:text-fg-2'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-[hsl(var(--surface-3))] text-fg-1' : 'text-fg-4 hover:text-fg-2'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
            <Plus className="w-4 h-4" />
            مساحة جديدة
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-[hsl(var(--brick)/0.3)] bg-[hsl(var(--brick)/0.08)] px-4 py-3 text-sm text-brick-soft">
            {error}
          </div>
        )}

        {/* ═══ CONTENT LAYOUT ═══ */}
        <div className="grid lg:grid-cols-[1fr_300px] gap-6">

          {/* LEFT — Workspaces */}
          <div>
            {loading ? (
              <div className={viewMode === 'grid' ? 'grid sm:grid-cols-2 gap-4' : 'space-y-3'}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton-shimmer" style={{ animationDelay: `${i * 100}ms`, height: viewMode === 'grid' ? '160px' : '72px' }} />
                ))}
              </div>
            ) : filteredWorkspaces.length === 0 ? (
              <div className="text-center py-16 rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--surface-2))]">
                <FolderOpen className="w-10 h-10 text-fg-4 mx-auto mb-4" />
                {searchQuery ? (
                  <>
                    <p className="text-fg-3">لا توجد نتائج لـ &quot;{searchQuery}&quot;</p>
                    <p className="text-fg-4 text-sm mt-1">جرب كلمة بحث مختلفة</p>
                  </>
                ) : (
                  <>
                    <p className="text-fg-3">لا توجد مساحات عمل بعد</p>
                    <button onClick={() => setShowCreate(true)} className="btn-primary mt-4 mx-auto">
                      <Plus className="w-4 h-4" />
                      إنشاء مساحة عمل
                    </button>
                  </>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {filteredWorkspaces.map((workspace) => (
                  <div
                    key={workspace.id}
                    onClick={() => navigate(`/workspace/${workspace.id}`)}
                    className="group relative p-5 rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--surface-2))] hover:border-[hsl(var(--line-strong))] transition-colors cursor-pointer"
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(workspace.id); }}
                      className="absolute top-3 left-3 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-fg-4 hover:text-brick-soft hover:bg-[hsl(var(--brick)/0.1)]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="mb-3 flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[hsl(var(--surface-3))]">
                        {workspace.subject ? <BookOpen className="h-4 w-4 text-[hsl(var(--brand-accent-ring))]" /> : <FolderOpen className="h-4 w-4 text-[hsl(var(--brand-accent-ring))]" />}
                      </div>
                      {workspace.subject && (
                        <span className="text-[10px] font-medium text-[hsl(var(--brand-accent-ring))] bg-[hsl(var(--brand-accent)/0.1)] px-2 py-0.5 rounded">
                          مادة
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-fg-1 mb-1 truncate">{workspace.name}</h3>
                    {workspace.subject && <p className="text-xs text-[hsl(var(--brand-accent-ring))] mb-1">{workspace.subject}</p>}
                    {workspace.description && <p className="text-sm text-fg-3 line-clamp-2 mb-3">{workspace.description}</p>}
                    {/* Storage progress bar */}
                    {storageMap[workspace.id] !== undefined && workspace.max_storage_mb && (
                      <div className="mt-3 mb-2">
                        <div className="flex items-center justify-between text-[10px] text-fg-4 mb-1">
                          <span>{fileService.formatSize(storageMap[workspace.id] || 0)}</span>
                          <span>{Math.min(100, ((storageMap[workspace.id] || 0) / (workspace.max_storage_mb * 1024 * 1024)) * 100).toFixed(0)}%</span>
                        </div>
                        <div className="h-1 rounded-full bg-surface-3 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              ((storageMap[workspace.id] || 0) / (workspace.max_storage_mb * 1024 * 1024)) > 0.9 ? 'bg-brick' :
                              ((storageMap[workspace.id] || 0) / (workspace.max_storage_mb * 1024 * 1024)) > 0.7 ? 'bg-brass' : 'bg-sage'
                            }`}
                            style={{ width: `${Math.min(100, ((storageMap[workspace.id] || 0) / (workspace.max_storage_mb * 1024 * 1024)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-xs text-fg-4 mt-auto pt-3 border-t border-[hsl(var(--line))]">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />مشتركة</span>
                      <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" />{fileService.formatSize(storageMap[workspace.id] || 0)}</span>
                      <span className="mr-auto">{new Date(workspace.created_at).toLocaleDateString('ar')}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredWorkspaces.map((workspace) => (
                  <div
                    key={workspace.id}
                    className="group flex cursor-pointer items-center justify-between gap-4 p-4 rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--surface-2))] hover:border-[hsl(var(--line-strong))] transition-colors"
                    onClick={() => navigate(`/workspace/${workspace.id}`)}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--surface-3))]">
                        {workspace.subject ? <BookOpen className="h-4 w-4 text-[hsl(var(--brand-accent-ring))]" /> : <FolderOpen className="h-4 w-4 text-[hsl(var(--brand-accent-ring))]" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-medium text-fg-1">{workspace.name}</h3>
                          {workspace.subject && <span className="text-[10px] font-medium text-[hsl(var(--brand-accent-ring))] bg-[hsl(var(--brand-accent)/0.1)] px-1.5 py-0.5 rounded">مادة</span>}
                        </div>
                        {workspace.description && <p className="line-clamp-1 text-xs text-fg-3">{workspace.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-fg-4 shrink-0">
                      <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" />{fileService.formatSize(storageMap[workspace.id] || 0)}</span>
                      <span>{new Date(workspace.created_at).toLocaleDateString('ar')}</span>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(workspace.id); }} className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-fg-4 hover:text-brick-soft">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — Activity sidebar */}
          <aside className="rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--surface-2))] p-5 h-fit lg:sticky lg:top-24">
            <div className="mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-fg-3" />
              <h3 className="text-sm font-semibold text-fg-1">آخر النشاطات</h3>
            </div>

            {recentActivity.length === 0 ? (
              <p className="text-sm text-fg-4 text-center py-8">لا توجد نشاطات بعد.</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="p-3 rounded-md border border-[hsl(var(--line))] bg-[hsl(var(--surface-1))]">
                    <p className="text-xs font-medium text-fg-1 mb-1">{activity.action}</p>
                    {activity.details && <p className="text-[11px] text-fg-3 leading-5 mb-1.5">{activity.details}</p>}
                    <div className="flex items-center gap-2 text-[10px] text-fg-4">
                      <span>{activity.user_name}</span>
                      {activity.workspace_name && <><span>·</span><span>{activity.workspace_name}</span></>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* ═══ CREATE MODAL ═══ */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => !creating && setShowCreate(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--surface-2))] p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-fg-1">إنشاء مساحة عمل</h3>
                <button onClick={() => !creating && setShowCreate(false)} className="text-fg-4 hover:text-fg-1 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-fg-3">اسم المساحة</label>
                  <input type="text" placeholder="مثال: مشروع التصميم" value={newName} onChange={(e) => setNewName(e.target.value)} required disabled={creating} className="field disabled:opacity-50" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-fg-3">الوصف (اختياري)</label>
                  <textarea placeholder="وصف مختصر..." value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={3} disabled={creating} className="field resize-none disabled:opacity-50" />
                </div>

                <div className="p-3 rounded-md border border-[hsl(var(--line))] bg-[hsl(var(--surface-1))]">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input type="checkbox" checked={newIsCourse} onChange={(e) => setNewIsCourse(e.target.checked)} disabled={creating} className="mt-1 h-4 w-4 accent-[hsl(var(--brand-accent))]" />
                    <span className="min-w-0 flex-1 text-sm text-fg-2">
                      <span className="font-medium text-fg-1 flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5 text-[hsl(var(--brand-accent-ring))]" />هذه مادة دراسية</span>
                      <span className="block text-xs text-fg-4 mt-0.5">سيظهر شعار «مادة» مع اسم المادة.</span>
                    </span>
                  </label>
                  {newIsCourse && (
                    <div className="mt-3">
                      <input type="text" placeholder="مثال: الرياضيات 1" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} disabled={creating} className="field disabled:opacity-50" />
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={creating} className="btn-primary flex-1 py-2.5">
                    {creating ? <><Loader2 className="w-4 h-4 animate-spin" />جاري الإنشاء...</> : 'إنشاء'}
                  </button>
                  <button type="button" onClick={() => setShowCreate(false)} disabled={creating} className="btn-secondary flex-1 py-2.5">
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ DELETE CONFIRM ═══ */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm rounded-lg border border-[hsl(var(--brick)/0.3)] bg-[hsl(var(--surface-2))] p-6"
            >
              <div className="text-center mb-5">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-[hsl(var(--brick)/0.1)]">
                  <Trash2 className="h-5 w-5 text-brick-soft" />
                </div>
                <h3 className="text-lg font-semibold text-fg-1">حذف مساحة العمل</h3>
                <p className="text-sm text-fg-3 mt-1">سيتم حذف جميع الملفات نهائياً</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => handleDelete(deleteConfirm)} disabled={deleting} className="btn-danger flex-1 py-2.5">
                  {deleting ? <><Loader2 className="w-4 h-4 animate-spin" />جاري الحذف...</> : 'حذف'}
                </button>
                <button onClick={() => setDeleteConfirm(null)} disabled={deleting} className="btn-secondary flex-1 py-2.5">إلغاء</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}