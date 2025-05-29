const twilio = require("twilio");

// إعدادات Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const apiKeySid = process.env.TWILIO_API_KEY_SID;
const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// إنشاء عميل Twilio
let client = null;
try {
  if (apiKeySid && apiKeySecret && accountSid) {
    // استخدام API Key
    client = twilio(apiKeySid, apiKeySecret, { accountSid: accountSid });
  } else if (accountSid && authToken) {
    // استخدام Account SID و Auth Token
    client = twilio(accountSid, authToken);
  } else {
    console.log('Twilio credentials not configured properly');
  }
} catch (error) {
  console.log('Twilio initialization failed:', error.message);
  client = null;
}

/**
 * إرسال رسالة نصية عبر Twilio
 * @param {string} to - رقم الهاتف المستلم
 * @param {string} message - نص الرسالة
 * @returns {Promise<boolean>} - نجح الإرسال أم لا
 */
const sendSMS = async (to, message) => {
  try {
    // التحقق من وجود إعدادات Twilio
    if (!client || !twilioPhoneNumber) {
      console.log("Twilio not configured, simulating SMS send");
      console.log(`SMS to ${to}: ${message}`);
      return true; // محاكاة نجح الإرسال
    }

    // تنسيق رقم الهاتف
    const formattedPhone = formatPhoneNumber(to);

    console.log(`Sending SMS to ${formattedPhone}: ${message}`);

    // إرسال الرسالة عبر Twilio
    const result = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: formattedPhone,
    });

    console.log(`SMS sent successfully. SID: ${result.sid}`);
    return true;
  } catch (error) {
    console.error("Error sending SMS:", error);

    // في حالة الخطأ، نحاول المحاكاة للتطوير
    if (process.env.NODE_ENV === "development") {
      console.log(`Development mode: Simulating SMS to ${to}: ${message}`);
      return true;
    }

    return false;
  }
};

/**
 * تنسيق رقم الهاتف للتنسيق الدولي
 * @param {string} phone - رقم الهاتف
 * @returns {string} - رقم الهاتف منسق
 */
const formatPhoneNumber = (phone) => {
  // إزالة المسافات والأحرف غير الرقمية
  let cleaned = phone.replace(/[^\d+]/g, "");

  // إذا كان الرقم يبدأ بـ + فهو منسق بالفعل
  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  // التعامل مع الأرقام السورية
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    // إزالة الصفر وإضافة رمز سوريا
    cleaned = "+963" + cleaned.substring(1);
  } else if (cleaned.startsWith("9") && cleaned.length === 9) {
    // رقم سوري بدون رمز الدولة
    cleaned = "+963" + cleaned;
  }
  // التعامل مع الأرقام السعودية
  else if (cleaned.startsWith("05") && cleaned.length === 10) {
    // رقم سعودي يبدأ بـ 05
    cleaned = "+966" + cleaned.substring(1);
  } else if (cleaned.startsWith("5") && cleaned.length === 9) {
    // رقم سعودي بدون رمز الدولة
    cleaned = "+966" + cleaned;
  }
  // التعامل مع الأرقام الأمريكية
  else if (cleaned.startsWith("1") && cleaned.length === 11) {
    // رقم أمريكي
    cleaned = "+" + cleaned;
  }
  // افتراضي: إضافة رمز سوريا
  else if (!cleaned.startsWith("+")) {
    cleaned = "+963" + cleaned;
  }

  return cleaned;
};

/**
 * إرسال رمز التحقق عبر SMS
 * @param {string} phone - رقم الهاتف
 * @param {string} otp - رمز التحقق
 * @returns {Promise<boolean>} - نجح الإرسال أم لا
 */
const sendOTPSMS = async (phone, otp) => {
  const message = `رمز التحقق الخاص بك في JobScope هو: ${otp}\nلا تشارك هذا الرمز مع أحد.`;
  return await sendSMS(phone, message);
};

/**
 * إرسال رسالة ترحيب للمستخدم الجديد
 * @param {string} phone - رقم الهاتف
 * @param {string} name - اسم المستخدم
 * @returns {Promise<boolean>} - نجح الإرسال أم لا
 */
const sendWelcomeSMS = async (phone, name) => {
  const message = `مرحباً ${name}! تم تسجيلك بنجاح في JobScope. نحن سعداء لانضمامك إلينا.`;
  return await sendSMS(phone, message);
};

/**
 * إرسال إشعار حجز جديد للحرفي
 * @param {string} phone - رقم هاتف الحرفي
 * @param {string} clientName - اسم العميل
 * @param {string} service - نوع الخدمة
 * @returns {Promise<boolean>} - نجح الإرسال أم لا
 */
const sendBookingNotificationSMS = async (phone, clientName, service) => {
  const message = `لديك طلب حجز جديد من ${clientName} لخدمة ${service}. تحقق من التطبيق لمزيد من التفاصيل.`;
  return await sendSMS(phone, message);
};

module.exports = {
  sendSMS,
  sendOTPSMS,
  sendWelcomeSMS,
  sendBookingNotificationSMS,
  formatPhoneNumber,
};
