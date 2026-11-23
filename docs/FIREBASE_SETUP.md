> هذا الملف مرجع تفصيلي. الترتيب الإجباري الكامل للتفعيل في [REQUIRED_ACTIVATION.md](REQUIRED_ACTIVATION.md).

# إعداد Firebase لتسجيل الدخول بجوجل

الكود جاهز وموصول؛ الناقص فقط قيم حسابك في Firebase. بدونها زر «دخول بجوجل»
يظهر رسالة واضحة بأن الإعداد غير مكتمل (ولن يتظاهر بالنجاح).

## الخطوات

1. افتح [console.firebase.google.com](https://console.firebase.google.com)
   وأنشئ مشروعًا باسم `ordarat-qena` (أو استخدم مشروعك الحالي).
2. من **Authentication → Sign-in method** فعّل مزوّد **Google**.
3. من **Project settings → General → Your apps** أضف **Web app** وانسخ قيم
   `apiKey` و `appId`.
4. الصق القيم في:
   - `frontend/src/environments/environment.ts`
   - `frontend/src/environments/environment.prod.ts`
   - `frontend/src/environments/environment.development.ts`

   ```ts
   firebase: {
     projectId: 'ordarat-qena',
     apiKey: 'AIza...',           // من خطوة 3
     authDomain: 'ordarat-qena.firebaseapp.com',
     appId: '1:1234...:web:...',  // من خطوة 3
   }
   ```

   هذه القيم آمنة للنشر في المتصفح؛ **ممنوع** وضع مفاتيح service account هنا.

5. في **Authentication → Settings → Authorized domains** أضف دومين النشر:
   - `ordarat.vercel.app`
   - أي دومين مخصص لاحقًا
   (localhost مضاف افتراضيًا للتطوير)

6. في `backend/.env` تأكد أن:

   ```
   FIREBASE_PROJECT_ID=ordarat-qena
   ```

   الباك إند يتحقق من توكن Firebase بتوقيع جوجل مباشرة، فلا يحتاج ملف
   service account للتحقق من الدخول.

## حسابات الأدمن والتجار ومديري الفروع

الدخول كله بجوجل. الدور لا يأتي من Firebase بل من قاعدة البيانات:

- العميل الجديد يُنشأ تلقائيًا بدور `customer`.
- لتعيين أدمن أو تاجر: أنشئ المستخدم في قاعدة البيانات بالبريد نفسه الذي
  سيدخل به من جوجل، مع الدور المطلوب (`admin` / `merchant` / `branch_manager`).
  عند أول دخول يتم الربط تلقائيًا بالبريد.

## اختبار سريع

1. `cd frontend && npm start`
2. افتح صفحة الدخول، اضغط «دخول بجوجل»، أكمل النافذة المنبثقة.
3. النجاح = إعادة التوجيه للصفحة المطلوبة وظهور اسمك في الهيدر.
4. تحقق من الباك إند: `GET /api/auth/me` بتوكن Firebase يرجع الدور الصحيح.
