// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/components/viewers/ImageViewer.tsx
// PURPOSE: Professional image viewer — fully responsive
// ═══════════════════════════════════════════════════════════════════════════════

import {
  useState, useRef, useCallback, useEffect, useLayoutEffect,
  type MouseEvent, type WheelEvent, type TouchEvent,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ZoomIn, ZoomOut, RotateCw, Maximize2, Minimize2,
  Loader2, AlertTriangle, FlipHorizontal, Expand,
} from 'lucide-react';

interface ImageViewerProps {
  url: string;
  name: string;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 8;
const WHEEL_SENSITIVITY = 0.001;

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

export default function ImageViewer({ url, name }: ImageViewerProps) {
  const [scale, setScale]           = useState(1);
  const [offset, setOffset]         = useState({ x: 0, y: 0 });
  const [rotation, setRotation]     = useState(0);
  const [flipH, setFlipH]           = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [fit, setFit]               = useState<'contain' | 'actual'>('contain');
  const [loaded, setLoaded]         = useState(false);
  const [imgError, setImgError]     = useState(false);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [zoomTip, setZoomTip]       = useState<string | null>(null);

  const containerRef  = useRef<HTMLDivElement>(null);
  const imgRef        = useRef<HTMLImageElement>(null);
  const dragStart     = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const lastPinchDist = useRef<number | null>(null);
  const zoomTipTimer  = useRef<number | null>(null);

  const flashZoom = useCallback((s: number) => {
    if (zoomTipTimer.current) window.clearTimeout(zoomTipTimer.current);
    setZoomTip(`${Math.round(s * 100)}%`);
    zoomTipTimer.current = window.setTimeout(() => setZoomTip(null), 900);
  }, []);

  const applyZoom = useCallback((newScale: number, pivot?: { x: number; y: number }) => {
    const s = clamp(newScale, MIN_SCALE, MAX_SCALE);
    setScale(prev => {
      if (pivot && containerRef.current) {
        const ratio = s / prev;
        setOffset(o => ({
          x: pivot.x + (o.x - pivot.x) * ratio,
          y: pivot.y + (o.y - pivot.y) * ratio,
        }));
      }
      return s;
    });
    flashZoom(s);
  }, [flashZoom]);

  const reset = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setRotation(0);
    setFlipH(false);
    setFit('contain');
    flashZoom(1);
  }, [flashZoom]);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await containerRef.current.requestFullscreen();
    } catch { /* ignore */ }
  }, []);

  // Fullscreen state
  useEffect(() => {
    const h = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  // Wheel zoom
  const onWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pivot = {
      x: e.clientX - rect.left - rect.width / 2,
      y: e.clientY - rect.top - rect.height / 2,
    };
    applyZoom(scale + (-e.deltaY * WHEEL_SENSITIVITY * scale), pivot);
  }, [scale, applyZoom]);

  // Mouse drag
  const onMouseDown = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (scale <= 1 && fit === 'contain') return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }, [scale, fit, offset]);

  const onMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.x),
      y: dragStart.current.oy + (e.clientY - dragStart.current.y),
    });
  }, []);

  const onMouseUp = useCallback(() => { dragStart.current = null; setIsDragging(false); }, []);

  // Double click
  const onDoubleClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pivot = { x: e.clientX - rect.left - rect.width / 2, y: e.clientY - rect.top - rect.height / 2 };
    if (scale >= 1.9) { setScale(1); setOffset({ x: 0, y: 0 }); flashZoom(1); }
    else applyZoom(scale * 2, pivot);
  }, [scale, applyZoom, flashZoom]);

  // Touch
  const onTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
    lastPinchDist.current = null;
    if (e.touches.length === 1) {
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, ox: offset.x, oy: offset.y };
    }
  }, [offset]);

  const onTouchMove = useCallback((e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      if (lastPinchDist.current !== null) {
        const ratio = dist / lastPinchDist.current;
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left - rect.width / 2;
          const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top - rect.height / 2;
          applyZoom(scale * ratio, { x: midX, y: midY });
        }
      }
      lastPinchDist.current = dist;
    } else if (e.touches.length === 1 && dragStart.current) {
      setOffset({
        x: dragStart.current.ox + (e.touches[0].clientX - dragStart.current.x),
        y: dragStart.current.oy + (e.touches[0].clientY - dragStart.current.y),
      });
    }
  }, [scale, applyZoom]);

  const onTouchEnd = useCallback(() => { dragStart.current = null; lastPinchDist.current = null; }, []);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case '+': case '=': applyZoom(scale + 0.25); break;
        case '-': applyZoom(scale - 0.25); break;
        case '0': reset(); break;
        case 'r': case 'R': setRotation(r => (r + 90) % 360); break;
        case 'h': case 'H': setFlipH(f => !f); break;
        case 'f': case 'F': void toggleFullscreen(); break;
        case 'ArrowLeft':  e.preventDefault(); setOffset(o => ({ ...o, x: o.x + 20 })); break;
        case 'ArrowRight': e.preventDefault(); setOffset(o => ({ ...o, x: o.x - 20 })); break;
        case 'ArrowUp':    e.preventDefault(); setOffset(o => ({ ...o, y: o.y + 20 })); break;
        case 'ArrowDown':  e.preventDefault(); setOffset(o => ({ ...o, y: o.y - 20 })); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [scale, applyZoom, reset, toggleFullscreen]);

  // Prevent default wheel
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const prevent = (e: Event) => e.preventDefault();
    el.addEventListener('wheel', prevent, { passive: false });
    return () => el.removeEventListener('wheel', prevent);
  }, []);

  const transform = [
    `translate(${offset.x}px, ${offset.y}px)`,
    `scale(${scale})`,
    `rotate(${rotation}deg)`,
    `scaleX(${flipH ? -1 : 1})`,
  ].join(' ');

  const btnCls = (active?: boolean) =>
    `p-2 rounded-xl transition-all ${
      active
        ? 'bg-brand-accent/20 text-brand-accent'
        : 'hover:bg-surface-3 text-fg-2 hover:text-fg-1 disabled:opacity-30'
    }`;

  return (
    <div className="flex flex-col w-full gap-2" style={{ minHeight: 'calc(100vh - 9rem)' }}>

      {/* ── Toolbar — scrollable on mobile ── */}
      <div className="flex items-center justify-between gap-1 px-2 py-1.5 bg-surface-2/80 border border-line/50 rounded-2xl backdrop-blur-sm overflow-x-auto scrollbar-hide">

        {/* Zoom controls */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={() => applyZoom(scale - 0.25)} disabled={scale <= MIN_SCALE} className={btnCls()}>
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={reset}
            className="px-2 py-1.5 rounded-xl hover:bg-surface-3 transition-all text-xs font-mono text-fg-2 hover:text-fg-1 min-w-[3.5rem] text-center tabular-nums"
          >
            {Math.round(scale * 100)}%
          </button>
          <button onClick={() => applyZoom(scale + 0.25)} disabled={scale >= MAX_SCALE} className={btnCls()}>
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>

        {/* Natural size — hidden on very small screens */}
        {loaded && naturalSize.w > 0 && (
          <span className="hidden sm:block text-[10px] text-fg-4 tabular-nums shrink-0">
            {naturalSize.w}×{naturalSize.h}
          </span>
        )}

        {/* Transform + fullscreen */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={() => setRotation(r => (r + 90) % 360)} className={btnCls()} title="تدوير (R)">
            <RotateCw className="h-4 w-4" />
          </button>
          <button onClick={() => setFlipH(f => !f)} className={btnCls(flipH)} title="عكس (H)">
            <FlipHorizontal className="h-4 w-4" />
          </button>
          <button
            onClick={() => { setFit(f => f === 'contain' ? 'actual' : 'contain'); setScale(1); setOffset({ x: 0, y: 0 }); }}
            className={btnCls(fit === 'actual')}
            title={fit === 'contain' ? 'الحجم الفعلي' : 'ملاءمة الشاشة'}
          >
            {fit === 'contain' ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </button>
          <div className="w-px h-5 bg-line/50 mx-0.5" />
          <button onClick={toggleFullscreen} className={btnCls(fullscreen)} title={fullscreen ? 'خروج (F)' : 'ملء الشاشة (F)'}>
            <Expand className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div
        ref={containerRef}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onDoubleClick={onDoubleClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="flex-1 relative flex items-center justify-center overflow-hidden select-none"
        style={{
          minHeight: 'calc(100vh - 16rem)',
          cursor: isDragging ? 'grabbing' : scale > 1 ? 'grab' : 'zoom-in',
          borderRadius: fullscreen ? 0 : '1rem',
          border: fullscreen ? 'none' : '1px solid hsl(var(--line)/0.4)',
          backgroundImage: `
            linear-gradient(45deg,hsl(var(--surface-3)/0.5) 25%,transparent 25%),
            linear-gradient(-45deg,hsl(var(--surface-3)/0.5) 25%,transparent 25%),
            linear-gradient(45deg,transparent 75%,hsl(var(--surface-3)/0.5) 75%),
            linear-gradient(-45deg,transparent 75%,hsl(var(--surface-3)/0.5) 75%)
          `,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0,0 10px,10px -10px,-10px 0',
          backgroundColor: 'hsl(var(--surface-1)/0.4)',
        }}
      >
        {/* Loading skeleton */}
        {!loaded && !imgError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
            <div className="w-40 h-28 sm:w-64 sm:h-44 rounded-2xl bg-surface-3/50 overflow-hidden relative">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            </div>
            <div className="flex items-center gap-2 text-xs text-fg-4">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              جاري التحميل…
            </div>
          </div>
        )}

        {/* Error */}
        {imgError && (
          <div className="flex flex-col items-center gap-3 text-fg-4 p-6 text-center">
            <AlertTriangle className="h-10 w-10 text-brick-soft" />
            <span className="text-sm">تعذّر تحميل الصورة</span>
          </div>
        )}

        {/* Image */}
        <img
          ref={imgRef}
          src={url}
          alt={name}
          draggable={false}
          onLoad={e => {
            setLoaded(true);
            const img = e.currentTarget;
            setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
          }}
          onError={() => setImgError(true)}
          style={{
            transform,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.18s ease',
            maxWidth: fit === 'contain' ? '100%' : 'none',
            maxHeight: fit === 'contain' ? '100%' : 'none',
            display: loaded ? 'block' : 'none',
            userSelect: 'none',
          } as React.CSSProperties}
          className="shadow-2xl"
        />

        {/* Zoom tip */}
        <AnimatePresence>
          {zoomTip && (
            <motion.div
              key={zoomTip}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur text-white text-sm font-mono px-3 py-1 rounded-xl pointer-events-none"
            >
              {zoomTip}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Hints — keyboard only on desktop, touch on mobile ── */}
      <p className="text-center text-[11px] text-fg-4 pb-1 px-2">
        <span className="hidden sm:inline">
          Scroll = زوم · سحب = تحريك · نقر مزدوج = تكبير ·{' '}
          <kbd className="bg-surface-3 px-1 py-0.5 rounded text-[10px]">R</kbd> تدوير ·{' '}
          <kbd className="bg-surface-3 px-1 py-0.5 rounded text-[10px]">F</kbd> ملء الشاشة
        </span>
        <span className="sm:hidden">
          اضغط مرتين للتكبير · اسحب بإصبعين للزوم
        </span>
      </p>
    </div>
  );
}
