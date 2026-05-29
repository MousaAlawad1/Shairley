// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/components/layout/LayoutWrapper.tsx
// PURPOSE: Layout wrapper — navbar, mobile bottom nav, consistent structure.
//          v2.1: Added MobileBottomNav + pb-16 lg:pb-0 for mobile spacing
// ═══════════════════════════════════════════════════════════════════════════════

import { ReactNode } from 'react';
import AppNavbar from './AppNavbar';
import MobileBottomNav from './MobileBottomNav';

interface LayoutWrapperProps {
  children: ReactNode;
  contentClassName?: string;
  hideNavbar?: boolean;
}

export default function LayoutWrapper({
  children,
  contentClassName = '',
  hideNavbar = false,
}: LayoutWrapperProps) {
  return (
    <div className="min-h-screen bg-ink text-fg-1 flex flex-col">
      {!hideNavbar && <AppNavbar />}

      {/* Main Content — add bottom padding on mobile for bottom nav */}
      <main className={`flex-1 pb-16 lg:pb-0 ${contentClassName}`}>
        {children}
      </main>

      <footer className="border-t border-line/40 py-6 mt-auto hidden lg:block">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between text-xs text-fg-4">
            <p>© 2026 Shairley · شيّرلي</p>
            <p>منصة عمل سحابية لمشاركة الملفات والتعاون</p>
          </div>
        </div>
      </footer>

      {/* Mobile bottom navigation */}
      <MobileBottomNav />
    </div>
  );
}
