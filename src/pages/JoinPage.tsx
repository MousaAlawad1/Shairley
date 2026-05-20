import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, FolderOpen, LogIn } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { workspaceService } from '@/services/supabase-services';
import { Workspace } from '@/types';

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!token) { setError('رابط غير صالح'); setLoading(false); return; }
      const ws = await workspaceService.getByInviteToken(token);
      if (!ws) { setError('رابط الدعوة غير صالح أو منتهي الصلاحية'); }
      else { setWorkspace(ws); }
      setLoading(false);
    };
    load();
  }, [token]);

  const handleJoinAsUser = async () => {
    if (!workspace || !user) return;
    setJoining(true);
    try {
      await workspaceService.join(workspace.id, user.id);
      navigate(`/workspace/${workspace.id}`);
    } catch { setError('فشل الانضمام'); }
    setJoining(false);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error && !workspace) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 flex items-center justify-center text-white" dir="rtl">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">{error}</p>
          <button onClick={() => navigate('/')} className="bg-indigo-600 hover:bg-indigo-700 px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 flex items-center justify-center text-white p-4" dir="rtl">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-8 w-full max-w-md text-center"
      >
        <div className="w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FolderOpen className="w-7 h-7 text-indigo-400" />
        </div>
        <h2 className="text-xl font-bold mb-1">انضم إلى مساحة العمل</h2>
        <p className="text-indigo-400 font-semibold text-lg mb-6">{workspace?.name}</p>

        {user ? (
          <div>
            <p className="text-sm text-slate-400 mb-4">ستنضم بحسابك: {user.email}</p>
            <button
              onClick={handleJoinAsUser}
              disabled={joining}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 py-3 rounded-xl font-medium transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              {joining ? '...' : 'انضمام'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">يجب تسجيل الدخول أولاً للانضمام إلى مساحة العمل</p>
            <button
              onClick={() => navigate('/')}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 py-3 rounded-xl font-medium transition-colors"
            >
              <LogIn className="w-4 h-4" />
              تسجيل الدخول
            </button>
          </div>
        )}

        {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
      </motion.div>
    </div>
  );
}