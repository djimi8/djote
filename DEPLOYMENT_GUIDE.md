# دليل النشر الآمن للمشروع

## خطوات النشر الآمن على GitHub:

### 1. حذف Repository القديم
- اذهب إلى https://github.com/djimi8/projet
- Settings → Danger Zone → Delete this repository
- اكتب اسم المشروع للتأكيد

### 2. إنشاء Repository جديد
```bash
# إنشاء مشروع جديد على GitHub
# https://github.com/new
```

### 3. تحديث المشروع وإزالة المفاتيح الحساسة
```bash
# حذف مجلد .git القديم
rm -rf .git

# إعادة تهيئة Git
git init
git add .
git commit -m "Initial commit - secure version"
git branch -M main
git remote add origin https://github.com/djimi8/projet.git
git push -u origin main
```

### 4. إعداد GitHub Secrets
في GitHub Repository:
- Settings → Secrets and variables → Actions
- أضف هذه المتغيرات:
  - `GEMINI_API_KEY_1`: مفتاح Gemini الأول
  - `GEMINI_API_KEY_2`: مفتاح Gemini الثاني
  - `DEEPSEEK_API_KEY`: مفتاح DeepSeek

### 5. الحصول على مفاتيح API جديدة
**مهم جداً**: المفاتيح الحالية مكشوفة ويجب تغييرها!

#### Google Gemini API:
1. اذهب إلى: https://makersuite.google.com/app/apikey
2. احذف المفاتيح القديمة
3. أنشئ مفاتيح جديدة
4. أضفها إلى GitHub Secrets

#### DeepSeek API:
1. اذهب إلى: https://platform.deepseek.com/
2. احذف المفتاح القديم
3. أنشئ مفتاح جديد
4. أضفه إلى GitHub Secrets

## خيارات النشر:

### أ) GitHub Pages (محدود)
- يدعم الملفات الثابتة فقط
- لا يدعم Node.js server
- يعمل فقط للواجهة الأمامية

### ب) Vercel (مجاني ومناسب) ✅
```bash
# تثبيت Vercel CLI
npm install -g vercel

# نشر المشروع
vercel --prod
```

### ج) Netlify (مجاني ومناسب) ✅
```bash
# تثبيت Netlify CLI
npm install -g netlify-cli

# نشر المشروع
netlify deploy --prod
```

### د) Heroku (مدفوع الآن)
```bash
# إنشاء تطبيق Heroku
heroku create your-app-name
git push heroku main
```

## ملفات إضافية للنشر:

### Vercel (vercel.json)
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ]
}
```

### Netlify (netlify.toml)
```toml
[build]
  command = "npm install"
  functions = "functions"
  publish = "."

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

## أفضل ممارسات الأمان:

1. **لا تضع مفاتيح API في الكود مطلقاً**
2. **استخدم متغيرات البيئة دائماً**
3. **أضف .env إلى .gitignore**
4. **غير المفاتيح المكشوفة فوراً**
5. **استخدم GitHub Secrets للنشر**