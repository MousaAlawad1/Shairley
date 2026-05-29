# دليل النشر الكامل — Shairley

هذا الدليل عملي ومباشر، من الصفر حتى تشغيل المشروع على Vercel.

---

# 1) المتطلبات قبل البدء

تحتاج إلى:

- حساب Firebase
- حساب Vercel
- حساب GitHub
- Firebase CLI مثبت محليًا

تثبيت Firebase CLI:
```bash
npm install -g firebase-tools
```

ثم تسجيل الدخول:
```bash
firebase login
```

---

# 2) إعداد Firebase

## 2.1 إنشاء مشروع Firebase
من Firebase Console:
- أنشئ Project جديد
- أنشئ Web App داخل المشروع

## 2.2 فعّل Authentication
اذهب إلى:
- Authentication
- Sign-in method
- فعّل Email/Password

## 2.3 أنشئ Firestore
اذهب إلى:
- Firestore Database
- Create database
- اختر Production mode

## 2.4 نزّل Service Account JSON
اذهب إلى:
- Project settings
- Service accounts
- Generate new private key

سنحتاج منه:
- `project_id`
- `client_email`
- `private_key`

---

# 3) إعداد مشروع Vercel

## 3.1 اربط الريبو
- افتح Vercel
- اختر الريبو
- Framework: Vite

## 3.2 أنشئ Blob Store
- ادخل Storage
- Blob
- أنشئ Blob Store جديد
- اربطه بالمشروع نفسه

> الأفضل ترك Vercel ينشئ `BLOB_READ_WRITE_TOKEN` تلقائيًا.

## 3.3 مهم جدًا
إذا ظهر عندك `BLOB_READ_WRITE_TOKEN` قديم أو كنت أضفته يدويًا، احذفه ثم أعد ربط Blob Store.

---

# 4) Environment Variables على Vercel

اذهب إلى:
- Project Settings
- Environment Variables

وأضف التالي:

## Firebase Web
```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## Firebase Admin
```env
FIREBASE_ADMIN_PROJECT_ID=...
FIREBASE_ADMIN_CLIENT_EMAIL=...
FIREBASE_ADMIN_PRIVATE_KEY=...
```

## Blob
```env
BLOB_READ_WRITE_TOKEN=...
```

> إذا كان Vercel أضافه تلقائيًا، لا تستبدله يدويًا إلا إذا كنت متأكدًا جدًا.

---

# 5) Authorized Domains في Firebase Auth

اذهب إلى:
- Firebase Console
- Authentication
- Settings
- Authorized domains

أضف:
```text
localhost
shairley.vercel.app
```

وأضف دومينك المخصص لاحقًا إذا استخدمته.

---

# 6) نشر Firestore Rules و Indexes

داخل المشروع محليًا:
```bash
firebase deploy --only firestore:rules,firestore:indexes --project YOUR_FIREBASE_PROJECT_ID
```

في هذا المشروع مثلًا:
```bash
firebase deploy --only firestore:rules,firestore:indexes --project shairley-here
```

> Vercel لا ينشر Rules و Indexes بدلًا عنك.

---

# 7) Redeploy على Vercel

بعد إضافة أو تعديل Environment Variables:
- ادخل Deployments
- اختر آخر Deployment
- Redeploy without cache

استخدم **without cache** خصوصًا بعد تعديل:
- متغيرات البيئة
- Blob Store
- Vercel Functions

---

# 8) الاختبار بعد النشر

اختبر بالترتيب:

## 8.1 المصادقة
- إنشاء حساب
- تسجيل دخول
- استعادة كلمة المرور

## 8.2 المساحات
- إنشاء مساحة عمل
- نسخ رابط الدعوة
- الانضمام من حساب آخر

## 8.3 الملفات
- رفع صورة صغيرة
- رفع PDF
- معاينة الملف
- تنزيل الملف
- حذف الملف
- رفع أكثر من ملف معًا

## 8.4 الأعضاء
- تغيير دور عضو
- إزالة عضو

---

# 9) أوامر مفيدة

## تثبيت الحزم
```bash
npm install
```

## تشغيل محلي
```bash
npm run dev
```

## تشغيل مع Functions
```bash
npx vercel dev
```

## فحص TypeScript
```bash
npm run typecheck
```

## بناء المشروع
```bash
npm run build
```

---

# 10) مشاكل متوقعة وحلولها

## مشكلة: `Missing or insufficient permissions`
السبب غالبًا:
- Firestore rules غير منشورة
- أو القواعد أضيق من المطلوب

الحل:
```bash
firebase deploy --only firestore:rules,firestore:indexes --project shairley-here
```

## مشكلة: `query requires an index`
السبب:
- Firestore index غير منشور

الحل:
```bash
firebase deploy --only firestore:indexes --project shairley-here
```

## مشكلة: `Failed to retrieve the client token`
السبب غالبًا:
- Vercel Function فاشلة
- أو Firebase Admin env ناقصة
- أو Blob token غير صحيح

تحقق من:
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`
- `BLOB_READ_WRITE_TOKEN`

## مشكلة: PUT إلى `vercel.com/api/blob` يرجع 400
السبب الأكثر شيوعًا:
- Blob Store مربوط بشكل خاطئ
- أو `BLOB_READ_WRITE_TOKEN` قديم / من store مختلف
- أو store/private setup لا يتوافق مع التدفق الحالي

الحل العملي:
1. احذف `BLOB_READ_WRITE_TOKEN` اليدوي إن وجد
2. أنشئ Blob Store جديد أو أعد ربطه
3. دع Vercel يضيف التوكن تلقائيًا
4. Redeploy without cache

---

# 11) تنظيف أمني بعد الإعداد

إذا كنت شاركت سابقًا:
- Firebase private key
- GitHub token

فيجب بعد انتهاء الإعداد:

## Firebase
- حذف الـ private key القديم
- إنشاء مفتاح جديد
- تحديثه في Vercel

## GitHub
- إلغاء التوكن القديم
- إنشاء توكن جديد

---

# 12) الخلاصة السريعة

إذا أردت أقصر مسار صحيح:

```bash
git clone https://github.com/Monopoly63/All-here2.git
cd All-here2
npm install
firebase login
firebase deploy --only firestore:rules,firestore:indexes --project shairley-here
```

ثم على Vercel:
1. اربط الريبو
2. أضف env vars
3. أنشئ وربط Blob Store
4. Redeploy without cache
5. اختبر تسجيل الدخول والمساحات والرفع

---

إذا اشتغل:
- Firebase Auth ✅
- Firestore ✅
- Vercel Blob ✅
- Vercel Deploy ✅

فالمشروع جاهز للإكمال والتحسين على الواجهة الأمامية.
