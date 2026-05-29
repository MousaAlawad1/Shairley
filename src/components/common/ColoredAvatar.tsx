// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/components/common/ColoredAvatar.tsx
// PURPOSE: Avatar with colorful unique background per user (hash-based)
//          Improvement: different color for each user, not same color for all
// ═══════════════════════════════════════════════════════════════════════════════

interface ColoredAvatarProps {
  name?: string | null;
  email?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Generate a consistent color from a string
function stringToColor(str: string): string {
  const colors = [
    'hsl(var(--brand-accent))',
    'hsl(var(--brass))',
    'hsl(var(--sage))',
    'hsl(220 70% 55%)', // blue
    'hsl(280 65% 55%)', // purple
    'hsl(340 70% 55%)', // pink
    'hsl(20 80% 55%)',  // orange
    'hsl(170 60% 45%)', // teal
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

const sizeMap = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-12 w-12 text-sm',
};

export default function ColoredAvatar({ name, email, size = 'md', className = '' }: ColoredAvatarProps) {
  const identifier = name || email || 'مستخدم';
  const initials = identifier.slice(0, 2).toUpperCase();
  const bgColor = stringToColor(identifier);

  return (
    <div
      className={`${sizeMap[size]} rounded-full flex items-center justify-center font-semibold text-white ring-1 ring-white/10 shrink-0 ${className}`}
      style={{ background: bgColor }}
      title={identifier}
    >
      {initials}
    </div>
  );
}
