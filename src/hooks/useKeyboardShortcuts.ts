// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/hooks/useKeyboardShortcuts.ts
// PURPOSE: Global keyboard shortcuts hook
//          Ctrl+K → focus global search
//          Esc    → close modals (used in individual pages)
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect } from 'react';

interface ShortcutOptions {
  onSearchOpen?: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts({ onSearchOpen, onEscape }: ShortcutOptions = {}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K → open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onSearchOpen?.();
      }

      // Esc → close/cancel
      if (e.key === 'Escape') {
        onEscape?.();
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onSearchOpen, onEscape]);
}
