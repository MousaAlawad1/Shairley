# دليل المنصة — Shairley

هذا الملف يشرح البنية الحالية للمشروع بشكل سريع وواضح.

## 1) ما الذي يستخدمه المشروع؟

### الواجهة
- React
- TypeScript
- Vite
- Tailwind CSS

### المصادقة والبيانات
- Firebase Authentication
- Cloud Firestore

### تخزين الملفات
- Vercel Blob

### النشر
- Vercel

---

## 2) كيف تعمل البنية؟

المشروع لا يعتمد على backend منفصل من نوع Express أو Laravel.
بدل ذلك:

- **Firebase Auth** يدير تسجيل الدخول واستعادة كلمة المرور والملفات الشخصية.
- **Firestore** يخزن المستخدمين، المساحات، الأعضاء، الملفات، التعليقات، وسجل النشاط.
- **Vercel Blob** يخزن الملفات نفسها.
- **Vercel Functions** تنفذ منطق الرفع، الحذف، والتحقق من التوكنات.

---

## 3) أهم Collections في Firestore

### users
```text
users/{uid}
```

### notifications
```text
users/{uid}/notifications/{notificationId}
```

### workspaces
```text
workspaces/{workspaceId}
```

### members
```text
workspaces/{workspaceId}/members/{memberId}
```

### files
```text
workspaces/{workspaceId}/files/{fileId}
```

### file_versions
```text
workspaces/{workspaceId}/file_versions/{versionId}
```

### file_comments
```text
workspaces/{workspaceId}/file_comments/{commentId}
```

### audit_logs
```text
workspaces/{workspaceId}/audit_logs/{logId}
```

### uploads
```text
workspaces/{workspaceId}/uploads/{uploadId}
```

> `uploads` هي collection مرحلية لدعم مسار رفع أوضح وأثبت.

---

## 4) كيف يعمل رفع الملفات الآن؟

بدل مسار رفع غامض، صار التدفق كالتالي:

### المرحلة 1: Prepare
الواجهة تطلب من السيرفر إنشاء جلسة رفع.

### المرحلة 2: Token
السيرفر يولد **client token** خاص بـ Vercel Blob.

### المرحلة 3: Direct Put
المتصفح يرفع الملف مباشرة إلى Blob باستخدام التوكن.

### المرحلة 4: Finalize
بعد نجاح الرفع، يتم تثبيت metadata في Firestore.

هذا التصميم يجعل الخطأ واضحًا أكثر ويمنع اعتبار progress وحده نجاحًا نهائيًا.

---

## 5) المتغيرات المطلوبة

## Firebase Web
```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

> `VITE_FIREBASE_STORAGE_BUCKET` يبقى موجودًا ضمن config Firebase، حتى لو التخزين الفعلي للملفات يتم في Vercel Blob.

## Firebase Admin
```env
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
```

## Vercel Blob
```env
BLOB_READ_WRITE_TOKEN=
```

> الأفضل أن يضيفه Vercel تلقائيًا عند ربط Blob Store بالمشروع.

---

## 6) الملفات المهمة داخل المشروع

### الواجهة
- `src/pages/LandingPage.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/WorkspacePage.tsx`
- `src/pages/DevelopersPage.tsx`

### الخدمات
- `src/services/api-services.ts`
- `src/services/upload-service.ts`
- `src/services/supabase-services.ts`

### Firebase
- `src/lib/firebase.ts`
- `src/lib/firebase-data.ts`
- `firebase/firestore.rules`
- `firebase/firestore.indexes.json`

### Vercel Functions
- `api/uploads/prepare.ts`
- `api/blob/token.ts`
- `api/uploads/finalize.ts`
- `api/blob/delete.ts`
- `api/_lib/firebase-admin.ts`

---

## 7) ملاحظات تشغيل

### محليًا
- لتشغيل الواجهة فقط:
```bash
npm run dev
```

- لتشغيل الواجهة مع Vercel Functions:
```bash
npx vercel dev
```

### في الإنتاج
- الواجهة وFunctions على Vercel
- Firestore rules تنشر عبر Firebase CLI يدويًا

---

## 8) ملاحظات مهمة جدًا

- لا ترفع `.env` إلى GitHub.
- لا تضع مفاتيح Firebase Admin داخل الكود.
- إذا أرسلت private key أو GitHub token في مكان غير آمن، قم بتبديلهما فورًا.
- عند ظهور مشكلة في الرفع، افصلها إلى:
  - prepare
  - token
  - blob put
  - finalize

وهكذا يصبح التشخيص أسرع بكثير.
