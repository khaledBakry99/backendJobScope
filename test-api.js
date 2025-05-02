const fetch = require('node-fetch');

// عنوان URL الأساسي للـ API
const BASE_URL = 'http://localhost:5000/api';

// دالة لاختبار نقطة نهاية GET
async function testGetEndpoint(endpoint) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`);
    const data = await response.json();
    console.log(`✅ GET ${endpoint}:`, data);
    return data;
  } catch (error) {
    console.error(`❌ GET ${endpoint} فشل:`, error.message);
    return null;
  }
}

// دالة لاختبار نقطة نهاية POST
async function testPostEndpoint(endpoint, body) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    console.log(`✅ POST ${endpoint}:`, data);
    return data;
  } catch (error) {
    console.error(`❌ POST ${endpoint} فشل:`, error.message);
    return null;
  }
}

// اختبار المسار الرئيسي
async function testRootEndpoint() {
  try {
    const response = await fetch('http://localhost:5173/');
    const data = await response.json();
    console.log('✅ GET / (المسار الرئيسي):', data);
    return data;
  } catch (error) {
    console.error('❌ GET / (المسار الرئيسي) فشل:', error.message);
    return null;
  }
}

// اختبار تسجيل مستخدم جديد
async function testRegisterUser() {
  const userData = {
    name: 'مستخدم اختبار',
    email: `test${Date.now()}@example.com`, // استخدام طابع زمني لتجنب تكرار البريد الإلكتروني
    password: 'Password123!',
    phone: '0123456789',
    userType: 'client',
  };

  return testPostEndpoint('/auth/register', userData);
}

// اختبار تسجيل الدخول
async function testLogin(email, password) {
  const loginData = {
    email,
    password,
  };

  return testPostEndpoint('/auth/login', loginData);
}

// اختبار الحصول على قائمة المهن
async function testGetProfessions() {
  return testGetEndpoint('/professions');
}

// تنفيذ الاختبارات
async function runTests() {
  console.log('🚀 بدء اختبارات API...');
  
  // اختبار المسار الرئيسي
  await testRootEndpoint();
  
  // اختبار تسجيل مستخدم جديد
  const registeredUser = await testRegisterUser();
  
  // اختبار تسجيل الدخول إذا نجح التسجيل
  if (registeredUser && !registeredUser.error) {
    await testLogin(registeredUser.email, 'Password123!');
  } else {
    console.log('⚠️ تخطي اختبار تسجيل الدخول لأن التسجيل فشل');
  }
  
  // اختبار الحصول على قائمة المهن
  await testGetProfessions();
  
  console.log('✨ اكتملت اختبارات API');
}

// تشغيل الاختبارات
runTests().catch(error => {
  console.error('❌ حدث خطأ أثناء تنفيذ الاختبارات:', error);
});
