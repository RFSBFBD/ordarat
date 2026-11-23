> هذا الملف مرجع تفصيلي. الترتيب الإجباري الكامل للتفعيل في [REQUIRED_ACTIVATION.md](REQUIRED_ACTIVATION.md).

# نقل قاعدة البيانات والتخزين إلى Neon

Neon يقدم شيئين نستخدمهما:

1. **Postgres مُدار** لقاعدة بيانات المنصة.
2. **Object Storage** بواجهة متوافقة مع S3 لصور المتاجر والمنتجات.

## 1. قاعدة البيانات (Neon Postgres)

1. أنشئ مشروعًا في [console.neon.tech](https://console.neon.tech) وقاعدة
   باسم `ordarat`.
2. من لوحة المشروع انسخ بيانات الاتصال (استخدم الـ **pooled** host).
3. في `backend/.env`:

   ```
   DB_CONNECTION=pgsql
   DB_HOST=ep-xxxx-pooler.<region>.aws.neon.tech
   DB_PORT=5432
   DB_DATABASE=ordarat
   DB_USERNAME=ordarat_owner
   DB_PASSWORD=كلمة-السر-من-نيون
   DB_SSLMODE=require
   ```

4. نفّذ الترحيلات والبيانات التجريبية:

   ```bash
   cd backend
   php artisan migrate --force
   php artisan db:seed   # بيانات قنا التجريبية؛ احذفها أو عدّلها للإنتاج
   ```

5. ملاحظة: المشروع يعمل محليًا بـ SQLite؛ PostgreSQL مطلوب للإنتاج على Neon.
   راجع أي استعلامات خام قبل النقل إن أضفت مستقبلًا (الحالية كلها عبر Eloquent).

## 2. التخزين (Neon Object Storage)

1. ثبّت حزمة S3 للارفيل (مرة واحدة):

   ```bash
   composer require league/flysystem-aws-s3-v3
   ```

   (مضافة بالفعل إلى composer.json؛ شغّل `composer update` لجلبها.)

2. من Neon Console أنشئ Bucket وولّد Access Key (راجع وثائق Neon:
   neon.com/docs/storage/get-started — تأكد أن التخزين متاح في منطقة مشروعك
   وخطتك قبل الاعتماد عليه).

3. في `backend/.env`:

   ```
   UPLOADS_DISK=neon
   NEON_ACCESS_KEY_ID=...
   NEON_SECRET_ACCESS_KEY=...
   NEON_REGION=<المنطقة>
   NEON_BUCKET=<اسم-الباكيت>
   NEON_ENDPOINT=<نقطة-النهاية-S3-من-نيون>
   NEON_PUBLIC_URL=<رابط-الملفات-العام-إن-وجد>
   ```

4. الكود جاهز: رفع صور المتاجر والمنتجات يستخدم القرص `UPLOADS_DISK`
   (`config/ordarat.php` → `uploads_disk`). محليًا يبقى `public`.

5. اختبار: من لوحة التاجر ارفع صورة منتج ثم افتح رابطها في المتصفح.

## 3. ما لم يتم

- لم يتم إنشاء أي موارد في حسابك ولم تُنقل بيانات فعلية؛ هذه الخطوات تحتاج
  حساب Neon الخاص بك.
- صور المنتجات الموجودة محليًا في `storage/app/public` تحتاج نقلًا يدويًا
  إلى الـ bucket عند الانتقال الفعلي.
