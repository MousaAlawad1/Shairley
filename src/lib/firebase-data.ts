import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  type CollectionReference,
  type DocumentData,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
  AuditLog,
  FileComment,
  FileVersion,
  NotificationItem,
  Profile,
  Workspace,
  WorkspaceFile,
  WorkspaceInvitePreview,
  WorkspaceMember,
} from '@/types';

export const nowIso = () => new Date().toISOString();

export const bytesFromMb = (mb: number) => Math.max(0, Math.round(mb * 1024 * 1024));

export const generateInviteToken = () =>
  Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8);

export const usersCollection = () => collection(db, 'users');
export const userDoc = (userId: string) => doc(db, 'users', userId);
export const userNotificationsCollection = (userId: string) => collection(db, 'users', userId, 'notifications');

export const workspacesCollection = () => collection(db, 'workspaces');
export const workspaceDoc = (workspaceId: string) => doc(db, 'workspaces', workspaceId);
export const workspaceMembersCollection = (workspaceId: string) => collection(db, 'workspaces', workspaceId, 'members');
export const workspaceMemberDoc = (workspaceId: string, userId: string) => doc(db, 'workspaces', workspaceId, 'members', userId);
export const workspaceFilesCollection = (workspaceId: string) => collection(db, 'workspaces', workspaceId, 'files');
export const workspaceFileDoc = (workspaceId: string, fileId: string) => doc(db, 'workspaces', workspaceId, 'files', fileId);
export const workspaceFileVersionsCollection = (workspaceId: string) => collection(db, 'workspaces', workspaceId, 'file_versions');
export const workspaceFileVersionDoc = (workspaceId: string, versionId: string) => doc(db, 'workspaces', workspaceId, 'file_versions', versionId);
export const workspaceCommentsCollection = (workspaceId: string) => collection(db, 'workspaces', workspaceId, 'file_comments');
export const workspaceCommentDoc = (workspaceId: string, commentId: string) => doc(db, 'workspaces', workspaceId, 'file_comments', commentId);
export const workspaceAuditLogsCollection = (workspaceId: string) => collection(db, 'workspaces', workspaceId, 'audit_logs');
export const workspaceAuditLogDoc = (workspaceId: string, logId: string) => doc(db, 'workspaces', workspaceId, 'audit_logs', logId);

export const invitesCollection = () => collection(db, 'invites');
export const inviteDoc = (token: string) => doc(db, 'invites', token);

export const membersGroupCollection = () => collectionGroup(db, 'members');

export function mapDoc<T>(snapshot: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>): T {
  return {
    id: snapshot.id,
    ...(snapshot.data() || {}),
  } as T;
}

export function mapDocs<T>(snapshots: QueryDocumentSnapshot<DocumentData>[]): T[] {
  return snapshots.map((snapshot) => mapDoc<T>(snapshot));
}

export interface InviteDocument extends WorkspaceInvitePreview {
  workspace_id: string;
  invite_max_uses?: number | null;
  invite_used_count?: number;
  invite_expires_at?: string | null;
  invite_single_use?: boolean;
  active?: boolean;
  created_at: string;
  updated_at: string;
}

export async function getProfileById(userId: string): Promise<Profile | null> {
  const snapshot = await getDoc(userDoc(userId));
  if (!snapshot.exists()) return null;
  return mapDoc<Profile>(snapshot);
}

export function workspaceToInviteDoc(workspace: Workspace): InviteDocument {
  return {
    id: workspace.invite_token,
    workspace_id: workspace.id,
    name: workspace.name,
    description: workspace.description,
    subject: workspace.subject,
    invite_token: workspace.invite_token,
    invite_max_uses: workspace.invite_max_uses ?? null,
    invite_used_count: workspace.invite_used_count ?? 0,
    invite_expires_at: workspace.invite_expires_at ?? null,
    invite_single_use: workspace.invite_single_use ?? false,
    active: true,
    created_at: workspace.created_at,
    updated_at: workspace.updated_at,
  };
}

export function ensureWorkspaceMember(
  workspaceId: string,
  userId: string,
  email?: string | null,
  displayName?: string | null,
  role: WorkspaceMember['role'] = 'member'
): WorkspaceMember {
  return {
    id: userId,
    workspace_id: workspaceId,
    user_id: userId,
    role,
    joined_at: nowIso(),
    display_name: displayName || email || 'مستخدم',
    email: email || null,
  };
}

export function createAuditLog(
  workspaceId: string,
  userId: string | null,
  userName: string,
  action: string,
  details?: string
): AuditLog {
  return {
    id: '',
    workspace_id: workspaceId,
    user_id: userId || undefined,
    user_name: userName,
    action,
    details,
    created_at: nowIso(),
  };
}

export function createNotification(input: Omit<NotificationItem, 'id' | 'created_at' | 'read'>): NotificationItem {
  return {
    id: '',
    ...input,
    read: false,
    created_at: nowIso(),
  };
}

export type WorkspaceDoc = Workspace;
export type WorkspaceMemberDoc = WorkspaceMember;
export type WorkspaceFileDoc = WorkspaceFile;
export type FileVersionDoc = FileVersion;
export type FileCommentDoc = FileComment;
export type NotificationDoc = NotificationItem;

export type AnyCollectionRef<T> = CollectionReference<T>;
