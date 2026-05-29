// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/pages/LoginPage.tsx
// PURPOSE: Auth page — Centered glass card, new layout
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Loader2,
  EyeOff,
  Eye,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { spring } from '@/lib/motion';

type AuthMode = 'login' | 'register' | 'forgot-password';

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, forgotPassword, user, loading: authLoading } = useAuth();

  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  const heading = mode === 'login' ? 'مرحباً بعودتك' : mode === 'register' ? 'أنشئ حسابك' : 'استعادة الوصول';
  const subheading = mode === 'login'
    ? 'سجّل دخولك للمتابعة إلى مساحاتك.'
    : mode === 'register'
      ? 'دقائق قليلة وتكون جاهزاً للعمل مع فريقك.'
      : 'أدخل بريدك وسنرسل رابط استعادة آمن.';

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'register') {
        if (!fullName.trim()) {
          setError('يرجى إدخال الاسم الكامل');
          return;
        }
        if (password.length < 6) {
          setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
          return;
        }
        await register(email, password, fullName.trim());
        setSuccess('تم إنشاء الحساب بنجاح! يمكنك تسجيل الدخول والمتابعة مباشرة.');
      } else if (mode === 'forgot-password') {
        await forgotPassword(email);
        setSuccess('تم إرسال رابط الاستعادة إلى بريدك الإلكتروني.');
      } else {
        await login(email, password);
        navigate(from, { replace: true });
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('حدث خطأ غير متوقع');
      }
    } finally {
      setLoading(false);
    }
  }, [mode, email, password, fullName, login, register, forgotPassword, navigate, from]);

  if (!authLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      {/* Background orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
      </div>

      {/* Grid pattern */}
      <div className="grid-pattern absolute inset-0 pointer-events-none" />

      {/* Glass Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md glass-card glow-card accent-top p-8 sm:p-10"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, ...spring.bouncy }}
          className="flex justify-center mb-8"
        >
          <div
            className="h-14 w-14 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--brand-accent) / 0.25), hsl(var(--brand-accent) / 0.08))',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 8px 24px -8px hsl(var(--brand-accent) / 0.4)',
            }}
          >
            <Shield className="h-7 w-7 text-brand-accent" />
          </div>
        </motion.div>

        {/* Header */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-center mb-8"
          >
            <h1 className="text-2xl font-bold text-fg-1">{heading}</h1>
            <p className="mt-2 text-sm text-fg-3">{subheading}</p>
          </motion.div>
        </AnimatePresence>

        {/* Error/Success */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              className="mb-5 rounded-xl p-3 text-sm text-brick-soft overflow-hidden"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              className="mb-5 rounded-xl p-3 text-sm text-sage overflow-hidden"
              style={{ background: 'rgba(75,163,181,0.08)', border: '1px solid rgba(75,163,181,0.2)' }}
            >
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {mode === 'register' && (
              <motion.div
                key="name"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <label className="block text-xs font-medium text-fg-3 mb-2">الاسم الكامل</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="أدخل اسمك الكامل"
                  className="field"
                  disabled={loading}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="block text-xs font-medium text-fg-3 mb-2">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="field"
              required
              disabled={loading}
              dir="ltr"
            />
          </div>

          {mode !== 'forgot-password' && (
            <div>
              <label className="block text-xs font-medium text-fg-3 mb-2">كلمة المرور</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="field !pl-12"
                  required
                  disabled={loading}
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-4 hover:text-fg-2 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Forgot password link */}
          {mode === 'login' && (
            <div className="text-left">
              <button
                type="button"
                onClick={() => { setMode('forgot-password'); setError(''); setSuccess(''); }}
                className="text-xs text-brand-accent hover:text-brand-accent-hover transition-colors"
              >
                نسيت كلمة المرور؟
              </button>
            </div>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3.5 mt-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === 'login' ? (
              'تسجيل الدخول'
            ) : mode === 'register' ? (
              'إنشاء الحساب'
            ) : (
              'إرسال رابط الاستعادة'
            )}
          </motion.button>
        </form>

        {/* Mode switcher */}
        <div className="mt-6 text-center text-sm text-fg-3">
          {mode === 'login' ? (
            <p>
              ليس لديك حساب؟{' '}
              <button
                onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
                className="text-brand-accent hover:text-brand-accent-hover font-medium transition-colors"
              >
                أنشئ حساباً
              </button>
            </p>
          ) : mode === 'register' ? (
            <p>
              لديك حساب بالفعل؟{' '}
              <button
                onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                className="text-brand-accent hover:text-brand-accent-hover font-medium transition-colors"
              >
                سجّل دخولك
              </button>
            </p>
          ) : (
            <p>
              <button
                onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                className="text-brand-accent hover:text-brand-accent-hover font-medium transition-colors"
              >
                العودة لتسجيل الدخول
              </button>
            </p>
          )}
        </div>

        {/* Landing page link */}
        <div className="mt-4 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-xs text-fg-4 hover:text-brand-accent transition-colors"
          >
            تعرّف على شيّرلي ←
          </button>
        </div>
      </motion.div>
    </div>
  );
}