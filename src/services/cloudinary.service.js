const cloudinary = require('cloudinary').v2;

// إعداد Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'jobscope-app',
  api_key: process.env.CLOUDINARY_API_KEY || '123456789012345',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'abcdefghijklmnopqrstuvwxyz123456'
});

/**
 * رفع صورة إلى Cloudinary
 * @param {Buffer} fileBuffer - محتوى الملف
 * @param {Object} options - خيارات الرفع
 * @returns {Promise<Object>} - معلومات الصورة المرفوعة
 */
const uploadImage = async (fileBuffer, options = {}) => {
  try {
    console.log('🚀 بدء رفع الصورة إلى Cloudinary...');
    
    const defaultOptions = {
      folder: 'jobscope/gallery',
      resource_type: 'image',
      format: 'webp', // تحويل تلقائي إلى WebP (أسرع وأصغر)
      quality: 'auto:good', // ضغط تلقائي ذكي
      fetch_format: 'auto', // اختيار أفضل صيغة تلقائياً
      transformation: [
        {
          width: 800,
          height: 600,
          crop: 'limit', // تصغير فقط إذا كانت أكبر
          quality: 'auto:good'
        }
      ]
    };

    const uploadOptions = { ...defaultOptions, ...options };

    // رفع الصورة
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('❌ خطأ في رفع الصورة:', error);
            reject(error);
          } else {
            console.log('✅ تم رفع الصورة بنجاح:', {
              public_id: result.public_id,
              url: result.secure_url,
              size: result.bytes,
              format: result.format
            });
            resolve(result);
          }
        }
      ).end(fileBuffer);
    });

    return {
      success: true,
      public_id: result.public_id,
      url: result.secure_url,
      thumbnail_url: cloudinary.url(result.public_id, {
        width: 300,
        height: 200,
        crop: 'fill',
        quality: 'auto:low',
        format: 'webp'
      }),
      size: result.bytes,
      format: result.format
    };

  } catch (error) {
    console.error('❌ خطأ في خدمة Cloudinary:', error);
    throw new Error(`فشل في رفع الصورة: ${error.message}`);
  }
};

/**
 * حذف صورة من Cloudinary
 * @param {string} publicId - معرف الصورة العام
 * @returns {Promise<Object>} - نتيجة الحذف
 */
const deleteImage = async (publicId) => {
  try {
    console.log('🗑️ بدء حذف الصورة من Cloudinary:', publicId);
    
    const result = await cloudinary.uploader.destroy(publicId);
    
    console.log('✅ تم حذف الصورة:', {
      public_id: publicId,
      result: result.result
    });
    
    return {
      success: result.result === 'ok',
      public_id: publicId,
      result: result.result
    };

  } catch (error) {
    console.error('❌ خطأ في حذف الصورة:', error);
    throw new Error(`فشل في حذف الصورة: ${error.message}`);
  }
};

/**
 * حذف عدة صور
 * @param {Array<string>} publicIds - معرفات الصور
 * @returns {Promise<Object>} - نتيجة الحذف
 */
const deleteMultipleImages = async (publicIds) => {
  try {
    console.log('🗑️ بدء حذف عدة صور:', publicIds.length);
    
    const result = await cloudinary.api.delete_resources(publicIds);
    
    console.log('✅ تم حذف الصور:', result);
    
    return {
      success: true,
      deleted: result.deleted,
      deleted_counts: result.deleted_counts
    };

  } catch (error) {
    console.error('❌ خطأ في حذف الصور:', error);
    throw new Error(`فشل في حذف الصور: ${error.message}`);
  }
};

/**
 * الحصول على رابط محسن للصورة
 * @param {string} publicId - معرف الصورة
 * @param {Object} options - خيارات التحسين
 * @returns {string} - رابط الصورة المحسن
 */
const getOptimizedUrl = (publicId, options = {}) => {
  const defaultOptions = {
    quality: 'auto:good',
    fetch_format: 'auto',
    width: 400,
    height: 300,
    crop: 'fill'
  };

  const finalOptions = { ...defaultOptions, ...options };
  
  return cloudinary.url(publicId, finalOptions);
};

module.exports = {
  uploadImage,
  deleteImage,
  deleteMultipleImages,
  getOptimizedUrl,
  cloudinary
};
