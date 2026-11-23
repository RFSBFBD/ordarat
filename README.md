# منصة أوردرات — قنا (Ordarat) 🍕🛒

منصة لطلب وتوصيل الطعام والبقالة في مدينة قنا، مصر. مبنية بتقنيات حديثة:
- **الواجهة الأمامية (Frontend):** Angular 22 (Standalone Components + Tailwind-ready design tokens).
- **الخلفية (Backend):** Laravel 13 (REST API + Stateless Session Architecture + Firebase Auth Verification).
- **قاعدة البيانات (Database):** Neon Serverless PostgreSQL (`ordarat_db`).
- **المصادقة (Authentication):** Firebase Authentication (تسجيل دخول العملاء عبر Google Sign-In بمفاتيح Google العامة والتحقق الصارم من الخادم).

---

## 1. تسجيل الدخول وإدارة الهوية (Google Auth + Server Verification)

### كيف يعمل التحقق؟
1. العميل يضغط «دخول بجوجل» في المتصفح ويختار حسابه عبر نافذة منبثقة من Firebase.
2. يحصل المتصفح على **Firebase ID Token**.
3. يرسل المتصفح الرمز إلى نقطة النهاية: `POST /api/auth/session`.
4. يقوم الباك إند (Laravel) بالتحقق الكامل من الرمز:
   - فحص التوقيع بالمفاتيح العامة لـ Google مع تدوير المفاتيح التلقائي (`Google Certs Key Rotation`).
   - فحص المصدر (`iss`) والمشروع (`aud`) وصلاحية التوكن (`exp` / `nbf` / `iat`).
   - التأكد الصارم أن مزود الدخول هو Google فقط (`sign_in_provider == 'google.com'`).
   - التأكد أن البريد موثق من Google (`email_verified == true`).
   - البحث عن الحساب بواسطة `firebase_uid` الموثق لمنع تكرار أو انتحال الحسابات، مع منع الدمج التلقائي العشوائي.
5. يُصدر السيرفر رمز جلسة مخصص للتطبيق (`ordarat_sess_*`) يدير الجلسة بمرونة.
6. عند تسجيل الخروج (`POST /api/auth/logout`)، يتم إبطال الجلسة وحظر التوكن فورياً.

---

## 2. تعيين حساب الأدمن الأول (من جهة السيرفر فقط)

**ممنوع تماماً** منح دور الأدمن أو التاجر بناءً على أي حقل يرسله العميل من الواجهة. تعيين الأدمن يتم من جهة السيرفر فقط بإحدى طريقتين:

### الطريقة الأولى: أمر Artisan في السيرفر (الأسرع والأسهل)
نفّذ الأمر التالي في مجلد `backend`:
```bash
php artisan ordarat:make-admin "user@gmail.com"
```
أو بواسطة الـ `firebase_uid`:
```bash
php artisan ordarat:make-admin "FIREBASE_UID_HERE"
```
سيقوم السيرفر فوراً بترقية الحساب إلى دور `admin` وتسجيل عملية الترقية في سجل التدقيق (`AuditLog`).

### الطريقة الثانية: عبر متغيرات البيئة في السيرفر (`.env`)
في ملف `backend/.env`، حدد البريد الإلكتروني للمدير:
```env
ADMIN_EMAILS=mohamed.mubarak.dev@gmail.com
```
عند تسجيل المستخدم الدخول لأول مرة بحساب Google الموثق المطابق لهذا البريد، سيمنحه السيرفر دور `admin` تلقائياً.

---

## 3. ربط مشروع Firebase

تم ربط المشروع بحسابك على Firebase:
* **Project ID:** `planning-with-ai-d25ac`
* **App ID:** `1:775088921115:web:3dc618f2b7e33de0ea76be`
* **API Key:** `AIzaSyCcdsLvfk0XwXtZIfuJ8KsjtIBOy-sBlN0`

### خطوة هامة في لوحة تحكم Firebase:
1. ادخل على [Firebase Console](https://console.firebase.google.com/) واختر مشروعك `planning-with-ai-d25ac`.
2. من القائمة الجانبية: **Build → Authentication → Sign-in method**:
   - تأكد من تفعيل مزود **Google**.
3. ادخل على تبويب **Settings → Authorized domains**:
   - اضغط **Add domain** وأضف دومين الواجهة على فرسل:
     ```text
     ordarat.vercel.app
     ```
   (دومين `localhost` مضاف افتراضياً للتطوير المحلي).

---

## 4. توجيه مسار `/api` على Vercel إلى Laravel (بدل HTML)

يتم نشر الواجهة الأمامية كـ Single Page Application (SPA) على Vercel، بينما يعمل الـ API على خادم Laravel (مثل Render أو Railway أو VPS).

### لتوجيه طلبات `/api` من Vercel إلى خادم Laravel:
في ملف `vercel.json` (وفي `frontend/vercel.json`):
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://YOUR_BACKEND_SERVER_URL/api/:path*"
    },
    {
      "source": "/((?!api/)(?!.*\\.).*)",
      "destination": "/"
    }
  ]
}
```
* استبدل `https://YOUR_BACKEND_SERVER_URL` بالرابط الحقيقي لخادم Laravel بعد نشره.
* هذا الإعداد يضمن أن:
  1. أي طلب لـ `/api/*` يتم توجيهه كـ Proxy مباشر لسيرفر الباك إند دون مشاكل CORS أو إرجاع كود HTML.
  2. أي مسار داخلي للواجهة (مثل `/cart` أو `/admin/dashboard`) يُعاد توجيهه لـ `index.html` ليعالجه راوتر Angular.

---

## 5. قاعدة البيانات (Neon Postgres)

تم تهيئة قاعدة البيانات السحابية في Neon بالكامل:
* **Database Name:** `ordarat_db`
* **Connection String:**
  ```env
  DB_CONNECTION=pgsql
  DB_URL=postgresql://neondb_owner:***@ep-lucky-tooth-bdux4uzb.c-8.us-east-2.aws.neon.tech/ordarat_db?sslmode=require
  ```
* لتشغيل أي تهجيرات مستقبلية يدوياً:
  ```bash
  cd backend
  php artisan migrate
  ```

---

## 6. أوامر التطوير والتشغيل

### تشغيل الواجهة (Frontend):
```bash
cd frontend
npm install
npm start
# يفتح على http://localhost:4200
```

### تشغيل الباك إند (Backend):
```bash
cd backend
composer install
php artisan serve
# يفتح على http://localhost:8000
```

### تشغيل الاختبارات:
- **الباك إند (105 اختبار):** `cd backend && php artisan test`
- **الفرونت إند (43 اختبار):** `cd frontend && npm test -- --watch=false`
