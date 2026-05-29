// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/hooks/useWorkspaceQueries.ts
// PURPOSE: TanStack Query hooks for workspace data fetching
// ═══════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseWorkspaceService } from '@/services/api-services';
import { queryKeys } from '@/components/providers/QueryProvider';
import { WorkspaceCreateInput, WorkspaceUpdateInput, Role } from '@/types';

// ─── Query Hooks ──────────────────────────────────────────────────────────────

/**
 * Fetch all workspaces for current user
 */
export function useWorkspaces() {
  return useQuery({
    queryKey: queryKeys.workspaces.list(),
    queryFn: () => supabaseWorkspaceService.listForCurrentUser(),
  });
}

/**
 * Fetch single workspace by ID
 */
export function useWorkspace(workspaceId: string) {
  return useQuery({
    queryKey: queryKeys.workspaces.detail(workspaceId),
    queryFn: () => supabaseWorkspaceService.getById(workspaceId),
    enabled: !!workspaceId,
  });
}

/**
 * Fetch workspace members
 */
export function useWorkspaceMembers(workspaceId: string) {
  return useQuery({
    queryKey: queryKeys.workspaces.members(workspaceId),
    queryFn: () => supabaseWorkspaceService.getMembers(workspaceId),
    enabled: !!workspaceId,
  });
}

/**
 * Fetch workspace files with pagination
 */
export function useWorkspaceFiles(
  workspaceId: string, 
  options?: { page?: number; limit?: number; search?: string }
) {
  return useQuery({
    queryKey: [...queryKeys.workspaces.files(workspaceId), options],
    queryFn: () => supabaseWorkspaceService.getFiles(workspaceId, options),
    enabled: !!workspaceId,
  });
}

/**
 * Fetch workspace activity
 */
export function useWorkspaceActivity(
  workspaceId: string,
  options?: { page?: number; limit?: number }
) {
  return useQuery({
    queryKey: [...queryKeys.workspaces.activity(workspaceId), options],
    queryFn: () => supabaseWorkspaceService.getActivity(workspaceId, options),
    enabled: !!workspaceId,
  });
}

/**
 * Fetch workspace storage info
 */
export function useWorkspaceStorage(workspaceId: string) {
  return useQuery({
    queryKey: queryKeys.workspaces.storage(workspaceId),
    queryFn: () => supabaseWorkspaceService.getStorage(workspaceId),
    enabled: !!workspaceId,
    // Refresh storage more frequently
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch recent activity across all workspaces
 */
export function useRecentActivity(limit = 10) {
  return useQuery({
    queryKey: ['recent-activity', limit],
    queryFn: () => supabaseWorkspaceService.getRecentActivity(limit),
  });
}

// ─── Mutation Hooks ────────────────────────────────────────────────────────────

/**
 * Create new workspace
 */
export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (input: WorkspaceCreateInput) => 
      supabaseWorkspaceService.create(input.name, input.description, input.subject),
    onSuccess: () => {
      // Invalidate workspaces list
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.list() });
    },
  });
}

/**
 * Update workspace
 */
export function useUpdateWorkspace() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      id, 
      updates 
    }: { id: string; updates: WorkspaceUpdateInput }) => 
      supabaseWorkspaceService.updateWorkspace(id, updates as { name: string; description: string; max_storage_mb: number; subject?: string | null }),
    onSuccess: (data) => {
      // Update workspace cache
      queryClient.setQueryData(
        queryKeys.workspaces.detail(data.id),
        data
      );
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.list() });
    },
  });
}

/**
 * Delete workspace
 */
export function useDeleteWorkspace() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (workspaceId: string) => 
      supabaseWorkspaceService.deleteWorkspace(workspaceId),
    onSuccess: () => {
      // Invalidate workspaces list
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.list() });
    },
  });
}

/**
 * Regenerate workspace invite token
 */
export function useRegenerateInvite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (workspaceId: string) => 
      supabaseWorkspaceService.regenerateInvite(workspaceId),
    onSuccess: (_, workspaceId) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.workspaces.detail(workspaceId) 
      });
    },
  });
}

/**
 * Update member role
 */
export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      workspaceId, 
      memberId, 
      role 
    }: { 
      workspaceId: string; 
      memberId: string; 
      role: Role 
    }) => 
      supabaseWorkspaceService.updateMemberRole(workspaceId, memberId, role),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.workspaces.members(workspaceId) 
      });
    },
  });
}

/**
 * Remove member
 */
export function useRemoveMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      workspaceId, 
      memberId 
    }: { 
      workspaceId: string; 
      memberId: string 
    }) => 
      supabaseWorkspaceService.removeMember(workspaceId, memberId),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.workspaces.members(workspaceId) 
      });
    },
  });
}