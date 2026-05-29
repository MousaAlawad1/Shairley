// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/components/workspace/WorkspaceSettings.tsx
// PURPOSE: Workspace settings component — Premium motion edition
// ═══════════════════════════════════════════════════════════════════════════════

import { motion, AnimatePresence } from 'framer-motion';
import {
  HardDrive,
  Link2,
  Copy,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Loader2,
  BookOpen,
  AlertTriangle,
  Settings2,
} from 'lucide-react';
import { Workspace, StorageInfo } from '@/types';
import { fileService } from '@/services/supabase-services';
import { staggerContainer, staggerItem, tapScale, spring } from '@/lib/motion';

interface WorkspaceSettingsProps {
  workspace: Workspace;
  storageInfo: StorageInfo;
  isOwner: boolean;
  currentUserRole: string | null;
  savingSettings: boolean;
  settingsError: string;
  onSave: () => Promise<void>;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onSubjectChange: (subject: string) => void;
  onIsCourseChange: (isCourse: boolean) => void;
  onStorageMbChange: (mb: string) => void;
  onCopyInvite: () => void;
  onRegenerateInvite: () => Promise<void>;
  onDeleteWorkspace: () => Promise<void>;
  name: string;
  description: string;
  subject: string;
  isCourse: boolean;
  storageMb: string;
  inviteCopied: boolean;
  // Invite settings
  inviteSingleUse: boolean;
  onInviteSingleUseChange: (val: boolean) => void;
  inviteMaxUses: string;
  onInviteMaxUsesChange: (val: string) => void;
  inviteExpiresAt: string;
  onInviteExpiresAtChange: (val: string) => void;
}

export default function WorkspaceSettings({
  workspace,
  storageInfo,
  isOwner,
  currentUserRole,
  savingSettings,
  settingsError,
  onSave,
  onNameChange,
  onDescriptionChange,
  onSubjectChange,
  onIsCourseChange,
  onStorageMbChange,
  onCopyInvite,
  onRegenerateInvite,
  onDeleteWorkspace,
  name,
  description,
  subject,
  isCourse,
  storageMb,
  inviteCopied,
  inviteSingleUse,
  onInviteSingleUseChange,
  inviteMaxUses,
  onInviteMaxUsesChange,
  inviteExpiresAt,
  onInviteExpiresAtChange,
}: WorkspaceSettingsProps) {
  const storagePercentage = storageInfo.percentage;
  const storageColor =
    storagePercentage > 90 ? 'text-brick-soft' :
    storagePercentage > 70 ? 'text-brand-accent' : 'text-sage';
  const storageBgColor =
    storagePercentage > 90 ? 'bg-brick' :
    storagePercentage > 70 ? 'bg-brand-accent' : 'bg-sage';

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-4 max-w-2xl"
    >
      {/* Settings Error */}
      <AnimatePresence>
        {settingsError && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={spring.smooth}
            className="flex items-start gap-3 rounded-xl border border-brick/40 bg-brick/10 px-4 py-3"
          >
            <AlertTriangle className="h-5 w-5 text-brick-soft shrink-0" />
            <p className="text-sm text-brick-soft">{settingsError}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Basic Settings */}
      <motion.div variants={staggerItem} className="glass-card p-5">
        <h3 className="font-semibold mb-4">إعدادات المساحة</h3>
        <div className="grid gap-4">
          
          <div>
            <label className="block text-sm text-fg-2 mb-2">اسم المساحة</label>
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className="field"
            />
          </div>

          <div>
            <label className="block text-sm text-fg-2 mb-2">الوصف</label>
            <textarea
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              rows={3}
              className="field resize-none"
            />
          </div>

          {/* Course Toggle */}
          <div className="rounded-2xl border border-line/70 bg-surface-1/60 p-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={isCourse}
                onChange={(e) => onIsCourseChange(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[hsl(var(--brand-accent))]"
              />
              <span className="min-w-0 flex-1 text-sm leading-6 text-fg-2">
                <span className="flex items-center gap-1.5 font-medium text-fg-1">
                  <BookOpen className="h-3.5 w-3.5 text-brand-accent" />
                  هذه مادة دراسية
                </span>
                <span className="block text-xs text-fg-4">سيظهر شعار «مادة» مع اسم المادة.</span>
              </span>
            </label>

            <AnimatePresence>
              {isCourse && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={spring.smooth}
                  className="overflow-hidden"
                >
                  <div className="mt-3">
                    <label className="mb-2 block text-sm text-fg-2">اسم المادة (اختياري)</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => onSubjectChange(e.target.value)}
                      placeholder="مثال: الفيزياء 2 — الفصل الأول"
                      className="field"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Storage Limit */}
          <div>
            <label className="block text-sm text-fg-2 mb-2">حد التخزين (MB)</label>
            <input
              type="number"
              min={1}
              value={storageMb}
              onChange={(e) => onStorageMbChange(e.target.value)}
              disabled={!isOwner}
              className="field disabled:opacity-60"
            />
            {!isOwner && (
              <p className="text-xs text-fg-4 mt-2">تعديل حد التخزين متاح للمالك فقط.</p>
            )}
          </div>

          {/* Save Button */}
          <motion.button
            {...tapScale}
            onClick={onSave}
            disabled={savingSettings}
            className="btn-primary w-fit"
          >
            {savingSettings ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                حفظ الإعدادات
              </>
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Storage Info */}
      <motion.div variants={staggerItem} className="glass-card p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-brand-accent" />
          التخزين
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-fg-3">المستخدم</span>
            <span className="text-fg-1">{fileService.formatSize(storageInfo.used)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-fg-3">الحد الأقصى</span>
            <span className="text-fg-1">{fileService.formatSize(storageInfo.max)}</span>
          </div>
          <div className="w-full h-2 bg-surface-3 rounded-full overflow-hidden mt-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(storagePercentage, 100)}%` }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className={`h-full rounded-full ${storageBgColor}`}
            />
          </div>
          <p className={`text-xs ${storageColor}`}>{storagePercentage.toFixed(1)}% مستخدم</p>
        </div>
      </motion.div>

      {/* Invite Link */}
      <motion.div variants={staggerItem} className="glass-card p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Link2 className="w-4 h-4 text-brand-accent" />
          رابط الدعوة
        </h3>
        <div className="flex gap-2">
          <input
            readOnly
            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/join/${workspace.invite_token}`}
            className="flex-1 bg-surface-3/60 border border-line-strong rounded-lg py-2.5 px-3 text-sm text-fg-2"
          />
          <motion.button
            {...tapScale}
            onClick={onCopyInvite}
            className="p-2.5 rounded-xl transition-colors"
            style={{ background: 'linear-gradient(135deg, hsl(var(--brand-accent-hover)), hsl(var(--brand-accent)))' }}
          >
            <Copy className="w-4 h-4 text-white" />
          </motion.button>
          {isOwner && (
            <motion.button
              {...tapScale}
              onClick={onRegenerateInvite}
              className="p-2.5 bg-surface-3 hover:bg-surface-4 rounded-xl transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </motion.button>
          )}
        </div>
        <AnimatePresence>
          {inviteCopied && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-xs text-sage mt-3"
            >
              تم نسخ رابط الدعوة بنجاح
            </motion.p>
          )}
        </AnimatePresence>

        {/* Invite usage info */}
        {workspace.invite_used_count !== undefined && workspace.invite_used_count > 0 && (
          <p className="text-xs text-fg-4 mt-2">
            تم استخدام الرابط {workspace.invite_used_count} مرة
            {workspace.invite_max_uses ? ` من أصل ${workspace.invite_max_uses}` : ''}
          </p>
        )}
      </motion.div>

      {/* Invite Advanced Settings */}
      {isOwner && (
        <motion.div variants={staggerItem} className="glass-card p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-brand-accent" />
            إعدادات متقدمة للدعوة
          </h3>
          <div className="grid gap-4">
            {/* Single use toggle */}
            <div className="rounded-2xl border border-line/70 bg-surface-1/60 p-3">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={inviteSingleUse}
                  onChange={(e) => onInviteSingleUseChange(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-[hsl(var(--brand-accent))]"
                />
                <span className="min-w-0 flex-1 text-sm leading-6 text-fg-2">
                  <span className="font-medium text-fg-1">استخدام مرة واحدة</span>
                  <span className="block text-xs text-fg-4">الرابط يصبح غير صالح بعد أول انضمام.</span>
                </span>
              </label>
            </div>

            {/* Max uses */}
            <div>
              <label className="block text-sm text-fg-2 mb-2">الحد الأقصى للاستخدامات</label>
              <input
                type="number"
                min={0}
                value={inviteMaxUses}
                onChange={(e) => onInviteMaxUsesChange(e.target.value)}
                placeholder="بلا حد (اتركه فارغاً)"
                className="field"
              />
              <p className="text-xs text-fg-4 mt-1">اتركه 0 أو فارغاً لعدم تحديد حد أقصى.</p>
            </div>

            {/* Expires at */}
            <div>
              <label className="block text-sm text-fg-2 mb-2">تاريخ انتهاء الصلاحية</label>
              <input
                type="datetime-local"
                value={inviteExpiresAt}
                onChange={(e) => onInviteExpiresAtChange(e.target.value)}
                className="field"
                dir="ltr"
              />
              <p className="text-xs text-fg-4 mt-1">اتركه فارغاً لعدم تحديد صلاحية زمنية.</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Danger Zone */}
      {isOwner && (
        <motion.div variants={staggerItem} className="bg-red-500/5 border border-brick/30 rounded-xl p-5">
          <h3 className="font-semibold text-brick-soft mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            منطقة الخطر
          </h3>
          <p className="text-sm text-fg-3 mb-3">
            حذف المساحة سيؤدي لحذف جميع الملفات والبيانات نهائياً.
          </p>
          <motion.button
            {...tapScale}
            onClick={onDeleteWorkspace}
            className="btn-danger"
          >
            <Trash2 className="w-4 h-4" />
            حذف المساحة
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
}