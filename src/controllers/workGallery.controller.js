const asyncHandler = require("express-async-handler");
const Craftsman = require("../models/craftsman.model");
const mongoose = require("mongoose");

/**
 * الحصول على معرض أعمال الحرفي
 */
exports.getWorkGallery = asyncHandler(async (req, res) => {
  try {
    const { craftsmanId } = req.params;

    // التحقق من صحة معرف الحرفي
    if (!mongoose.Types.ObjectId.isValid(craftsmanId)) {
      return res.status(400).json({ message: "معرف الحرفي غير صالح" });
    }

    // البحث عن الحرفي
    const craftsman = await Craftsman.findById(craftsmanId).select("workGallery");
    
    if (!craftsman) {
      return res.status(404).json({ message: "لم يتم العثور على الحرفي" });
    }

    res.json({
      success: true,
      workGallery: craftsman.workGallery || [],
      count: craftsman.workGallery ? craftsman.workGallery.length : 0
    });

  } catch (error) {
    console.error("خطأ في جلب معرض الأعمال:", error);
    res.status(500).json({ message: "حدث خطأ أثناء جلب معرض الأعمال" });
  }
});

/**
 * الحصول على معرض أعمال الحرفي الحالي
 */
exports.getMyWorkGallery = asyncHandler(async (req, res) => {
  try {
    // البحث عن الحرفي باستخدام معرف المستخدم
    const craftsman = await Craftsman.findOne({ user: req.user._id }).select("workGallery");
    
    if (!craftsman) {
      return res.status(404).json({ message: "لم يتم العثور على ملف الحرفي" });
    }

    res.json({
      success: true,
      workGallery: craftsman.workGallery || [],
      count: craftsman.workGallery ? craftsman.workGallery.length : 0
    });

  } catch (error) {
    console.error("خطأ في جلب معرض الأعمال:", error);
    res.status(500).json({ message: "حدث خطأ أثناء جلب معرض الأعمال" });
  }
});

/**
 * إضافة صور إلى معرض الأعمال
 */
exports.addToWorkGallery = asyncHandler(async (req, res) => {
  try {
    const { images } = req.body;

    // التحقق من وجود الصور
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ message: "يجب توفير صور صالحة" });
    }

    // التحقق من صحة بيانات الصور
    const validImages = images.filter(image => {
      return image && 
             typeof image === 'object' && 
             image.url && 
             typeof image.url === 'string';
    });

    if (validImages.length === 0) {
      return res.status(400).json({ message: "لا توجد صور صالحة للإضافة" });
    }

    // البحث عن الحرفي
    const craftsman = await Craftsman.findOne({ user: req.user._id });
    
    if (!craftsman) {
      return res.status(404).json({ message: "لم يتم العثور على ملف الحرفي" });
    }

    // التحقق من الحد الأقصى للصور (مثلاً 20 صورة)
    const maxImages = 20;
    const currentImageCount = craftsman.workGallery ? craftsman.workGallery.length : 0;
    
    if (currentImageCount + validImages.length > maxImages) {
      return res.status(400).json({ 
        message: `لا يمكن إضافة أكثر من ${maxImages} صورة. لديك حالياً ${currentImageCount} صورة` 
      });
    }

    // إضافة الصور إلى المعرض
    if (!craftsman.workGallery) {
      craftsman.workGallery = [];
    }

    // إضافة معلومات إضافية لكل صورة
    const imagesToAdd = validImages.map(image => ({
      url: image.url,
      thumb: image.thumb || image.url,
      medium: image.medium || image.url,
      id: image.id || Date.now().toString(),
      filename: image.filename || 'work-image.jpg',
      size: image.size || 0,
      uploadedAt: image.uploadedAt || new Date().toISOString()
    }));

    craftsman.workGallery.push(...imagesToAdd);

    // حفظ التغييرات
    await craftsman.save();

    res.json({
      success: true,
      message: `تم إضافة ${validImages.length} صورة إلى معرض الأعمال`,
      workGallery: craftsman.workGallery,
      addedImages: imagesToAdd,
      count: craftsman.workGallery.length
    });

  } catch (error) {
    console.error("خطأ في إضافة الصور:", error);
    res.status(500).json({ message: "حدث خطأ أثناء إضافة الصور" });
  }
});

/**
 * حذف صورة من معرض الأعمال
 */
exports.removeFromWorkGallery = asyncHandler(async (req, res) => {
  try {
    const { imageId, imageUrl } = req.body;

    // التحقق من وجود معرف الصورة أو رابطها
    if (!imageId && !imageUrl) {
      return res.status(400).json({ message: "يجب توفير معرف الصورة أو رابطها" });
    }

    // البحث عن الحرفي
    const craftsman = await Craftsman.findOne({ user: req.user._id });
    
    if (!craftsman) {
      return res.status(404).json({ message: "لم يتم العثور على ملف الحرفي" });
    }

    if (!craftsman.workGallery || craftsman.workGallery.length === 0) {
      return res.status(404).json({ message: "معرض الأعمال فارغ" });
    }

    // البحث عن الصورة وحذفها
    const initialLength = craftsman.workGallery.length;
    
    if (imageId) {
      craftsman.workGallery = craftsman.workGallery.filter(image => 
        (typeof image === 'object' ? image.id : null) !== imageId
      );
    } else if (imageUrl) {
      craftsman.workGallery = craftsman.workGallery.filter(image => 
        (typeof image === 'object' ? image.url : image) !== imageUrl
      );
    }

    // التحقق من حذف الصورة
    if (craftsman.workGallery.length === initialLength) {
      return res.status(404).json({ message: "لم يتم العثور على الصورة المطلوب حذفها" });
    }

    // حفظ التغييرات
    await craftsman.save();

    res.json({
      success: true,
      message: "تم حذف الصورة من معرض الأعمال",
      workGallery: craftsman.workGallery,
      count: craftsman.workGallery.length
    });

  } catch (error) {
    console.error("خطأ في حذف الصورة:", error);
    res.status(500).json({ message: "حدث خطأ أثناء حذف الصورة" });
  }
});

/**
 * تحديث ترتيب الصور في معرض الأعمال
 */
exports.reorderWorkGallery = asyncHandler(async (req, res) => {
  try {
    const { orderedImages } = req.body;

    // التحقق من البيانات
    if (!orderedImages || !Array.isArray(orderedImages)) {
      return res.status(400).json({ message: "يجب توفير ترتيب صالح للصور" });
    }

    // البحث عن الحرفي
    const craftsman = await Craftsman.findOne({ user: req.user._id });
    
    if (!craftsman) {
      return res.status(404).json({ message: "لم يتم العثور على ملف الحرفي" });
    }

    // التحقق من تطابق عدد الصور
    const currentImageCount = craftsman.workGallery ? craftsman.workGallery.length : 0;
    
    if (orderedImages.length !== currentImageCount) {
      return res.status(400).json({ 
        message: "عدد الصور في الترتيب الجديد لا يتطابق مع العدد الحالي" 
      });
    }

    // تحديث ترتيب الصور
    craftsman.workGallery = orderedImages;

    // حفظ التغييرات
    await craftsman.save();

    res.json({
      success: true,
      message: "تم تحديث ترتيب الصور في معرض الأعمال",
      workGallery: craftsman.workGallery,
      count: craftsman.workGallery.length
    });

  } catch (error) {
    console.error("خطأ في تحديث ترتيب الصور:", error);
    res.status(500).json({ message: "حدث خطأ أثناء تحديث ترتيب الصور" });
  }
});

/**
 * مسح معرض الأعمال بالكامل
 */
exports.clearWorkGallery = asyncHandler(async (req, res) => {
  try {
    // البحث عن الحرفي
    const craftsman = await Craftsman.findOne({ user: req.user._id });
    
    if (!craftsman) {
      return res.status(404).json({ message: "لم يتم العثور على ملف الحرفي" });
    }

    // مسح المعرض
    craftsman.workGallery = [];

    // حفظ التغييرات
    await craftsman.save();

    res.json({
      success: true,
      message: "تم مسح معرض الأعمال بالكامل",
      workGallery: [],
      count: 0
    });

  } catch (error) {
    console.error("خطأ في مسح معرض الأعمال:", error);
    res.status(500).json({ message: "حدث خطأ أثناء مسح معرض الأعمال" });
  }
});
