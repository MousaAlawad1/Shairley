// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/lib/motion.ts
// PURPOSE: Minimal motion configuration — enterprise-grade, no flashy animations
// ═══════════════════════════════════════════════════════════════════════════════

import { type Variants, type Transition } from 'framer-motion';

// ─── Spring Presets (subtle) ──────────────────────────────────────────────────
export const spring = {
  snappy: { type: 'spring', stiffness: 400, damping: 35 } as Transition,
  smooth: { type: 'spring', stiffness: 300, damping: 30 } as Transition,
  gentle: { type: 'spring', stiffness: 200, damping: 25 } as Transition,
  bouncy: { type: 'spring', stiffness: 300, damping: 20 } as Transition,
} as const;

// ─── Page Transition Variants ─────────────────────────────────────────────────
export const pageVariants: Variants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

// ─── Stagger Container ────────────────────────────────────────────────────────
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

// ─── Stagger Items ────────────────────────────────────────────────────────────
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
  },
};

export const staggerItemFade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2 } },
};

// ─── Tap Scale ────────────────────────────────────────────────────────────────
export const tapScale = {
  whileTap: { scale: 0.98 },
  transition: spring.snappy,
};

// ─── Hover Lift — disabled for enterprise ─────────────────────────────────────
export const hoverLift = {
  whileHover: {},
  transition: spring.smooth,
};

// ─── Modal / Overlay Variants ─────────────────────────────────────────────────
export const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: 0.15 },
  },
};

// ─── Shimmer ──────────────────────────────────────────────────────────────────
export const shimmerVariants: Variants = {
  initial: { backgroundPosition: '-200% 0' },
  animate: {
    backgroundPosition: '200% 0',
    transition: { repeat: Infinity, duration: 1.5, ease: 'linear' },
  },
};