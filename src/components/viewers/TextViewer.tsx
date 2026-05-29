// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/components/viewers/TextViewer.tsx
// PURPOSE: Professional text / code / markdown viewer
//
//  ✅ Auto-detects: Markdown → full typography renderer
//                  Code    → token-based syntax highlighting (no external lib)
//                  Text    → clean readable view
//  ✅ Syntax highlighting with CSS classes (built-in tokenizer)
//  ✅ Line numbers (toggle)
//  ✅ Word-wrap toggle
//  ✅ In-page search (Ctrl+F) with match highlighting + navigation
//  ✅ Copy entire file
//  ✅ Jump to line
//  ✅ Markdown: Table of Contents (auto-generated from headings)
//  ✅ Markdown: Dark / Light theme toggle
//  ✅ Diff viewer: detects unified diff format and renders +/− lines colored
//  ✅ Language detection from extension
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Markdown from 'markdown-to-jsx';
import {
  Hash, WrapText, Search, X, Copy, Check, ChevronUp, ChevronDown,
  Loader2, AlertTriangle, Code2, BookOpen, List, Sun, Moon,
  CornerDownRight, RefreshCw,
} from 'lucide-react';

// ─── Language detection ───────────────────────────────────────────────────────

function getExt(name: string) { return name.split('.').pop()?.toLowerCase() || ''; }

function isMarkdown(name: string) { return ['md', 'mdx', 'markdown'].includes(getExt(name)); }

function isDiff(content: string) {
  return content.split('\n').slice(0, 20).some(l => l.startsWith('--- ') || l.startsWith('+++ '));
}

const LANG_MAP: Record<string, string> = {
  js: 'JavaScript', ts: 'TypeScript', tsx: 'TSX', jsx: 'JSX',
  py: 'Python', rb: 'Ruby', go: 'Go', rs: 'Rust', java: 'Java',
  c: 'C', cpp: 'C++', cs: 'C#', php: 'PHP', swift: 'Swift',
  kt: 'Kotlin', html: 'HTML', css: 'CSS', scss: 'SCSS', less: 'Less',
  json: 'JSON', yaml: 'YAML', yml: 'YAML', toml: 'TOML', xml: 'XML',
  sh: 'Shell', bash: 'Bash', zsh: 'Zsh', sql: 'SQL',
  graphql: 'GraphQL', vue: 'Vue', svelte: 'Svelte',
  r: 'R', dart: 'Dart', lua: 'Lua', md: 'Markdown', txt: 'Text',
};

function getLang(name: string) { return LANG_MAP[getExt(name)] || getExt(name).toUpperCase() || 'Text'; }

// ─── Simple tokenizer ─────────────────────────────────────────────────────────
// Highlights: strings, comments, keywords, numbers, booleans, operators, types

const KEYWORDS_JS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
  'do', 'switch', 'case', 'break', 'continue', 'class', 'extends', 'import',
  'export', 'default', 'from', 'new', 'this', 'super', 'typeof', 'instanceof',
  'void', 'delete', 'in', 'of', 'try', 'catch', 'finally', 'throw', 'async',
  'await', 'yield', 'static', 'get', 'set', 'null', 'undefined',
  // Python
  'def', 'pass', 'lambda', 'with', 'as', 'assert', 'del', 'global', 'nonlocal',
  'raise', 'elif', 'not', 'and', 'or', 'is', 'none',
  // Go / Rust / etc
  'fn', 'let', 'mut', 'pub', 'use', 'mod', 'impl', 'trait', 'struct', 'enum',
  'match', 'type', 'interface', 'package', 'defer', 'go', 'chan', 'select',
]);

const TYPES_TS = new Set([
  'string', 'number', 'boolean', 'object', 'any', 'never', 'unknown',
  'void', 'Promise', 'Array', 'Record', 'Partial', 'Required', 'Readonly',
  'Pick', 'Omit', 'Extract', 'Exclude', 'ReturnType', 'Parameters',
]);

type Token = { kind: 'kw' | 'type' | 'str' | 'comment' | 'num' | 'bool' | 'op' | 'plain'; text: string };

function tokenize(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < line.length) {
    // Comment //
    if (line[i] === '/' && line[i + 1] === '/') {
      tokens.push({ kind: 'comment', text: line.slice(i) });
      break;
    }
    // Comment #
    if (line[i] === '#') {
      tokens.push({ kind: 'comment', text: line.slice(i) });
      break;
    }
    // String " or '
    if (line[i] === '"' || line[i] === "'" || line[i] === '`') {
      const q = line[i];
      let j = i + 1;
      while (j < line.length && (line[j] !== q || line[j - 1] === '\\')) j++;
      j++;
      tokens.push({ kind: 'str', text: line.slice(i, j) });
      i = j;
      continue;
    }
    // Number
    if (/[0-9]/.test(line[i]) && (i === 0 || !/[a-zA-Z_]/.test(line[i - 1]))) {
      let j = i;
      while (j < line.length && /[0-9._xXa-fA-FbBoO]/.test(line[j])) j++;
      tokens.push({ kind: 'num', text: line.slice(i, j) });
      i = j;
      continue;
    }
    // Word
    if (/[a-zA-Z_$]/.test(line[i])) {
      let j = i;
      while (j < line.length && /[a-zA-Z0-9_$]/.test(line[j])) j++;
      const word = line.slice(i, j);
      if (word === 'true' || word === 'false') tokens.push({ kind: 'bool', text: word });
      else if (KEYWORDS_JS.has(word))          tokens.push({ kind: 'kw',   text: word });
      else if (TYPES_TS.has(word))             tokens.push({ kind: 'type', text: word });
      else                                      tokens.push({ kind: 'plain', text: word });
      i = j;
      continue;
    }
    // Operator
    if (/[=<>!+\-*/%&|^~?:;,(){}[\].]/.test(line[i])) {
      tokens.push({ kind: 'op', text: line[i] });
      i++;
      continue;
    }
    // Plain
    tokens.push({ kind: 'plain', text: line[i] });
    i++;
  }
  return tokens;
}

const TOKEN_COLOR: Record<Token['kind'], string> = {
  kw:      'text-[hsl(280,65%,72%)]',   // purple — keywords
  type:    'text-[hsl(195,65%,65%)]',   // cyan   — types
  str:     'text-[hsl(142,50%,60%)]',   // green  — strings
  comment: 'text-[hsl(0,0%,45%)] italic', // gray — comments
  num:     'text-[hsl(30,80%,65%)]',    // orange — numbers
  bool:    'text-[hsl(350,70%,65%)]',   // red    — booleans
  op:      'text-[hsl(0,0%,65%)]',      // light gray — operators
  plain:   'text-[hsl(0,0%,85%)]',      // white-ish — identifiers
};

// ─── Table of contents ────────────────────────────────────────────────────────

interface Heading { level: number; text: string; id: string }

function extractHeadings(md: string): Heading[] {
  return md.split('\n')
    .filter(l => /^#{1,4}\s/.test(l))
    .map(l => {
      const m = l.match(/^(#{1,4})\s+(.+)/);
      if (!m) return null;
      const text = m[2].replace(/[*_`]/g, '');
      return { level: m[1].length, text, id: text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') };
    })
    .filter(Boolean) as Heading[];
}

// ─── Search utility ───────────────────────────────────────────────────────────

function findMatches(content: string, query: string): number[] {
  if (!query.trim()) return [];
  const lines = content.split('\n');
  const results: number[] = [];
  const q = query.toLowerCase();
  lines.forEach((line, i) => { if (line.toLowerCase().includes(q)) results.push(i); });
  return results;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DiffLine({ line }: { line: string }) {
  if (line.startsWith('+') && !line.startsWith('+++'))
    return <div className="bg-sage/10 border-l-2 border-sage text-sage pl-3 pr-2 font-mono text-xs leading-6 whitespace-pre">{line}</div>;
  if (line.startsWith('-') && !line.startsWith('---'))
    return <div className="bg-brick/10 border-l-2 border-brick-soft text-brick-soft pl-3 pr-2 font-mono text-xs leading-6 whitespace-pre">{line}</div>;
  if (line.startsWith('@@'))
    return <div className="bg-brand-accent/10 text-brand-accent pl-3 pr-2 font-mono text-xs leading-6 whitespace-pre">{line}</div>;
  if (line.startsWith('---') || line.startsWith('+++'))
    return <div className="text-fg-4 pl-3 pr-2 font-mono text-xs leading-6 whitespace-pre">{line}</div>;
  return <div className="pl-3 pr-2 font-mono text-xs leading-6 text-fg-2 whitespace-pre">{line}</div>;
}

function MarkdownContent({ content, dark }: { content: string; dark: boolean }) {
  return (
    <div className={`max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-8 ${dark ? '' : 'bg-white text-gray-900'}`}>
      <div className={`prose ${dark ? 'prose-invert' : ''} prose-sm sm:prose-base max-w-none
        prose-headings:font-bold prose-headings:tracking-tight
        ${dark ? 'prose-headings:text-fg-1 prose-p:text-fg-2 prose-li:text-fg-2 prose-strong:text-fg-1 prose-a:text-brand-accent prose-code:text-brass-ring prose-code:bg-surface-3/80 prose-blockquote:border-brand-accent/60 prose-blockquote:text-fg-3 prose-blockquote:bg-brand-accent/5 prose-th:text-fg-1 prose-td:text-fg-2 prose-hr:border-line/40'
         : 'prose-p:text-gray-700 prose-li:text-gray-700 prose-code:text-purple-700 prose-code:bg-purple-50 prose-a:text-blue-600 prose-blockquote:border-blue-400 prose-th:text-gray-900'}
        prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
        prose-pre:rounded-2xl prose-pre:text-sm prose-pre:leading-6 prose-pre:overflow-x-auto
        ${dark ? 'prose-pre:bg-surface-3 prose-pre:border prose-pre:border-line/50' : 'prose-pre:bg-gray-900 prose-pre:text-gray-100'}
        prose-img:rounded-xl prose-img:shadow-lg
        prose-h1:text-2xl prose-h1:border-b prose-h1:pb-3 prose-h1:mb-6
        ${dark ? 'prose-h1:border-line/60' : 'prose-h1:border-gray-200'}
      `}>
        <Markdown>{content}</Markdown>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function TextViewer({ url, name }: { url: string; name: string; mimeType?: string }) {
  const [content,    setContent]    = useState<string | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [retryKey,   setRetryKey]   = useState(0);
  const [progress,   setProgress]   = useState(0); // 0-100 for loading bar
  const [wrap,       setWrap]       = useState(false);
  const [showLines,  setShowLines]  = useState(true);
  const [dark,       setDark]       = useState(true);
  const [showToc,    setShowToc]    = useState(false);
  const [copied,     setCopied]     = useState(false);
  const [search,     setSearch]     = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [matchIdx,   setMatchIdx]   = useState(0);
  const [jumpLine,   setJumpLine]   = useState('');
  const [showJump,   setShowJump]   = useState(false);
  const contentRef  = useRef<HTMLDivElement>(null);
  const searchRef   = useRef<HTMLInputElement>(null);

  const md   = isMarkdown(name);
  const lang = getLang(name);

  // ── Fetch with progress simulation ───────────────────────────────
  useEffect(() => {
    setLoading(true);
    setFetchError(false);
    setContent(null);
    setProgress(0);

    // Simulate progress while fetching (no real XHR progress for text)
    let prog = 0;
    const progTimer = window.setInterval(() => {
      prog = Math.min(prog + Math.random() * 15, 85);
      setProgress(Math.round(prog));
    }, 200);

    fetch(url)
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then(t => {
        window.clearInterval(progTimer);
        setProgress(100);
        // Small delay so 100% is visible
        setTimeout(() => {
          setContent(t);
          setLoading(false);
          setProgress(0);
        }, 200);
      })
      .catch(() => {
        window.clearInterval(progTimer);
        setFetchError(true);
        setLoading(false);
        setProgress(0);
      });

    return () => window.clearInterval(progTimer);
  }, [url, retryKey]);

  // ── Derived ───────────────────────────────────────────────────────
  const headings = useMemo(() => md && content ? extractHeadings(content) : [], [md, content]);
  const lines    = useMemo(() => content?.split('\n') ?? [], [content]);
  const matches  = useMemo(() => findMatches(content ?? '', search), [content, search]);
  const isDiffFile = useMemo(() => content ? isDiff(content) : false, [content]);

  // ── Search keyboard ───────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(v => { if (!v) setTimeout(() => searchRef.current?.focus(), 50); return true; });
      }
      if (e.key === 'Escape') { setShowSearch(false); setSearch(''); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Copy ──────────────────────────────────────────────────────────
  const handleCopy = useCallback(() => {
    if (!content) return;
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, [content]);

  // ── Jump to line ──────────────────────────────────────────────────
  const handleJump = useCallback(() => {
    const n = parseInt(jumpLine, 10);
    if (!n || n < 1 || n > lines.length) return;
    const el = contentRef.current?.querySelector(`[data-line="${n - 1}"]`);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setShowJump(false);
    setJumpLine('');
  }, [jumpLine, lines.length]);

  // ── Match navigation ──────────────────────────────────────────────
  const goMatch = useCallback((dir: 1 | -1) => {
    if (!matches.length) return;
    const next = (matchIdx + dir + matches.length) % matches.length;
    setMatchIdx(next);
    const el = contentRef.current?.querySelector(`[data-line="${matches[next]}"]`);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [matchIdx, matches]);

  // ── Toolbar button style ──────────────────────────────────────────
  const tb = (active?: boolean) =>
    `flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all ${
      active ? 'bg-surface-3 text-fg-1' : 'text-fg-4 hover:text-fg-2 hover:bg-surface-3'
    }`;

  if (loading) return (
    <div className="w-full flex flex-col rounded-2xl border border-line/50 overflow-hidden" style={{ minHeight: 'calc(100svh - 8rem)' }}>
      {/* Fake toolbar skeleton */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-surface-2/90 border-b border-line/40">
        <div className="h-7 w-7 rounded-lg bg-surface-3/60 animate-pulse" />
        <div className="h-4 w-36 rounded bg-surface-3/50 animate-pulse" />
        <div className="h-4 w-12 rounded-full bg-surface-3/40 animate-pulse" />
        <div className="flex-1" />
        <div className="h-4 w-24 rounded bg-surface-3/30 animate-pulse hidden sm:block" />
      </div>

      {/* Progress bar */}
      {progress > 0 && (
        <div className="h-0.5 bg-surface-3 shrink-0">
          <div
            className="h-full bg-brand-accent transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Content skeleton */}
      <div className="flex flex-1 gap-0">
        {/* Line numbers skeleton */}
        <div className="w-12 bg-surface-3/40 border-r border-line/30 py-5 px-3 space-y-2 shrink-0">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="h-3 rounded bg-surface-3/50 animate-pulse" style={{ width: `${40 + (i % 3) * 20}%`, animationDelay: `${i * 40}ms` }} />
          ))}
        </div>
        {/* Code lines skeleton */}
        <div className="flex-1 py-5 px-5 space-y-2">
          {Array.from({ length: 18 }).map((_, i) => {
            const widths = [70, 90, 55, 80, 45, 95, 65, 75, 50, 85, 60, 88, 40, 78, 92, 52, 70, 83];
            return (
              <div key={i} className="h-3 rounded bg-surface-3/40 animate-pulse" style={{ width: `${widths[i] ?? 70}%`, animationDelay: `${i * 30}ms` }} />
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 py-3 border-t border-line/30 text-xs text-fg-4">
        <Loader2 className="h-3 w-3 animate-spin" />
        جاري تحميل {getLang(name)}…
        {progress > 0 && <span className="tabular-nums">{progress}%</span>}
      </div>
    </div>
  );

  if (fetchError || content === null) return (
    <div className="w-full flex flex-col items-center justify-center gap-5 rounded-2xl border border-line/50 bg-surface-2/60 py-24 text-center" style={{ minHeight: 'calc(100vh - 9rem)' }}>
      <div className="w-16 h-16 rounded-2xl bg-brick/10 border border-brick/20 flex items-center justify-center">
        <AlertTriangle className="h-8 w-8 text-brick-soft" />
      </div>
      <div>
        <p className="font-semibold text-fg-1 mb-1">تعذّر تحميل الملف</p>
        <p className="text-sm text-fg-3">تحقق من اتصالك أو حاول مرة أخرى</p>
      </div>
      <button
        onClick={() => setRetryKey(k => k + 1)}
        className="btn-primary gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        إعادة المحاولة
      </button>
    </div>
  );

  const lineCount = lines.length;
  const charCount = content.length;

  return (
    <div className="w-full flex flex-col rounded-2xl border border-line/50 overflow-hidden" style={{ minHeight: 'calc(100svh - 8rem)' }}>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 bg-surface-2/90 border-b border-line/40 shrink-0">
        {/* Left */}
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${
            md ? 'bg-sage/15 border-sage/25' : 'bg-brand-accent/15 border-brand-accent/25'
          }`}>
            {md ? <BookOpen className="h-3.5 w-3.5 text-sage" /> : <Code2 className="h-3.5 w-3.5 text-brand-accent" />}
          </div>
          <span className="text-xs sm:text-sm font-medium text-fg-1 truncate max-w-[100px] sm:max-w-[180px]">{name}</span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
            md ? 'bg-sage/10 border-sage/20 text-sage' : 'bg-brand-accent/10 border-brand-accent/20 text-brand-accent'
          }`}>
            {isDiffFile ? 'Diff' : lang}
          </span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs text-fg-4 hidden md:block tabular-nums mr-1">
            {lineCount.toLocaleString()} سطر · {charCount.toLocaleString()} حرف
          </span>

          {/* Search */}
          <button onClick={() => { setShowSearch(v => !v); setTimeout(() => searchRef.current?.focus(), 50); }} className={tb(showSearch)}>
            <Search className="h-3 w-3" />
            <span className="hidden sm:block">بحث</span>
          </button>

          {/* Jump to line */}
          {!md && (
            <div className="relative">
              <button onClick={() => setShowJump(v => !v)} className={tb(showJump)}>
                <CornerDownRight className="h-3 w-3" />
                <span className="hidden lg:block">انتقل لسطر</span>
              </button>
              {showJump && (
                <div className="absolute top-full right-0 mt-1 bg-surface-2 border border-line/70 rounded-xl p-2 z-20 flex gap-2 shadow-lg">
                  <input
                    autoFocus
                    type="number"
                    value={jumpLine}
                    onChange={e => setJumpLine(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleJump()}
                    placeholder={`1–${lineCount}`}
                    className="field !py-1 text-xs w-24"
                  />
                  <button onClick={handleJump} className="btn-primary !py-1 text-xs">انتقل</button>
                </div>
              )}
            </div>
          )}

          {/* Markdown ToC */}
          {md && headings.length > 0 && (
            <button onClick={() => setShowToc(v => !v)} className={tb(showToc)}>
              <List className="h-3 w-3" />
              <span className="hidden lg:block">الفهرس</span>
            </button>
          )}

          {/* Dark/Light (markdown) */}
          {md && (
            <button onClick={() => setDark(v => !v)} className={tb()}>
              {dark ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
            </button>
          )}

          {/* Code tools */}
          {!md && (
            <>
              <button onClick={() => setShowLines(v => !v)} className={tb(showLines)}>
                <Hash className="h-3 w-3" />
              </button>
              <button onClick={() => setWrap(v => !v)} className={tb(wrap)}>
                <WrapText className="h-3 w-3" />
              </button>
            </>
          )}

          {/* Copy */}
          <button onClick={handleCopy} className={tb(copied)}>
            {copied ? <Check className="h-3 w-3 text-sage" /> : <Copy className="h-3 w-3" />}
            <span className="hidden sm:block">{copied ? 'تم!' : 'نسخ'}</span>
          </button>
        </div>
      </div>

      {/* ── Search bar ── */}
      {showSearch && (
        <div className="flex items-center gap-2 px-4 py-2 bg-surface-3/80 border-b border-line/40 shrink-0">
          <Search className="h-4 w-4 text-fg-4 shrink-0" />
          <input
            ref={searchRef}
            value={search}
            onChange={e => { setSearch(e.target.value); setMatchIdx(0); }}
            onKeyDown={e => {
              if (e.key === 'Enter') goMatch(e.shiftKey ? -1 : 1);
              if (e.key === 'Escape') { setShowSearch(false); setSearch(''); }
            }}
            placeholder="ابحث في الملف… (Enter = التالي)"
            className="flex-1 bg-transparent outline-none text-sm text-fg-1 placeholder:text-fg-4"
          />
          {search && (
            <>
              <span className="text-xs text-fg-4 tabular-nums shrink-0">
                {matches.length > 0 ? `${matchIdx + 1}/${matches.length}` : 'لا نتائج'}
              </span>
              <button onClick={() => goMatch(-1)} disabled={!matches.length} className="p-1 rounded hover:bg-surface-2 disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5 text-fg-3" /></button>
              <button onClick={() => goMatch(1)} disabled={!matches.length} className="p-1 rounded hover:bg-surface-2 disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5 text-fg-3" /></button>
            </>
          )}
          <button onClick={() => { setShowSearch(false); setSearch(''); }} className="p-1 rounded hover:bg-surface-2">
            <X className="h-3.5 w-3.5 text-fg-3" />
          </button>
        </div>
      )}

      {/* ── Body (flex row: optional ToC + content) ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ToC sidebar (markdown) */}
        {md && showToc && headings.length > 0 && (
          <div className="w-44 sm:w-56 shrink-0 border-l border-line/40 bg-surface-2/60 overflow-auto py-3 sm:py-4 px-2 sm:px-3">
            <p className="text-[10px] font-semibold text-fg-4 uppercase tracking-wider mb-3">الفهرس</p>
            {headings.map((h, i) => (
              <a
                key={i}
                href={`#${h.id}`}
                className="block py-1 text-xs text-fg-3 hover:text-fg-1 transition-colors truncate"
                style={{ paddingRight: `${(h.level - 1) * 12}px` }}
              >
                {h.text}
              </a>
            ))}
          </div>
        )}

        {/* Content */}
        <div ref={contentRef} className={`flex-1 overflow-auto ${dark || !md ? 'bg-surface-1/90' : 'bg-white'}`}>

          {/* Markdown */}
          {md && <MarkdownContent content={content} dark={dark} />}

          {/* Diff */}
          {!md && isDiffFile && (
            <div className="p-2">
              {lines.map((line, i) => (
                <div
                  key={i}
                  data-line={i}
                  className={matches.includes(i) ? 'ring-1 ring-brand-accent/60 rounded' : ''}
                >
                  <DiffLine line={line} />
                </div>
              ))}
            </div>
          )}

          {/* Code with syntax highlighting */}
          {!md && !isDiffFile && (
            <div className="flex text-sm font-mono leading-6 min-h-full">
              {/* Line numbers */}
              {showLines && (
                <div
                  className="select-none text-right text-fg-4 border-r border-line/30 bg-surface-3/40 shrink-0 py-5"
                  style={{ minWidth: `${String(lineCount).length * 0.6 + 1}rem`, paddingLeft: '0.5rem', paddingRight: '0.5rem', fontSize: '0.7rem' }}
                >
                  {lines.map((_, i) => (
                    <div
                      key={i}
                      className={`leading-6 cursor-pointer hover:text-fg-1 transition-colors ${
                        matches.includes(i) ? 'text-brand-accent font-semibold' : ''
                      }`}
                      onClick={() => {
                        const el = contentRef.current?.querySelector(`[data-line="${i}"]`);
                        el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
                      }}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
              )}

              {/* Code */}
              <pre
                className="flex-1 px-3 sm:px-5 py-3 sm:py-5 overflow-x-auto text-xs sm:text-sm"
                style={{ whiteSpace: wrap ? 'pre-wrap' : 'pre', wordBreak: wrap ? 'break-all' : 'normal' }}
              >
                {lines.map((line, i) => {
                  const isMatch = search && matches.includes(i);
                  const tokens = tokenize(line);
                  return (
                    <div
                      key={i}
                      data-line={i}
                      className={`leading-6 ${
                        isMatch
                          ? i === matches[matchIdx]
                            ? 'bg-brand-accent/20 -mx-5 px-5 rounded'
                            : 'bg-brand-accent/8 -mx-5 px-5'
                          : ''
                      }`}
                    >
                      {tokens.map((tok, j) => {
                        const text = search && isMatch
                          ? tok.text.replace(
                              new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
                              '<mark>$1</mark>'
                            )
                          : null;

                        return text
                          ? <span key={j} className={TOKEN_COLOR[tok.kind]} dangerouslySetInnerHTML={{ __html: text }} />
                          : <span key={j} className={TOKEN_COLOR[tok.kind]}>{tok.text}</span>;
                      })}
                      {'\n'}
                    </div>
                  );
                })}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
