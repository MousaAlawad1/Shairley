// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/services/member-api.ts
// PURPOSE: Member management operations — split from api-services.ts
// ═══════════════════════════════════════════════════════════════════════════════

import { supabaseWorkspaceService } from '@/services/api-services';

export const memberApi = {
  getMembers:       supabaseWorkspaceService.getMembers.bind(supabaseWorkspaceService),
  updateMemberRole: supabaseWorkspaceService.updateMemberRole.bind(supabaseWorkspaceService),
  removeMember:     supabaseWorkspaceService.removeMember.bind(supabaseWorkspaceService),
};
