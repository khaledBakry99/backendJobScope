const asyncHandler = require("express-async-handler");
const Craftsman = require("../models/craftsman.model");
const mongoose = require("mongoose");

/**
 * تطبيع بيانات معرض الأعمال للتوافق مع الفرونت إند
 */
exports.normalizeGalleryData = function normalizeGalleryData(galleryData) {
  if (!Array.isArray(galleryData)) {
    console.warn(
      "normalizeGalleryData: galleryData ليس مصفوفة! القيمة:",
      galleryData
    );
    return [];
  }

  return galleryData
    .map((item, index) => {
      console.log(
        `normalizeGalleryData: معالجة العنصر رقم ${index}:`,
        item,
        "(النوع:",
        typeof item,
        ")"
      );
      // إذا كان العنصر string (رابط مباشر)
      if (typeof item === "string") {
        return {
          id: `legacy_${index}`,
          url: item,
          thumb: item,
          medium: item,
          filename: `work-image-${index + 1}.jpg`,
          size: 0,
          uploadedAt: new Date().toISOString(),
        };
      }

      // إذا كان العنصر object
      if (typeof item === "object" && item !== null) {
        // حماية إضافية: تأكد من وجود url أو display_url
        if (!item.url && !item.display_url) {
          console.warn(
            `normalizeGalleryData: كائن بدون url أو display_url عند الفهرس ${index}:`,
            item
          );
          return null;
        }
        const normalizedItem = {
          id: item.id || item._id || `object_${index}`,
          url: item.url || item.display_url || "",
          thumb: item.thumb || item.url || item.display_url || "",
          medium: item.medium || item.url || item.display_url || "",
          filename: item.filename || `work-image-${index + 1}.jpg`,
          size: item.size || 0,
          uploadedAt: item.uploadedAt || new Date().toISOString(),
        };

        // إضافة معلومات إضافية من imgbb إذا كانت متوفرة
        if (item.delete_url) {
          normalizedItem.delete_url = item.delete_url;
        }
        if (item.extension) {
          normalizedItem.extension = item.extension;
        }

        return normalizedItem;
      }

      // إذا كان العنصر غير صالح (null أو نوع غير متوقع)
      console.warn(
        `normalizeGalleryData: عنصر غير متوقع عند الفهرس ${index}:`,
        item,
        "(النوع:",
        typeof item,
        ")"
      );
      return null;
    })
    .filter((item) => item !== null && item.url); // تصفية العناصر الفارغة
};

/**
 * الحصول على معرض أعمال الحرفي
 */
// [احترافي] جلب معرض أعمال الحرفي الحالي فقط للمستخدم المسجل
exports.getMyWorkGallery = asyncHandler(async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res
        .status(401)
        .json({ message: "غير مصرح لك بالوصول (المستخدم غير معرف)" });
    }
    const craftsman = await Craftsman.findOne({ user: req.user._id });
    if (!craftsman) {
      return res
        .status(404)
        .json({ message: "لم يتم العثور على ملف الحرفي لهذا المستخدم" });
    }
    const normalizedGallery = exports.normalizeGalleryData(
      craftsman.workGallery || []
    );
    res.json({
      success: true,
      workGallery: normalizedGallery,
      count: normalizedGallery.length,
    });
  } catch (error) {
    console.error("خطأ في جلب معرض الأعمال:", error);
    res.status(500).json({ message: "حدث خطأ أثناء جلب معرض الأعمال" });
  }
});

/**
      console.log("getMyWorkGallery - req.user غير معرف أو لا يحتوي على _id");
      return res
        .status(401)
        .json({ message: "غير مصرح لك بالوصول إلى هذا المورد" });
    }

    console.log(
      "getMyWorkGallery - البحث عن الحرفي بمعرف المستخدم:",
      req.user._id
    );

    // البحث عن الحرفي باستخدام معرف المستخدم
    console.log("getMyWorkGallery - req.user:", req.user);
    console.log("بحث عن الحرفي بـ user:", req.user._id, typeof req.user._id);
    let craftsman = null;
    try {
      craftsman = await Craftsman.findOne({ user: mongoose.Types.ObjectId(req.user._id) }).select("workGallery");
    } catch (err) {
      console.error("خطأ في تحويل req.user._id إلى ObjectId أو في البحث:", err);
      return res.status(500).json({ message: "خطأ في البحث عن الحرفي: مشكلة في ObjectId للمستخدم", error: err.message });
    }
    console.log("getMyWorkGallery - نتيجة البحث عن الحرفي:", craftsman);

    if (!craftsman) {
      console.error("getMyWorkGallery - لم يتم العثور على كائن الحرفي لهذا المستخدم!", req.user);
      return res.status(404).json({ message: "لم يتم العثور على ملف الحرفي لهذا المستخدم. تأكد من أن عملية التسجيل أنشأت كائن الحرفي بشكل صحيح." });
    }

    // تحقق من وجود workGallery
    if (typeof craftsman.workGallery === 'undefined') {
      console.error("getMyWorkGallery - craftsman.workGallery غير معرف!", craftsman);
      return res.status(500).json({ message: "ملف الحرفي لا يحتوي على workGallery!", craftsman });
    }
    console.log("getMyWorkGallery - محتوى workGallery:", craftsman.workGallery);
    let normalizedGallery = [];
    try {
      normalizedGallery = exports.normalizeGalleryData(craftsman.workGallery);
      console.log("getMyWorkGallery - normalizedGallery:", normalizedGallery);
    } catch (err) {
      console.error("getMyWorkGallery - خطأ أثناء معالجة normalizeGalleryData:", err, craftsman.workGallery);
      return res.status(500).json({ message: "خطأ أثناء معالجة معرض الأعمال", error: err.message });
    }
    res.json({
      success: true,
      workGallery: normalizedGallery,
      gallery: normalizedGallery,
      count: normalizedGallery.length,
    });
  } catch (error) {
    console.error("خطأ في جلب معرض الأعمال:", error);
    res.status(500).json({ message: "حدث خطأ أثناء جلب معرض الأعمال" });
  }
});

/**
 * إضافة صور إلى معرض الأعمال
 */
const { uploadToImgbb } = require("../services/imgbbService");

exports.addToWorkGallery = asyncHandler(async (req, res) => {
  try {
    const { images } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ message: "يجب توفير صور صالحة" });
    }

    // البحث عن الحرفي
    const craftsman = await Craftsman.findOne({ user: req.user._id });
    if (!craftsman) {
      return res.status(404).json({ message: "لم يتم العثور على ملف الحرفي" });
    }

    // فلترة الصور وإعدادها للرفع
    const maxImages = 6;
    const currentImageCount = craftsman.workGallery
      ? craftsman.workGallery.length
      : 0;
    if (currentImageCount + images.length > maxImages) {
      return res.status(400).json({
        message: `لا يمكن إضافة أكثر من ${maxImages} صور. لديك حالياً ${currentImageCount} صورة`,
      });
    }

    const imagesToAdd = [];
    for (let i = 0; i < images.length; i++) {
      let img = images[i];
      // إذا كانت صورة base64 أو data:image
      if (typeof img === "string" && img.startsWith("data:image")) {
        try {
          const base64 = img.split(",")[1];
          const imgbbData = await uploadToImgbb(base64);
          imagesToAdd.push({
            id: imgbbData.id || `imgbb_${Date.now()}_${i}`,
            url: imgbbData.url,
            thumb: imgbbData.thumb_url || imgbbData.url,
            medium: imgbbData.medium_url || imgbbData.url,
            filename: imgbbData.title || `work-image-${Date.now()}-${i}.jpg`,
            size: imgbbData.size || 0,
            uploadedAt: new Date().toISOString(),
            delete_url: imgbbData.delete_url || undefined,
            extension: imgbbData.extension || undefined,
          });
        } catch (err) {
          console.error("رفع imgbb فشل:", err);
        }
      } else if (typeof img === "string" && img.startsWith("http")) {
        // إذا كان رابط imgbb فقط
        if (/imgbb\.com|imgbb\.host|ibb\.co/.test(img)) {
          imagesToAdd.push({
            id: `img_${Date.now()}_${i}`,
            url: img,
            thumb: img,
            medium: img,
            filename: `work-image-${Date.now()}-${i}.jpg`,
            size: 0,
            uploadedAt: new Date().toISOString(),
          });
        }
      } else if (
        typeof img === "object" &&
        img.url &&
        typeof img.url === "string"
      ) {
        // إذا كان كائن فيه رابط imgbb فقط
        if (/imgbb\.com|imgbb\.host|ibb\.co/.test(img.url)) {
          imagesToAdd.push({
            id: img.id || `img_${Date.now()}_${i}`,
            url: img.url,
            thumb: img.thumb || img.url,
            medium: img.medium || img.url,
            filename: img.filename || `work-image-${Date.now()}-${i}.jpg`,
            size: img.size || 0,
            uploadedAt: img.uploadedAt || new Date().toISOString(),
          });
        }
      }
    }

    if (imagesToAdd.length === 0) {
      return res.status(400).json({ message: "يجب رفع صور imgbb فقط" });
    }

    craftsman.workGallery.push(...imagesToAdd);
    await craftsman.save();

    // إرجاع الصور من imgbb فقط
    const normalizedGallery = exports.normalizeGalleryData(
      craftsman.workGallery.filter((img) => {
        if (typeof img === "string")
          return /imgbb\.com|imgbb\.host|ibb\.co/.test(img);
        if (typeof img === "object" && img.url)
          return /imgbb\.com|imgbb\.host|ibb\.co/.test(img.url);
        return false;
      })
    );

    res.json({
      success: true,
      message: `تم إضافة ${imagesToAdd.length} صورة إلى معرض الأعمال (imgbb فقط)`,
      workGallery: normalizedGallery,
      addedImages: imagesToAdd,
      count: normalizedGallery.length,
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
      return res
        .status(400)
        .json({ message: "يجب توفير معرف الصورة أو رابطها" });
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
      craftsman.workGallery = craftsman.workGallery.filter((image) => {
        if (typeof image === "string") return true; // لا يمكن مطابقة ID مع string
        if (typeof image === "object" && image) return image.id !== imageId;
        return true;
      });
    } else if (imageUrl) {
      craftsman.workGallery = craftsman.workGallery.filter((image) => {
        if (typeof image === "string") return image !== imageUrl;
        if (typeof image === "object" && image) return image.url !== imageUrl;
        return true;
      });
    }

    // التحقق من حذف الصورة
    if (craftsman.workGallery.length === initialLength) {
      return res
        .status(404)
        .json({ message: "لم يتم العثور على الصورة المطلوب حذفها" });
    }

    // حفظ التغييرات
    await craftsman.save();

    // تطبيع البيانات للإرجاع
    const normalizedGallery = exports.normalizeGalleryData(
      craftsman.workGallery
    );

    res.json({
      success: true,
      message: "تم حذف الصورة من معرض الأعمال",
      workGallery: normalizedGallery,
      count: normalizedGallery.length,
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
    const currentImageCount = craftsman.workGallery
      ? craftsman.workGallery.length
      : 0;

    if (orderedImages.length !== currentImageCount) {
      return res.status(400).json({
        message: "عدد الصور في الترتيب الجديد لا يتطابق مع العدد الحالي",
      });
    }

    // تحديث ترتيب الصور
    craftsman.workGallery = orderedImages;

    // حفظ التغييرات
    await craftsman.save();

    // تطبيع البيانات للإرجاع
    const normalizedGallery = exports.normalizeGalleryData(
      craftsman.workGallery
    );

    res.json({
      success: true,
      message: "تم تحديث ترتيب الصور في معرض الأعمال",
      workGallery: normalizedGallery,
      count: normalizedGallery.length,
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
      count: 0,
    });
  } catch (error) {
    console.error("خطأ في مسح معرض الأعمال:", error);
    res.status(500).json({ message: "حدث خطأ أثناء مسح معرض الأعمال" });
  }
});
