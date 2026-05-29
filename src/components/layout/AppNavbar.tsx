// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/components/layout/AppNavbar.tsx
// PURPOSE: Enterprise navbar — clean, minimal, professional
// ═══════════════════════════════════════════════════════════════════════════════

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import {
  BadgeCheck,
  ChevronDown,
  FolderOpen,
  Home,
  LogOut,
  Menu,
  Share2,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { NotificationBell } from '@/components/common/NotificationBell';
import OwnerBadge from '@/components/common/OwnerBadge';
import ColoredAvatar from '@/components/common/ColoredAvatar';

interface NavLink {
  id: string;
  label: string;
  path: string;
  icon: typeof Home;
  requiresAuth?: boolean;
}

const NAV_LINKS: NavLink[] = [
  { id: 'home', label: 'الرئيسية', path: '/', icon: Home },
  { id: 'dashboard', label: 'مساحات العمل', path: '/dashboard', icon: FolderOpen, requiresAuth: true },
  { id: 'developers', label: 'المطورين', path: '/developers', icon: BadgeCheck },
  { id: 'profile', label: 'الملف الشخصي', path: '/profile', icon: User, requiresAuth: true },
];

export default function AppNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setProfileDropdownOpen(false);
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const getUserDisplayName = () => {
    return user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'مستخدم';
  };

  const getUserInitials = () => {
    const name = getUserDisplayName();
    return name.slice(0, 2).toUpperCase();
  };

  const visibleLinks = NAV_LINKS.filter(link => {
    if (!link.requiresAuth) return true;
    return !!user;
  });

  return (
    <>
      {/* ─── Floating Navbar ─── */}
      <div className="fixed top-3 inset-x-0 z-50 px-3 sm:px-6 pointer-events-none">
        <nav className="navbar-blur pointer-events-auto mx-auto max-w-[1280px] rounded-2xl border border-[hsl(var(--line)/0.5)] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.6),0_0_0_1px_hsl(var(--brand-accent)/0.05)] ring-1 ring-white/[0.04]">
          <div className="flex items-center justify-between px-4 sm:px-6 h-14">

          {/* Logo */}
          <Link to="/" className="group flex items-center gap-2.5 shrink-0 rounded-lg px-1 py-1 -mx-1 -my-1 transition-all duration-300 hover:bg-[hsl(var(--brand-accent)/0.06)]">
            <div className="h-8 w-8 rounded-lg bg-[hsl(var(--brand-accent))] flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-[0_0_18px_-2px_hsl(var(--brand-accent)/0.7)] ring-1 ring-white/10">
              <Share2 className="h-4 w-4 text-white transition-transform duration-300 group-hover:scale-110" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-fg-1 hidden sm:block transition-colors group-hover:text-white">
              Shairley
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-0.5">
            {visibleLinks.map((link) => (
              <Link
                key={link.id}
                to={link.path}
                className={`group relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive(link.path)
                    ? 'text-fg-1 bg-[hsl(var(--brand-accent)/0.10)]'
                    : 'text-fg-3 hover:text-fg-1 hover:bg-[hsl(var(--surface-3)/0.6)]'
                }`}
              >
                <link.icon className={`h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110 ${
                  isActive(link.path) ? 'text-[hsl(var(--brand-accent))]' : ''
                }`} />
                {link.label}
                {/* underline indicator */}
                <span
                  aria-hidden
                  className={`pointer-events-none absolute inset-x-3 -bottom-0.5 h-[2px] rounded-full bg-[hsl(var(--brand-accent))] transition-all duration-300 ${
                    isActive(link.path)
                      ? 'opacity-100 scale-x-100'
                      : 'opacity-0 scale-x-0 group-hover:opacity-60 group-hover:scale-x-75'
                  }`}
                />
              </Link>
            ))}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3 shrink-0">
            {user && (
              <div className="hidden sm:block">
                <NotificationBell />
              </div>
            )}

            {/* Profile Dropdown */}
            {user ? (
              <div className="relative hidden sm:block" ref={profileRef}>
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-all duration-200 ${
                    profileDropdownOpen
                      ? 'bg-[hsl(var(--brand-accent)/0.12)] ring-1 ring-[hsl(var(--brand-accent)/0.30)]'
                      : 'hover:bg-[hsl(var(--surface-3)/0.6)]'
                  }`}
                >
                  <ColoredAvatar name={getUserDisplayName()} email={user?.email} size="sm" />
                  <span className="text-xs font-medium text-fg-2 max-w-[100px] truncate hidden md:block">
                    {getUserDisplayName()}
                  </span>
                  <OwnerBadge email={user.email} size="sm" iconOnly className="hidden md:inline-flex" />
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-fg-4 transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {profileDropdownOpen && (
                  <div className="absolute left-0 mt-3 w-56 rounded-xl border border-[hsl(var(--line)/0.7)] bg-[hsl(var(--surface-2)/0.95)] backdrop-blur-xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)] overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-[hsl(var(--line))]">
                      <p className="text-sm font-medium text-fg-1 truncate">
                        {getUserDisplayName()}
                      </p>
                      <p className="text-[11px] text-fg-4 truncate mt-0.5">
                        {user.email}
                      </p>
                      <OwnerBadge email={user.email} size="sm" className="mt-2" />
                    </div>

                    <div className="py-1">
                      <Link
                        to="/profile"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-fg-2 hover:text-fg-1 hover:bg-[hsl(var(--surface-3))] transition-colors"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        <User className="h-4 w-4 text-fg-3" />
                        الملف الشخصي
                      </Link>
                      <Link
                        to="/dashboard"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-fg-2 hover:text-fg-1 hover:bg-[hsl(var(--surface-3))] transition-colors"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        <FolderOpen className="h-4 w-4 text-fg-3" />
                        مساحات العمل
                      </Link>
                    </div>

                    <div className="border-t border-[hsl(var(--line))] py-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-brick-soft hover:bg-[hsl(var(--brick)/0.08)] w-full transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        تسجيل الخروج
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="hidden sm:flex btn-primary !py-2 !px-4 text-xs">
                تسجيل الدخول
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-md hover:bg-[hsl(var(--surface-2))] transition-colors"
            >
              {mobileMenuOpen ? <X className="h-5 w-5 text-fg-2" /> : <Menu className="h-5 w-5 text-fg-2" />}
            </button>
          </div>
          </div>
        </nav>
      </div>

      {/* ─── Mobile Menu ─── */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="navbar-blur fixed top-0 right-0 bottom-0 w-72 z-50 lg:hidden overflow-y-auto border-l border-[hsl(var(--line)/0.6)] shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--line))]">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-md bg-[hsl(var(--brand-accent))] flex items-center justify-center">
                  <Share2 className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-fg-1">Shairley</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-md hover:bg-[hsl(var(--surface-3))] transition-colors"
              >
                <X className="h-5 w-5 text-fg-3" />
              </button>
            </div>

            {user && (
              <div className="p-5 border-b border-[hsl(var(--line))]">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-[hsl(var(--brand-accent)/0.15)] flex items-center justify-center">
                    <span className="text-sm font-semibold text-[hsl(var(--brand-accent-ring))]">
                      {getUserInitials()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-fg-1 truncate">
                      {getUserDisplayName()}
                    </p>
                    <p className="text-xs text-fg-4 truncate">
                      {user.email}
                    </p>
                    <OwnerBadge email={user.email} size="sm" className="mt-1.5" />
                  </div>
                </div>
              </div>
            )}

            <nav className="py-2">
              {visibleLinks.map((link) => (
                <Link
                  key={link.id}
                  to={link.path}
                  className={`
                    flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors
                    ${isActive(link.path)
                      ? 'text-fg-1 bg-[hsl(var(--surface-3))] border-r-2 border-[hsl(var(--brand-accent))]'
                      : 'text-fg-3 hover:text-fg-1 hover:bg-[hsl(var(--surface-3))] border-r-2 border-transparent'
                    }
                  `}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[hsl(var(--line))]">
              {user ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-2.5 rounded-md text-sm text-brick-soft hover:bg-[hsl(var(--brick)/0.08)] transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="font-medium">تسجيل الخروج</span>
                </button>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center justify-center gap-2 w-full btn-primary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  تسجيل الدخول
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}