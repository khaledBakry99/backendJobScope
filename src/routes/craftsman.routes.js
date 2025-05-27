const express = require("express");
const { check } = require("express-validator");
const craftsmanController = require("../controllers/craftsman.controller");
const { protect } = require("../middleware/auth.middleware");
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

// جلب معرض صور حرفي معين
router.get("/:id/gallery", async (req, res) => {
  try {
    const craftsmanId = req.params.id;

    console.log("طلب جلب معرض صور حرفي:", {
      craftsmanId: craftsmanId,
    });

    // البحث عن الحرفي بمعرف الحرفي أو معرف المستخدم
    let craftsman = await Craftsman.findById(craftsmanId);

    if (!craftsman) {
      craftsman = await Craftsman.findOne({ user: craftsmanId });
    }

    if (!craftsman) {
      return res.status(404).json({
        success: false,
        message: "الحرفي غير موجود",
        data: {
          gallery: [],
          workGallery: [],
        },
      });
    }

    const gallery = craftsman.workGallery || [];

    console.log("تم جلب معرض صور الحرفي بنجاح:", {
      craftsmanId: craftsman._id,
      imagesCount: gallery.length,
    });

    res.json({
      success: true,
      message: "تم جلب معرض الصور بنجاح",
      data: {
        gallery: gallery,
        workGallery: gallery,
      },
    });
  } catch (error) {
    console.error("خطأ في جلب معرض صور الحرفي:", error);
    res.status(500).json({
      success: false,
      message: "خطأ في جلب معرض الصور",
      error: error.message,
      data: {
        gallery: [],
        workGallery: [],
      },
    });
  }
});

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
router.get("/me/profile", craftsmanController.getMyProfile);

// Actualizar perfil de artesano
router.put(
  "/me/profile",
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

// تم حذف route لتحديث المعرض - سيتم استبداله بطريقة جديدة

// رفع صور المعرض إلى ImgBB
router.post(
  "/me/gallery/upload",
  uploadMultipleImages("galleryImages", 5),
  async (req, res) => {
    try {
      console.log("طلب رفع صور المعرض:", {
        files: req.files ? req.files.length : 0,
        userId: req.user.id || req.user._id,
      });

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "لم يتم اختيار أي صور",
        });
      }

      // البحث عن الحرفي
      let craftsman = await Craftsman.findOne({
        user: req.user.id || req.user._id,
      });

      if (!craftsman) {
        return res.status(404).json({
          success: false,
          message: "ملف الحرفي غير موجود",
        });
      }

      // استيراد خدمة ImgBB
      const imgbbService = require("../services/imgbb.service");

      // تحضير الصور للرفع
      const imageBuffers = req.files.map((file) => file.buffer);
      const imageNames = req.files.map(
        (file) => `gallery_${craftsman._id}_${Date.now()}_${file.originalname}`
      );

      // رفع الصور إلى ImgBB
      const uploadResult = await imgbbService.uploadMultipleImages(
        imageBuffers,
        imageNames
      );

      console.log("نتائج رفع الصور:", uploadResult);

      if (uploadResult.successful.length === 0) {
        return res.status(500).json({
          success: false,
          message: "فشل في رفع جميع الصور",
          errors: uploadResult.failed,
        });
      }

      // إضافة روابط الصور الناجحة إلى معرض الحرفي
      const newImageUrls = uploadResult.successful.map(
        (img) => img.display_url
      );
      const currentGallery = craftsman.workGallery || [];
      const updatedGallery = [...currentGallery, ...newImageUrls];

      // تحديث معرض الحرفي
      craftsman.workGallery = updatedGallery;
      await craftsman.save();

      console.log("تم تحديث معرض الحرفي بنجاح:", {
        newImages: newImageUrls.length,
        totalImages: updatedGallery.length,
      });

      res.json({
        success: true,
        message: "تم رفع الصور بنجاح",
        data: {
          uploadedImages: uploadResult.successful,
          failedImages: uploadResult.failed,
          gallery: updatedGallery,
          workGallery: updatedGallery,
        },
      });
    } catch (error) {
      console.error("خطأ في رفع صور المعرض:", error);
      res.status(500).json({
        success: false,
        message: "خطأ في رفع الصور",
        error: error.message,
      });
    }
  }
);

// حذف صورة من المعرض
router.delete("/me/gallery/:imageUrl", async (req, res) => {
  try {
    const imageUrl = decodeURIComponent(req.params.imageUrl);

    console.log("طلب حذف صورة من المعرض:", {
      imageUrl: imageUrl,
      userId: req.user.id || req.user._id,
    });

    // البحث عن الحرفي
    let craftsman = await Craftsman.findOne({
      user: req.user.id || req.user._id,
    });

    if (!craftsman) {
      return res.status(404).json({
        success: false,
        message: "ملف الحرفي غير موجود",
      });
    }

    // التحقق من وجود الصورة في المعرض
    const currentGallery = craftsman.workGallery || [];
    const imageIndex = currentGallery.findIndex((url) => url === imageUrl);

    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "الصورة غير موجودة في المعرض",
      });
    }

    // حذف الصورة من المعرض
    const updatedGallery = currentGallery.filter((url) => url !== imageUrl);
    craftsman.workGallery = updatedGallery;
    await craftsman.save();

    console.log("تم حذف الصورة من المعرض بنجاح:", {
      removedImage: imageUrl,
      remainingImages: updatedGallery.length,
    });

    res.json({
      success: true,
      message: "تم حذف الصورة بنجاح",
      data: {
        removedImageUrl: imageUrl,
        gallery: updatedGallery,
        workGallery: updatedGallery,
      },
    });
  } catch (error) {
    console.error("خطأ في حذف صورة المعرض:", error);
    res.status(500).json({
      success: false,
      message: "خطأ في حذف الصورة",
      error: error.message,
    });
  }
});

// جلب معرض الصور
router.get("/me/gallery", async (req, res) => {
  try {
    console.log("طلب جلب معرض الصور:", {
      userId: req.user.id || req.user._id,
    });

    // البحث عن الحرفي
    let craftsman = await Craftsman.findOne({
      user: req.user.id || req.user._id,
    });

    if (!craftsman) {
      return res.status(404).json({
        success: false,
        message: "ملف الحرفي غير موجود",
        data: {
          gallery: [],
          workGallery: [],
        },
      });
    }

    const gallery = craftsman.workGallery || [];

    console.log("تم جلب معرض الصور بنجاح:", {
      imagesCount: gallery.length,
    });

    res.json({
      success: true,
      message: "تم جلب معرض الصور بنجاح",
      data: {
        gallery: gallery,
        workGallery: gallery,
      },
    });
  } catch (error) {
    console.error("خطأ في جلب معرض الصور:", error);
    res.status(500).json({
      success: false,
      message: "خطأ في جلب معرض الصور",
      error: error.message,
      data: {
        gallery: [],
        workGallery: [],
      },
    });
  }
});

// Actualizar disponibilidad
router.put(
  "/me/availability",
  [check("available", "La disponibilidad debe ser un booleano").isBoolean()],
  craftsmanController.updateAvailability
);

// Actualizar las calles dentro del rango de trabajo
router.put(
  "/me/streets",
  craftsmanController.updateStreetsInWorkRange
);

// تم حذف API endpoint لرفع الصور - سيتم استبداله بطريقة جديدة

module.exports = router;
