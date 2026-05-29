# Shairley · شيّرلي

منصة سحابية لمشاركة الملفات وإدارة مساحات العمل، مبنية بواجهة React حديثة مع Firebase وVercel Blob.

## البنية الحالية

- **Frontend:** React 18 + TypeScript + Vite
- **Authentication:** Firebase Auth
- **Database:** Cloud Firestore
- **File Storage:** Vercel Blob
- **Hosting & Functions:** Vercel

> لا يوجد backend تقليدي مستقل داخل المشروع. المنطق الخدمي موزّع بين الواجهة وVercel Functions وFirebase.

## أهم الملفات التوثيقية

- `PLATFORM_GUIDE_AR.md` — شرح البنية الحالية للمشروع، الخدمات المستخدمة، والمتغيرات المطلوبة.
- `DEPLOYMENT_GUIDE_AR.md` — دليل النشر الكامل خطوة بخطوة من الصفر حتى التشغيل الفعلي.

## التشغيل المحلي

### تشغيل الواجهة فقط
```bash
npm install
npm run dev
```

### تشغيل الواجهة مع Vercel Functions محليًا
```bash
npx vercel dev
```

## البناء

```bash
npm run build
```

## الفحص

```bash
npm run typecheck
```

## أهم المجلدات

- `src/` — الواجهة بالكامل
- `api/` — Vercel Functions
- `firebase/` — Firestore rules & indexes
- `public/` — الأصول العامة

## مسار الرفع الحالي

تمت إعادة تصميم رفع الملفات ليكون أوضح وأكثر ثباتًا:

1. `prepare`
2. `token`
3. direct `put` to Vercel Blob
4. `finalize`

وهذا يقلل مشاكل التعليق أثناء الرفع ويجعل كل مرحلة قابلة للتشخيص بشكل مستقل.

## ملاحظات مهمة

- لا ترفع `.env` إلى GitHub.
- لا تضف `BLOB_READ_WRITE_TOKEN` يدويًا إذا كان Vercel يضيفه تلقائيًا عند ربط Blob Store.
- بعد تعديل `firebase/firestore.rules` أو `firebase/firestore.indexes.json` يجب نشرها يدويًا عبر Firebase CLI.
