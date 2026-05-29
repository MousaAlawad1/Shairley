// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/hooks/useFileQueries.ts
// PURPOSE: TanStack Query hooks for file operations
// ═══════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseWorkspaceService } from '@/services/api-services';
import { queryKeys } from '@/components/providers/QueryProvider';
import { FileUpdateInput } from '@/types';

// ─── Query Hooks ──────────────────────────────────────────────────────────────

/**
 * Fetch file details
 */
export function useFileDetails(workspaceId: string, fileId: string) {
  return useQuery({
    queryKey: queryKeys.files.detail(workspaceId, fileId),
    queryFn: () => supabaseWorkspaceService.getFiles(workspaceId, { search: '' }).then(
      (result) => result.data.find(f => f.id === fileId)
    ),
    enabled: !!workspaceId && !!fileId,
  });
}

/**
 * Fetch file versions
 */
export function useFileVersions(workspaceId: string, fileId: string) {
  return useQuery({
    queryKey: queryKeys.files.versions(workspaceId, fileId),
    queryFn: () => supabaseWorkspaceService.getFileVersions(workspaceId, fileId),
    enabled: !!workspaceId && !!fileId,
  });
}

/**
 * Fetch file comments
 */
export function useFileComments(
  workspaceId: string, 
  fileId: string,
  options?: { page?: number; limit?: number }
) {
  return useQuery({
    queryKey: [...queryKeys.files.comments(workspaceId, fileId), options],
    queryFn: () => supabaseWorkspaceService.getFileComments(workspaceId, fileId, options),
    enabled: !!workspaceId && !!fileId,
  });
}

// ─── Mutation Hooks ────────────────────────────────────────────────────────────

/**
 * Upload new file
 */
export function useUploadFile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      workspaceId, 
      file, 
      options 
    }: { 
      workspaceId: string; 
      file: File; 
      options?: { 
        displayName?: string; 
        description?: string; 
        onProgress?: (progress: number) => void;
      }
    }) => 
      supabaseWorkspaceService.uploadFile(workspaceId, file, options),
    onSuccess: (_, { workspaceId }) => {
      // Invalidate files list
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.workspaces.files(workspaceId) 
      });
      // Invalidate storage info
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.workspaces.storage(workspaceId) 
      });
    },
  });
}

/**
 * Upload new file version
 */
export function useUploadFileVersion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      workspaceId, 
      fileId, 
      file, 
      onProgress 
    }: { 
      workspaceId: string; 
      fileId: string; 
      file: File; 
      onProgress?: (progress: number) => void;
    }) => 
      supabaseWorkspaceService.uploadFileVersion(workspaceId, fileId, file, onProgress),
    onSuccess: (_, { workspaceId, fileId }) => {
      // Invalidate files and versions
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.workspaces.files(workspaceId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.files.versions(workspaceId, fileId) 
      });
    },
  });
}

/**
 * Update file (rename, update description)
 */
export function useUpdateFile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      workspaceId, 
      fileId, 
      updates 
    }: { 
      workspaceId: string; 
      fileId: string; 
      updates: FileUpdateInput;
    }) => 
      supabaseWorkspaceService.updateFile(workspaceId, fileId, updates),
    onSuccess: (_, { workspaceId, fileId }) => {
      // Invalidate files list
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.workspaces.files(workspaceId) 
      });
      // Update specific file cache
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.files.detail(workspaceId, fileId) 
      });
    },
  });
}

/**
 * Delete file
 */
export function useDeleteFile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      workspaceId, 
      fileId 
    }: { 
      workspaceId: string; 
      fileId: string; 
    }) => 
      supabaseWorkspaceService.deleteFile(workspaceId, fileId),
    onSuccess: (_, { workspaceId }) => {
      // Invalidate files and storage
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.workspaces.files(workspaceId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.workspaces.storage(workspaceId) 
      });
    },
  });
}

/**
 * Add file comment
 */
export function useAddFileComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      workspaceId, 
      fileId, 
      content 
    }: { 
      workspaceId: string; 
      fileId: string; 
      content: string;
    }) => 
      supabaseWorkspaceService.addFileComment(workspaceId, fileId, content),
    onSuccess: (_, { workspaceId, fileId }) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.files.comments(workspaceId, fileId) 
      });
    },
  });
}