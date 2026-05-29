import {
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { uploadFileWithProgress } from '@/services/upload-service';
import { emitAuthExpired } from '@/components/providers/AuthProvider';
import {
  bytesFromMb,
  createNotification,
  ensureWorkspaceMember,
  generateInviteToken,
  getProfileById,
  inviteDoc,
  mapDoc,
  membersGroupCollection,
  nowIso,
  userDoc,
  userNotificationsCollection,
  workspaceAuditLogDoc,
  workspaceAuditLogsCollection,
  workspaceCommentDoc,
  workspaceCommentsCollection,
  workspaceDoc,
  workspaceFileDoc,
  workspaceFileVersionDoc,
  workspaceFileVersionsCollection,
  workspaceFilesCollection,
  workspaceMemberDoc,
  workspaceMembersCollection,
  workspaceToInviteDoc,
  workspacesCollection,
  type InviteDocument,
} from '@/lib/firebase-data';
import {
  AuditLog,
  FileComment,
  FileVersion,
  NotificationItem,
  PaginatedResult,
  Role,
  StorageInfo,
  Workspace,
  WorkspaceActivity,
  WorkspaceFile,
  WorkspaceInvitePreview,
  WorkspaceMember,
} from '@/types';

interface ServiceError extends Error {
  isAuthError?: boolean;
}

function createError(message: string, isAuthError = false): ServiceError {
  const error = new Error(message) as ServiceError;
  error.isAuthError = isAuthError;
  return error;
}

async function getCurrentUser() {
  const user = auth.currentUser;
  if (!user) {
    emitAuthExpired();
    throw createError('يجب تسجيل الدخول أولاً', true);
  }
  return user;
}

async function getCurrentProfile() {
  const user = await getCurrentUser();
  const profile = await getProfileById(user.uid);
  return {
    id: user.uid,
    email: user.email,
    full_name: profile?.full_name || user.displayName || user.email?.split('@')[0] || 'مستخدم',
    avatar_url: profile?.avatar_url || user.photoURL || undefined,
  };
}

function getActorName(profile: { full_name?: string | null; email?: string | null }) {
  return profile.full_name || profile.email || 'مستخدم';
}

function buildPagination(page: number, limit: number, total: number) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

function paginateArray<T>(items: T[], page: number, limit: number): PaginatedResult<T> {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const start = (safePage - 1) * safeLimit;
  const data = items.slice(start, start + safeLimit);
  return {
    data,
    pagination: buildPagination(safePage, safeLimit, items.length),
  };
}

function sortByCreatedDesc<T extends { created_at: string }>(items: T[]) {
  return [...items].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

async function getWorkspaceOrThrow(workspaceId: string): Promise<Workspace> {
  const snapshot = await getDoc(workspaceDoc(workspaceId));
  if (!snapshot.exists()) {
    throw createError('مساحة العمل غير موجودة');
  }
  return mapDoc<Workspace>(snapshot);
}

async function getMemberOrThrow(workspaceId: string, userId: string): Promise<WorkspaceMember> {
  const snapshot = await getDoc(workspaceMemberDoc(workspaceId, userId));
  if (!snapshot.exists()) {
    throw createError('لا تملك صلاحية الوصول إلى هذه المساحة');
  }
  return mapDoc<WorkspaceMember>(snapshot);
}

async function ensureWorkspaceAccess(workspaceId: string): Promise<{ workspace: Workspace; membership: WorkspaceMember }> {
  const user = await getCurrentUser();
  const [workspace, membership] = await Promise.all([
    getWorkspaceOrThrow(workspaceId),
    getMemberOrThrow(workspaceId, user.uid),
  ]);
  return { workspace, membership };
}

async function getCurrentUserMembershipRole(workspaceId: string): Promise<Role | undefined> {
  const user = await getCurrentUser();
  const snapshot = await getDoc(workspaceMemberDoc(workspaceId, user.uid));
  if (!snapshot.exists()) return undefined;
  return snapshot.data().role as Role | undefined;
}

function ensureCanWriteFiles(role?: Role) {
  if (!role || role === 'viewer' || role === 'guest') {
    throw createError('لا تملك صلاحية تعديل الملفات');
  }
}

function validateInvite(invite: InviteDocument | null | undefined) {
  if (!invite || invite.active === false) {
    throw createError('رابط الدعوة غير صالح أو منتهي الصلاحية');
  }

  if (invite.invite_expires_at && new Date(invite.invite_expires_at).getTime() < Date.now()) {
    throw createError('انتهت صلاحية رابط الدعوة');
  }

  const usedCount = invite.invite_used_count || 0;
  if (invite.invite_single_use && usedCount >= 1) {
    throw createError('تم استخدام رابط الدعوة مسبقاً');
  }

  if (invite.invite_max_uses && usedCount >= invite.invite_max_uses) {
    throw createError('تم الوصول إلى الحد الأقصى لاستخدامات رابط الدعوة');
  }
}

async function logAudit(
  workspaceId: string,
  userId: string | null,
  userName: string,
  action: string,
  details?: string
) {
  try {
    const logRef = doc(workspaceAuditLogsCollection(workspaceId));
    await setDoc(logRef, {
      workspace_id: workspaceId,
      user_id: userId,
      user_name: userName,
      action,
      details: details || '',
      created_at: nowIso(),
    });
  } catch {
    // never block main flow on audit failure
  }
}

async function getWorkspaceMembersRaw(workspaceId: string) {
  const snapshots = await getDocs(query(workspaceMembersCollection(workspaceId), orderBy('joined_at', 'asc')));
  return snapshots.docs.map((snapshot) => mapDoc<WorkspaceMember>(snapshot));
}

async function notifyUsers(userIds: string[], build: (userId: string) => Omit<NotificationItem, 'id' | 'created_at' | 'read'>) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueIds.length === 0) return;

  const batch = writeBatch(db);
  for (const userId of uniqueIds) {
    const notificationRef = doc(userNotificationsCollection(userId));
    batch.set(notificationRef, createNotification(build(userId)));
  }
  await batch.commit();
}

async function notifyWorkspaceMembers(
  workspaceId: string,
  actorUserId: string,
  type: NotificationItem['type'],
  title: string,
  message: string,
  data: Record<string, unknown> = {}
) {
  try {
    const members = await getWorkspaceMembersRaw(workspaceId);
    const targetUserIds = members
      .map((member) => member.user_id)
      .filter((userId): userId is string => Boolean(userId && userId !== actorUserId));

    await notifyUsers(targetUserIds, (userId) => ({
      user_id: userId,
      workspace_id: workspaceId,
      type,
      title,
      message,
      data,
    }));
  } catch {
    // ignore notification failures
  }
}

async function notifySpecificUser(
  userId: string,
  workspaceId: string,
  type: NotificationItem['type'],
  title: string,
  message: string,
  data: Record<string, unknown> = {}
) {
  await notifyUsers([userId], (targetId) => ({
    user_id: targetId,
    workspace_id: workspaceId,
    type,
    title,
    message,
    data,
  }));
}

async function getCurrentUserIdToken() {
  const user = await getCurrentUser();
  return user.getIdToken();
}

async function uploadToStorage(
  workspaceId: string,
  file: File,
  options: {
    onProgress?: (percentage: number) => void;
    onStageChange?: (stage: 'preparing' | 'uploading' | 'finalizing') => void;
    signal?: AbortSignal;
    displayName?: string;
    description?: string;
    operation?: 'create' | 'version';
    fileId?: string;
  } = {}
) {
  return uploadFileWithProgress(workspaceId, file, options);
}

async function deleteBlobUrls(urls: string[]) {
  const cleanUrls = [...new Set(urls.filter(Boolean))];
  if (cleanUrls.length === 0) return;

  const token = await getCurrentUserIdToken();
  const response = await fetch('/api/blob/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ urls: cleanUrls }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'تعذر حذف الملف من التخزين');
  }
}

async function deleteStoragePath(path: string) {
  try {
    await deleteBlobUrls([path]);
  } catch {
    // ignore missing object failures
  }
}

async function getStorageInfoDirect(workspaceId: string): Promise<StorageInfo> {
  const workspace = await getWorkspaceOrThrow(workspaceId);
  const snapshots = await getDocs(workspaceFilesCollection(workspaceId));
  const used = snapshots.docs.reduce((sum, snapshot) => sum + Number(snapshot.data().size || 0), 0);
  const max = bytesFromMb(workspace.max_storage_mb || 0);
  return {
    used,
    max,
    percentage: max > 0 ? (used / max) * 100 : 0,
  };
}

async function getWorkspaceFileOrThrow(workspaceId: string, fileId: string): Promise<WorkspaceFile> {
  const snapshot = await getDoc(workspaceFileDoc(workspaceId, fileId));
  if (!snapshot.exists()) throw createError('الملف غير موجود');
  return mapDoc<WorkspaceFile>(snapshot);
}

async function getHighestVersionNumber(workspaceId: string, fileId: string) {
  const snapshots = await getDocs(query(workspaceFileVersionsCollection(workspaceId), where('file_id', '==', fileId)));
  return snapshots.docs.reduce((max, snapshot) => Math.max(max, Number(snapshot.data().version_number || 0)), 0);
}

async function deleteDocsByChunks(paths: Array<{ type: 'doc'; ref: ReturnType<typeof doc> }>) {
  for (let i = 0; i < paths.length; i += 400) {
    const batch = writeBatch(db);
    for (const item of paths.slice(i, i + 400)) {
      batch.delete(item.ref);
    }
    await batch.commit();
  }
}

async function getWorkspaceIdsForCurrentUser() {
  const user = await getCurrentUser();
  const membershipSnapshots = await getDocs(query(membersGroupCollection(), where('user_id', '==', user.uid)));
  return [...new Set(membershipSnapshots.docs.map((snapshot) => snapshot.data().workspace_id as string).filter(Boolean))];
}

export const supabaseWorkspaceService = {
  async listForCurrentUser(): Promise<Workspace[]> {
    const workspaceIds = await getWorkspaceIdsForCurrentUser();
    const snapshots = await Promise.all(workspaceIds.map((workspaceId) => getDoc(workspaceDoc(workspaceId))));
    return snapshots
      .filter((snapshot) => snapshot.exists())
      .map((snapshot) => mapDoc<Workspace>(snapshot))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async getRecentActivity(limit = 10): Promise<WorkspaceActivity[]> {
    const workspaceIds = await getWorkspaceIdsForCurrentUser();
    const results = await Promise.all(
      workspaceIds.map(async (workspaceId) => {
        const [workspaceSnapshot, logsSnapshot] = await Promise.all([
          getDoc(workspaceDoc(workspaceId)),
          getDocs(query(workspaceAuditLogsCollection(workspaceId), orderBy('created_at', 'desc'), firestoreLimit(limit))),
        ]);

        if (!workspaceSnapshot.exists()) return [] as WorkspaceActivity[];
        const workspace = mapDoc<Workspace>(workspaceSnapshot);

        return logsSnapshot.docs.map((snapshot) => ({
          ...mapDoc<AuditLog>(snapshot),
          workspace_name: workspace.name,
        }));
      })
    );

    return sortByCreatedDesc(results.flat()).slice(0, limit);
  },

  async create(name: string, description: string, subject?: string | null): Promise<Workspace> {
    const user = await getCurrentUser();
    const profile = await getCurrentProfile();
    const workspaceId = doc(workspacesCollection()).id;
    const token = generateInviteToken();
    const timestamp = nowIso();

    const workspace: Workspace = {
      id: workspaceId,
      name: name.trim(),
      description: description?.trim() || '',
      subject: subject?.trim() || null,
      owner_id: user.uid,
      invite_token: token,
      max_storage_mb: 500,
      invite_max_uses: null,
      invite_used_count: 0,
      invite_expires_at: null,
      invite_single_use: false,
      created_at: timestamp,
      updated_at: timestamp,
    };

    const member = ensureWorkspaceMember(workspaceId, user.uid, user.email, profile.full_name, 'owner');
    const batch = writeBatch(db);

    batch.set(workspaceDoc(workspaceId), workspace);
    batch.set(workspaceMemberDoc(workspaceId, user.uid), member);
    batch.set(inviteDoc(token), workspaceToInviteDoc(workspace));
    batch.set(workspaceAuditLogDoc(workspaceId, doc(workspaceAuditLogsCollection(workspaceId)).id), {
      workspace_id: workspaceId,
      user_id: user.uid,
      user_name: getActorName(profile),
      action: 'إنشاء مساحة عمل',
      details: `تم إنشاء مساحة العمل "${workspace.name}"`,
      created_at: timestamp,
    });

    await batch.commit();
    return workspace;
  },

  async getById(id: string): Promise<Workspace> {
    await ensureWorkspaceAccess(id);
    return getWorkspaceOrThrow(id);
  },

  async getInvitePreview(token: string): Promise<WorkspaceInvitePreview> {
    const snapshot = await getDoc(inviteDoc(token));
    if (!snapshot.exists()) {
      throw createError('رابط الدعوة غير صالح أو منتهي الصلاحية');
    }

    const invite = mapDoc<InviteDocument>(snapshot);
    validateInvite(invite);

    return {
      id: invite.workspace_id,
      name: invite.name,
      description: invite.description,
      subject: invite.subject,
      invite_token: invite.invite_token,
    };
  },

  async joinByInviteToken(token: string): Promise<Workspace> {
    const user = await getCurrentUser();
    const profile = await getCurrentProfile();

    const joinedWorkspace = await runTransaction(db, async (transaction) => {
      const inviteSnapshot = await transaction.get(inviteDoc(token));
      if (!inviteSnapshot.exists()) {
        throw createError('رابط الدعوة غير صالح أو منتهي الصلاحية');
      }

      const invite = mapDoc<InviteDocument>(inviteSnapshot);
      validateInvite(invite);

      const workspaceSnapshot = await transaction.get(workspaceDoc(invite.workspace_id));
      if (!workspaceSnapshot.exists()) {
        throw createError('مساحة العمل غير موجودة');
      }

      const workspace = mapDoc<Workspace>(workspaceSnapshot);
      const memberRef = workspaceMemberDoc(workspace.id, user.uid);
      const memberSnapshot = await transaction.get(memberRef);

      if (!memberSnapshot.exists()) {
        transaction.set(memberRef, ensureWorkspaceMember(workspace.id, user.uid, user.email, profile.full_name, 'member'));
        transaction.update(workspaceDoc(workspace.id), {
          invite_used_count: (workspace.invite_used_count || 0) + 1,
          updated_at: nowIso(),
        });
        transaction.update(inviteDoc(token), {
          invite_used_count: (invite.invite_used_count || 0) + 1,
          updated_at: nowIso(),
        });
        transaction.set(workspaceAuditLogDoc(workspace.id, doc(workspaceAuditLogsCollection(workspace.id)).id), {
          workspace_id: workspace.id,
          user_id: user.uid,
          user_name: getActorName(profile),
          action: 'انضمام عضو جديد',
          details: `انضم ${getActorName(profile)} إلى المساحة`,
          created_at: nowIso(),
        });
      }

      return {
        ...workspace,
        invite_used_count: memberSnapshot.exists() ? workspace.invite_used_count : (workspace.invite_used_count || 0) + 1,
      } as Workspace;
    });

    await notifyWorkspaceMembers(
      joinedWorkspace.id,
      user.uid,
      'member_joined',
      'عضو جديد',
      `انضم ${getActorName(profile)} إلى مساحة العمل`,
      { workspace_id: joinedWorkspace.id, joined_user_id: user.uid }
    ).catch(() => undefined);

    return joinedWorkspace;
  },

  async getMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    const user = await getCurrentUser();
    await ensureWorkspaceAccess(workspaceId);
    const members = await getWorkspaceMembersRaw(workspaceId);
    return members.map((member) => ({
      ...member,
      is_current_user: member.user_id === user.uid,
    }));
  },

  async updateMemberRole(workspaceId: string, memberId: string, role: Role): Promise<WorkspaceMember> {
    const user = await getCurrentUser();
    const profile = await getCurrentProfile();
    const currentRole = await getCurrentUserMembershipRole(workspaceId);

    if (!currentRole || !['owner', 'admin'].includes(currentRole)) {
      throw createError('لا تملك صلاحية تعديل الأدوار');
    }

    const targetSnapshot = await getDoc(workspaceMemberDoc(workspaceId, memberId));
    if (!targetSnapshot.exists()) throw createError('العضو غير موجود');

    const targetMember = mapDoc<WorkspaceMember>(targetSnapshot);
    if (targetMember.role === 'owner') throw createError('لا يمكن تعديل دور المالك');
    if (targetMember.user_id === user.uid) throw createError('لا يمكنك تعديل دورك من هذه الواجهة');
    if (currentRole === 'admin' && targetMember.role === 'admin') {
      throw createError('المشرف لا يمكنه تعديل دور مشرف آخر');
    }

    const updated: WorkspaceMember = {
      ...targetMember,
      role,
    };

    await updateDoc(workspaceMemberDoc(workspaceId, memberId), { role });
    await logAudit(
      workspaceId,
      user.uid,
      getActorName(profile),
      'تغيير دور عضو',
      `تم تغيير دور ${targetMember.display_name || targetMember.email || 'عضو'} إلى ${role}`
    );

    if (targetMember.user_id) {
      await notifySpecificUser(
        targetMember.user_id,
        workspaceId,
        'role_changed',
        'تغيير صلاحياتك',
        `تم تغيير دورك في المساحة إلى ${role}`,
        { role }
      ).catch(() => undefined);
    }

    return updated;
  },

  async removeMember(workspaceId: string, memberId: string): Promise<void> {
    const user = await getCurrentUser();
    const profile = await getCurrentProfile();
    const currentRole = await getCurrentUserMembershipRole(workspaceId);

    if (!currentRole || !['owner', 'admin'].includes(currentRole)) {
      throw createError('لا تملك صلاحية إزالة الأعضاء');
    }

    const targetSnapshot = await getDoc(workspaceMemberDoc(workspaceId, memberId));
    if (!targetSnapshot.exists()) throw createError('العضو غير موجود');

    const targetMember = mapDoc<WorkspaceMember>(targetSnapshot);
    if (targetMember.role === 'owner') throw createError('لا يمكن إزالة مالك المساحة');
    if (targetMember.user_id === user.uid) throw createError('لا يمكنك إزالة نفسك من هذه الواجهة');
    if (currentRole === 'admin' && targetMember.role === 'admin') {
      throw createError('المشرف لا يمكنه إزالة مشرف آخر');
    }

    await deleteDoc(workspaceMemberDoc(workspaceId, memberId));
    await logAudit(
      workspaceId,
      user.uid,
      getActorName(profile),
      'إزالة عضو',
      `تمت إزالة ${targetMember.display_name || targetMember.email || 'عضو'} من المساحة`
    );

    if (targetMember.user_id) {
      await notifySpecificUser(
        targetMember.user_id,
        workspaceId,
        'member_removed',
        'تمت إزالتك من المساحة',
        'تمت إزالة عضويتك من مساحة العمل',
        {}
      ).catch(() => undefined);
    }
  },

  async getFiles(
    id: string,
    options?: { page?: number; limit?: number; search?: string }
  ): Promise<PaginatedResult<WorkspaceFile>> {
    await ensureWorkspaceAccess(id);
    const snapshots = await getDocs(query(workspaceFilesCollection(id), orderBy('created_at', 'desc')));
    let files = snapshots.docs.map((snapshot) => mapDoc<WorkspaceFile>(snapshot));

    if (options?.search?.trim()) {
      const search = options.search.trim().toLowerCase();
      files = files.filter((file) => file.name.toLowerCase().includes(search));
    }

    return paginateArray(files, options?.page || 1, options?.limit || 12);
  },

  async getFileById(workspaceId: string, fileId: string): Promise<WorkspaceFile> {
    await ensureWorkspaceAccess(workspaceId);
    return getWorkspaceFileOrThrow(workspaceId, fileId);
  },

  async uploadFile(
    workspaceId: string,
    file: File,
    options: {
      displayName?: string;
      description?: string;
      onProgress?: (percentage: number) => void;
      onStageChange?: (stage: 'preparing' | 'uploading' | 'finalizing') => void;
      signal?: AbortSignal;
    } = {}
  ): Promise<WorkspaceFile> {
    const user = await getCurrentUser();
    const profile = await getCurrentProfile();
    const role = await getCurrentUserMembershipRole(workspaceId);
    ensureCanWriteFiles(role);

    const storageInfo = await getStorageInfoDirect(workspaceId);
    if (storageInfo.max > 0 && storageInfo.used + file.size > storageInfo.max) {
      throw createError('المساحة المتبقية لا تكفي لرفع هذا الملف');
    }

    const result = await uploadToStorage(workspaceId, file, {
      displayName: options.displayName,
      description: options.description,
      onProgress: options.onProgress,
      onStageChange: options.onStageChange,
      signal: options.signal,
      operation: 'create',
    });

    const workspaceFile = result.file;

    await logAudit(workspaceId, user.uid, getActorName(profile), 'رفع ملف', `تم رفع "${workspaceFile.name}"`);
    await notifyWorkspaceMembers(
      workspaceId,
      user.uid,
      'file_uploaded',
      'تم رفع ملف جديد',
      `قام ${getActorName(profile)} برفع الملف "${workspaceFile.name}"`,
      { file_id: workspaceFile.id, file_name: workspaceFile.name }
    ).catch(() => undefined);

    options.onProgress?.(100);
    return workspaceFile;
  },

  async updateFile(
    workspaceId: string,
    fileId: string,
    updates: { name?: string; description?: string }
  ): Promise<WorkspaceFile> {
    const role = await getCurrentUserMembershipRole(workspaceId);
    ensureCanWriteFiles(role);

    const file = await getWorkspaceFileOrThrow(workspaceId, fileId);
    const payload: Partial<WorkspaceFile> = {};
    if (typeof updates.name === 'string') payload.name = updates.name.trim() || file.name;
    if (typeof updates.description === 'string') payload.description = updates.description;

    await updateDoc(workspaceFileDoc(workspaceId, fileId), payload);
    return {
      ...file,
      ...payload,
    };
  },

  async getFileVersions(workspaceId: string, fileId: string): Promise<FileVersion[]> {
    await ensureWorkspaceAccess(workspaceId);
    const currentFile = await getWorkspaceFileOrThrow(workspaceId, fileId);
    const snapshots = await getDocs(query(
      workspaceFileVersionsCollection(workspaceId),
      where('file_id', '==', fileId),
      orderBy('version_number', 'desc')
    ));

    const archivedVersions = snapshots.docs.map((snapshot) => mapDoc<FileVersion>(snapshot));
    const currentVersionNumber = Math.max(...archivedVersions.map((item) => item.version_number), 0) + 1;

    return [
      {
        id: currentFile.id,
        file_id: currentFile.id,
        workspace_id: currentFile.workspace_id,
        version_number: currentVersionNumber,
        name: currentFile.name,
        size: currentFile.size,
        mime_type: currentFile.mime_type,
        storage_path: currentFile.storage_path,
        uploaded_by: currentFile.uploaded_by,
        uploaded_by_name: currentFile.uploaded_by_name,
        created_at: currentFile.created_at,
        is_current: true,
      },
      ...archivedVersions.map((item) => ({ ...item, is_current: false })),
    ];
  },

  async uploadFileVersion(
    workspaceId: string,
    fileId: string,
    file: File,
    onProgress?: (percentage: number) => void,
    signal?: AbortSignal
  ): Promise<WorkspaceFile> {
    const user = await getCurrentUser();
    const profile = await getCurrentProfile();
    const role = await getCurrentUserMembershipRole(workspaceId);
    ensureCanWriteFiles(role);

    const currentFile = await getWorkspaceFileOrThrow(workspaceId, fileId);
    const result = await uploadToStorage(workspaceId, file, {
      onProgress,
      signal,
      operation: 'version',
      fileId,
    });

    const updatedFile = result.file;

    await logAudit(
      workspaceId,
      user.uid,
      getActorName(profile),
      'رفع نسخة جديدة',
      `تم رفع نسخة جديدة للملف "${currentFile.name}"`
    );
    await notifyWorkspaceMembers(
      workspaceId,
      user.uid,
      'file_version_uploaded',
      'نسخة جديدة من ملف',
      `قام ${getActorName(profile)} برفع نسخة جديدة من الملف "${currentFile.name}"`,
      { file_id: fileId, file_name: currentFile.name }
    ).catch(() => undefined);

    onProgress?.(100);
    return updatedFile;
  },

  async getFileComments(
    workspaceId: string,
    fileId: string,
    options?: { page?: number; limit?: number }
  ): Promise<PaginatedResult<FileComment>> {
    await ensureWorkspaceAccess(workspaceId);
    const snapshots = await getDocs(query(
      workspaceCommentsCollection(workspaceId),
      where('file_id', '==', fileId),
      orderBy('created_at', 'desc')
    ));
    const comments = snapshots.docs.map((snapshot) => mapDoc<FileComment>(snapshot));
    return paginateArray(comments, options?.page || 1, options?.limit || 20);
  },

  async addFileComment(
    workspaceId: string,
    fileId: string,
    content: string,
    parentId?: string
  ): Promise<FileComment> {
    const user = await getCurrentUser();
    const profile = await getCurrentProfile();
    const role = await getCurrentUserMembershipRole(workspaceId);
    ensureCanWriteFiles(role);

    const commentRef = workspaceCommentDoc(workspaceId, doc(workspaceCommentsCollection(workspaceId)).id);
    const comment: FileComment = {
      id: commentRef.id,
      file_id: fileId,
      workspace_id: workspaceId,
      user_id: user.uid,
      user_name: getActorName(profile),
      content,
      parent_id: parentId || null,
      created_at: nowIso(),
      updated_at: nowIso(),
    };

    await setDoc(commentRef, comment);
    await logAudit(workspaceId, user.uid, getActorName(profile), 'إضافة تعليق', 'تمت إضافة تعليق جديد على ملف داخل المساحة');

    const file = await getWorkspaceFileOrThrow(workspaceId, fileId).catch(() => null);
    const targetUserIds = new Set<string>();
    if (file?.uploaded_by && file.uploaded_by !== user.uid) targetUserIds.add(file.uploaded_by);

    await notifyUsers([...targetUserIds], (targetId) => ({
      user_id: targetId,
      workspace_id: workspaceId,
      type: 'comment_added',
      title: 'تعليق جديد على ملفك',
      message: `أضاف ${getActorName(profile)} تعليقاً على الملف "${file?.name || 'ملف'}"`,
      data: { file_id: fileId },
    })).catch(() => undefined);

    return comment;
  },

  async getActivity(id: string, options?: { page?: number; limit?: number }): Promise<PaginatedResult<AuditLog>> {
    await ensureWorkspaceAccess(id);
    const snapshots = await getDocs(query(workspaceAuditLogsCollection(id), orderBy('created_at', 'desc')));
    const logs = snapshots.docs.map((snapshot) => mapDoc<AuditLog>(snapshot));
    return paginateArray(logs, options?.page || 1, options?.limit || 10);
  },

  async getStorage(id: string): Promise<StorageInfo> {
    await ensureWorkspaceAccess(id);
    return getStorageInfoDirect(id);
  },

  async updateWorkspace(
    id: string,
    updates: {
      name: string;
      description: string;
      max_storage_mb: number;
      subject?: string | null;
      invite_single_use?: boolean;
      invite_max_uses?: number | null;
      invite_expires_at?: string | null;
    }
  ): Promise<Workspace> {
    const user = await getCurrentUser();
    const profile = await getCurrentProfile();
    const currentRole = await getCurrentUserMembershipRole(id);
    if (!currentRole || !['owner', 'admin'].includes(currentRole)) {
      throw createError('لا تملك صلاحية تعديل إعدادات المساحة');
    }

    const workspace = await getWorkspaceOrThrow(id);
    const isOwner = workspace.owner_id === user.uid;

    const payload: Partial<Workspace> = {
      name: updates.name,
      description: updates.description,
      subject: updates.subject ? String(updates.subject).trim() || null : null,
      updated_at: nowIso(),
    };

    if (isOwner) {
      payload.max_storage_mb = updates.max_storage_mb;
      payload.invite_single_use = updates.invite_single_use ?? false;
      payload.invite_max_uses = updates.invite_max_uses ?? null;
      payload.invite_expires_at = updates.invite_expires_at ?? null;
    }

    const updatedWorkspace: Workspace = {
      ...workspace,
      ...payload,
    };

    const batch = writeBatch(db);
    batch.set(workspaceDoc(id), updatedWorkspace);
    batch.set(inviteDoc(updatedWorkspace.invite_token), workspaceToInviteDoc(updatedWorkspace));
    await batch.commit();

    await logAudit(id, user.uid, getActorName(profile), 'تحديث إعدادات المساحة', 'تم تعديل إعدادات المساحة');
    return updatedWorkspace;
  },

  async regenerateInvite(id: string): Promise<{ invite_token: string }> {
    const user = await getCurrentUser();
    const profile = await getCurrentProfile();
    const workspace = await getWorkspaceOrThrow(id);

    if (workspace.owner_id !== user.uid) {
      throw createError('لا تملك صلاحية إعادة توليد رابط الدعوة');
    }

    const newToken = generateInviteToken();
    const updatedWorkspace: Workspace = {
      ...workspace,
      invite_token: newToken,
      invite_used_count: 0,
      updated_at: nowIso(),
    };

    const batch = writeBatch(db);
    batch.set(workspaceDoc(id), updatedWorkspace);
    batch.set(inviteDoc(newToken), workspaceToInviteDoc(updatedWorkspace));
    batch.delete(inviteDoc(workspace.invite_token));
    await batch.commit();

    await logAudit(id, user.uid, getActorName(profile), 'تجديد رابط الدعوة', 'تم إنشاء رابط دعوة جديد');
    await notifyWorkspaceMembers(
      id,
      user.uid,
      'invite_regenerated',
      'تم تجديد رابط الدعوة',
      `قام ${getActorName(profile)} بتجديد رابط الدعوة الخاص بالمساحة`,
      {}
    ).catch(() => undefined);

    return { invite_token: newToken };
  },

  async deleteWorkspace(id: string): Promise<void> {
    const user = await getCurrentUser();
    const workspace = await getWorkspaceOrThrow(id);
    if (workspace.owner_id !== user.uid) {
      throw createError('لا تملك صلاحية حذف مساحة العمل');
    }

    const [members, files, versions, comments, logs] = await Promise.all([
      getDocs(workspaceMembersCollection(id)),
      getDocs(workspaceFilesCollection(id)),
      getDocs(workspaceFileVersionsCollection(id)),
      getDocs(workspaceCommentsCollection(id)),
      getDocs(workspaceAuditLogsCollection(id)),
    ]);

    const blobUrls = [
      ...files.docs.map((snapshot) => String(snapshot.data().storage_path || '')),
      ...versions.docs.map((snapshot) => String(snapshot.data().storage_path || '')),
    ].filter(Boolean);

    await deleteBlobUrls(blobUrls).catch(() => undefined);

    await deleteDocsByChunks([
      ...members.docs.map((snapshot) => ({ type: 'doc' as const, ref: snapshot.ref })),
      ...files.docs.map((snapshot) => ({ type: 'doc' as const, ref: snapshot.ref })),
      ...versions.docs.map((snapshot) => ({ type: 'doc' as const, ref: snapshot.ref })),
      ...comments.docs.map((snapshot) => ({ type: 'doc' as const, ref: snapshot.ref })),
      ...logs.docs.map((snapshot) => ({ type: 'doc' as const, ref: snapshot.ref })),
      { type: 'doc' as const, ref: inviteDoc(workspace.invite_token) },
      { type: 'doc' as const, ref: workspaceDoc(id) },
    ]);
  },

  async deleteFile(workspaceId: string, fileId: string): Promise<void> {
    const user = await getCurrentUser();
    const profile = await getCurrentProfile();
    const role = await getCurrentUserMembershipRole(workspaceId);
    ensureCanWriteFiles(role);

    const file = await getWorkspaceFileOrThrow(workspaceId, fileId);
    await deleteStoragePath(file.storage_path);
    await deleteDoc(workspaceFileDoc(workspaceId, fileId));
    await logAudit(workspaceId, user.uid, getActorName(profile), 'حذف ملف', `تم حذف "${file.name}"`);
    await notifyWorkspaceMembers(
      workspaceId,
      user.uid,
      'file_deleted',
      'تم حذف ملف',
      `قام ${getActorName(profile)} بحذف الملف "${file.name}"`,
      { file_id: fileId, file_name: file.name }
    ).catch(() => undefined);
  },
};

export const supabaseNotificationsService = {
  async list(options?: { page?: number; limit?: number; unreadOnly?: boolean }): Promise<{
    data: NotificationItem[];
    pagination: ReturnType<typeof buildPagination>;
    unreadCount: number;
  }> {
    const user = await getCurrentUser();
    const snapshots = await getDocs(query(userNotificationsCollection(user.uid), orderBy('created_at', 'desc')));
    let notifications = snapshots.docs.map((snapshot) => mapDoc<NotificationItem>(snapshot));

    const unreadCount = notifications.filter((item) => !item.read).length;
    if (options?.unreadOnly) {
      notifications = notifications.filter((item) => !item.read);
    }

    const paginated = paginateArray(notifications, options?.page || 1, options?.limit || 8);
    return {
      data: paginated.data,
      pagination: paginated.pagination,
      unreadCount,
    };
  },

  async markAsRead(notificationId: string): Promise<number> {
    const user = await getCurrentUser();
    await updateDoc(doc(userNotificationsCollection(user.uid), notificationId), { read: true });

    const snapshots = await getDocs(userNotificationsCollection(user.uid));
    return snapshots.docs.filter((snapshot) => !snapshot.data().read).length;
  },

  async markAllAsRead(): Promise<number> {
    const user = await getCurrentUser();
    const snapshots = await getDocs(query(userNotificationsCollection(user.uid), where('read', '==', false)));

    for (let i = 0; i < snapshots.docs.length; i += 400) {
      const batch = writeBatch(db);
      for (const snapshot of snapshots.docs.slice(i, i + 400)) {
        batch.update(snapshot.ref, { read: true });
      }
      await batch.commit();
    }

    return 0;
  },
};

export async function deleteCurrentUserData() {
  const user = await getCurrentUser();
  const membershipSnapshots = await getDocs(query(membersGroupCollection(), where('user_id', '==', user.uid)));

  const ownedWorkspaceIds = membershipSnapshots.docs
    .filter((snapshot) => snapshot.data().role === 'owner')
    .map((snapshot) => snapshot.data().workspace_id as string);

  for (const workspaceId of ownedWorkspaceIds) {
    await supabaseWorkspaceService.deleteWorkspace(workspaceId);
  }

  const otherMemberships = membershipSnapshots.docs.filter((snapshot) => snapshot.data().role !== 'owner');
  await deleteDocsByChunks(otherMemberships.map((snapshot) => ({ type: 'doc' as const, ref: snapshot.ref })));

  const notifications = await getDocs(userNotificationsCollection(user.uid));
  await deleteDocsByChunks([
    ...notifications.docs.map((snapshot) => ({ type: 'doc' as const, ref: snapshot.ref })),
    { type: 'doc' as const, ref: userDoc(user.uid) },
  ]);
}

export async function getCurrentUserStats(userId: string): Promise<{
  workspacesCount: number;
  filesCount: number;
  totalStorage: number;
}> {
  const membershipSnapshots = await getDocs(query(membersGroupCollection(), where('user_id', '==', userId)));
  const workspaceIds = membershipSnapshots.docs.map((snapshot) => snapshot.data().workspace_id as string).filter(Boolean);

  const fileSnapshots = await Promise.all(workspaceIds.map((workspaceId) => getDocs(workspaceFilesCollection(workspaceId))));
  const files = fileSnapshots.flatMap((snapshot) => snapshot.docs.map((docSnap) => docSnap.data()));

  return {
    workspacesCount: workspaceIds.length,
    filesCount: files.length,
    totalStorage: files.reduce((sum, file) => sum + Number(file.size || 0), 0),
  };
}

export async function getFileDownloadUrl(storagePath: string): Promise<string> {
  return storagePath;
}
