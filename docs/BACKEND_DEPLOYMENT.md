# نشر الباك إند وربط /api بالواجهة

المشكلة الحالية على https://ordarat.vercel.app: طلب `/api/health` يرجع HTML
الواجهة بدل JSON، لأن Vercel لا يشغّل Laravel — ينشر الواجهة فقط، وقاعدة
`vercel.json` تحوّل كل المسارات (بما فيها `/api`) إلى تطبيق Angular.

الحل: نشر Laravel على استضافة منفصلة، ثم تمرير `/api/*` إليها.

## 1. نشر Laravel

الخيارات الشائعة (أي واحدة تكفي):

- **Railway / Render / Fly.io**: انشر مجلد `backend/` باستخدام `backend/Dockerfile`.
- **VPS**: Docker مع `docker-compose.yml` الموجود في الجذر.

متغيرات البيئة المطلوبة على الاستضافة:

```
APP_ENV=production
APP_DEBUG=false
APP_KEY=          # ولّدها: php artisan key:generate --show
APP_URL=https://<رابط-الباك-إند>
DB_CONNECTION=pgsql + بيانات Neon (راجع docs/NEON_SETUP.md)
FIREBASE_PROJECT_ID=ordarat-qena
UPLOADS_DISK=neon أو public
```

## 2. تمرير /api من Vercel إلى الباك إند

عدّل `vercel.json` في الجذر وأضف rewrite قبل قاعدة الـ SPA، مثال:

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://<رابط-الباك-إند>/api/:path*" },
    { "source": "/((?!.*\\.).*)", "destination": "/" }
  ]
}
```

> ملاحظة: Vercel لا يقرأ متغيرات البيئة داخل vercel.json؛ اكتب الرابط صراحة
> أو استخدم إعدادات Rewrites من لوحة المشروع.

## 3. التحقق بعد النشر

```bash
curl https://ordarat.vercel.app/api/health
# المطلوب: JSON فيه "status": "healthy" وليس صفحة HTML
```

ثم افتح الموقع: قائمة المتاجر يجب أن تعرض بيانات قاعدة البيانات الفعلية
(أو حالة فارغة صادقة إن لم توجد متاجر بعد).

## 4. CORS

الواجهة والـ API على نفس الدومين بعد التمرير، فلا حاجة لإعداد CORS إضافي.
أثناء التطوير المحلي (`apiUrl: http://localhost:8000/api`) تأكد أن Laravel
يسمح لـ localhost:4200 (الإعداد الافتراضي في `config/cors.php`).
