const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { getRandomReferences, getResearchTemplate, LEGAL_TERMS } = require('./law-references.js');

// Load environment variables
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// قائمة مفاتيح API متعددة من متغيرات البيئة
const API_KEYS = [];

// إضافة مفاتيح Gemini من متغيرات البيئة
if (process.env.GEMINI_API_KEY) {
  API_KEYS.push({
    key: process.env.GEMINI_API_KEY,
    type: 'gemini',
    name: 'Gemini'
  });
}

if (process.env.GEMINI_API_KEY_1) {
  API_KEYS.push({
    key: process.env.GEMINI_API_KEY_1,
    type: 'gemini',
    name: 'Gemini 1'
  });
}

if (process.env.GEMINI_API_KEY_2) {
  API_KEYS.push({
    key: process.env.GEMINI_API_KEY_2,
    type: 'gemini',
    name: 'Gemini 2'
  });
}

// إزالة دعم DeepSeek - التطبيق سيستخدم Gemini فقط

// التأكد من وجود مفتاح واحد على الأقل
if (API_KEYS.length === 0) {
  console.error('🔴 خطأ فادح: لم يتم العثور على مفاتيح API في متغيرات البيئة. يرجى تعيين GEMINI_API_KEY.');
  process.exit(1); // In a real deployment, you'd want the app to fail fast.
}

// قائمة النماذج المدعومة - Gemini فقط
const SUPPORTED_MODELS = {
  'gemini-2.0-flash': {
    provider: 'gemini',
    name: 'Gemini 2.0 Flash',
    maxTokens: 4000,
    free: true
  },
  'gemini-1.5-flash': {
    provider: 'gemini', 
    name: 'Gemini 1.5 Flash',
    maxTokens: 4000,
    free: true
  }
};

// متغيرات لإدارة المفاتيح
let currentKeyIndex = 0;
let keyUsageCount = {};
let keyFailureCount = {};

// تهيئة إحصائيات المفاتيح
API_KEYS.forEach((key, index) => {
  keyUsageCount[index] = 0;
  keyFailureCount[index] = 0;
});

// دالة للحصول على المفتاح المناسب للنموذج مع حماية من الحلقات اللانهائية
function getAPIKeyForModel(modelName, preferredProvider = null) {
  const model = SUPPORTED_MODELS[modelName];
  if (!model) {
    throw new Error(`نموذج غير مدعوم: ${modelName}`);
  }
  
  // التأكد من وجود مفاتيح في النظام
  if (!API_KEYS || API_KEYS.length === 0) {
    throw new Error('لا توجد مفاتيح API متاحة');
  }
  
  // البحث عن مفتاح مناسب للنموذج
  const compatibleKeys = API_KEYS.filter((keyObj, index) => 
    keyObj && keyObj.type === model.provider && keyFailureCount[index] < 5
  );
  
  if (compatibleKeys.length === 0) {
    // إذا لم توجد مفاتيح متوافقة، جرب مفاتيح أخرى كبديل
    const fallbackKeys = API_KEYS.filter((keyObj, index) => 
      keyObj && keyFailureCount[index] < 10
    );
    
    if (fallbackKeys.length === 0) {
      throw new Error(`جميع المفاتيح معطلة مؤقتاً`);
    }
    
    // استخدم مفتاح متوافق فقط، لا تخلط بين الأنواع
    console.log(`❌ لا يوجد مفتاح متوافق للنموذج ${modelName}`);
    throw new Error(`لا يوجد مفتاح متوافق للنموذج: ${modelName}`);
  }
  
  // اختيار المفتاح الأقل استخداماً (محدود بعدد المفاتيح لتجنب الحلقة اللانهائية)
  let bestKey = compatibleKeys[0];
  let bestIndex = API_KEYS.indexOf(bestKey);
  let minUsage = keyUsageCount[bestIndex];
  
  // حلقة محدودة وآمنة
  for (let i = 0; i < Math.min(compatibleKeys.length, 10); i++) {
    const keyObj = compatibleKeys[i];
    const index = API_KEYS.indexOf(keyObj);
    if (keyUsageCount[index] < minUsage) {
      minUsage = keyUsageCount[index];
      bestKey = keyObj;
      bestIndex = index;
    }
  }
  
  currentKeyIndex = bestIndex;
  keyUsageCount[currentKeyIndex]++;
  
  console.log(`استخدام ${bestKey.name} (${currentKeyIndex + 1}), عدد الاستخدامات: ${keyUsageCount[currentKeyIndex]}`);
  
  return bestKey;
}

// دالة لبناء URL حسب نوع API
function buildAPIURL(keyObj, modelName) {
  switch (keyObj.type) {
    case 'gemini':
      return `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${keyObj.key}`;
    default:
      throw new Error(`نوع API غير مدعوم: ${keyObj.type}. يدعم التطبيق Gemini فقط.`);
  }
}

// دالة لإعادة تعيين إحصائيات المفاتيح
function resetKeyStats() {
  API_KEYS.forEach((key, index) => {
    keyUsageCount[index] = Math.floor(keyUsageCount[index] / 2);
    keyFailureCount[index] = Math.max(0, keyFailureCount[index] - 1);
  });
  console.log('تم إعادة تعيين إحصائيات المفاتيح');
}

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// Enhanced configuration for better academic research
const RESEARCH_CONFIG = {
  temperature: 0.7,
  maxTokens: 4000, // تقليل أكثر لتجنب الأخطاء
  topP: 0.8,
  topK: 30
};

// نظام إدارة الطلبات المحسن
let requestCount = 0;
const MAX_REQUESTS_PER_MINUTE = 100; // زيادة الحد بشكل كبير
let lastResetTime = Date.now();
let isResetting = false;

// تنظيف معداد الطلبات كل 15 ثانية
setInterval(() => {
  if (!isResetting) {
    isResetting = true;
    requestCount = Math.max(0, requestCount - 5); // تقليل تدريجي
    lastResetTime = Date.now();
    console.log(`تم تقليل معداد الطلبات إلى: ${requestCount}`);
    isResetting = false;
  }
}, 15000);

// إعادة تعيين كاملة كل دقيقة
setInterval(() => {
  requestCount = 0;
  lastResetTime = Date.now();
  resetKeyStats(); // إعادة تعيين إحصائيات المفاتيح أيضاً
  console.log('إعادة تعيين كاملة لمعداد الطلبات والمفاتيح');
}, 60000);

app.post('/research', async (req, res) => {
  // إضافة مهلة زمنية قصوى للعملية بأكملها (5 دقائق)
  const requestTimeout = setTimeout(() => {
    console.log('🔴 انتهت المهلة الزمنية للطلب');
    if (!res.headersSent) {
      res.status(408).json({
        error: {
          message: 'انتهت المهلة الزمنية للطلب. حاول مرة أخرى.',
          type: 'مهلة زمنية',
          suggestion: 'جرب تقليل حجم النص أو استخدم نموذج أسرع'
        }
      });
    }
  }, 300000); // 5 دقائق

  try {
    // فحص بسيط لمعدل الطلبات
    requestCount++;
    console.log(`طلب رقم: ${requestCount}`);
    
    // فقط في حالة الطلبات المفرطة
    if (requestCount > MAX_REQUESTS_PER_MINUTE) {
      console.log('تجاوز الحد المسموح - تأخير مؤقت');
      await new Promise(resolve => setTimeout(resolve, 2000)); // انتظار ثانيتين
      requestCount = Math.floor(requestCount / 2); // تقليل المعداد
    }
    const { prompt, type = 'simple', selectedModel = 'gemini-2.0-flash', apiKey } = req.body;
    
    // Enhanced prompt for better academic results based on selected model
    let enhancedPrompt = prompt;
    
    // تحسين النص حسب النموذج المحدد - Gemini فقط
    if (selectedModel.includes('gemini-2.0')) {
      enhancedPrompt = `باستخدام أحدث معايير البحث القانوني والأكاديمي، ${enhancedPrompt}`;
    } else if (selectedModel.includes('gemini')) {
      enhancedPrompt = `كخبير قانوني أكاديمي متمرس في التحليل العميق والدقيق، ${enhancedPrompt}`;
    }
    
    if (type === 'academic') {
      enhancedPrompt = `
${prompt}

تعليمات مهمة لضمان جودة البحث:

1. **الهيكل الأكاديمي:**
   - اتبع التسلسل الهرمي: مبحث → مطلب → فرع
   - رقم كل عنصر بوضوح
   - استخدم العناوين الواضحة والمحددة

2. **المحتوى العلمي:**
   - اكتب مقدمة شاملة تتضمن الإشكالية وأهمية الموضوع
   - استخدم التعريفات الدقيقة للمصطلحات
   - اذكر آراء متنوعة للفقهاء والباحثين
   - قدم أمثلة عملية وتطبيقية
   - اربط بين النظرية والتطبيق

3. **المراجع والهوامش:**
   - اكتب هوامش مرقمة في نهاية كل فقرة مهمة
   - استخدم تنسيق المراجع الأكاديمي: اسم المؤلف، عنوان الكتاب، دار النشر، مكان النشر، سنة النشر، رقم الصفحة
   - نوع المراجع (كتب، رسائل، مقالات، قوانين، مواقع موثوقة)
   - استخدم مراجع حديثة (آخر 10-15 سنة)

4. **الأسلوب الأكاديمي:**
   - استخدم اللغة العربية الفصيحة
   - تجنب الضمائر الشخصية
   - استخدم الأسلوب الموضوعي والمنطقي
   - اكتب فقرات متوازنة ومترابطة

5. **الخاتمة والتوصيات:**
   - لخص أهم النتائج
   - قدم توصيات عملية
   - اقترح مجالات للبحث المستقبلي

6. **التنسيق:**
   - ضع رقم الصفحة في أسفل كل صفحة
   - استخدم التباعد المناسب بين الأسطر
   - ميز العناوين الرئيسية والفرعية

الرجاء كتابة بحث شامل ومفصل يلتزم بهذه المعايير الأكاديمية.
      `;
    }
    
    const requestBody = {
      contents: [{
        parts: [{
          text: enhancedPrompt
        }]
      }],
      generationConfig: {
        temperature: RESEARCH_CONFIG.temperature,
        maxOutputTokens: RESEARCH_CONFIG.maxTokens,
        topP: RESEARCH_CONFIG.topP,
        topK: RESEARCH_CONFIG.topK,
        candidateCount: 1,
        stopSequences: []
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH", 
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };
    
    console.log(`إرسال طلب البحث باستخدام النموذج: ${selectedModel}`);
    
    // التحقق من توافق النموذج قبل البدء
    const model = SUPPORTED_MODELS[selectedModel];
    if (!model) {
      throw new Error(`النموذج ${selectedModel} غير مدعوم`);
    }
    
    // الحصول على المفتاح المناسب للنموذج
    let keyObj;
    
    // في البيئة المنشورة، يجب أن يأتي المفتاح دائمًا من متغيرات البيئة
    try {
      keyObj = getAPIKeyForModel(selectedModel);
    } catch (keyError) {
      console.log(`❌ ${keyError.message}`);
      // This error will be caught and sent as a 500 response
      throw new Error('لا يوجد مفتاح Gemini API صالح متاح في متغيرات البيئة على الخادم.');
    }
    
    try {
        
        const apiUrl = buildAPIURL(keyObj, selectedModel);
        console.log(`🔑 استخدام ${keyObj.name} للنموذج ${selectedModel}`);
        
        // بناء محتوى الطلب حسب نوع API
        let requestBody;
        let headers = { 'Content-Type': 'application/json' };
        
        if (keyObj.type === 'gemini') {
          requestBody = {
            contents: [
              {
                parts: [
                  {
                    text: enhancedPrompt
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: RESEARCH_CONFIG.temperature,
              maxOutputTokens: RESEARCH_CONFIG.maxTokens,
              topP: RESEARCH_CONFIG.topP,
              topK: RESEARCH_CONFIG.topK,
              candidateCount: 1,
              stopSequences: []
            },
            safetySettings: [
              {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_HATE_SPEECH", 
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              }
            ]
          };
        } else {
          throw new Error(`نوع API غير مدعوم: ${keyObj.type}. يدعم التطبيق Gemini فقط.`);
        }
        
        // إرسال الطلب
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(requestBody)
        });
        
        console.log(`✅ تم إرسال الطلب باستخدام ${keyObj.name}`);
        
       // معالجة الاستجابة
         if (!response.ok) {
          const errorText = await response.text();
          console.error('خطأ من Gemini API:', response.status, errorText);
          
          let errorMessage = 'خطأ غير معروف من Gemini API';
          
          if (response.status === 400) {
            errorMessage = 'البيانات المرسلة غير صحيحة. تحقق من المدخلات.';
          } else if (response.status === 401) {
            errorMessage = 'خطأ في مفتاح API. تحقق من صحة المفتاح.';
          } else if (response.status === 403) {
            errorMessage = 'تم تجاوز الحصة اليومية لـ API. الرجاء المحاولة غداً أو استخدام مفتاح آخر.';
          } else if (response.status === 429) {
            errorMessage = 'طلبات كثيرة جداً. انتظر دقيقة واحدة.';
          }
          
          throw new Error(errorMessage);
        }
        
        const data = await response.json();
        console.log('استلام استجابة من API');
        
        // استخراج النص من استجابة Gemini
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          console.error('استجابة Gemini فارغة:', JSON.stringify(data, null, 2));
          throw new Error('لم يتم العثور على نص في استجابة Gemini');
        }
        
        // تنسيق النص
        const formattedText = formatAcademicResponse(text, type);
        
        // تنظيف المهلة الزمنية عند النجاح
        clearTimeout(requestTimeout);
        
        res.json({
          research: formattedText,
          metadata: {
            type: type,
            timestamp: new Date().toISOString(),
            wordCount: text.split(' ').length,
            processing_time: Date.now(),
            model_used: selectedModel
          }
        });
        
      } catch (error) {
        console.error('خطأ في البحث:', error);
        
        // تنظيف المهلة الزمنية عند الخطأ
        clearTimeout(requestTimeout);
        
        res.status(500).json({
          error: {
            message: error.message,
            type: 'خطأ في المعالجة'
          }
        });
      }
  } catch (error) {
    console.error('خطأ في البحث:', error);
    
    // تقليل عداد الطلبات في حالة الخطأ
    if (requestCount > 0) {
      requestCount--;
    }
    
    let errorDetails = {
      message: error.message,
      type: 'غير معروف',
      timestamp: new Date().toISOString(),
      suggestion: 'حاول مرة أخرى خلال دقيقة واحدة'
    };
    
    if (error.message.includes('401') || error.message.includes('unauthorized')) {
      errorDetails = {
        message: 'خطأ في مصادقة مفتاح Gemini API.',
        type: 'مشكلة المصادقة',
        suggestion: 'تحقق من صحة مفتاح API في إعدادات الخادم'
      };
    } else if (error.message.includes('quota') || error.message.includes('429')) {
      errorDetails = {
        message: 'تم تجاوز الحد المسموح من الطلبات مؤقتاً.',
        type: 'تجاوز الحصة',
        suggestion: 'انتظر 30 ثانية قبل المحاولة مرة أخرى'
      };
    } else if (error.message.includes('model') || error.message.includes('400')) {
      errorDetails = {
        message: 'خطأ في البيانات المرسلة أو النموذج المستخدم.',
        type: 'خطأ في البيانات',
        suggestion: 'تحقق من صحة المدخلات وحاول مرة أخرى'
      };
    } else if (error.message.includes('لا يوجد مفتاح متوافق') || error.message.includes('غير مدعوم') || error.message.includes('404')) {
      errorDetails = {
        message: 'النموذج المحدد غير متاح حالياً أو غير مدعوم.',
        type: 'نموذج غير متاح',
        suggestion: 'استخدم نموذج Gemini 2.0 Flash للحصول على أفضل النتائج'
      };
    } else if (error.message.includes('timeout') || error.code === 'ECONNRESET') {
      errorDetails = {
        message: 'انتهت مهلة الاتصال مع الخادم.',
        type: 'مهلة الاتصال',
        suggestion: 'تحقق من اتصال الإنترنت وحاول مرة أخرى'
      };
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('network')) {
      errorDetails = {
        message: 'مشكلة في الاتصال بالإنترنت.',
        type: 'مشكلة الشبكة',
        suggestion: 'تحقق من اتصال الإنترنت'
      };
    }
    
    res.status(500).json({
      error: errorDetails
    });
  } finally {
    // تنظيف المهلة الزمنية
    clearTimeout(requestTimeout);
  }
});

// Function to format responses based on type
function formatAcademicResponse(text, type) {
  let formatted = text;
  
  switch(type) {
    case 'academic':
      // Enhanced formatting for academic papers
      formatted = formatted.replace(/^(المبحث|المطلب|الفرع|الخاتمة|المقدمة)/gm, '\n\n$1');
      formatted = formatted.replace(/\(\d+\)/g, '$&\n');
      formatted = formatted.replace(/(المبحث الثاني|المبحث الثالث|المبحث الرابع)/g, '\n[صفحة جديدة]\n\n$1');
      formatted = formatted.replace(/\n{3,}/g, '\n\n');
      break;
      
    case 'summary':
      // Format for lesson summaries
      formatted = formatted.replace(/^(\d+\.|[أابجد]\.)/gm, '\n$1');
      formatted = formatted.replace(/^(التعريف:|المفهوم:|النقطة الأساسية:)/gm, '\n\n**$1**');
      break;
      
    case 'preparation':
      // Format for research preparation
      formatted = formatted.replace(/^(\d+\.\s)/gm, '\n$1');
      formatted = formatted.replace(/^(المراجع:|الأسئلة:|الخطة:)/gm, '\n\n**$1**');
      break;
      
    case 'quiz':
      // Keep quiz format as is for parsing
      break;
      
    default:
      // Default formatting
      formatted = formatted.replace(/\n{3,}/g, '\n\n');
  }
  
  return formatted.trim();
}

// دالة اقتراحات حل الأخطاء
function getErrorSuggestion(statusCode) {
  const suggestions = {
    400: 'تحقق من صحة عنوان البحث والمدخلات',
    401: 'تحقق من مفتاح Gemini API في ملف server.js',
    403: 'تأكد من تفعيل Gemini API في Google Cloud Console',
    429: 'انتظر دقيقة واحدة قبل المحاولة مرة أخرى',
    500: 'خطأ مؤقت في الخادم، حاول مرة أخرى بعد قليل',
    503: 'الخدمة غير متوفرة مؤقتاً، حاول لاحقاً'
  };
  
  return suggestions[statusCode] || 'حاول مرة أخرى أو تواصل مع الدعم الفني';
}

// Add route for legal document templates
app.get('/templates/:field', (req, res) => {
  const field = req.params.field;
  const templates = {
    'قانون مدني': {
      structure: [
        'المقدمة',
        'المبحث الأول: مفهوم [الموضوع] في القانون المدني',
        'المطلب الأول: تعريف [الموضوع]',
        'المطلب الثاني: خصائص [الموضوع]',
        'المبحث الثاني: أحكام [الموضوع] في التشريع والفقه',
        'المطلب الأول: الأحكام في القانون المدني الجزائري',
        'المطلب الثاني: موقف الفقه والقضاء',
        'الخاتمة'
      ],
      keywords: ['العقد', 'الالتزام', 'المسؤولية', 'الحق العيني', 'الحق الشخصي']
    },
    'قانون جنائي': {
      structure: [
        'المقدمة',
        'المبحث الأول: ماهية [الجريمة/الموضوع]',
        'المطلب الأول: تعريف الجريمة وأركانها',
        'المطلب الثاني: خصائص وشروط الجريمة',
        'المبحث الثاني: العقوبة والجزاء',
        'المطلب الأول: أنواع العقوبات',
        'المطلب الثاني: ظروف التشديد والتخفيف',
        'الخاتمة'
      ],
      keywords: ['الجريمة', 'الركن المادي', 'الركن المعنوي', 'العقوبة', 'القصد الجنائي']
    }
  };
  
  res.json(templates[field] || { structure: [], keywords: [] });
});

// Add route for legal definitions
app.get('/definitions/:term', (req, res) => {
  const term = req.params.term;
  const definitions = {
    'القانون': 'مجموعة القواعد العامة المجردة التي تنظم سلوك الأفراد في المجتمع والمقترنة بجزاء توقعه السلطة العامة',
    'العقد': 'اتفاق يلتزم بموجبه شخص أو أشخاص آخرين بمنح أو فعل أو عدم فعل شيء ما',
    'الجريمة': 'كل فعل أو امتناع مخالف للقانون الجنائي ومعاقب عليه بمقتضاه',
    'الحق': 'استئثار يقره القانون ويحميه لشخص معين على شيء معين'
  };
  
  res.json({ 
    term: term, 
    definition: definitions[term] || 'التعريف غير متوفر' 
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// إضافة endpoint لإعادة تعيين النظام
app.post('/reset', (req, res) => {
  requestCount = 0;
  lastResetTime = Date.now();
  resetKeyStats();
  console.log('تم إعادة تعيين النظام يدوياً');
  res.json({ 
    message: 'تم إعادة تعيين النظام بنجاح', 
    requestCount: 0,
    keysReset: true
  });
});

// إضافة endpoint لفحص حالة النظام
app.get('/status', (req, res) => {
  const keyStats = API_KEYS.map((keyObj, index) => ({
    keyIndex: index + 1,
    name: keyObj.name,
    type: keyObj.type,
    keyEnd: keyObj.key.slice(-8),
    usageCount: keyUsageCount[index],
    failureCount: keyFailureCount[index],
    isActive: keyFailureCount[index] < 5
  }));

  res.json({
    requestCount,
    maxRequests: MAX_REQUESTS_PER_MINUTE,
    lastReset: new Date(lastResetTime).toLocaleString('ar-EG'),
    uptime: Math.floor(process.uptime()),
    memory: process.memoryUsage(),
    apiKeys: {
      total: API_KEYS.length,
      current: currentKeyIndex + 1,
      stats: keyStats
    }
  });
});

// إضافة endpoint لتبديل المفتاح يدوياً
app.post('/switch-key', (req, res) => {
  const { keyIndex } = req.body;
  
  if (keyIndex >= 0 && keyIndex < API_KEYS.length) {
    currentKeyIndex = keyIndex;
    console.log(`تم تبديل المفتاح يدوياً إلى رقم: ${currentKeyIndex + 1}`);
    res.json({ 
      message: `تم تبديل المفتاح إلى رقم ${currentKeyIndex + 1}`,
      currentKey: currentKeyIndex + 1,
      keyEnd: API_KEYS[currentKeyIndex].slice(-8)
    });
  } else {
    res.status(400).json({ error: 'رقم مفتاح غير صحيح' });
  }
});

app.listen(port, () => {
  console.log(`Research server running at http://localhost:${port}`);
  console.log(`Status: http://localhost:${port}/status`);
});
