// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/components/media/MediaPlayer.tsx
// PURPOSE: Professional RTL-aware media player
//
//  Video features:
//   ✅ Custom controls bar (auto-hide)
//   ✅ Seek bar with buffered indicator + hover time preview
//   ✅ Play / Pause / Seek ±5s / ±10s
//   ✅ Volume slider + mute
//   ✅ Playback speed menu (0.25x → 3x)
//   ✅ Fullscreen
//   ✅ Picture-in-Picture (PiP)
//   ✅ Theater Mode (darkens the page around the player)
//   ✅ Loop toggle
//   ✅ Keyboard shortcuts (Space/K, ←/→, ↑/↓, F, M, T, P, L, 0-9)
//   ✅ Chapters support (via chapters prop)
//   ✅ Subtitle/caption tracks (via tracks prop)
//
//  Audio features:
//   ✅ Animated waveform-style visualizer (canvas)
//   ✅ Full seek + volume + speed controls
//   ✅ Loop toggle + Sleep timer (15/30/60 min)
//   ✅ Keyboard shortcuts
// ═══════════════════════════════════════════════════════════════════════════════

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type SyntheticEvent,
} from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2,
  Gauge, RotateCcw, RotateCw, Loader2, Music2,
  PictureInPicture2, Tv2, Repeat, Repeat1, Clock,
  Subtitles,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type MediaKind = 'video' | 'audio';

export interface Chapter {
  title: string;
  startTime: number; // seconds
}

export interface SubTrack {
  label: string;
  src: string;
  srclang: string;
  default?: boolean;
}

interface MediaPlayerProps {
  src: string;
  kind: MediaKind;
  poster?: string;
  title?: string;
  className?: string;
  chapters?: Chapter[];
  tracks?: SubTrack[];
}

export interface MediaPlayerHandle {
  pause(): void;
  play(): void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3] as const;
const SLEEP_OPTS = [
  { label: '15 دقيقة', mins: 15 },
  { label: '30 دقيقة', mins: 30 },
  { label: '60 دقيقة', mins: 60 },
];

// ─── Utilities ───────────────────────────────────────────────────────────────

function fmt(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '00:00';
  const t = Math.floor(sec);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${p(h)}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

// ─── Seek Bar ─────────────────────────────────────────────────────────────────

function SeekBar({
  progress, buffered, duration, chapters = [], compact = false,
  onSeek,
}: {
  progress: number; buffered: number; duration: number;
  chapters?: Chapter[]; compact?: boolean;
  onSeek: (pct: number) => void;
}) {
  const [hoverPct, setHoverPct] = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const getHoverChapter = (pct: number) => {
    const t = (pct / 100) * duration;
    const ch = [...chapters].reverse().find(c => c.startTime <= t);
    return ch?.title ?? null;
  };

  return (
    <div
      ref={barRef}
      className={`relative w-full ${compact ? 'h-1.5' : 'h-2'} group/seek`}
      onMouseMove={e => {
        const rect = barRef.current?.getBoundingClientRect();
        if (rect) setHoverPct(clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100));
      }}
      onMouseLeave={() => setHoverPct(null)}
    >
      {/* Track */}
      <div className={`absolute inset-0 rounded-full bg-white/15 overflow-hidden ${compact ? '' : 'group-hover/seek:h-3 transition-all duration-150 -translate-y-0.5'}`}>
        {/* Buffered */}
        <div className="absolute inset-y-0 left-0 bg-white/30 rounded-full" style={{ width: `${Math.min(100, buffered)}%` }} />
        {/* Progress */}
        <div className="absolute inset-y-0 left-0 bg-[hsl(var(--brand-accent))] rounded-full" style={{ width: `${Math.min(100, progress)}%` }} />
        {/* Chapter markers */}
        {chapters.map((ch, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-0.5 bg-white/60"
            style={{ left: `${(ch.startTime / duration) * 100}%` }}
          />
        ))}
      </div>

      {/* Hover tooltip */}
      {hoverPct !== null && !compact && (
        <div
          className="absolute -top-9 bg-black/80 text-white text-xs px-2 py-1 rounded-lg pointer-events-none whitespace-nowrap backdrop-blur"
          style={{ left: `${hoverPct}%`, transform: 'translateX(-50%)' }}
        >
          {fmt((hoverPct / 100) * duration)}
          {getHoverChapter(hoverPct) && (
            <span className="block text-white/60 text-[10px]">{getHoverChapter(hoverPct)}</span>
          )}
        </div>
      )}

      {/* Input */}
      <input
        type="range" min={0} max={100} step={0.01}
        value={progress}
        onChange={e => onSeek(Number(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      />
    </div>
  );
}

// ─── Waveform Visualizer (audio) ──────────────────────────────────────────────

function WaveformBar({ progress }: { progress: number }) {
  const BARS = 48;
  return (
    <div className="flex items-end justify-center gap-[3px] h-12 w-full">
      {Array.from({ length: BARS }).map((_, i) => {
        const pct = (i / BARS) * 100;
        const active = pct <= progress;
        // Pseudo-random heights based on index
        const seed = ((i * 7 + 13) % 17) / 17;
        const h = 20 + seed * 80;
        return (
          <div
            key={i}
            className={`rounded-full flex-1 transition-colors duration-300 ${
              active ? 'bg-brand-accent' : 'bg-white/20'
            }`}
            style={{ height: `${h}%` }}
          />
        );
      })}
    </div>
  );
}

// ─── Icon button ──────────────────────────────────────────────────────────────

function Btn({
  children, light = false, active = false, title, onClick, disabled,
}: {
  children: React.ReactNode;
  light?: boolean;
  active?: boolean;
  title?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-all disabled:opacity-40 ${
        light
          ? `text-white hover:bg-white/15 ${active ? 'text-[hsl(var(--brand-accent-ring))]' : ''}`
          : `text-fg-2 hover:bg-surface-3 hover:text-fg-1 ${active ? 'text-brand-accent' : ''}`
      }`}
    >
      {children}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const MediaPlayer = forwardRef<MediaPlayerHandle, MediaPlayerProps>(function MediaPlayer(
  { src, kind, poster, title, className = '', chapters = [], tracks = [] },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mediaRef     = useRef<HTMLMediaElement>(null);
  const hideTimer    = useRef<number | null>(null);
  const sleepTimer   = useRef<number | null>(null);

  const [playing,       setPlaying]       = useState(false);
  const [muted,         setMuted]         = useState(false);
  const [volume,        setVolume]        = useState(1);
  const [currentTime,   setCurrentTime]   = useState(0);
  const [duration,      setDuration]      = useState(0);
  const [buffered,      setBuffered]      = useState(0);
  const [rate,          setRate]          = useState(1);
  const [fullscreen,    setFullscreen]    = useState(false);
  const [theater,       setTheater]       = useState(false);
  const [loop,          setLoop]          = useState(false);
  const [pip,           setPip]           = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [controlsVis,   setControlsVis]   = useState(true);
  const [showSpeed,     setShowSpeed]     = useState(false);
  const [showSleep,     setShowSleep]     = useState(false);
  const [showSubs,      setShowSubs]      = useState(false);
  const [activeTrack,   setActiveTrack]   = useState<number | null>(tracks.findIndex(t => t.default) ?? null);
  const [sleepLeft,     setSleepLeft]     = useState<number | null>(null);
  const [currentChapter, setCurrentChapter] = useState<string | null>(null);

  // ── Imperative handle ────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    pause: () => mediaRef.current?.pause(),
    play:  () => { void mediaRef.current?.play(); },
  }), []);

  // ── Helpers ──────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const el = mediaRef.current;
    if (!el) return;
    el.paused ? void el.play() : el.pause();
  }, []);

  const seekBy = useCallback((delta: number) => {
    const el = mediaRef.current;
    if (!el || !Number.isFinite(el.duration)) return;
    el.currentTime = clamp(el.currentTime + delta, 0, el.duration);
  }, []);

  const seekTo = useCallback((seconds: number) => {
    const el = mediaRef.current;
    if (!el) return;
    el.currentTime = clamp(seconds, 0, el.duration || seconds);
  }, []);

  const seekPct = useCallback((pct: number) => {
    seekTo((pct / 100) * (mediaRef.current?.duration || 0));
  }, [seekTo]);

  const changeVolume = useCallback((v: number) => {
    const el = mediaRef.current;
    if (!el) return;
    const safe = clamp(v, 0, 1);
    el.volume = safe;
    setVolume(safe);
    if (safe === 0) { el.muted = true; setMuted(true); }
    else if (el.muted) { el.muted = false; setMuted(false); }
  }, []);

  const toggleMute = useCallback(() => {
    const el = mediaRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  }, []);

  const changeRate = useCallback((r: number) => {
    const el = mediaRef.current;
    if (!el) return;
    el.playbackRate = r;
    setRate(r);
    setShowSpeed(false);
  }, []);

  const toggleLoop = useCallback(() => {
    const el = mediaRef.current;
    if (!el) return;
    el.loop = !el.loop;
    setLoop(el.loop);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await containerRef.current.requestFullscreen();
    } catch { /* ignore */ }
  }, []);

  const togglePip = useCallback(async () => {
    const el = mediaRef.current as HTMLVideoElement | null;
    if (!el) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await el.requestPictureInPicture();
    } catch { /* ignore */ }
  }, []);

  const setSleep = useCallback((mins: number) => {
    if (sleepTimer.current) window.clearInterval(sleepTimer.current);
    const end = Date.now() + mins * 60_000;
    setSleepLeft(mins * 60);
    sleepTimer.current = window.setInterval(() => {
      const left = Math.round((end - Date.now()) / 1000);
      if (left <= 0) {
        mediaRef.current?.pause();
        setSleepLeft(null);
        window.clearInterval(sleepTimer.current!);
      } else {
        setSleepLeft(left);
      }
    }, 1000);
    setShowSleep(false);
  }, []);

  const cancelSleep = useCallback(() => {
    if (sleepTimer.current) window.clearInterval(sleepTimer.current);
    setSleepLeft(null);
  }, []);

  // ── Controls auto-hide (video) ───────────────────────────────────
  const scheduleHide = useCallback(() => {
    if (kind !== 'video') return;
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setControlsVis(false), 3000);
  }, [kind]);

  const pingActivity = useCallback(() => {
    setControlsVis(true);
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => () => { if (hideTimer.current) window.clearTimeout(hideTimer.current); }, []);
  useEffect(() => () => { if (sleepTimer.current) window.clearInterval(sleepTimer.current); }, []);

  // ── Chapter detection ────────────────────────────────────────────
  useEffect(() => {
    if (!chapters.length) return;
    const ch = [...chapters].reverse().find(c => c.startTime <= currentTime);
    setCurrentChapter(ch?.title ?? null);
  }, [currentTime, chapters]);

  // ── PiP state ────────────────────────────────────────────────────
  useEffect(() => {
    const onEnter = () => setPip(true);
    const onLeave = () => setPip(false);
    document.addEventListener('enterpictureinpicture', onEnter);
    document.addEventListener('leavepictureinpicture', onLeave);
    return () => {
      document.removeEventListener('enterpictureinpicture', onEnter);
      document.removeEventListener('leavepictureinpicture', onLeave);
    };
  }, []);

  // ── Fullscreen state ──────────────────────────────────────────────
  useEffect(() => {
    const h = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  // ── Subtitle track switching ─────────────────────────────────────
  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;
    for (let i = 0; i < el.textTracks.length; i++) {
      el.textTracks[i].mode = i === activeTrack ? 'showing' : 'disabled';
    }
  }, [activeTrack]);

  // ── Keyboard shortcuts ────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.matches('input,textarea,select,[contenteditable]')) return;
      if (!containerRef.current) return;
      switch (e.key.toLowerCase()) {
        case ' ': case 'k': e.preventDefault(); togglePlay(); break;
        case 'arrowleft':   e.preventDefault(); seekBy(e.shiftKey ? -10 : -5); break;
        case 'arrowright':  e.preventDefault(); seekBy(e.shiftKey ? 10 : 5); break;
        case 'arrowup':     e.preventDefault(); changeVolume(volume + 0.05); break;
        case 'arrowdown':   e.preventDefault(); changeVolume(volume - 0.05); break;
        case 'm':           e.preventDefault(); toggleMute(); break;
        case 'f':           if (kind === 'video') { e.preventDefault(); void toggleFullscreen(); } break;
        case 't':           if (kind === 'video') { e.preventDefault(); setTheater(v => !v); } break;
        case 'p':           if (kind === 'video') { e.preventDefault(); void togglePip(); } break;
        case 'l':           e.preventDefault(); toggleLoop(); break;
        default:
          if (/^[0-9]$/.test(e.key) && duration > 0) seekTo((Number(e.key) / 10) * duration);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [duration, kind, volume, togglePlay, seekBy, seekTo, changeVolume, toggleMute, toggleFullscreen, togglePip, toggleLoop]);

  // ── Media events ──────────────────────────────────────────────────
  const onLoadedMetadata = (e: SyntheticEvent<HTMLMediaElement>) => { setDuration(e.currentTarget.duration || 0); setLoading(false); };
  const onTimeUpdate     = (e: SyntheticEvent<HTMLMediaElement>) => { setCurrentTime(e.currentTarget.currentTime); };
  const onProgress       = (e: SyntheticEvent<HTMLMediaElement>) => {
    const el = e.currentTarget;
    if (el.buffered.length > 0) setBuffered(el.buffered.end(el.buffered.length - 1));
  };
  const onPlay     = () => { setPlaying(true); scheduleHide(); };
  const onPause    = () => { setPlaying(false); setControlsVis(true); };
  const onWaiting  = () => setLoading(true);
  const onCanPlay  = () => setLoading(false);
  const onMediaErr = () => { setLoading(false); setError('تعذّر تحميل الوسائط. تحقّق من الاتصال ثم أعد المحاولة.'); };

  const progress     = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct  = duration > 0 ? (buffered / duration) * 100 : 0;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  AUDIO PLAYER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (kind === 'audio') {
    return (
      <div
        ref={containerRef}
        tabIndex={0}
        className={`w-full rounded-2xl border border-line/60 bg-surface-2/80 backdrop-blur-sm overflow-hidden focus:outline-none ${className}`}
      >
        <audio
          ref={mediaRef as React.RefObject<HTMLAudioElement>}
          src={src}
          preload="metadata"
          loop={loop}
          onLoadedMetadata={onLoadedMetadata}
          onTimeUpdate={onTimeUpdate}
          onProgress={onProgress}
          onPlay={onPlay}
          onPause={onPause}
          onWaiting={onWaiting}
          onCanPlay={onCanPlay}
          onError={onMediaErr}
        />

        {/* Waveform area */}
        <div className="px-3 sm:px-6 pt-4 sm:pt-5 pb-2">
          <WaveformBar progress={progress} />
        </div>

        {/* Seek bar */}
        <div className="px-3 sm:px-6 pb-1">
          <SeekBar
            progress={progress}
            buffered={bufferedPct}
            duration={duration}
            compact
            onSeek={seekPct}
          />
          <div className="flex items-center justify-between text-[11px] text-fg-4 mt-1 tabular-nums">
            <span>{fmt(currentTime)}</span>
            {sleepLeft !== null && (
              <span className="flex items-center gap-1 text-brass-ring">
                <Clock className="h-3 w-3" />
                {fmt(sleepLeft)}
              </span>
            )}
            <span>{fmt(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Seek back */}
          <Btn onClick={() => seekBy(-10)} title="رجوع 10 ثوانٍ">
            <RotateCcw className="h-4 w-4" />
          </Btn>

          {/* Play */}
          <button
            onClick={togglePlay}
            className="h-10 w-10 rounded-full bg-brand-accent flex items-center justify-center hover:bg-brand-accent/90 transition-colors shadow-lg"
          >
            {loading
              ? <Loader2 className="h-5 w-5 text-white animate-spin" />
              : playing
                ? <Pause className="h-5 w-5 text-white" fill="currentColor" />
                : <Play  className="h-5 w-5 text-white" fill="currentColor" />
            }
          </button>

          {/* Seek fwd */}
          <Btn onClick={() => seekBy(10)} title="تقدّم 10 ثوانٍ">
            <RotateCw className="h-4 w-4" />
          </Btn>

          {/* Volume */}
          <Btn onClick={toggleMute} title={muted ? 'إلغاء الكتم' : 'كتم'}>
            {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Btn>
          <input
            type="range" min={0} max={1} step={0.02} value={muted ? 0 : volume}
            onChange={e => changeVolume(Number(e.target.value))}
            className="w-16 sm:w-20 h-1 cursor-pointer accent-[hsl(var(--brand-accent))] hidden xs:block"
          />

          <div className="flex-1" />

          {/* Loop */}
          <Btn onClick={toggleLoop} active={loop} title="تكرار">
            {loop ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
          </Btn>

          {/* Speed */}
          <div className="relative">
            <button
              onClick={() => { setShowSpeed(v => !v); setShowSleep(false); }}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${showSpeed ? 'bg-surface-3 text-fg-1' : 'text-fg-3 hover:text-fg-1 hover:bg-surface-3'}`}
            >
              {rate}×
            </button>
            {showSpeed && (
              <div className="absolute bottom-full left-0 mb-2 bg-surface-2/95 border border-line/70 rounded-xl overflow-hidden shadow-xl z-20 backdrop-blur">
                {PLAYBACK_RATES.map(r => (
                  <button
                    key={r}
                    onClick={() => changeRate(r)}
                    className={`block w-full px-4 py-2 text-right text-xs hover:bg-surface-3 transition-colors ${r === rate ? 'text-brand-accent font-semibold' : 'text-fg-2'}`}
                  >
                    {r === 1 ? 'العادية' : `${r}×`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sleep timer */}
          <div className="relative">
            <Btn
              onClick={() => { setShowSleep(v => !v); setShowSpeed(false); }}
              active={sleepLeft !== null}
              title="مؤقت النوم"
            >
              <Clock className="h-4 w-4" />
            </Btn>
            {showSleep && (
              <div className="absolute bottom-full right-0 mb-2 bg-surface-2/95 border border-line/70 rounded-xl overflow-hidden shadow-xl z-20 backdrop-blur min-w-[130px]">
                {sleepLeft !== null && (
                  <button onClick={cancelSleep} className="block w-full px-4 py-2 text-right text-xs text-brick-soft hover:bg-surface-3 transition-colors">
                    إلغاء المؤقت
                  </button>
                )}
                {SLEEP_OPTS.map(opt => (
                  <button
                    key={opt.mins}
                    onClick={() => setSleep(opt.mins)}
                    className="block w-full px-4 py-2 text-right text-xs text-fg-2 hover:bg-surface-3 transition-colors"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && <p className="px-4 pb-3 text-xs text-brick-soft">{error}</p>}
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  VIDEO PLAYER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <>
      {/* Theater mode backdrop */}
      {theater && !fullscreen && (
        <div className="fixed inset-0 bg-black/85 z-30 pointer-events-none" />
      )}

      <div
        ref={containerRef}
        tabIndex={0}
        onMouseMove={pingActivity}
        onMouseLeave={() => playing && setControlsVis(false)}
        onTouchStart={pingActivity}
        className={`group relative w-full overflow-hidden rounded-2xl bg-black focus:outline-none ${
          theater && !fullscreen ? 'z-40' : ''
        } ${className}`}
        style={{ aspectRatio: fullscreen ? 'auto' : '16/9' }}
      >
        {/* ── Video element ── */}
        <video
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          src={src}
          poster={poster}
          playsInline
          preload="metadata"
          loop={loop}
          className="absolute inset-0 h-full w-full object-contain"
          onClick={togglePlay}
          onLoadedMetadata={onLoadedMetadata}
          onTimeUpdate={onTimeUpdate}
          onProgress={onProgress}
          onPlay={onPlay}
          onPause={onPause}
          onWaiting={onWaiting}
          onCanPlay={onCanPlay}
          onError={onMediaErr}
        >
          {tracks.map((t, i) => (
            <track key={i} kind="subtitles" src={t.src} srcLang={t.srclang} label={t.label} default={t.default} />
          ))}
        </video>

        {/* ── Loading spinner ── */}
        {loading && !error && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 z-10">
            <Loader2 className="h-10 w-10 animate-spin text-white/80" />
          </div>
        )}

        {/* ── Error overlay ── */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10 p-6 text-center">
            <p className="rounded-xl border border-brick/30 bg-brick/15 px-4 py-3 text-sm text-brick-soft">
              {error}
            </p>
          </div>
        )}

        {/* ── Big play button (paused) ── */}
        {!playing && !loading && !error && (
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/25 hover:bg-black/35 transition-colors z-10"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/15 border border-white/30 backdrop-blur-md hover:scale-105 transition-transform shadow-2xl">
              <Play className="h-9 w-9 text-white" fill="currentColor" />
            </span>
          </button>
        )}

        {/* ── Chapter label ── */}
        {currentChapter && controlsVis && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur text-white text-xs px-3 py-1.5 rounded-xl pointer-events-none z-20">
            {currentChapter}
          </div>
        )}

        {/* ── Controls bar ── */}
        <div
          className={`absolute inset-x-0 bottom-0 z-20 px-2 sm:px-4 pb-2 sm:pb-3 pt-8 sm:pt-12 transition-opacity duration-300 ${
            controlsVis || !playing ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)' }}
          onMouseEnter={() => setControlsVis(true)}
        >
          {/* Seek bar */}
          <SeekBar
            progress={progress}
            buffered={bufferedPct}
            duration={duration}
            chapters={chapters}
            onSeek={seekPct}
          />

          {/* Bottom row */}
          <div className="mt-1.5 sm:mt-2 flex items-center gap-0.5 sm:gap-1 text-white">
            {/* Play / Seek */}
            <Btn onClick={togglePlay} light title={playing ? 'إيقاف مؤقت (K)' : 'تشغيل (K)'}>
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Btn>
            <Btn onClick={() => seekBy(-10)} light title="رجوع 10 ثوانٍ"><RotateCcw className="h-4 w-4" /></Btn>
            <Btn onClick={() => seekBy(10)}  light title="تقدّم 10 ثوانٍ"><RotateCw  className="h-4 w-4" /></Btn>

            {/* Volume */}
            <Btn onClick={toggleMute} light title="كتم (M)">
              {muted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Btn>
            <input
              type="range" min={0} max={1} step={0.02} value={muted ? 0 : volume}
              onChange={e => changeVolume(Number(e.target.value))}
              className="w-16 sm:w-24 h-1 cursor-pointer accent-white hidden sm:block"
            />

            {/* Time */}
            <span className="mx-2 text-xs text-white/80 tabular-nums hidden sm:block">
              {fmt(currentTime)} <span className="text-white/40">/ {fmt(duration)}</span>
            </span>

            <div className="flex-1" />

            {/* Loop */}
            <Btn onClick={toggleLoop} light active={loop} title="تكرار (L)">
              {loop ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
            </Btn>

            {/* Speed */}
            <div className="relative">
              <button
                onClick={() => { setShowSpeed(v => !v); setShowSubs(false); setShowSleep(false); }}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-white hover:bg-white/15 transition-colors"
              >
                <Gauge className="h-4 w-4" />
                <span>{rate}×</span>
              </button>
              {showSpeed && (
                <div className="absolute bottom-full right-0 mb-2 bg-black/90 border border-white/15 rounded-xl overflow-hidden shadow-2xl z-30 backdrop-blur min-w-[110px]">
                  {PLAYBACK_RATES.map(r => (
                    <button
                      key={r}
                      onClick={() => changeRate(r)}
                      className={`block w-full px-4 py-2 text-right text-xs hover:bg-white/10 transition-colors ${r === rate ? 'text-[hsl(var(--brand-accent-ring))] font-semibold' : 'text-white/80'}`}
                    >
                      {r === 1 ? 'العادية' : `${r}×`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Subtitles */}
            {tracks.length > 0 && (
              <div className="relative">
                <Btn
                  light
                  active={activeTrack !== null}
                  onClick={() => { setShowSubs(v => !v); setShowSpeed(false); setShowSleep(false); }}
                  title="الترجمات"
                >
                  <Subtitles className="h-4 w-4" />
                </Btn>
                {showSubs && (
                  <div className="absolute bottom-full right-0 mb-2 bg-black/90 border border-white/15 rounded-xl overflow-hidden shadow-2xl z-30 backdrop-blur min-w-[130px]">
                    <button
                      onClick={() => { setActiveTrack(null); setShowSubs(false); }}
                      className={`block w-full px-4 py-2 text-right text-xs hover:bg-white/10 transition-colors ${activeTrack === null ? 'text-[hsl(var(--brand-accent-ring))]' : 'text-white/80'}`}
                    >
                      بدون ترجمة
                    </button>
                    {tracks.map((t, i) => (
                      <button
                        key={i}
                        onClick={() => { setActiveTrack(i); setShowSubs(false); }}
                        className={`block w-full px-4 py-2 text-right text-xs hover:bg-white/10 transition-colors ${activeTrack === i ? 'text-[hsl(var(--brand-accent-ring))]' : 'text-white/80'}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sleep timer */}
            <div className="relative">
              <Btn light active={sleepLeft !== null} onClick={() => { setShowSleep(v => !v); setShowSpeed(false); setShowSubs(false); }} title="مؤقت النوم">
                <Clock className="h-4 w-4" />
              </Btn>
              {sleepLeft !== null && (
                <span className="absolute -top-1 -right-1 text-[9px] bg-brand-accent text-white rounded-full px-1 leading-4 pointer-events-none">
                  {Math.ceil(sleepLeft / 60)}د
                </span>
              )}
              {showSleep && (
                <div className="absolute bottom-full right-0 mb-2 bg-black/90 border border-white/15 rounded-xl overflow-hidden shadow-2xl z-30 backdrop-blur min-w-[130px]">
                  {sleepLeft !== null && (
                    <button onClick={cancelSleep} className="block w-full px-4 py-2 text-right text-xs text-brick-soft hover:bg-white/10 transition-colors">
                      إلغاء ({fmt(sleepLeft)})
                    </button>
                  )}
                  {SLEEP_OPTS.map(opt => (
                    <button key={opt.mins} onClick={() => setSleep(opt.mins)} className="block w-full px-4 py-2 text-right text-xs text-white/80 hover:bg-white/10 transition-colors">
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* PiP */}
            {'pictureInPictureEnabled' in document && window.innerWidth >= 640 && (
              <Btn light active={pip} onClick={togglePip} title="صورة داخل صورة (P)">
                <PictureInPicture2 className="h-4 w-4" />
              </Btn>
            )}

            {/* Theater — desktop only */}
            <Btn light active={theater} onClick={() => setTheater(v => !v)} title="وضع السينما (T)" className="hidden sm:inline-flex">
              <Tv2 className="h-4 w-4" />
            </Btn>

            {/* Fullscreen */}
            <Btn light onClick={toggleFullscreen} title="ملء الشاشة (F)">
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Btn>
          </div>
        </div>
      </div>
    </>
  );
});

export default MediaPlayer;
