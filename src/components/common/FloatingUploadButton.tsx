// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/components/common/FloatingUploadButton.tsx
// PURPOSE: Floating Action Button (FAB) for mobile upload — shown on workspace page
// ═══════════════════════════════════════════════════════════════════════════════

import { UploadCloud } from 'lucide-react';

interface FloatingUploadButtonProps {
  onClick: () => void;
}

export default function FloatingUploadButton({ onClick }: FloatingUploadButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 left-4 z-30 lg:hidden flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-all active:scale-95 hover:scale-105"
      style={{
        background: 'hsl(var(--brand-accent))',
        boxShadow: '0 8px 32px -4px hsl(var(--brand-accent) / 0.5)',
      }}
      title="رفع ملف"
      aria-label="رفع ملف"
    >
      <UploadCloud className="h-6 w-6 text-white" />
    </button>
  );
}
