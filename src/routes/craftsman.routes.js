const express = require("express");
const { check } = require("express-validator");
const craftsmanController = require("../controllers/craftsman.controller");
const { protect, authorize } = require("../middleware/auth.middleware");
const { uploadMultipleImages } = require("../middleware/upload.middleware");
const Craftsman = require("../models/craftsman.model");

const router = express.Router();

// Rutas públicas
// Obtener todos los artesanos
router.get("/", craftsmanController.getAllCraftsmen);

// Obtener un artesano por ID
router.get("/:id", craftsmanController.getCraftsmanById);

// Obtener las calles dentro del rango de trabajo de un artesano
router.get("/:id/streets", craftsmanController.getStreetsInWorkRange);

// Obtener galería de trabajos de un artesano
router.get("/:id/gallery", craftsmanController.getCraftsmanGallery);

// Buscar artesanos
router.post(
  "/search",
  [
    check("professions", "Las profesiones deben ser un array")
      .optional()
      .isArray(),
    check("specializations", "Las especializaciones deben ser un array")
      .optional()
      .isArray(),
    check("rating", "La calificación debe ser un número")
      .optional()
      .isNumeric(),
    check("radius", "El radio debe ser un número")
      .optional()
      .isNumeric(),
    check("street", "La calle debe ser un texto")
      .optional()
      .isString(),
    check("neighborhood", "El barrio debe ser un texto")
      .optional()
      .isString(),
  ],
  craftsmanController.searchCraftsmen
);

// Rutas protegidas (requieren autenticación)
router.use(protect);

// Obtener perfil de artesano del usuario actual
router.get(
  "/me/profile",
  authorize("craftsman"),
  craftsmanController.getMyProfile
);

// Actualizar perfil de artesano
router.put(
  "/me/profile",
  authorize("craftsman"),
  [
    check("professions", "Las profesiones deben ser un array")
      .optional()
      .isArray(),
    check("specializations", "Las especializaciones deben ser un array")
      .optional()
      .isArray(),
    check("workRadius", "El radio de trabajo debe ser un número")
      .optional()
      .isNumeric(),
  ],
  craftsmanController.updateCraftsmanProfile
);

// ملاحظة: تم حذف route updateGallery القديم المعقد
// الآن نستخدم فقط:
// - DELETE /me/gallery/:imageIndex لحذف صورة واحدة
// - POST /me/upload-gallery لرفع صور جديدة

// Obtener galería de trabajos del artesano actual
router.get("/me/gallery", authorize("craftsman"), async (req, res) => {
  try {
    // Imprimir información de depuración del usuario
    console.log("Usuario autenticado en /me/gallery:", {
      id: req.user.id,
      _id: req.user._id,
      userKeys: Object.keys(req.user),
    });

    // Buscar perfil de artesano usando ambos formatos de ID
    let craftsman = null;

    // Primero intentar con req.user.id
    if (req.user.id) {
      craftsman = await Craftsman.findOne({ user: req.user.id });
      if (craftsman) {
        console.log("Craftsman encontrado con req.user.id");
      }
    }

    // Si no se encuentra, intentar con req.user._id
    if (!craftsman && req.user._id) {
      craftsman = await Craftsman.findOne({ user: req.user._id });
      if (craftsman) {
        console.log("Craftsman encontrado con req.user._id");
      }
    }

    if (!craftsman) {
      console.log("Perfil de artesano no encontrado con ningún ID");
      return res
        .status(404)
        .json({ message: "Perfil de artesano no encontrado" });
    }

    // Imprimir información de depuración
    console.log("Craftsman encontrado en /me/gallery:", {
      id: craftsman._id,
      userId: craftsman.user,
      requestUserId: req.user.id || req.user._id,
      workGallery: craftsman.workGallery ? craftsman.workGallery.length : 0,
    });

    // إرجاع المعرض مباشرة (Cloudinary URLs أو كائنات)
    const gallery = craftsman.workGallery || [];

    console.log("📂 إرجاع معرض الصور:", {
      totalImages: gallery.length,
      imageTypes: gallery.map(item => typeof item === 'object' ? 'object' : 'string')
    });

    // Devolver la galería مع دعم كامل لـ Cloudinary
    res.json({
      gallery: gallery,
      workGallery: gallery,
      totalImages: gallery.length
    });
  } catch (error) {
    console.error("Error al obtener la galería:", error);
    console.error("Detalles del error:", error.stack);
    res.status(500).json({
      message: "Error al obtener la galería",
      error: error.message,
      stack: error.stack,
    });
  }
});

// Actualizar disponibilidad
router.put(
  "/me/availability",
  authorize("craftsman"),
  [check("available", "La disponibilidad debe ser un booleano").isBoolean()],
  craftsmanController.updateAvailability
);

// Actualizar las calles dentro del rango de trabajo
router.put(
  "/me/streets",
  authorize("craftsman"),
  craftsmanController.updateStreetsInWorkRange
);

// حذف صورة واحدة من المعرض (محسن مع Cloudinary)
router.delete("/me/gallery/:imageIndex", authorize("craftsman"), async (req, res) => {
  try {
    const imageIndex = parseInt(req.params.imageIndex);
    console.log("🗑️ طلب حذف صورة:", {
      userId: req.user.id || req.user._id,
      imageIndex: imageIndex,
    });

    const craftsman = await Craftsman.findOne({
      user: req.user.id || req.user._id,
    });

    if (!craftsman) {
      return res.status(404).json({ message: "الحرفي غير موجود" });
    }

    // التحقق من صحة الفهرس
    if (imageIndex < 0 || imageIndex >= craftsman.workGallery.length) {
      return res.status(400).json({
        message: "فهرس الصورة غير صالح",
        currentGalleryLength: craftsman.workGallery.length
      });
    }

    // الحصول على الصورة المراد حذفها
    const imageToDelete = craftsman.workGallery[imageIndex];
    console.log("🔍 الصورة المراد حذفها:", imageToDelete);

    // حذف الصورة من Cloudinary إذا كانت مرفوعة عليه
    if (imageToDelete && typeof imageToDelete === 'object' && imageToDelete.public_id) {
      try {
        const { deleteImage } = require('../services/cloudinary.service');
        const deleteResult = await deleteImage(imageToDelete.public_id);
        console.log("🗑️ تم حذف الصورة من Cloudinary:", deleteResult);
      } catch (cloudinaryError) {
        console.error("⚠️ خطأ في حذف الصورة من Cloudinary:", cloudinaryError.message);
        // نكمل العملية حتى لو فشل حذف الصورة من Cloudinary
      }
    }

    // حذف الصورة من المعرض
    const removedImage = craftsman.workGallery.splice(imageIndex, 1)[0];
    await craftsman.save();

    console.log("✅ تم حذف الصورة بنجاح:", {
      craftsmanId: craftsman._id,
      removedImageIndex: imageIndex,
      remainingImages: craftsman.workGallery.length,
    });

    res.json({
      success: true,
      message: "تم حذف الصورة بنجاح",
      removedImageIndex: imageIndex,
      workGallery: craftsman.workGallery,
      gallery: craftsman.workGallery, // للتوافق مع الواجهة
      totalImages: craftsman.workGallery.length
    });
  } catch (error) {
    console.error("❌ خطأ في حذف الصورة:", error);
    res.status(500).json({
      success: false,
      message: "خطأ في الخادم",
      error: error.message
    });
  }
});

// رفع الصور إلى Cloudinary (أسرع وأكثر احترافية)
router.post(
  "/me/upload-gallery",
  authorize("craftsman"),
  uploadMultipleImages("galleryImages", 10),
  async (req, res) => {
    try {
      console.log("🚀 طلب رفع صور جديد:", {
        files: req.files ? req.files.length : 0,
        userId: req.user.id || req.user._id,
      });

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "لم يتم رفع أي صور" });
      }

      // محاولة استيراد خدمة Cloudinary مع fallback
      let uploadImage;
      let useCloudinary = true;

      try {
        const cloudinaryService = require('../services/cloudinary.service');
        uploadImage = cloudinaryService.uploadImage;
        console.log("✅ تم تحميل خدمة Cloudinary بنجاح");
      } catch (cloudinaryError) {
        console.error("❌ فشل في تحميل خدمة Cloudinary:", cloudinaryError.message);
        console.log("🔄 التبديل إلى النظام القديم (Base64)");
        useCloudinary = false;
      }

      let uploadResults = [];

      if (useCloudinary) {
        // رفع الصور إلى Cloudinary بشكل متوازي (أسرع)
        const uploadPromises = req.files.map(async (file, index) => {
          try {
            console.log(`📤 رفع الصورة ${index + 1}/${req.files.length} إلى Cloudinary:`, {
              name: file.originalname,
              size: file.size,
              type: file.mimetype
            });

            const result = await uploadImage(file.buffer, {
              folder: `jobscope/gallery/${req.user.id || req.user._id}`,
              public_id: `gallery_${Date.now()}_${index}`,
            });

            console.log(`✅ تم رفع الصورة ${index + 1} بنجاح إلى Cloudinary:`, {
              url: result.url,
              size: result.size,
              format: result.format
            });

            return result;
          } catch (error) {
            console.error(`❌ فشل رفع الصورة ${index + 1} إلى Cloudinary:`, error.message);
            throw error;
          }
        });

        try {
          // انتظار رفع جميع الصور
          uploadResults = await Promise.all(uploadPromises);
          console.log(`🎉 تم رفع ${uploadResults.length} صور بنجاح إلى Cloudinary`);
        } catch (cloudinaryUploadError) {
          console.error("❌ فشل في رفع الصور إلى Cloudinary:", cloudinaryUploadError.message);
          console.log("🔄 التبديل إلى النظام القديم (Base64)");
          useCloudinary = false;
        }
      }

      if (!useCloudinary) {
        // النظام البديل: تحويل إلى Base64
        console.log("📤 استخدام النظام البديل (Base64)");

        uploadResults = req.files.map((file, index) => {
          try {
            console.log(`📤 تحويل الصورة ${index + 1}/${req.files.length} إلى Base64:`, {
              name: file.originalname,
              size: file.size,
              type: file.mimetype
            });

            // تحويل الملف إلى Base64 مباشرة من buffer
            const base64String = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

            console.log(`✅ تم تحويل الصورة ${index + 1} إلى Base64 بنجاح`);

            return {
              url: base64String,
              thumbnail_url: base64String, // نفس الصورة للـ thumbnail
              public_id: `base64_${Date.now()}_${index}`,
              size: file.size,
              format: file.mimetype.split('/')[1],
              uploaded_at: new Date()
            };
          } catch (error) {
            console.error(`❌ فشل تحويل الصورة ${index + 1} إلى Base64:`, error.message);
            throw error;
          }
        });

        console.log(`🎉 تم تحويل ${uploadResults.length} صور إلى Base64 بنجاح`);
      }

      // البحث عن الحرفي
      const craftsman = await Craftsman.findOne({
        user: req.user.id || req.user._id,
      });

      if (!craftsman) {
        console.log("❌ لم يتم العثور على ملف الحرفي");
        return res.status(404).json({ message: "ملف الحرفي غير موجود" });
      }

      // الحصول على المعرض الحالي (URLs فقط، ليس Base64)
      let currentGallery = [];
      if (craftsman.workGallery && Array.isArray(craftsman.workGallery)) {
        // الاحتفاظ بـ URLs من Cloudinary فقط
        currentGallery = craftsman.workGallery.filter(
          (item) => {
            if (typeof item === 'string') {
              return item.startsWith('http'); // URLs من Cloudinary
            } else if (typeof item === 'object' && item.url) {
              return item.url.startsWith('http'); // كائنات بها URL
            }
            return false;
          }
        );
      }

      console.log("📂 المعرض الحالي:", {
        originalLength: craftsman.workGallery ? craftsman.workGallery.length : 0,
        filteredLength: currentGallery.length,
      });

      // إنشاء مصفوفة الصور الجديدة (كائنات بمعلومات كاملة)
      const newImages = uploadResults.map(result => ({
        url: result.url,
        thumbnail_url: result.thumbnail_url,
        public_id: result.public_id,
        size: result.size,
        format: result.format,
        uploaded_at: new Date()
      }));

      // دمج الصور الحالية مع الجديدة
      const updatedGallery = [...currentGallery, ...newImages];

      console.log("📊 إحصائيات المعرض المحدث:", {
        currentImages: currentGallery.length,
        newImages: newImages.length,
        totalImages: updatedGallery.length,
      });

      // حفظ المعرض المحدث
      craftsman.workGallery = updatedGallery;
      await craftsman.save();

      console.log("💾 تم حفظ المعرض في قاعدة البيانات بنجاح");

      // إرجاع النتيجة
      res.json({
        success: true,
        message: `تم رفع ${newImages.length} صور بنجاح`,
        method: useCloudinary ? 'cloudinary' : 'base64',
        newImages: newImages,
        gallery: updatedGallery,
        workGallery: updatedGallery,
        totalImages: updatedGallery.length
      });
    } catch (error) {
      console.error("❌ خطأ في رفع الصور:", error);

      // تحديد نوع الخطأ
      let errorMessage = "خطأ في رفع الصور";
      let errorDetails = error.message;

      if (error.message && error.message.includes('cloudinary')) {
        errorMessage = "خطأ في خدمة Cloudinary - تم التبديل إلى النظام البديل";
      } else if (error.message && error.message.includes('multer')) {
        errorMessage = "خطأ في معالجة الملفات المرفوعة";
      } else if (error.message && error.message.includes('validation')) {
        errorMessage = "خطأ في التحقق من صحة البيانات";
      }

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: errorDetails,
        timestamp: new Date().toISOString()
      });
    }
  }
);

module.exports = router;
