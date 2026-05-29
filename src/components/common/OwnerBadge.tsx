// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/components/common/OwnerBadge.tsx
// PURPOSE: Premium "Shairley Owner" badge — only rendered for accounts whose
//          email is listed in the VITE_DEVELOPER_EMAILS env var.
//          STYLE: flat silver. No 3D, no gradient, no shadows.
// ═══════════════════════════════════════════════════════════════════════════════

import { Crown } from 'lucide-react';
import { isDeveloperEmail } from '@/lib/developers';

type Size = 'sm' | 'md' | 'lg';

interface OwnerBadgeProps {
  email: string | null | undefined;
  size?: Size;
  iconOnly?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<Size, { wrap: string; icon: string; text: string; gap: string }> = {
  sm: { wrap: 'px-2.5 py-0.5 rounded-sm',  icon: 'h-3 w-3',     text: 'text-[10px]', gap: 'gap-1'   },
  md: { wrap: 'px-3 py-1 rounded-sm',       icon: 'h-3.5 w-3.5', text: 'text-[11px]', gap: 'gap-1.5' },
  lg: { wrap: 'px-4 py-1.5 rounded',        icon: 'h-4 w-4',     text: 'text-xs',     gap: 'gap-2'   },
};

const ICON_ONLY_SIZE: Record<Size, string> = {
  sm: 'h-5 w-5 rounded-sm',
  md: 'h-6 w-6 rounded-sm',
  lg: 'h-7 w-7 rounded',
};

const ICON_ONLY_ICON: Record<Size, string> = {
  sm: 'h-2.5 w-2.5',
  md: 'h-3 w-3',
  lg: 'h-3.5 w-3.5',
};

export default function OwnerBadge({
  email,
  size = 'md',
  iconOnly = false,
  className = '',
}: OwnerBadgeProps) {
  if (!isDeveloperEmail(email)) return null;

  if (iconOnly) {
    return (
      <span
        title="Shairley Owner — حساب مطوّر رسمي"
        aria-label="Shairley Owner"
        className={[
          'owner-badge-pulse',
          'inline-flex items-center justify-center shrink-0',
          ICON_ONLY_SIZE[size],
          className,
        ].join(' ')}
      >
        <Crown className={ICON_ONLY_ICON[size]} fill="currentColor" />
      </span>
    );
  }

  const sz = SIZE_CLASSES[size];

  return (
    <span
      title="Shairley Owner — حساب مطوّر رسمي للمنصة"
      aria-label="Shairley Owner"
      className={[
        'owner-badge',
        'inline-flex items-center font-semibold uppercase tracking-[0.10em] shrink-0',
        sz.wrap,
        sz.gap,
        sz.text,
        className,
      ].join(' ')}
    >
      <Crown className={sz.icon} fill="currentColor" />
      <span className="whitespace-nowrap">Shairley Owner</span>
    </span>
  );
}
