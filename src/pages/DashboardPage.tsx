import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, FolderOpen, Users, HardDrive, LogOut, Upload } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { workspaceService, fileService } from '@/services/supabase-services';
import { Workspace } from '@/types';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [storageMap, setStorageMap] = useState<Record<string, number>>({});

  const loadWorkspaces = useCallback(async () => {
    if (!user) return;
    const ws = await workspaceService.listForUser(user.id);
    setWorkspaces(ws);
    const sMap: Record<string, number> = {};
    for (const w of ws) {
      sMap[w.id] = await workspaceService.getStorageUsed(w.id);
    }
    setStorageMap(sMap);
  }, [user]);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newName.trim()) return;
    setCreating(true);
    try {
      await workspaceService.create(newName.trim(), newDesc.trim(), user.id);
      setNewName('');
      setNewDesc('');
      setShowCreate(false);
      await loadWorkspaces();
    } catch { /* ignore */ }
    setCreating(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 text-white" dir="rtl">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-500 rounded-lg flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <h1 className="text-lg font-bold">FileShare</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-300">{user?.email}</span>
            <button onClick={handleLogout} className="text-slate-400 hover:text-white transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">مساحات العمل</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            مساحة جديدة
          </button>
        </div>

        {/* Create Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md"
            >
              <h3 className="text-lg font-bold mb-4">إنشاء مساحة عمل</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <input
                  type="text"
                  placeholder="اسم المساحة"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-xl py-3 px-4 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
                <textarea
                  placeholder="وصف (اختياري)"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-xl py-3 px-4 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 resize-none"
                />
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 py-2.5 rounded-xl font-medium transition-colors"
                  >
                    {creating ? '...' : 'إنشاء'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 py-2.5 rounded-xl font-medium transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Workspace Grid */}
        {workspaces.length === 0 ? (
          <div className="text-center py-20">
            <FolderOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">لا توجد مساحات عمل بعد</p>
            <p className="text-slate-500 text-sm mt-1">أنشئ مساحة عمل جديدة للبدء</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaces.map((ws, i) => (
              <motion.div
                key={ws.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/workspace/${ws.id}`)}
                className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 cursor-pointer hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center group-hover:bg-indigo-500/30 transition-colors">
                    <FolderOpen className="w-5 h-5 text-indigo-400" />
                  </div>
                </div>
                <h3 className="font-semibold text-white mb-1">{ws.name}</h3>
                {ws.description && <p className="text-sm text-slate-400 line-clamp-2 mb-3">{ws.description}</p>}
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    أعضاء
                  </span>
                  <span className="flex items-center gap-1">
                    <HardDrive className="w-3.5 h-3.5" />
                    {fileService.formatSize(storageMap[ws.id] || 0)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}