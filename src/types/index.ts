export type Role = 'owner' | 'admin' | 'member' | 'viewer';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  invite_token: string;
  max_storage_mb: number;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id?: string;
  guest_name?: string;
  role: Role;
  joined_at: string;
}

export interface WorkspaceFile {
  id: string;
  workspace_id: string;
  name: string;
  size: number;
  mime_type: string;
  storage_path: string;
  uploaded_by: string;
  uploaded_by_name: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  workspace_id: string;
  user_id?: string;
  user_name: string;
  action: string;
  details?: string;
  created_at: string;
}