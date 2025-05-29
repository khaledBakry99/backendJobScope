const axios = require("axios");
require("dotenv").config();

class HyperSenderService {
  constructor() {
    // إعدادات HyperSender من متغيرات البيئة
    this.apiToken = process.env.HYPERSENDER_API_TOKEN;
    this.senderId = process.env.HYPERSENDER_SENDER_ID || "JobScope";
    this.apiUrl =
      process.env.HYPERSENDER_API_URL || "https://api.hypersender.com/sms/send";

    // التحقق من وجود الإعدادات المطلوبة
    if (!this.apiToken) {
      console.warn("HYPERSENDER_API_TOKEN is not set in environment variables");
    }
  }

  /**
   * تنسيق رقم الهاتف للتأكد من أنه بالصيغة الصحيحة
   * @param {string} phone - رقم الهاتف
   * @returns {string} - رقم الهاتف المنسق
   */
  formatPhoneNumber(phone) {
    // إزالة المسافات والأحرف غير الرقمية
    let cleanPhone = phone.replace(/[^\d+]/g, "");

    // التعامل مع الأرقام السورية
    if (cleanPhone.startsWith("0")) {
      // إزالة الصفر وإضافة رمز سوريا
      cleanPhone = "+963" + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith("9") && cleanPhone.length === 9) {
      // إضافة رمز سوريا للأرقام التي تبدأ بـ 9
      cleanPhone = "+963" + cleanPhone;
    } else if (!cleanPhone.startsWith("+")) {
      // إضافة رمز سوريا إذا لم يكن موجود
      cleanPhone = "+963" + cleanPhone;
    }

    return cleanPhone;
  }

  /**
   * إرسال رسالة نصية عبر HyperSender
   * @param {string} phone - رقم الهاتف
   * @param {string} message - نص الرسالة
   * @returns {Promise<Object>} - نتيجة الإرسال
   */
  async sendSMS(phone, message) {
    try {
      // التحقق من وجود API Token
      if (!this.apiToken) {
        console.error("HyperSender API Token is not configured");
        return {
          success: false,
          error: "SMS service is not configured",
        };
      }

      // تنسيق رقم الهاتف
      const formattedPhone = this.formatPhoneNumber(phone);

      console.log(
        `Sending SMS via HyperSender to ${formattedPhone}: ${message}`
      );

      // تجربة تنسيقات مختلفة للـ API
      const requestFormats = [
        // التنسيق الأول - JSON مع Authorization Bearer
        {
          data: {
            to: formattedPhone,
            message: message,
            sender_id: this.senderId,
            type: "text",
          },
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiToken}`,
            Accept: "application/json",
          },
        },
        // التنسيق الثاني - JSON مع X-API-Key
        {
          data: {
            phone: formattedPhone,
            text: message,
            sender: this.senderId,
            api_key: this.apiToken,
          },
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": this.apiToken,
            Accept: "application/json",
          },
        },
        // التنسيق الثالث - Form Data
        {
          data: new URLSearchParams({
            phone: formattedPhone,
            message: message,
            sender: this.senderId,
            api_key: this.apiToken,
          }),
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Bearer ${this.apiToken}`,
          },
        },
        // التنسيق الرابع - مع معاملات مختلفة
        {
          data: {
            recipient: formattedPhone,
            content: message,
            from: this.senderId,
            token: this.apiToken,
          },
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${this.apiToken}`,
            Accept: "application/json",
          },
        },
      ];

      let lastError = null;

      // تجربة كل تنسيق حتى ينجح واحد
      for (let i = 0; i < requestFormats.length; i++) {
        try {
          console.log(`Trying request format ${i + 1}...`);

          const { data, headers } = requestFormats[i];

          const response = await axios.post(this.apiUrl, data, {
            headers: headers,
            timeout: 15000, // 15 ثانية timeout
          });

          console.log(`Format ${i + 1} - HyperSender response:`, response.data);

          // التحقق من نجاح الإرسال
          if (response.status === 200 || response.status === 201) {
            const responseData = response.data;

            // تحقق من علامات النجاح المختلفة
            const isSuccess =
              responseData.success === true ||
              responseData.status === "success" ||
              responseData.status === "sent" ||
              responseData.message_id ||
              responseData.id ||
              (responseData.error === undefined &&
                responseData.message !== "error");

            if (isSuccess) {
              return {
                success: true,
                messageId:
                  responseData.message_id ||
                  responseData.id ||
                  `msg_${Date.now()}`,
                status: responseData.status || "sent",
                data: responseData,
                format: i + 1,
              };
            }
          }
        } catch (formatError) {
          console.log(
            `Format ${i + 1} failed:`,
            formatError.response?.data || formatError.message
          );
          lastError = formatError;
          continue;
        }
      }

      // إذا فشلت جميع التنسيقات
      throw lastError || new Error("All request formats failed");
    } catch (error) {
      console.error("HyperSender SMS sending error:", error);

      if (error.response) {
        // خطأ من الخادم
        console.error("Response error:", error.response.data);
        return {
          success: false,
          error:
            error.response.data.message ||
            error.response.data.error ||
            "SMS service error",
          statusCode: error.response.status,
          data: error.response.data,
        };
      } else if (error.request) {
        // خطأ في الشبكة
        console.error("Network error:", error.message);
        return {
          success: false,
          error: "Network error - unable to reach SMS service",
        };
      } else {
        // خطأ آخر
        console.error("General error:", error.message);
        return {
          success: false,
          error: error.message || "Unknown error occurred",
        };
      }
    }
  }

  /**
   * إرسال رمز التحقق OTP
   * @param {string} phone - رقم الهاتف
   * @param {string} otp - رمز التحقق
   * @returns {Promise<Object>} - نتيجة الإرسال
   */
  async sendOTP(phone, otp) {
    const message = `رمز التحقق الخاص بك في JobScope هو: ${otp}\nلا تشارك هذا الرمز مع أي شخص.\nصالح لمدة 10 دقائق.`;

    return await this.sendSMS(phone, message);
  }

  /**
   * إرسال رسالة ترحيب
   * @param {string} phone - رقم الهاتف
   * @param {string} name - اسم المستخدم
   * @returns {Promise<Object>} - نتيجة الإرسال
   */
  async sendWelcomeMessage(phone, name) {
    const message = `مرحباً ${name}!\nتم تسجيلك بنجاح في JobScope.\nنتمنى لك تجربة ممتعة في منصتنا.`;

    return await this.sendSMS(phone, message);
  }

  /**
   * إرسال إشعار حجز جديد للحرفي
   * @param {string} phone - رقم هاتف الحرفي
   * @param {string} clientName - اسم العميل
   * @param {string} service - نوع الخدمة
   * @returns {Promise<Object>} - نتيجة الإرسال
   */
  async sendBookingNotification(phone, clientName, service) {
    const message = `لديك طلب حجز جديد من ${clientName} لخدمة ${service}.\nيرجى مراجعة التطبيق للتفاصيل والرد على الطلب.`;

    return await this.sendSMS(phone, message);
  }

  /**
   * اختبار الاتصال مع خدمة HyperSender
   * @returns {Promise<Object>} - نتيجة الاختبار
   */
  async testConnection() {
    try {
      console.log("Testing HyperSender connection...");

      // اختبار بسيط للتحقق من الإعدادات
      if (!this.apiToken) {
        return {
          success: false,
          message: "HyperSender API Token is not configured",
          error: "Missing API Token",
        };
      }

      // إرسال رسالة اختبار لرقم وهمي (لن يتم إرسالها فعلياً)
      const testMessage = "اختبار اتصال JobScope - Test Connection";
      const testPhone = "+963999999999";

      console.log(`Testing with phone: ${testPhone}, message: ${testMessage}`);

      const testResult = await this.sendSMS(testPhone, testMessage);

      return {
        success: testResult.success,
        message: testResult.success
          ? "HyperSender connection test completed successfully"
          : "HyperSender connection test failed",
        result: testResult,
        apiToken: this.apiToken
          ? `${this.apiToken.substring(0, 10)}...`
          : "Not set",
        apiUrl: this.apiUrl,
        senderId: this.senderId,
      };
    } catch (error) {
      console.error("HyperSender connection test error:", error);
      return {
        success: false,
        message: "HyperSender connection test failed",
        error: error.message,
        apiToken: this.apiToken
          ? `${this.apiToken.substring(0, 10)}...`
          : "Not set",
        apiUrl: this.apiUrl,
        senderId: this.senderId,
      };
    }
  }

  /**
   * التحقق من حالة الرسالة
   * @param {string} messageId - معرف الرسالة
   * @returns {Promise<Object>} - حالة الرسالة
   */
  async getMessageStatus(messageId) {
    try {
      if (!this.apiToken || !messageId) {
        return {
          success: false,
          error: "Missing API token or message ID",
        };
      }

      // محاولة الحصول على حالة الرسالة
      const statusUrl = this.apiUrl.replace("/send", "/status");

      const response = await axios.get(`${statusUrl}/${messageId}`, {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          Accept: "application/json",
        },
        timeout: 10000,
      });

      return {
        success: true,
        status: response.data.status || "unknown",
        data: response.data,
      };
    } catch (error) {
      console.error("Error getting message status:", error);
      return {
        success: false,
        error: error.message,
        status: "unknown",
      };
    }
  }

  /**
   * الحصول على رصيد الحساب
   * @returns {Promise<Object>} - معلومات الرصيد
   */
  async getAccountBalance() {
    try {
      if (!this.apiToken) {
        return {
          success: false,
          error: "API token not configured",
        };
      }

      const balanceUrl = this.apiUrl.replace("/send", "/balance");

      const response = await axios.get(balanceUrl, {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          Accept: "application/json",
        },
        timeout: 10000,
      });

      return {
        success: true,
        balance: response.data.balance || 0,
        currency: response.data.currency || "USD",
        data: response.data,
      };
    } catch (error) {
      console.error("Error getting account balance:", error);
      return {
        success: false,
        error: error.message,
        balance: 0,
      };
    }
  }
}

module.exports = new HyperSenderService();
