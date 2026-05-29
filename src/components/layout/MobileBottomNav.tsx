// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/components/layout/MobileBottomNav.tsx
// PURPOSE: Mobile bottom navigation bar — shown only on small screens.
//          Replaces hamburger menu for a native-app feel.
// ═══════════════════════════════════════════════════════════════════════════════

import { Link, useLocation } from 'react-router-dom';
import { FolderOpen, Home, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function MobileBottomNav() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { path: '/',          icon: Home,       label: 'الرئيسية' },
    { path: '/dashboard', icon: FolderOpen,  label: 'مساحاتي'  },
    { path: '/profile',   icon: User,        label: 'ملفي'      },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden border-t border-line/60 bg-surface-1/90 backdrop-blur-xl">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all min-w-[56px] ${
                active
                  ? 'text-brand-accent'
                  : 'text-fg-4 hover:text-fg-2'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-brand-accent/15' : ''}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
