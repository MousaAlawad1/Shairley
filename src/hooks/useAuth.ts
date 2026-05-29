// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/hooks/useAuth.ts
// PURPOSE: Re-exports useAuth from AuthProvider for backward compatibility.
//          All components that import from '@/hooks/useAuth' will now use
//          the centralized AuthProvider context.
// ═══════════════════════════════════════════════════════════════════════════════

export { useAuth } from '@/components/providers/AuthProvider';
export type { AuthContextValue as UseAuthReturn } from '@/components/providers/AuthProvider';