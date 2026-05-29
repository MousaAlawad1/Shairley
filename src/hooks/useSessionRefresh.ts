// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/hooks/useSessionRefresh.ts
// PURPOSE: DEPRECATED — Firebase auth keeps the session persisted internally.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @deprecated Session refresh is managed by Firebase Auth internally.
 * This hook is a no-op kept for backward compatibility.
 */
export function useSessionRefresh(_session: null = null, _enabled = true) {
  // No-op.
}
