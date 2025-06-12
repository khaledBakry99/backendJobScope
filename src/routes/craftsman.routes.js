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

// [تم التوحيد] جميع عمليات معرض الأعمال تتم عبر /me/gallery فقط مع حماية كاملة
// إزالة المسار القديم نهائيًا
//router.get("/:id/gallery", craftsmanController.getCraftsmanGallery);

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

// Actualizar galería de trabajos
router.put(
  "/me/gallery",
  authorize("craftsman"),
  [check("workGallery", "La galería debe ser un array").isArray()],
  craftsmanController.updateWorkGallery
);

// Obtener galería de trabajos del artesano actual
router.get(
  "/me/gallery",
  authorize("craftsman"),
  craftsmanController.getCraftsmanGallery
);

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

// رفع صور معرض الأعمال للمستخدم الحالي فقط
const workGalleryController = require("../controllers/workGallery.controller");
router.post(
  "/me/upload-gallery",
  authorize("craftsman"),
  uploadMultipleImages("galleryImages", 5),
  workGalleryController.addToWorkGallery // يجب أن تدعم استقبال الصور من req.files أو req.body.images
);

// حذف صورة من المعرض
router.delete(
  "/me/gallery",
  authorize("craftsman"),
  workGalleryController.removeFromWorkGallery
);

// إعادة ترتيب المعرض
router.put(
  "/me/gallery/reorder",
  authorize("craftsman"),
  workGalleryController.reorderWorkGallery
);

// مسح المعرض بالكامل
router.delete(
  "/me/gallery/clear",
  authorize("craftsman"),
  workGalleryController.clearWorkGallery
);

module.exports = router;
