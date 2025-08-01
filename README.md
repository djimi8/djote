# مساعد طلبة الحقوق الذكي

تطبيق ذكي لمساعدة طلبة الحقوق في الأبحاث والدراسة باستخدام الذكاء الاصطناعي.

## المتطلبات

- Node.js (الإصدار 16 أو أحدث)
- npm أو yarn
- مفاتيح API من Google Gemini

## كيفية الإعداد

1. استنساخ المشروع:
```bash
git clone https://github.com/djimi8/projet.git
cd projet
```

2. تثبيت الحزم:
```bash
npm install
```

3. إنشاء ملف `.env` من `.env.example`:
```bash
cp .env.example .env
```

4. إضافة مفاتيح API الخاصة بك في ملف `.env`:
```
GEMINI_API_KEY_1=your_actual_gemini_api_key_here
GEMINI_API_KEY_2=your_second_gemini_api_key_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

## الحصول على مفاتيح API

### Google Gemini API
1. اذهب إلى [Google AI Studio](https://makersuite.google.com/app/apikey)
2. قم بإنشاء مفتاح API جديد
3. انسخ المفتاح وأضفه إلى ملف `.env`

### DeepSeek API (اختياري)
1. اذهب إلى [DeepSeek API](https://platform.deepseek.com/)
2. قم بإنشاء حساب والحصول على مفتاح API
3. أضف المفتاح إلى ملف `.env`

## تشغيل التطبيق

### تشغيل الخادم فقط:
```bash
npm run server
```

### تشغيل تطبيق سطح المكتب:
```bash
npm start
```

## نشر التطبيق

لنشر التطبيق على GitHub Pages أو أي خدمة استضافة أخرى، تأكد من:

1. عدم رفع ملف `.env` إلى Git
2. إعداد متغيرات البيئة في خدمة الاستضافة
3. استخدام مفاتيح API صحيحة وغير منتهية الصلاحية

## المميزات

- واجهة عربية سهلة الاستخدام
- دعم متعدد لمفاتيح API
- مراجع قانونية شاملة
- تطبيق سطح مكتب وويب
- نظام بحث ذكي

## المساهمة

مرحب بالمساهمات! يرجى إنشاء Pull Request أو Issue للتحسينات المقترحة.

## الترخيص

MIT License#   m o t i s  
 #   m o t i s  
 