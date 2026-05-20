import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, Users, Shield, Zap, Eye, Mail, Lock, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function LandingPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (mode === 'register') {
        const data = await register(email, password, fullName);
        // If session is returned, user is auto-confirmed
        if (data.session) {
          navigate('/dashboard');
        } else {
          // Email confirmation required - show message and switch to login
          setSuccess('تم إنشاء الحساب! يمكنك تسجيل الدخول الآن');
          setMode('login');
        }
      } else {
        await login(email, password);
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'حدث خطأ';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Upload, title: 'رفع سريع', desc: 'ارفع ملفاتك بسرعة مع دعم السحب والإفلات' },
    { icon: Users, title: 'تعاون جماعي', desc: 'شارك مساحات العمل مع فريقك بسهولة' },
    { icon: Shield, title: 'أمان متقدم', desc: 'حماية ملفاتك مع صلاحيات دقيقة' },
    { icon: Zap, title: 'تحديث فوري', desc: 'تحديثات لحظية عبر Realtime' },
    { icon: Eye, title: 'معاينة مباشرة', desc: 'استعرض الصور والملفات مباشرة' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 text-white" dir="rtl">
      {/* Header */}
      <header className="container mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
            <Upload className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold">FileShare</h1>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl lg:text-5xl font-bold leading-tight mb-6">
              مساحة عمل مشتركة
              <br />
              <span className="text-indigo-400">لإدارة ملفاتك</span>
            </h2>
            <p className="text-lg text-slate-300 mb-10 leading-relaxed">
              أنشئ مساحات عمل، شارك الملفات مع فريقك، وتابع كل التغييرات في الوقت الحقيقي.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              {features.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
                >
                  <f.icon className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-sm">{f.title}</h3>
                    <p className="text-xs text-slate-400">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right - Auth Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => { setMode('login'); setError(''); }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    mode === 'login' ? 'bg-indigo-600 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  تسجيل الدخول
                </button>
                <button
                  onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    mode === 'register' ? 'bg-indigo-600 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  حساب جديد
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <div className="relative">
                    <User className="absolute right-3 top-3 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="الاسم الكامل"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-xl py-3 pr-11 pl-4 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                )}
                <div className="relative">
                  <Mail className="absolute right-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    placeholder="البريد الإلكتروني"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl py-3 pr-11 pl-4 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute right-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    placeholder="كلمة المرور"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl py-3 pr-11 pl-4 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-300 text-sm">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-green-300 text-sm">
                    {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors"
                >
                  {loading ? '...' : mode === 'login' ? 'دخول' : 'إنشاء حساب'}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}