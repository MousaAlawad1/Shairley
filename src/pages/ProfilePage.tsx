// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/pages/ProfilePage.tsx
// PURPOSE: User profile page with edit capabilities — Premium motion edition
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Save,
  Loader2,
  X,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  User,
  Mail,
  Lock,
  Shield,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { PageLoader } from '@/components/common/PageLoader';
import { handleError } from '@/lib/errors';
import { staggerContainer, staggerItem, staggerItemFade, modalVariants, overlayVariants, tapScale, spring } from '@/lib/motion';
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { deleteCurrentUserData, getCurrentUserStats } from '@/services/api-services';
import OwnerBadge from '@/components/common/OwnerBadge';

interface ProfileStats {
  workspacesCount: number;
  filesCount: number;
  totalStorage: number;
}

export default function ProfilePage() {
  const { user, loading: authLoading, updateProfile, resetPassword, logout } = useAuth();
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // Form state
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  
  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // UI state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Stats
  const [stats, setStats] = useState<ProfileStats>({
    workspacesCount: 0,
    filesCount: 0,
    totalStorage: 0,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [authLoading, user, navigate]);

  // Initialize form data
  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || '');
      setAvatarUrl(user.user_metadata?.avatar_url);
    }
  }, [user]);

  // Load user stats
  const loadStats = useCallback(async () => {
    if (!user) return;

    try {
      const nextStats = await getCurrentUserStats(user.id);
      setStats(nextStats);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadStats();
      setLoading(false);
    }
  }, [user, loadStats]);

  // Handle avatar upload
  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      setError('يرجى اختيار ملف صورة');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('حجم الصورة يجب أن يكون أقل من 2 ميجابايت');
      return;
    }

    setUploadingAvatar(true);
    setError('');

    try {
      const reader = new FileReader();
      
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const base64Url = await base64Promise;
      setAvatarUrl(base64Url);
      await updateProfile({ avatar_url: base64Url });
      setSuccess('تم تحديث صورة الملف الشخصي بنجاح');
    } catch (err) {
      const appError = handleError(err);
      setError(appError.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Handle profile save
  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      setError('يرجى إدخال الاسم');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await updateProfile({ full_name: fullName.trim() });
      setSuccess('تم تحديث الملف الشخصي بنجاح');
    } catch (err) {
      const appError = handleError(err);
      setError(appError.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async () => {
    setPasswordError('');

    if (!currentPassword) {
      setPasswordError('يرجى إدخال كلمة المرور الحالية');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('كلمة المرور الجديدة غير متطابقة');
      return;
    }

    setChangingPassword(true);
    setError('');

    try {
      if (!auth.currentUser || !user?.email) {
        throw new Error('الجلسة غير متاحة');
      }

      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await resetPassword(newPassword);

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordChange(false);
      setSuccess('تم تغيير كلمة المرور بنجاح');
    } catch (err) {
      const appError = handleError(err);
      setPasswordError(appError.message);
    } finally {
      setChangingPassword(false);
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (!window.confirm('هل أنت متأكد من حذف حسابك؟ هذا الإجراء لا يمكن التراجع عنه.')) {
      return;
    }

    setDeleting(true);
    setError('');

    try {
      await deleteCurrentUserData();
      if (!auth.currentUser) {
        throw new Error('الجلسة غير متاحة');
      }
      await deleteUser(auth.currentUser);
      await logout();
      navigate('/');
    } catch (err) {
      const appError = handleError(err);
      setError(appError.message.includes('حديث') ? appError.message : `${appError.message}. إذا ظهرت مشكلة بالحذف فقم بتسجيل الخروج ثم تسجيل الدخول وحاول مرة أخرى.`);
      setDeleting(false);
    }
  };

  // Format bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (authLoading || loading) {
    return <PageLoader label="جاري تحميل الملف الشخصي..." />;
  }

  if (!user) return null;

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'مستخدم';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="container mx-auto px-4 sm:px-6 py-8 max-w-3xl"
    >
      {/* Header */}
      <motion.div variants={staggerItem} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <motion.button
            {...tapScale}
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-xl hover:bg-surface-2 transition-colors"
          >
            <X className="h-5 w-5 text-fg-3" />
          </motion.button>
          <h1 className="text-2xl font-bold">الملف الشخصي</h1>
          <OwnerBadge email={user?.email} size="md" />
        </div>
        <p className="text-fg-3">إدارة معلوماتك الشخصية وإعدادات حسابك</p>
      </motion.div>

      {/* Error/Success Messages */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={spring.smooth}
            className="mb-6 flex items-start gap-3 rounded-xl border border-brick/40 bg-brick/10 px-4 py-3"
          >
            <AlertTriangle className="h-5 w-5 text-brick-soft shrink-0" />
            <p className="text-sm text-brick-soft">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={spring.smooth}
            className="mb-6 flex items-start gap-3 rounded-xl border border-sage/40 bg-sage/10 px-4 py-3"
          >
            <CheckCircle2 className="h-5 w-5 text-sage shrink-0" />
            <p className="text-sm text-sage">{success}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Card */}
      <motion.div variants={staggerItem} className="glass-card p-6 mb-6">
        
        {/* Avatar Section */}
        <div className="flex items-center gap-6 mb-8 pb-8 border-b border-line/60">
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={spring.smooth}
            className="relative"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-24 w-24 rounded-full object-cover border-2 border-brand-accent/30"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-brand-accent/20 flex items-center justify-center border-2 border-brand-accent/30">
                <span className="text-2xl font-bold text-brand-accent">{initials}</span>
              </div>
            )}
            
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 left-0 h-8 w-8 rounded-full bg-brand-accent hover:bg-brand-accent-hover flex items-center justify-center transition-colors disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, hsl(var(--brand-accent-hover)), hsl(var(--brand-accent)))' }}
            >
              {uploadingAvatar ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <Camera className="h-4 w-4 text-white" />
              )}
            </motion.button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarSelect}
            />
          </motion.div>
          
          <div>
            <h2 className="text-lg font-semibold">{displayName}</h2>
            <p className="text-sm text-fg-4">{user.email}</p>
            <p className="text-xs text-fg-4 mt-1">عضو منذ {new Date(user.created_at).toLocaleDateString('ar')}</p>
          </div>
        </div>

        {/* Stats */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-3 gap-4 mb-8"
        >
          {[
            { value: stats.workspacesCount, label: 'مساحات عمل' },
            { value: stats.filesCount, label: 'ملفات مرفوعة' },
            { value: formatBytes(stats.totalStorage), label: 'مساحة مستخدمة' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              variants={staggerItemFade}
              whileHover={{ y: -2, scale: 1.02 }}
              transition={spring.smooth}
              className="bg-surface-1/60 rounded-xl p-4 text-center border border-line/40"
            >
              <p className="text-2xl font-bold text-brand-accent">{stat.value}</p>
              <p className="text-xs text-fg-4 mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-fg-2 mb-2">
              <User className="h-4 w-4 text-fg-3" />
              الاسم
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="field"
              placeholder="أدخل اسمك"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-fg-2 mb-2">
              <Mail className="h-4 w-4 text-fg-3" />
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={user.email || ''}
              readOnly
              className="w-full rounded-xl border border-line/60 bg-surface-3/40 px-4 py-3 text-fg-3 cursor-not-allowed"
            />
            <p className="text-xs text-fg-4 mt-2">لا يمكن تغيير البريد الإلكتروني</p>
          </div>

          <motion.button
            {...tapScale}
            onClick={handleSaveProfile}
            disabled={saving}
            className="btn-primary w-full py-3"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                حفظ التغييرات
              </>
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Password Change Section */}
      <motion.div variants={staggerItem} className="glass-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center border border-brand-accent/25"
              style={{
                background: 'linear-gradient(180deg, hsl(var(--brand-accent) / 0.15), hsl(var(--brand-accent) / 0.04))',
              }}
            >
              <Lock className="h-5 w-5 text-brand-accent" />
            </div>
            <div>
              <h3 className="font-semibold">كلمة المرور</h3>
              <p className="text-xs text-fg-4">تغيير كلمة المرور الخاصة بك</p>
            </div>
          </div>
          {!showPasswordChange && (
            <motion.button
              {...tapScale}
              onClick={() => setShowPasswordChange(true)}
              className="btn-secondary text-sm"
            >
              تغيير
            </motion.button>
          )}
        </div>

        <AnimatePresence>
          {showPasswordChange && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={spring.smooth}
              className="overflow-hidden"
            >
              <div className="space-y-4 pt-4 border-t border-line/60">
                {passwordError && (
                  <motion.p
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-sm text-brick-soft bg-brick/10 px-4 py-2 rounded-xl"
                  >
                    {passwordError}
                  </motion.p>
                )}
                
                <div>
                  <label className="block text-sm text-fg-2 mb-2">كلمة المرور الحالية</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="field"
                    placeholder="أدخل كلمة المرور الحالية"
                  />
                </div>

                <div>
                  <label className="block text-sm text-fg-2 mb-2">كلمة المرور الجديدة</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="field"
                    placeholder="6 أحرف على الأقل"
                  />
                </div>

                <div>
                  <label className="block text-sm text-fg-2 mb-2">تأكيد كلمة المرور</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="field"
                    placeholder="أعد إدخال كلمة المرور الجديدة"
                  />
                </div>

                <div className="flex gap-3">
                  <motion.button
                    {...tapScale}
                    onClick={handlePasswordChange}
                    disabled={changingPassword}
                    className="btn-primary flex-1 py-3"
                  >
                    {changingPassword ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        جاري التغيير...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        تأكيد التغيير
                      </>
                    )}
                  </motion.button>
                  <motion.button
                    {...tapScale}
                    onClick={() => {
                      setShowPasswordChange(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setPasswordError('');
                    }}
                    disabled={changingPassword}
                    className="btn-secondary py-3"
                  >
                    إلغاء
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Danger Zone */}
      <motion.div variants={staggerItem} className="bg-red-500/5 border border-brick/30 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-brick/15 flex items-center justify-center">
            <Shield className="h-5 w-5 text-brick-soft" />
          </div>
          <div>
            <h3 className="font-semibold text-brick-soft">منطقة الخطر</h3>
            <p className="text-xs text-fg-4">الإجراءات هنا لا يمكن التراجع عنها</p>
          </div>
        </div>

        <p className="text-sm text-fg-3 mb-4">
          حذف حسابك سيؤدي إلى إزالة جميع بياناتك نهائياً بما في ذلك المساحات والملفات.
        </p>

        <motion.button
          {...tapScale}
          onClick={() => setShowDeleteConfirm(true)}
          className="btn-danger"
        >
          <Trash2 className="h-4 w-4" />
          حذف الحساب
        </motion.button>
      </motion.div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-surface-2 border border-brick/40 rounded-2xl p-6 w-full max-w-md shadow-depth-3"
            >
              <div className="text-center mb-6">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-16 h-16 rounded-full bg-brick/20 flex items-center justify-center mx-auto mb-4"
                >
                  <AlertTriangle className="h-8 w-8 text-brick-soft" />
                </motion.div>
                <h3 className="text-lg font-bold text-fg-1 mb-2">حذف الحساب نهائياً</h3>
                <p className="text-sm text-fg-3">
                  هذا الإجراء سيحذف حسابك وجميع بياناتك بشكل نهائي. لا يمكن التراجع عن هذا الإجراء.
                </p>
              </div>

              <div className="flex gap-3">
                <motion.button
                  {...tapScale}
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="flex-1 btn-danger py-3"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جاري الحذف...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      نعم، احذف حسابي
                    </>
                  )}
                </motion.button>
                <motion.button
                  {...tapScale}
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 btn-secondary py-3"
                >
                  إلغاء
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}