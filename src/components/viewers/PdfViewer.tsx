// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/components/viewers/PdfViewer.tsx
// PURPOSE: PDF viewer — <object> tag + fullscreen + proper loading states
//
//  Fixes:
//  - Added loading skeleton while PDF is being fetched
//  - onError fires only after a grace period (object tag fires it too early)
//  - Retry button instead of immediate failure
//  - Progressive loading indicator
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileType2, AlertTriangle, Expand, Minimize2,
  Loader2, RefreshCw,
} from 'lucide-react';

interface PdfViewerProps {
  url: string;
  name: string;
}

export default function PdfViewer({ url, name }: PdfViewerProps) {
  const [status,     setStatus]     = useState<'loading' | 'ready' | 'error'>('loading');
  const [fullscreen, setFullscreen] = useState(false);
  const [retryKey,   setRetryKey]   = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const objectRef    = useRef<HTMLObjectElement>(null);
  const errorTimer   = useRef<number | null>(null);
  const loadTimer    = useRef<number | null>(null);

  // ── When url/retryKey changes, reset to loading ───────────────────
  useEffect(() => {
    setStatus('loading');

    // Give the object tag time to load before assuming error
    // Most PDFs load within 15s; after that show a retry option
    loadTimer.current = window.setTimeout(() => {
      // If still loading after 20s, show retry (not hard error)
      setStatus(s => s === 'loading' ? 'error' : s);
    }, 20_000);

    // Try to detect load success via iframe-like check
    const el = objectRef.current;
    if (el) {
      const onLoad = () => {
        if (loadTimer.current) window.clearTimeout(loadTimer.current);
        if (errorTimer.current) window.clearTimeout(errorTimer.current);
        setStatus('ready');
      };
      el.addEventListener('load', onLoad);
      return () => {
        el.removeEventListener('load', onLoad);
        if (loadTimer.current) window.clearTimeout(loadTimer.current);
        if (errorTimer.current) window.clearTimeout(errorTimer.current);
      };
    }

    return () => {
      if (loadTimer.current) window.clearTimeout(loadTimer.current);
      if (errorTimer.current) window.clearTimeout(errorTimer.current);
    };
  }, [url, retryKey]);

  // ── onError: debounce — object fires this too early sometimes ─────
  const handleError = useCallback(() => {
    if (errorTimer.current) window.clearTimeout(errorTimer.current);
    // Wait 3s before showing error — sometimes it fires then recovers
    errorTimer.current = window.setTimeout(() => {
      setStatus(s => s === 'loading' ? 'error' : s);
    }, 3000);
  }, []);

  const handleRetry = useCallback(() => {
    if (loadTimer.current) window.clearTimeout(loadTimer.current);
    if (errorTimer.current) window.clearTimeout(errorTimer.current);
    setRetryKey(k => k + 1);
  }, []);

  // ── Fullscreen ────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await containerRef.current.requestFullscreen();
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const h = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'f' || e.key === 'F') { e.preventDefault(); void toggleFullscreen(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleFullscreen]);

  return (
    <div
      ref={containerRef}
      className={`w-full flex flex-col overflow-hidden ${
        fullscreen ? 'bg-surface-1' : 'rounded-2xl border border-line/50'
      }`}
      style={{ height: fullscreen ? '100dvh' : 'calc(100svh - 8rem)' }}
    >
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 bg-surface-2/95 border-b border-line/40 shrink-0 backdrop-blur-sm gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-brick/15 border border-brick/20 flex items-center justify-center shrink-0">
            <FileType2 className="h-3.5 w-3.5 text-brick-soft" />
          </div>
          <span className="text-xs sm:text-sm font-medium text-fg-1 truncate max-w-[120px] sm:max-w-[220px]">{name}</span>

          {/* Loading badge */}
          <AnimatePresence>
            {status === 'loading' && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1 text-[10px] text-fg-4 bg-surface-3 px-2 py-0.5 rounded-full"
              >
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                جاري التحميل…
              </motion.span>
            )}
            {status === 'ready' && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-[10px] text-sage bg-sage/10 border border-sage/20 px-2 py-0.5 rounded-full"
              >
                جاهز
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2">
          {/* Retry */}
          {status === 'error' && (
            <button
              onClick={handleRetry}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs text-fg-3 hover:text-fg-1 hover:bg-surface-3 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              إعادة المحاولة
            </button>
          )}

          <div className="w-px h-4 bg-line/50" />

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              fullscreen
                ? 'bg-brand-accent/15 text-brand-accent'
                : 'text-fg-3 hover:text-fg-1 hover:bg-surface-3'
            }`}
            title={fullscreen ? 'خروج من ملء الشاشة (F)' : 'ملء الشاشة (F)'}
          >
            {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Expand className="h-3.5 w-3.5" />}
            <span className="hidden xs:block">{fullscreen ? 'خروج' : 'ملء'}</span>
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 relative overflow-hidden">

        {/* Loading skeleton */}
        <AnimatePresence>
          {status === 'loading' && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 z-10 bg-surface-1 flex flex-col items-center justify-center gap-5"
            >
              {/* Animated PDF page skeleton */}
              <div className="w-48 sm:w-64 space-y-3 animate-pulse">
                <div className="h-64 sm:h-80 bg-surface-3/60 rounded-xl" />
                <div className="h-3 bg-surface-3/50 rounded-full w-3/4 mx-auto" />
                <div className="h-3 bg-surface-3/40 rounded-full w-1/2 mx-auto" />
              </div>
              <div className="flex items-center gap-2 text-sm text-fg-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري تحميل الـ PDF…
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error overlay */}
        <AnimatePresence>
          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 bg-surface-1 flex flex-col items-center justify-center gap-5 text-center p-6"
            >
              <div className="w-16 h-16 rounded-2xl bg-brick/10 border border-brick/20 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-brick-soft" />
              </div>
              <div>
                <p className="font-semibold text-fg-1 mb-1">تعذّر عرض الـ PDF</p>
                <p className="text-sm text-fg-3">قد يكون التحميل لا يزال جارياً، أو أن المتصفح لا يدعم عرض PDF مباشرة</p>
              </div>
              <div className="flex gap-3">
                <button onClick={handleRetry} className="btn-primary gap-2">
                  <RefreshCw className="h-4 w-4" />
                  إعادة المحاولة
                </button>
                <span className="btn-secondary opacity-60 cursor-default text-xs">استخدم زر التحميل في الأعلى</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PDF object — always rendered so browser can load it */}
        <object
          key={retryKey}
          ref={objectRef}
          data={url}
          type="application/pdf"
          className="w-full h-full bg-white"
          onError={handleError}
        >
          {/* Fallback slot — shown when browser ignores object entirely */}
          <div className="flex flex-col items-center justify-center h-full gap-4 bg-surface-1">
            <FileType2 className="h-10 w-10 text-fg-4" />
            <p className="text-sm text-fg-3">المتصفح لا يدعم عرض PDF</p>
          </div>
        </object>
      </div>

      {/* ── Bottom hint ── */}
      {!fullscreen && (
        <div className="text-center text-xs text-fg-4 py-1.5 shrink-0 border-t border-line/30">
          <kbd className="bg-surface-3 px-1.5 py-0.5 rounded text-[10px]">F</kbd> ملء الشاشة
        </div>
      )}
    </div>
  );
}
