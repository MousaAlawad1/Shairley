# خطة ثيم الواجهة الجديد — Shairley Professional Theme

> **الهدف:** تحويل الواجهة من "Dark Startup" إلى "Professional Enterprise" — رسمي، نظيف، يوحي بالثقة والاحترافية.

---

## 1. فلسفة الثيم الجديد

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   قبل: "Dark Techy Startup"                                │
│   → ألوان نيون، gradients قوية، أجواء مطورين               │
│                                                             │
│   بعد: "Professional Enterprise"                            │
│   → نظيف، هادئ، رسمي، يصلح لبيئة عمل حقيقية              │
│                                                             │
│   الإلهام: Linear, Notion, Vercel Dashboard, Apple Pro      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### المبادئ:
1. **الهدوء** — لا ألوان صارخة، لا حركات مبالغ فيها
2. **الوضوح** — كل عنصر له غرض واضح
3. **المساحة البيضاء** — تنفّس بصري بين العناصر
4. **التدرج** — hierarchy واضح بين العناوين والمحتوى
5. **الاتساق** — نفس اللغة البصرية في كل صفحة

---

## 2. لوحة الألوان (Color Palette)

### الوضع الداكن (Dark Mode — الأساسي)

```css
/* ─── الخلفيات ─── */
--bg-primary:      #0a0a0b;      /* أسود عميق نظيف */
--bg-secondary:    #111113;      /* بطاقات */
--bg-tertiary:     #1a1a1e;      /* عناصر مرتفعة */
--bg-elevated:     #222226;      /* dropdowns, modals */
--bg-hover:        #2a2a2f;      /* hover states */

/* ─── النصوص ─── */
--text-primary:    #f5f5f7;      /* عناوين رئيسية */
--text-secondary:  #a1a1a6;      /* نصوص ثانوية */
--text-tertiary:   #6e6e73;      /* تلميحات، metadata */
--text-disabled:   #48484a;      /* معطّل */

/* ─── الحدود ─── */
--border-subtle:   #1d1d1f;      /* حدود خفيفة */
--border-default:  #2c2c2e;      /* حدود عادية */
--border-strong:   #3a3a3c;      /* حدود بارزة */

/* ─── اللون الأساسي (Brand) ─── */
--accent-primary:  #2563eb;      /* أزرق احترافي — ليس نيون */
--accent-hover:    #3b82f6;      /* hover */
--accent-muted:    #1d4ed8;      /* pressed */
--accent-subtle:   rgba(37, 99, 235, 0.12);  /* خلفية خفيفة */

/* ─── ألوان الحالة ─── */
--success:         #22c55e;      /* أخضر */
--success-subtle:  rgba(34, 197, 94, 0.12);
--warning:         #f59e0b;      /* أصفر */
--warning-subtle:  rgba(245, 158, 11, 0.12);
--error:           #ef4444;      /* أحمر */
--error-subtle:    rgba(239, 68, 68, 0.12);
--info:            #06b6d4;      /* سماوي */
--info-subtle:     rgba(6, 182, 212, 0.12);
```

### الوضع الفاتح (Light Mode — اختياري مستقبلاً)

```css
--bg-primary:      #ffffff;
--bg-secondary:    #f9fafb;
--bg-tertiary:     #f3f4f6;
--bg-elevated:     #ffffff;
--text-primary:    #111827;
--text-secondary:  #6b7280;
--text-tertiary:   #9ca3af;
--border-subtle:   #f3f4f6;
--border-default:  #e5e7eb;
--accent-primary:  #2563eb;
```

---

## 3. الخطوط (Typography)

### الاختيار:

```css
/* العربية — خط رسمي واضح */
--font-arabic: 'IBM Plex Sans Arabic', 'Noto Kufi Arabic', sans-serif;

/* الإنجليزية/الأرقام — خط هندسي نظيف */
--font-latin: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

/* الكود — monospace */
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### التدرج (Scale):

| الاستخدام | الحجم | الوزن | Line Height |
|-----------|-------|-------|-------------|
| Display (عنوان الصفحة) | 32px / 2rem | 700 | 1.2 |
| H1 (عنوان القسم) | 24px / 1.5rem | 600 | 1.3 |
| H2 (عنوان فرعي) | 20px / 1.25rem | 600 | 1.4 |
| H3 (عنوان بطاقة) | 16px / 1rem | 600 | 1.4 |
| Body (نص عادي) | 14px / 0.875rem | 400 | 1.6 |
| Small (metadata) | 12px / 0.75rem | 400 | 1.5 |
| Tiny (badge) | 11px / 0.6875rem | 500 | 1.4 |

### القواعد:
- **العناوين:** وزن 600-700، لون `text-primary`
- **النصوص:** وزن 400، لون `text-secondary`
- **Metadata:** وزن 400، لون `text-tertiary`، حجم أصغر
- **المسافة بين العناوين والمحتوى:** 8px minimum

---

## 4. المكونات (Components Design)

### 4.1 الأزرار (Buttons)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Primary:   bg-accent + text-white + rounded-lg             │
│             hover: أفتح قليلاً | pressed: أغمق             │
│             shadow: none (نظيف بدون ظل)                     │
│                                                             │
│  Secondary: bg-transparent + border + text-secondary        │
│             hover: bg-hover | pressed: bg-tertiary          │
│                                                             │
│  Ghost:     bg-transparent + text-secondary                 │
│             hover: bg-hover | لا حدود                       │
│                                                             │
│  Danger:    bg-error-subtle + text-error                    │
│             hover: bg-error + text-white                    │
│                                                             │
│  الحجم:    sm(32px) | md(36px) | lg(40px)                  │
│  الزوايا:  rounded-lg (8px) — ليس مدوّر بالكامل            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 البطاقات (Cards)

```css
.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 20px;
  transition: border-color 0.15s ease;
}
.card:hover {
  border-color: var(--border-default);
  /* لا shadow — نظيف */
}
```

**القواعد:**
- لا `box-shadow` في الوضع الداكن (الحدود تكفي)
- `border-radius: 12px` موحد لكل البطاقات
- Padding داخلي: `20px` (أو `16px` للبطاقات الصغيرة)
- لا gradients على البطاقات

### 4.3 الحقول (Inputs)

```css
.input {
  background: var(--bg-primary);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 8px 12px;
  color: var(--text-primary);
  font-size: 14px;
  height: 36px;
}
.input:focus {
  border-color: var(--accent-primary);
  outline: none;
  box-shadow: 0 0 0 3px var(--accent-subtle);
}
.input::placeholder {
  color: var(--text-tertiary);
}
```

### 4.4 الـ Navbar

```
┌─────────────────────────────────────────────────────────────┐
│  Logo    │  الرئيسية   مساحات العمل   │   🔔  [Avatar ▾]  │
└─────────────────────────────────────────────────────────────┘

- خلفية: bg-primary مع border-bottom خفيف
- ارتفاع: 56px
- لا blur/glass effect (بسيط ونظيف)
- الروابط: text-secondary → text-primary عند active
- Active indicator: خط سفلي 2px بلون accent
```

### 4.5 الـ Sidebar (داخل Workspace)

```
┌──────────────┬──────────────────────────────────────────────┐
│              │                                              │
│  📁 ملفات   │         محتوى الصفحة                         │
│  👥 أعضاء   │                                              │
│  📊 نشاط    │                                              │
│  ⚙️ إعدادات │                                              │
│              │                                              │
│              │                                              │
└──────────────┴──────────────────────────────────────────────┘

- عرض: 240px (قابل للطي على الموبايل)
- خلفية: bg-secondary
- العناصر: rounded-md + hover:bg-hover
- Active: bg-accent-subtle + text-accent + font-medium
- أيقونات: 18px + text-tertiary (active: text-accent)
```

---

## 5. المؤثرات والحركة (Motion)

### المبدأ: أقل = أفضل

| العنصر | الحركة | المدة |
|--------|--------|-------|
| Page transition | fade-in فقط (لا slide) | 150ms |
| Modal open | scale(0.98→1) + fade | 200ms |
| Modal close | fade-out | 150ms |
| Hover effects | border-color change | 150ms |
| Button press | scale(0.98) | 100ms |
| Toast appear | slide-in from top | 200ms |
| Dropdown | fade + translateY(-4px→0) | 150ms |

### ما نزيله:
- ❌ لا `hover:-translate-y` على البطاقات (يبدو لعبة)
- ❌ لا blur/glass effects (يبطئ الأداء)
- ❌ لا gradient animations
- ❌ لا parallax أو 3D tilt
- ❌ لا spring physics (framer-motion springs)

### ما نبقيه:
- ✅ fade transitions بسيطة
- ✅ smooth color transitions
- ✅ subtle scale on press
- ✅ AnimatePresence للـ modals فقط

---

## 6. تخطيط الصفحات (Layout)

### 6.1 Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  Navbar                                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  مساحات العمل          [+ إنشاء مساحة]    🔍 [بحث]  ≡/⊞  │
│                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐      │
│  │ مساحة 1 │  │ مساحة 2 │  │ مساحة 3 │  │ مساحة 4 │      │
│  │         │  │         │  │         │  │         │      │
│  │ 12 ملف  │  │ 5 ملف   │  │ 28 ملف  │  │ 3 ملف   │      │
│  │ 3 أعضاء │  │ 7 أعضاء │  │ 2 أعضاء │  │ 1 عضو   │      │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘      │
│                                                             │
│  ─── النشاط الأخير ───────────────────────────────────────  │
│  • أحمد رفع ملف في "الرياضيات"         منذ 5 دقائق        │
│  • سارة انضمت لـ "مشروع التخرج"        منذ ساعة           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Workspace (مع Sidebar)

```
┌─────────────────────────────────────────────────────────────┐
│  Navbar                                                     │
├──────────────┬──────────────────────────────────────────────┤
│              │  الرياضيات 1  ←  مساحات العمل  ←  الرئيسية  │
│  📁 ملفات ● │──────────────────────────────────────────────│
│  👥 أعضاء   │                                              │
│  📊 نشاط    │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │
│  ⚙️ إعدادات │  │ 📄   │ │ 🖼️   │ │ 🎬   │ │ 📄   │       │
│              │  │ملف 1 │ │صورة 2│ │فيديو │ │ملف 4 │       │
│              │  │ 2 MB  │ │ 5 MB │ │12 MB │ │ 1 MB │       │
│              │  └──────┘ └──────┘ └──────┘ └──────┘       │
│              │                                              │
│              │  ┌──────┐ ┌──────┐                          │
│              │  │ 📄   │ │ 🎵   │                          │
│              │  │ملف 5 │ │صوت 6 │                          │
│              │  └──────┘ └──────┘                          │
│              │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

### 6.3 Landing Page

```
┌─────────────────────────────────────────────────────────────┐
│  Navbar (شفاف)                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              شيّرلي                                          │
│     مساحة عمل واحدة لكل ملفاتك المهمة                      │
│                                                             │
│         [ ابدأ مجاناً ]    [ شاهد كيف تعمل ]               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────┐   ┌─────────┐   ┌─────────┐                 │
│   │ رفع     │   │ تعاون   │   │ أمان    │                 │
│   │ ومشاركة │   │ منظم    │   │ عملي    │                 │
│   └─────────┘   └─────────┘   └─────────┘                 │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   كيف تعمل؟                                                │
│   1. أنشئ مساحة  →  2. ارفع ملفات  →  3. شارك بثقة        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│   FAQ                                                       │
├─────────────────────────────────────────────────────────────┤
│   Footer                                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. المقارنة: قبل وبعد

| العنصر | قبل (حالياً) | بعد (الثيم الجديد) |
|--------|-------------|-------------------|
| الخلفية | gradient خفيف + orbs | لون واحد صلب `#0a0a0b` |
| البطاقات | glass effect + glow | border خفيف + bg صلب |
| الأزرار | gradient + shadow | لون واحد + لا shadow |
| الـ Navbar | floating + blur + rounded | ثابت أعلى + border-bottom |
| الحركة | spring + translate-y + tilt | fade + subtle scale فقط |
| الخطوط | Noto Kufi (زخرفي) | IBM Plex Sans Arabic (رسمي) |
| الزوايا | rounded-2xl (16px) | rounded-lg (12px) — أقل تدوير |
| الألوان | indigo نيون + sage + brass | أزرق احترافي هادئ |
| الأيقونات | كبيرة + ملونة | 18px + لون واحد (tertiary) |
| المسافات | متفاوتة | نظام 4px grid موحد |

---

## 8. نظام المسافات (Spacing System)

```
Base unit: 4px

4px   → gap بين أيقونة ونص
8px   → padding داخلي صغير، gap بين عناصر متقاربة
12px  → padding حقول الإدخال
16px  → padding بطاقات صغيرة، gap بين بطاقات
20px  → padding بطاقات كبيرة
24px  → margin بين أقسام
32px  → margin بين sections
48px  → padding sections رئيسية
64px  → فراغ بين أقسام Landing Page
```

---

## 9. أيقونات الملفات (File Type System)

| النوع | الأيقونة | اللون | الخلفية |
|-------|---------|-------|---------|
| PDF | FileText | `#ef4444` | `rgba(239,68,68,0.12)` |
| صورة | Image | `#8b5cf6` | `rgba(139,92,246,0.12)` |
| فيديو | Film | `#3b82f6` | `rgba(59,130,246,0.12)` |
| صوت | Music | `#f59e0b` | `rgba(245,158,11,0.12)` |
| نص | FileText | `#22c55e` | `rgba(34,197,94,0.12)` |
| أخرى | File | `#6b7280` | `rgba(107,114,128,0.12)` |

---

## 10. خطة التنفيذ

### المرحلة 1: الأساس (يوم 1-2)

| المهمة | التفاصيل |
|--------|----------|
| تحديث CSS variables | استبدال الألوان القديمة بالجديدة في `index.css` |
| تحديث الخطوط | إضافة IBM Plex Sans Arabic + تحديث font-family |
| إزالة glass effects | حذف backdrop-blur, glassmorphism classes |
| تبسيط الخلفية | إزالة orbs, gradients, grid-pattern |

### المرحلة 2: المكونات (يوم 3-4)

| المهمة | التفاصيل |
|--------|----------|
| تحديث Buttons | تبسيط الأنماط، إزالة shadows |
| تحديث Cards | border صلب بدل glass, إزالة glow |
| تحديث Navbar | ثابت بدل floating, إزالة blur |
| تحديث Inputs | تبسيط focus states |

### المرحلة 3: الصفحات (يوم 5-6)

| المهمة | التفاصيل |
|--------|----------|
| Landing Page | تبسيط Hero, إزالة animations ثقيلة |
| Dashboard | تنظيف البطاقات, تحسين spacing |
| Workspace | إضافة sidebar layout, تنظيف tabs |
| Login/Profile | توحيد مع الثيم الجديد |

### المرحلة 4: التلميع (يوم 7)

| المهمة | التفاصيل |
|--------|----------|
| Motion cleanup | إزالة spring/tilt, تبسيط لـ fade فقط |
| Responsive check | التأكد كل شيء يعمل على الموبايل |
| Consistency pass | مراجعة كل صفحة للتأكد من التوحيد |

---

## 11. ملفات تحتاج تعديل

```
src/index.css                          ← الألوان + الخطوط + الأنماط العامة
src/lib/motion.ts                      ← تبسيط الحركات
src/components/layout/AppNavbar.tsx     ← تحويل لـ fixed navbar
src/components/workspace/FileCard.tsx   ← تبسيط + file type colors
src/pages/LandingPage.tsx              ← تبسيط Hero + إزالة effects
src/pages/DashboardPage.tsx            ← تنظيف cards
src/pages/WorkspacePage.tsx            ← sidebar layout
src/pages/LoginPage.tsx                ← توحيد
src/pages/ProfilePage.tsx              ← توحيد
tailwind.config.ts                     ← تحديث theme tokens
```

---

## 12. ملخص الهوية الجديدة

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   شيّرلي — Professional Edition                             │
│                                                             │
│   🎨 ألوان: أزرق احترافي + رمادي هادئ                       │
│   📝 خطوط: IBM Plex Sans Arabic (رسمي + واضح)              │
│   📐 زوايا: 12px (ليس مدوّر بالكامل)                        │
│   💫 حركة: fade فقط (لا spring/tilt/glass)                  │
│   📦 بطاقات: border صلب + bg صلب (لا glass)                │
│   🧭 تنقل: navbar ثابت + sidebar في workspace              │
│   📏 مسافات: نظام 4px grid                                  │
│                                                             │
│   الشعور: "أداة عمل حقيقية" — ليس "demo تقني"              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

> **آخر تحديث:** 2026-05-29  
> **النوع:** خطة ثيم واجهة احترافي  
> **المدة المقدرة:** أسبوع واحد  
> **الحالة:** جاهزة للتنفيذ
