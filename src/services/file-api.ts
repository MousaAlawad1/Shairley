// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/services/file-api.ts
// PURPOSE: File operations — split from api-services.ts
// Provides focused file methods from the main workspace service
// ═══════════════════════════════════════════════════════════════════════════════

import { supabaseWorkspaceService } from '@/services/api-services';

export const fileApi = {
  getFiles:         supabaseWorkspaceService.getFiles.bind(supabaseWorkspaceService),
  uploadFile:       supabaseWorkspaceService.uploadFile.bind(supabaseWorkspaceService),
  updateFile:       supabaseWorkspaceService.updateFile.bind(supabaseWorkspaceService),
  deleteFile:       supabaseWorkspaceService.deleteFile.bind(supabaseWorkspaceService),
  getFileVersions:  supabaseWorkspaceService.getFileVersions.bind(supabaseWorkspaceService),
  uploadFileVersion:supabaseWorkspaceService.uploadFileVersion.bind(supabaseWorkspaceService),
  getFileComments:  supabaseWorkspaceService.getFileComments.bind(supabaseWorkspaceService),
  addFileComment:   supabaseWorkspaceService.addFileComment.bind(supabaseWorkspaceService),
  getStorage:       supabaseWorkspaceService.getStorage.bind(supabaseWorkspaceService),
};
