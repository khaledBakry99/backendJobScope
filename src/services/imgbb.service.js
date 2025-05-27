const axios = require('axios');
const FormData = require('form-data');

class ImgBBService {
  constructor() {
    // استخدام متغير البيئة أولاً، ثم القيمة الافتراضية
    this.apiKey = process.env.IMGBB_API_KEY || 'f34117eed7981fb377ebcfd3621871e5';
    this.baseUrl = 'https://api.imgbb.com/1/upload';

    // التحقق من وجود API Key
    if (!this.apiKey) {
      console.error('ImgBB API Key غير موجود! يرجى إضافة IMGBB_API_KEY في متغيرات البيئة');
    } else {
      console.log('ImgBB Service تم تهيئته بنجاح مع API Key');
    }
  }

  /**
   * رفع صورة إلى ImgBB
   * @param {Buffer} imageBuffer - بيانات الصورة
   * @param {string} imageName - اسم الصورة (اختياري)
   * @returns {Promise<Object>} - معلومات الصورة المرفوعة
   */
  async uploadImage(imageBuffer, imageName = null) {
    try {
      console.log('ImgBB - بدء رفع الصورة:', {
        bufferSize: imageBuffer.length,
        imageName: imageName
      });

      // تحويل Buffer إلى base64
      const base64Image = imageBuffer.toString('base64');

      // إنشاء FormData
      const formData = new FormData();
      formData.append('key', this.apiKey);
      formData.append('image', base64Image);

      if (imageName) {
        formData.append('name', imageName);
      }

      // رفع الصورة
      const response = await axios.post(this.baseUrl, formData, {
        headers: {
          ...formData.getHeaders(),
          'User-Agent': 'JobScope-Backend/1.0',
          'Accept': 'application/json',
        },
        timeout: 30000, // 30 ثانية timeout
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      if (response.data && response.data.success) {
        const imageData = response.data.data;

        console.log('ImgBB - تم رفع الصورة بنجاح:', {
          id: imageData.id,
          url: imageData.url,
          display_url: imageData.display_url,
          size: imageData.size
        });

        return {
          success: true,
          id: imageData.id,
          url: imageData.url,
          display_url: imageData.display_url,
          delete_url: imageData.delete_url,
          size: imageData.size,
          width: imageData.width,
          height: imageData.height,
          title: imageData.title,
          time: imageData.time
        };
      } else {
        throw new Error('فشل في رفع الصورة إلى ImgBB');
      }
    } catch (error) {
      console.error('ImgBB - خطأ في رفع الصورة:', error.message);

      if (error.response) {
        console.error('ImgBB - تفاصيل الخطأ:', {
          status: error.response.status,
          data: error.response.data
        });
      }

      throw new Error(`خطأ في رفع الصورة: ${error.message}`);
    }
  }

  /**
   * رفع عدة صور
   * @param {Array} imageBuffers - مصفوفة من بيانات الصور
   * @param {Array} imageNames - مصفوفة من أسماء الصور (اختياري)
   * @returns {Promise<Array>} - مصفوفة من معلومات الصور المرفوعة
   */
  async uploadMultipleImages(imageBuffers, imageNames = []) {
    try {
      console.log('ImgBB - بدء رفع عدة صور:', {
        count: imageBuffers.length
      });

      const uploadPromises = imageBuffers.map((buffer, index) => {
        const imageName = imageNames[index] || `image_${Date.now()}_${index}`;
        return this.uploadImage(buffer, imageName);
      });

      const results = await Promise.allSettled(uploadPromises);

      const successfulUploads = [];
      const failedUploads = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulUploads.push(result.value);
        } else {
          failedUploads.push({
            index,
            error: result.reason.message
          });
        }
      });

      console.log('ImgBB - نتائج رفع الصور:', {
        successful: successfulUploads.length,
        failed: failedUploads.length
      });

      return {
        successful: successfulUploads,
        failed: failedUploads,
        totalCount: imageBuffers.length
      };
    } catch (error) {
      console.error('ImgBB - خطأ في رفع عدة صور:', error.message);
      throw error;
    }
  }

  /**
   * حذف صورة من ImgBB (ملاحظة: ImgBB لا يدعم حذف الصور عبر API)
   * @param {string} imageId - معرف الصورة
   * @returns {Promise<Object>} - نتيجة الحذف
   */
  async deleteImage(imageId) {
    // ImgBB لا يدعم حذف الصور عبر API
    // لذلك سنقوم بحذف الرابط من قاعدة البيانات فقط
    console.log('ImgBB - تحذير: لا يمكن حذف الصور من ImgBB عبر API');

    return {
      success: true,
      message: 'تم حذف الرابط من قاعدة البيانات (الصورة تبقى على ImgBB)',
      imageId: imageId
    };
  }

  /**
   * التحقق من صحة رابط الصورة
   * @param {string} imageUrl - رابط الصورة
   * @returns {boolean} - هل الرابط صحيح
   */
  isValidImgBBUrl(imageUrl) {
    if (!imageUrl || typeof imageUrl !== 'string') {
      return false;
    }

    // التحقق من أن الرابط من ImgBB
    const imgbbDomains = [
      'i.ibb.co',
      'ibb.co',
      'imgbb.com'
    ];

    try {
      const url = new URL(imageUrl);
      return imgbbDomains.some(domain => url.hostname.includes(domain));
    } catch (error) {
      return false;
    }
  }

  /**
   * استخراج معرف الصورة من الرابط
   * @param {string} imageUrl - رابط الصورة
   * @returns {string|null} - معرف الصورة
   */
  extractImageIdFromUrl(imageUrl) {
    if (!this.isValidImgBBUrl(imageUrl)) {
      return null;
    }

    try {
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/');

      // البحث عن معرف الصورة في المسار
      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        if (part && part.length > 5) { // معرف الصورة عادة أطول من 5 أحرف
          return part.split('.')[0]; // إزالة امتداد الملف
        }
      }

      return null;
    } catch (error) {
      console.error('خطأ في استخراج معرف الصورة:', error.message);
      return null;
    }
  }
}

module.exports = new ImgBBService();
