-- FileShare Workspace - Supabase Migration
-- Run this SQL in your Supabase SQL Editor

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Workspaces
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invite_token TEXT UNIQUE NOT NULL,
  max_storage_mb INTEGER DEFAULT 500 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Workspace Members
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_name TEXT,
  role TEXT DEFAULT 'member' NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer', 'guest')),
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Workspace Files
CREATE TABLE IF NOT EXISTS public.workspace_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  size BIGINT DEFAULT 0 NOT NULL,
  mime_type TEXT DEFAULT '' NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  uploaded_by_name TEXT DEFAULT '' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT DEFAULT '' NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON public.workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_invite ON public.workspaces(invite_token);
CREATE INDEX IF NOT EXISTS idx_members_workspace ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_members_user ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_files_workspace ON public.workspace_files(workspace_id);
CREATE INDEX IF NOT EXISTS idx_audit_workspace ON public.audit_logs(workspace_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Workspaces
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspaces_select_member" ON public.workspaces FOR SELECT USING (
  id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  OR invite_token IS NOT NULL
);
CREATE POLICY "workspaces_insert_auth" ON public.workspaces FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "workspaces_update_owner" ON public.workspaces FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "workspaces_delete_owner" ON public.workspaces FOR DELETE USING (owner_id = auth.uid());

-- Workspace Members
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_select_all" ON public.workspace_members FOR SELECT USING (true);
CREATE POLICY "members_insert_all" ON public.workspace_members FOR INSERT WITH CHECK (true);
CREATE POLICY "members_delete_owner" ON public.workspace_members FOR DELETE USING (
  workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
);

-- Workspace Files
ALTER TABLE public.workspace_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "files_select_member" ON public.workspace_files FOR SELECT USING (
  workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
);
CREATE POLICY "files_insert_member" ON public.workspace_files FOR INSERT WITH CHECK (true);
CREATE POLICY "files_delete_member" ON public.workspace_files FOR DELETE USING (true);

-- Audit Logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_select_member" ON public.audit_logs FOR SELECT USING (
  workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
);
CREATE POLICY "audit_insert_all" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- STORAGE BUCKET
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public) 
VALUES ('workspace-files', 'workspace-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "storage_select_auth" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'workspace-files');
CREATE POLICY "storage_insert_auth" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'workspace-files');
CREATE POLICY "storage_delete_auth" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'workspace-files');

-- ═══════════════════════════════════════════════════════════════════════════════
-- TRIGGER: Auto-create profile on signup
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════════════════════
-- REALTIME
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_files;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_members;

COMMIT;