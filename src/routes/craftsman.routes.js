const express = require("express");
const { check } = require("express-validator");
const craftsmanController = require("../controllers/craftsman.controller");
const { protect, authorize } = require("../middleware/auth.middleware");
const { uploadMultipleImages } = require("../middleware/upload.middleware");

const router = express.Router();

// Rutas públicas
// Obtener todos los artesanos
router.get("/", craftsmanController.getAllCraftsmen);

// Obtener un artesano por ID
router.get("/:id", craftsmanController.getCraftsmanById);

// Obtener las calles dentro del rango de trabajo de un artesano
router.get("/:id/streets", craftsmanController.getStreetsInWorkRange);

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

// Subir imágenes para la galería de trabajos
router.post(
  "/me/upload-gallery",
  authorize("craftsman"),
  uploadMultipleImages("galleryImages", 5),
  (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No se han subido imágenes" });
    }

    const imageUrls = req.files.map((file) => `/uploads/${file.filename}`);
    res.json({ imageUrls });
  }
);

module.exports = router;
