// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/hooks/useWorkspaceMembers.ts
// PURPOSE: Custom hook for workspace members state & logic
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import { supabaseWorkspaceService } from '@/services/api-services';
import { WorkspaceMember, Role } from '@/types';

export function useWorkspaceMembers(workspaceId: string | undefined) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState<'all' | Role>('all');
  const [membersError, setMembersError] = useState('');

  const loadMembers = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const data = await supabaseWorkspaceService.getMembers(workspaceId);
      setMembers(data);
      setMembersError('');
    } catch (err: unknown) {
      setMembersError(err instanceof Error ? err.message : 'تعذر تحميل الأعضاء');
    }
  }, [workspaceId]);

  const changeRole = useCallback(async (
    member: WorkspaceMember,
    role: Role,
    onRefresh?: () => Promise<void>
  ) => {
    if (!workspaceId || member.role === role) return;
    try {
      setMembersError('');
      await supabaseWorkspaceService.updateMemberRole(workspaceId, member.id, role);
      setMembers((curr) => curr.map((m) => (m.id === member.id ? { ...m, role } : m)));
      await onRefresh?.();
    } catch (err: unknown) {
      setMembersError(err instanceof Error ? err.message : 'تعذر تحديث دور العضو');
    }
  }, [workspaceId]);

  const removeMember = useCallback(async (
    member: WorkspaceMember,
    onRefresh?: () => Promise<void>
  ) => {
    if (!workspaceId) return;
    if (!window.confirm(`هل تريد إزالة ${member.display_name || 'هذا العضو'} من المساحة؟`)) return;
    try {
      setMembersError('');
      await supabaseWorkspaceService.removeMember(workspaceId, member.id);
      setMembers((curr) => curr.filter((m) => m.id !== member.id));
      await onRefresh?.();
    } catch (err: unknown) {
      setMembersError(err instanceof Error ? err.message : 'تعذر إزالة العضو');
    }
  }, [workspaceId]);

  return {
    members,
    setMembers,
    memberSearchQuery,
    setMemberSearchQuery,
    memberRoleFilter,
    setMemberRoleFilter,
    membersError,
    loadMembers,
    changeRole,
    removeMember,
  };
}
