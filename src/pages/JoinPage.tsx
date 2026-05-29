// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/pages/JoinPage.tsx
// PURPOSE: Workspace invite join page — Glassmorphism layout
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus,
  FolderOpen,
  LogIn,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabaseWorkspaceService } from '@/services/api-services';
import { WorkspaceInvitePreview } from '@/types';
import { PageLoader } from '@/components/common/PageLoader';
import { modalVariants, spring, tapScale } from '@/lib/motion';

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [workspace, setWorkspace] = useState<WorkspaceInvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!token) { setError('رابط غير صالح'); setLoading(false); return; }
      try {
        const preview = await supabaseWorkspaceService.getInvitePreview(token);
        setWorkspace(preview);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تحميل معلومات المساحة');
      }
      setLoading(false);
    };
    load();
  }, [token]);

  const handleJoin = async () => {
    if (!token) return;
    setJoining(true); setError('');
    try {
      const joinedWorkspace = await supabaseWorkspaceService.joinByInviteToken(token);
      setSuccess('تم الانضمام بنجاح!');
      window.setTimeout(() => navigate(`/workspace/${joinedWorkspace.id}`), 900);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'فشل الانضمام إلى المساحة');
    } finally { setJoining(false); }
  };

  if (loading || authLoading) return <PageLoader label="جاري تحميل الدعوة..." />;

  if (error && !workspace) {
    return (
      <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center p-4 relative" dir="rtl">
        <div aria-hidden className="pointer-events-none absolute inset-0"><div className="orb orb-1" /></div>
        <motion.div variants={modalVariants} initial="hidden" animate="visible" className="glass-card glow-card p-8 text-center max-w-md">
          <p className="text-brick-soft text-lg mb-4">{error}</p>
          <motion.button {...tapScale} onClick={() => navigate('/')} className="btn-primary">العودة للرئيسية</motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center p-4 relative" dir="rtl">
      {/* Background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
      </div>
      <div className="grid-pattern absolute inset-0 pointer-events-none" />

      <motion.div
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 glass-card glow-card accent-top p-8 sm:p-10 w-full max-w-md text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, ...spring.bouncy }}
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--brand-accent) / 0.25), hsl(var(--brand-accent) / 0.08))',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 24px -8px hsl(var(--brand-accent) / 0.4)',
          }}
        >
          <FolderOpen className="w-7 h-7 text-brand-accent" />
        </motion.div>

        <h2 className="text-xl font-bold mb-1">انضم إلى مساحة العمل</h2>
        <p className="text-brand-accent font-semibold text-lg mb-2">{workspace?.name}</p>
        {workspace?.description && <p className="text-sm text-fg-3 mb-6 leading-7">{workspace.description}</p>}

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="rounded-xl p-3 text-brick-soft text-sm mb-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {success && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="rounded-xl p-3 text-sage text-sm mb-4 flex items-center justify-center gap-2" style={{ background: 'rgba(75,163,181,0.08)', border: '1px solid rgba(75,163,181,0.2)' }}>
              <CheckCircle2 className="w-4 h-4" />{success}
            </motion.div>
          )}
        </AnimatePresence>

        {user ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <p className="text-sm text-fg-3 mb-4">ستنضم بهذه الجلسة: <span className="text-fg-2">{user.email || user.user_metadata?.full_name || 'مستخدم'}</span></p>
            <motion.button {...tapScale} onClick={handleJoin} disabled={joining} className="w-full btn-primary py-3.5">
              {joining ? <><Loader2 className="w-4 h-4 animate-spin" />جاري الانضمام...</> : <><UserPlus className="w-4 h-4" />الانضمام الآن</>}
            </motion.button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <motion.button {...tapScale} onClick={() => navigate('/')} className="w-full btn-primary py-3.5">
              <LogIn className="w-4 h-4" />تسجيل الدخول أو إنشاء حساب
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}