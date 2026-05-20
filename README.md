# FileShare Workspace

مساحة عمل مشتركة لإدارة ومشاركة الملفات مع فريقك — مبنية على React + Supabase.

## المميزات

- 🔐 تسجيل دخول وإنشاء حساب (Supabase Auth)
- 📁 رفع وتحميل الملفات (Supabase Storage)
- 👥 مساحات عمل مشتركة مع نظام أدوار (مالك، مشرف، عضو، ضيف)
- 🔗 دعوة أعضاء عبر رابط
- ⚡ تحديثات فورية (Supabase Realtime)
- 📋 سجل نشاط كامل
- 🌙 واجهة عربية حديثة (RTL)

## الإعداد

### 1. إنشاء مشروع Supabase

1. اذهب إلى [supabase.com](https://supabase.com) وأنشئ مشروع جديد
2. انسخ **Project URL** و **anon public key** من Settings > API

### 2. تشغيل الـ Migration

1. افتح SQL Editor في لوحة تحكم Supabase
2. الصق محتوى `supabase/migrations/001_init.sql`
3. اضغط Run

هذا سينشئ:
- جميع الجداول (profiles, workspaces, workspace_members, workspace_files, audit_logs)
- سياسات RLS للحماية
- Storage bucket للملفات
- Trigger لإنشاء profile تلقائياً عند التسجيل
- تفعيل Realtime على الجداول المطلوبة

### 3. إعداد متغيرات البيئة

```bash
cp .env.example .env
```

عدّل `.env` وأضف قيم Supabase الخاصة بك.

### 4. التشغيل محلياً

```bash
pnpm install
pnpm run dev
```

## النشر على Vercel

1. ارفع المشروع على GitHub
2. اربطه بـ Vercel
3. أضف متغيرات البيئة في Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. انشر!

ملف `vercel.json` موجود ويتعامل مع SPA routing تلقائياً.

## التقنيات

- React 18 + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- Supabase (Auth, Database, Storage, Realtime)
- Framer Motion
- React Router v6