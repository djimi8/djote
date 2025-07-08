# كيفية نشر المشروع على Vercel 🚀

## الخطوات البسيطة:

### 1. إنشاء حساب Vercel (مجاني)
- اذهب إلى: https://vercel.com
- قم بتسجيل الدخول بحساب GitHub

### 2. تحديث مفاتيح API (مهم!)
المفاتيح الحالية مكشوفة، يجب تغييرها:

#### Google Gemini:
1. https://makersuite.google.com/app/apikey
2. احذف المفاتيح القديمة
3. أنشئ مفاتيح جديدة

#### DeepSeek:
1. https://platform.deepseek.com/
2. احذف المفتاح القديم
3. أنشئ مفتاح جديد

### 3. رفع المشروع لـ GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 4. نشر على Vercel
**طريقة 1: من الموقع (أسهل)**
1. اذهب إلى https://vercel.com/dashboard
2. اضغط "New Project"
3. اختر المشروع من GitHub
4. أضف متغيرات البيئة:
   - `GEMINI_API_KEY_1` = المفتاح الجديد
   - `GEMINI_API_KEY_2` = المفتاح الجديد
   - `DEEPSEEK_API_KEY` = المفتاح الجديد
5. اضغط Deploy

**طريقة 2: من Terminal**
```bash
# تثبيت Vercel CLI
npm install -g vercel

# تسجيل الدخول
vercel login

# نشر المشروع
vercel --prod
```

### 5. إعداد متغيرات البيئة في Vercel
بعد النشر:
1. اذهب إلى Dashboard → مشروعك → Settings
2. اضغط على "Environment Variables"
3. أضف:
   - `GEMINI_API_KEY_1` = مفتاحك الجديد
   - `GEMINI_API_KEY_2` = مفتاحك الجديد
   - `DEEPSEEK_API_KEY` = مفتاحك الجديد

### 6. اختبار التطبيق
- ستحصل على رابط مثل: https://your-project.vercel.app
- جرب البحث للتأكد من أن المفاتيح تعمل

## ملاحظات مهمة:
- ✅ المشروع مُعد للنشر على Vercel
- ✅ الملفات الحساسة محمية
- ✅ النشر سيكون آمن
- ⚠️ **لا تنسى تغيير مفاتيح API**

## مشاكل محتملة وحلولها:

### المشكلة: "API key invalid"
**الحل**: تأكد من إضافة المفاتيح في Environment Variables

### المشكلة: "Build failed"
**الحل**: تأكد من أن package.json يحتوي على جميع التبعيات

### المشكلة: "Cannot find module"
**الحل**: تأكد من أن جميع الملفات موجودة في المشروع

## دعم:
إذا واجهت أي مشكلة، يمكنك:
1. التحقق من Vercel Dashboard → Functions → View Function Logs
2. مراجعة Build Logs
3. طلب المساعدة في Discord أو GitHub Issues