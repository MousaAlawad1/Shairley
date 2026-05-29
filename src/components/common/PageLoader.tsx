// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/components/common/PageLoader.tsx
// PURPOSE: Premium shimmer skeleton loader with staggered animation
// ═══════════════════════════════════════════════════════════════════════════════

import { motion } from 'framer-motion';

interface PageLoaderProps {
  label?: string;
}

export function PageLoader({ label = 'جاري التحميل...' }: PageLoaderProps) {
  return (
    <div className="min-h-screen bg-ink flex items-center justify-center text-fg-1" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-6 text-center px-6"
      >
        {/* Animated logo pulse */}
        <div className="relative">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-16 h-16 rounded-2xl border border-brand-accent/30 flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--brand-accent) / 0.15), hsl(var(--brand-accent) / 0.05))',
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              className="w-6 h-6 border-2 border-brand-accent/30 border-t-brand-accent rounded-full"
            />
          </motion.div>
          {/* Glow ring */}
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-2xl"
            style={{ boxShadow: '0 0 30px 5px hsl(var(--brand-accent) / 0.15)' }}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-fg-1">{label}</p>
          {/* Shimmer bar */}
          <div className="w-32 h-1 rounded-full overflow-hidden bg-surface-3">
            <motion.div
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              className="h-full w-1/2 rounded-full bg-gradient-to-r from-transparent via-brand-accent/50 to-transparent"
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}