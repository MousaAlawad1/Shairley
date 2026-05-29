// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/types/index.ts
// PURPOSE: centralized TypeScript type definitions for the entire application
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Core Types ───────────────────────────────────────────────────────────────

export type Role = 'owner' | 'admin' | 'member' | 'viewer' | 'guest';

export type NotificationType =
  | 'file_uploaded'
  | 'file_deleted'
  | 'file_version_uploaded'
  | 'comment_added'
  | 'member_joined'
  | 'invite_regenerated'
  | 'workspace_created'
  | 'member_removed'
  | 'role_changed';

export type FileKind = 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'other';

// ─── User & Profile ───────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface ProfileFormData {
  full_name: string;
  avatar_url?: string;
}

export interface PasswordChangeData {
  current_password: string;
  new_password: string;
}

// ─── Workspace ────────────────────────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  /** اسم المادة الدراسية — يدلّ على أن هذه مساحة عمل لكورس/مادّة. */
  subject?: string | null;
  owner_id: string;
  invite_token: string;
  max_storage_mb: number;
  /** حد أقصى لعدد استخدامات رابط الدعوة (null = بلا حد) */
  invite_max_uses?: number | null;
  /** عدد مرات استخدام رابط الدعوة الحالي */
  invite_used_count?: number;
  /** تاريخ انتهاء صلاحية رابط الدعوة (null = بلا انتهاء) */
  invite_expires_at?: string | null;
  /** هل رابط الدعوة صالح لاستخدام واحد فقط */
  invite_single_use?: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceCreateInput {
  name: string;
  description?: string;
  subject?: string | null;
}

export interface WorkspaceUpdateInput {
  name?: string;
  description?: string;
  subject?: string | null;
  max_storage_mb?: number;
}

export interface WorkspaceInvitePreview {
  id: string;
  name: string;
  description?: string;
  subject?: string | null;
  invite_token: string;
}

// ─── Members ──────────────────────────────────────────────────────────────────

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id?: string;
  role: Role;
  joined_at: string;
  display_name?: string;
  email?: string | null;
  is_current_user?: boolean;
}

export interface MemberUpdateInput {
  role: Role;
}

// ─── Files ────────────────────────────────────────────────────────────────────

export interface WorkspaceFile {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  size: number;
  mime_type: string;
  storage_path: string;
  uploaded_by: string;
  uploaded_by_name: string;
  created_at: string;
}

export interface FileUploadInput {
  file: File;
  display_name?: string;
  description?: string;
}

export interface FileUpdateInput {
  name?: string;
  description?: string;
}

export interface FileVersion {
  id: string;
  file_id: string;
  workspace_id: string;
  version_number: number;
  name: string;
  size: number;
  mime_type: string;
  storage_path: string;
  uploaded_by?: string | null;
  uploaded_by_name: string;
  created_at: string;
  is_current: boolean;
}

export interface FileComment {
  id: string;
  file_id: string;
  workspace_id: string;
  user_id?: string | null;
  user_name: string;
  content: string;
  parent_id?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface FileCommentInput {
  content: string;
  parent_id?: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface NotificationItem {
  id: string;
  user_id: string;
  workspace_id?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  workspace_id: string;
  user_id?: string;
  user_name: string;
  action: string;
  details?: string;
  created_at: string;
}

export interface WorkspaceActivity extends AuditLog {
  workspace_name?: string;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

export interface StorageInfo {
  used: number;
  max: number;
  percentage: number;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

// ─── UI State Types ───────────────────────────────────────────────────────────

export type ViewMode = 'grid' | 'list';

export type Tab = 'files' | 'members' | 'activity' | 'settings';

export type FileTypeFilter = 'all' | 'image' | 'document' | 'media' | 'text' | 'other';

export type FileSortBy = 'newest' | 'oldest' | 'name' | 'size_desc' | 'size_asc';

export type MemberRoleFilter = 'all' | Role;

// ─── Error Handling Types ─────────────────────────────────────────────────────

export interface AppErrorData {
  code: string;
  message: string;
  details?: string;
}

export enum ErrorCode {
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  WORKSPACE_NOT_FOUND = 'WORKSPACE_NOT_FOUND',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  MEMBER_NOT_FOUND = 'MEMBER_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  STORAGE_LIMIT_EXCEEDED = 'STORAGE_LIMIT_EXCEEDED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// ─── Navbar Types ─────────────────────────────────────────────────────────────

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  badge?: number;
  requiresAuth?: boolean;
  exact?: boolean;
}

export interface NavbarState {
  isAuthenticated: boolean;
  user: {
    id: string;
    email: string;
    full_name: string;
    avatar_url?: string;
  } | null;
  notificationCount: number;
  currentPath: string;
}

// ─── File Handling Types ──────────────────────────────────────────────────────

export interface FileDownloadOptions {
  storagePath: string;
  fileName: string;
}

export interface FilePreviewOptions {
  storagePath: string;
  mimeType: string;
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: AppErrorData;
}

export interface UploadProgress {
  fileId: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}