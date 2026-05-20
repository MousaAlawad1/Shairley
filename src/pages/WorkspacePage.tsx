import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Upload, ArrowRight, Users, FileText, Activity, Settings, Trash2,
  Download, Eye, Copy, RefreshCw, FolderOpen, X, Link2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { workspaceService, fileService, realtimeService } from '@/services/supabase-services';
import { Workspace, WorkspaceFile, WorkspaceMember, AuditLog } from '@/types';

type Tab = 'files' | 'members' | 'activity' | 'settings';

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [tab, setTab] = useState<Tab>('files');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect to landing if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [authLoading, user, navigate]);

  const loadData = useCallback(async () => {
    if (!id) return;
    const ws = await workspaceService.getById(id);
    if (!ws) { navigate('/dashboard'); return; }
    setWorkspace(ws);
    const [f, m, l] = await Promise.all([
      workspaceService.getFiles(id),
      workspaceService.getMembers(id),
      workspaceService.getAuditLog(id),
    ]);
    setFiles(f);
    setMembers(m);
    setLogs(l);
  }, [id, navigate]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [loadData, user]);

  useEffect(() => {
    if (!id) return;
    realtimeService.subscribeToWorkspace(id, loadData, loadData);
    return () => realtimeService.unsubscribe();
  }, [id, loadData]);

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || !id || !user) return;
    setUploading(true);
    const uploaderId = user.id;
    const uploaderName = user.user_metadata?.full_name || user.email || 'مستخدم';
    for (let i = 0; i < fileList.length; i++) {
      try {
        await fileService.upload(id, fileList[i], uploaderId, uploaderName);
      } catch { /* ignore individual failures */ }
    }
    setUploading(false);
    await loadData();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  };

  const handleDelete = async (file: WorkspaceFile) => {
    if (!user) return;
    await fileService.deleteFile(file, user.id);
    await loadData();
  };

  const handleDownload = async (file: WorkspaceFile) => {
    const url = await fileService.getDownloadUrl(file.storage_path);
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handlePreview = async (file: WorkspaceFile) => {
    const url = await fileService.getDownloadUrl(file.storage_path);
    if (url) {
      setPreviewUrl(url);
    }
  };

  const copyInviteLink = () => {
    if (!workspace) return;
    const link = `${window.location.origin}/join/${workspace.invite_token}`;
    navigator.clipboard.writeText(link);
  };

  const handleRegenerate = async () => {
    if (!id) return;
    const newToken = await workspaceService.regenerateInvite(id);
    setWorkspace((prev) => prev ? { ...prev, invite_token: newToken } : null);
  };

  const handleDeleteWorkspace = async () => {
    if (!id) return;
    if (!confirm('هل أنت متأكد من حذف هذه المساحة؟')) return;
    await workspaceService.deleteWorkspace(id);
    navigate('/dashboard');
  };

  if (authLoading || !workspace) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  const tabs: { key: Tab; icon: typeof FileText; label: string }[] = [
    { key: 'files', icon: FileText, label: 'الملفات' },
    { key: 'members', icon: Users, label: 'الأعضاء' },
    { key: 'activity', icon: Activity, label: 'السجل' },
    { key: 'settings', icon: Settings, label: 'الإعدادات' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 text-white" dir="rtl">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-white transition-colors">
              <ArrowRight className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 bg-indigo-500/20 rounded-lg flex items-center justify-center">
              <FolderOpen className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h1 className="font-bold">{workspace.name}</h1>
              {workspace.description && <p className="text-xs text-slate-400">{workspace.description}</p>}
            </div>
          </div>
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Link2 className="w-4 h-4" />
            دعوة
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="container mx-auto px-6 pt-4">
        <div className="flex gap-1 bg-slate-800/50 rounded-xl p-1 w-fit">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.key ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-6 py-6">
        {/* Files Tab */}
        {tab === 'files' && (
          <div>
            {/* Upload Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all mb-6 ${
                dragOver ? 'border-indigo-400 bg-indigo-500/10' : 'border-slate-600 hover:border-slate-500'
              }`}
            >
              <Upload className={`w-10 h-10 mx-auto mb-3 ${dragOver ? 'text-indigo-400' : 'text-slate-500'}`} />
              <p className="text-slate-300 font-medium">
                {uploading ? 'جاري الرفع...' : 'اسحب الملفات هنا أو انقر للاختيار'}
              </p>
              <p className="text-xs text-slate-500 mt-1">يدعم جميع أنواع الملفات</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleUpload(e.target.files)}
              />
            </div>

            {/* File List */}
            {files.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>لا توجد ملفات بعد</p>
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((file) => (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-8 h-8 text-indigo-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{file.name}</p>
                        <p className="text-xs text-slate-500">
                          {fileService.formatSize(file.size)} • {file.uploaded_by_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {fileService.canPreview(file.mime_type) && (
                        <button onClick={() => handlePreview(file)} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                          <Eye className="w-4 h-4 text-slate-300" />
                        </button>
                      )}
                      <button onClick={() => handleDownload(file)} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                        <Download className="w-4 h-4 text-slate-300" />
                      </button>
                      <button onClick={() => handleDelete(file)} className="p-2 hover:bg-red-500/20 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Members Tab */}
        {tab === 'members' && (
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-indigo-500/20 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{m.user_id?.slice(0, 8) || 'عضو'}</p>
                    <p className="text-xs text-slate-500">{m.role}</p>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full ${
                  m.role === 'owner' ? 'bg-amber-500/20 text-amber-300' :
                  m.role === 'admin' ? 'bg-indigo-500/20 text-indigo-300' :
                  'bg-green-500/20 text-green-300'
                }`}>
                  {m.role === 'owner' ? 'مالك' : m.role === 'admin' ? 'مشرف' : 'عضو'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Activity Tab */}
        {tab === 'activity' && (
          <div className="space-y-2">
            {logs.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>لا يوجد نشاط بعد</p>
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{log.action}</p>
                      {log.details && <p className="text-xs text-slate-400 mt-0.5">{log.details}</p>}
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(log.created_at).toLocaleDateString('ar')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Settings Tab */}
        {tab === 'settings' && (
          <div className="space-y-4 max-w-lg">
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
              <h3 className="font-semibold mb-3">رابط الدعوة</h3>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={`${window.location.origin}/join/${workspace.invite_token}`}
                  className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg py-2 px-3 text-sm text-slate-300"
                />
                <button onClick={copyInviteLink} className="p-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
                  <Copy className="w-4 h-4" />
                </button>
                <button onClick={handleRegenerate} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
              <h3 className="font-semibold text-red-300 mb-2">منطقة الخطر</h3>
              <p className="text-sm text-slate-400 mb-3">حذف المساحة سيؤدي لحذف جميع الملفات والبيانات نهائياً.</p>
              <button
                onClick={handleDeleteWorkspace}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                حذف المساحة
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">دعوة أعضاء</h3>
              <button onClick={() => setShowInvite(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-400 mb-4">شارك هذا الرابط مع من تريد دعوتهم:</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={`${window.location.origin}/join/${workspace.invite_token}`}
                className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg py-2.5 px-3 text-sm text-slate-300"
              />
              <button
                onClick={() => { copyInviteLink(); setShowInvite(false); }}
                className="bg-indigo-600 hover:bg-indigo-700 px-4 rounded-lg text-sm font-medium transition-colors"
              >
                نسخ
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
          <div className="max-w-4xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <img src={previewUrl} alt="preview" className="max-w-full rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
}