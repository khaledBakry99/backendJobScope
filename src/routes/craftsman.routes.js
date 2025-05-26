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

// Actualizar galería de trabajos
router.put(
  "/me/gallery",
  authorize("craftsman"),
  [check("workGallery", "La galería debe ser un array").isArray()],
  craftsmanController.updateWorkGallery
);

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

    // Filtrar solo صور Base64 صالحة وحذف مسارات /uploads/ القديمة
    const validGallery = Array.isArray(craftsman.workGallery)
      ? craftsman.workGallery.filter(
          (url) => url &&
                   url !== "undefined" &&
                   url !== "null" &&
                   url.startsWith('data:image/')  // فقط صور Base64
        )
      : [];

    console.log("Galería filtrada في /me/gallery (Base64 فقط):", {
      original: craftsman.workGallery ? craftsman.workGallery.length : 0,
      filtered: validGallery.length,
      removedOldPaths: (craftsman.workGallery ? craftsman.workGallery.length : 0) - validGallery.length
    });

    // Si hay diferencia entre la galería original y la filtrada, actualizar en la base de datos
    if (
      validGallery.length !==
      (craftsman.workGallery ? craftsman.workGallery.length : 0)
    ) {
      console.log(
        "Actualizando galería en la base de datos después de filtrar"
      );
      craftsman.workGallery = validGallery;
      await craftsman.save();
    }

    // Devolver la galería con ambos nombres para compatibilidad
    res.json({
      gallery: validGallery,
      workGallery: validGallery,
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

// حذف صورة واحدة من المعرض
router.delete("/me/gallery/:imageIndex", authorize("craftsman"), async (req, res) => {
  try {
    const imageIndex = parseInt(req.params.imageIndex);
    console.log("طلب حذف صورة:", {
      userId: req.user.id || req.user._id,
      imageIndex: imageIndex,
    });

    const craftsman = await Craftsman.findOne({
      user: req.user.id || req.user._id,
    });

    if (!craftsman) {
      return res.status(404).json({ message: "Artesano no encontrado" });
    }

    // التحقق من صحة الفهرس
    if (imageIndex < 0 || imageIndex >= craftsman.workGallery.length) {
      return res.status(400).json({
        message: "فهرس الصورة غير صالح",
        currentGalleryLength: craftsman.workGallery.length
      });
    }

    // حذف الصورة من المعرض
    const removedImage = craftsman.workGallery.splice(imageIndex, 1)[0];

    await craftsman.save();

    console.log("تم حذف الصورة بنجاح:", {
      craftsmanId: craftsman._id,
      removedImageIndex: imageIndex,
      removedImagePreview: removedImage ? removedImage.substring(0, 50) + '...' : 'null',
      remainingImages: craftsman.workGallery.length,
    });

    res.json({
      message: "تم حذف الصورة بنجاح",
      removedImageIndex: imageIndex,
      workGallery: craftsman.workGallery,
      gallery: craftsman.workGallery, // للتوافق مع الواجهة
    });
  } catch (error) {
    console.error("خطأ في حذف الصورة:", error);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

// Subir imágenes para la galería de trabajos (مباشرة إلى Base64)
router.post(
  "/me/upload-gallery",
  authorize("craftsman"),
  uploadMultipleImages("galleryImages", 5),
  async (req, res) => {
    try {
      console.log("Solicitud de carga de imágenes recibida:", {
        files: req.files ? req.files.length : 0,
        userId: req.user.id || req.user._id,
      });

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No se han subido imágenes" });
      }

      // تحويل الصور إلى Base64 مباشرة من الذاكرة بدون حفظ في مجلد
      const imageBase64Array = [];

      for (const file of req.files) {
        try {
          // تحويل الملف إلى Base64 مباشرة من buffer
          const base64String = `data:${
            file.mimetype
          };base64,${file.buffer.toString("base64")}`;

          imageBase64Array.push(base64String);

          console.log("تم تحويل صورة إلى Base64 مباشرة:", {
            originalName: file.originalname,
            size: file.size,
            base64Length: base64String.length,
          });
        } catch (fileError) {
          console.error("خطأ في معالجة الملف:", file.originalname, fileError);
        }
      }

      console.log("تم تحويل الصور إلى Base64:", imageBase64Array.length);

      // Buscar el perfil del artesano
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

      // Obtener la galería actual y filtrar solo صور Base64 صالحة
      let currentGallery = [];
      if (craftsman.workGallery && Array.isArray(craftsman.workGallery)) {
        // الاحتفاظ فقط بصور Base64 وحذف مسارات /uploads/ القديمة
        currentGallery = craftsman.workGallery.filter(
          (url) => url &&
                   url !== "undefined" &&
                   url !== "null" &&
                   url.startsWith('data:image/')  // فقط صور Base64
        );
      }

      console.log("Galería actual بعد تصفية صور Base64 فقط:", {
        originalLength: craftsman.workGallery ? craftsman.workGallery.length : 0,
        filteredLength: currentGallery.length,
        currentGalleryItems: currentGallery.map(img => img.substring(0, 50) + '...')
      });

      // Combinar الصور الحالية (Base64 فقط) مع الصور الجديدة
      const updatedGallery = [...currentGallery, ...imageBase64Array];

      console.log("Galería después de la actualización:", {
        currentGallery: currentGallery.length,
        newImages: imageBase64Array.length,
        updatedGallery: updatedGallery.length,
      });

      // Guardar la galería actualizada
      craftsman.workGallery = updatedGallery;
      await craftsman.save();

      console.log("Galería guardada en la base de datos:", {
        savedGalleryLength: craftsman.workGallery.length,
      });

      // Devolver الصور المحولة والمعرض المحدث
      res.json({
        imageUrls: imageBase64Array,
        gallery: craftsman.workGallery,
        workGallery: craftsman.workGallery,
      });
    } catch (error) {
      console.error("Error al subir imágenes:", error);
      res.status(500).json({
        message: "Error al subir imágenes",
        error: error.message,
        stack: error.stack,
      });
    }
  }
);

module.exports = router;
