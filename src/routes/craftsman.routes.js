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

// Obtener horas de trabajo de un artesano
router.get("/:id/working-hours", async (req, res) => {
  try {
    const craftsmanId = req.params.id;
    console.log(`Solicitud de horas de trabajo para el artesano ID: ${craftsmanId}`);

    // Importar los modelos necesarios
    const Craftsman = require("../models/craftsman.model");
    const WorkingHours = require("../models/workingHours.model");

    // Buscar el artesano
    const craftsman = await Craftsman.findById(craftsmanId);
    if (!craftsman) {
      console.log(`Artesano con ID ${craftsmanId} no encontrado`);
      return res.status(404).json({ message: "Artesano no encontrado" });
    }

    // Buscar las horas de trabajo del artesano
    const workingHours = await WorkingHours.findOne({ craftsman: craftsmanId });

    if (!workingHours) {
      console.log(`Horas de trabajo para el artesano ID ${craftsmanId} no encontradas`);
      return res.status(404).json({
        message: "Horas de trabajo no encontradas",
        workingHours: {},
        workingHoursArray: []
      });
    }

    console.log(`Horas de trabajo encontradas para el artesano ID ${craftsmanId}:`, workingHours);

    // Convertir el objeto de horas de trabajo a un array para mayor compatibilidad
    const workingHoursArray = Object.entries(workingHours.workingHours || {}).map(([day, data]) => ({
      day,
      isWorking: data.isWorking || false,
      start: data.start || "",
      end: data.end || ""
    }));

    // Devolver las horas de trabajo
    res.json({
      workingHours: workingHours.workingHours || {},
      workingHoursArray
    });
  } catch (error) {
    console.error("Error al obtener las horas de trabajo:", error);
    res.status(500).json({
      message: "Error al obtener las horas de trabajo",
      error: error.message
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

    // Filtrar URLs vacías o inválidas
    const validGallery = Array.isArray(craftsman.workGallery)
      ? craftsman.workGallery.filter(url => url && url !== "undefined" && url !== "null")
      : [];

    console.log("Galería filtrada en /me/gallery:", {
      original: craftsman.workGallery ? craftsman.workGallery.length : 0,
      filtered: validGallery.length
    });

    // Si hay diferencia entre la galería original y la filtrada, actualizar en la base de datos
    if (validGallery.length !== (craftsman.workGallery ? craftsman.workGallery.length : 0)) {
      console.log("Actualizando galería en la base de datos después de filtrar");
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

// Subir imágenes para la galería de trabajos
router.post(
  "/me/upload-gallery",
  authorize("craftsman"),
  uploadMultipleImages("galleryImages", 5),
  async (req, res) => {
    try {
      console.log("Solicitud de carga de imágenes recibida:", {
        files: req.files ? req.files.length : 0,
        userId: req.user.id || req.user._id
      });

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No se han subido imágenes" });
      }

      // Generar URLs para las imágenes cargadas
      const imageUrls = req.files.map((file) => `/uploads/${file.filename}`);
      console.log("URLs de imágenes generadas:", imageUrls);

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
        return res.status(404).json({ message: "Perfil de artesano no encontrado" });
      }

      // Obtener la galería actual y asegurarse de que sea un array
      let currentGallery = [];
      if (craftsman.workGallery && Array.isArray(craftsman.workGallery)) {
        // Filtrar URLs vacías o inválidas
        currentGallery = craftsman.workGallery.filter(url => url && url !== "undefined" && url !== "null");
      }

      console.log("Galería actual antes de la actualización:", {
        currentGalleryLength: currentGallery.length,
        currentGalleryItems: currentGallery
      });

      // Combinar la galería actual con las nuevas imágenes
      const updatedGallery = [...currentGallery, ...imageUrls];

      console.log("Galería después de la actualización:", {
        currentGallery: currentGallery.length,
        newImages: imageUrls.length,
        updatedGallery: updatedGallery.length,
        updatedGalleryItems: updatedGallery
      });

      // Guardar la galería actualizada
      craftsman.workGallery = updatedGallery;
      await craftsman.save();

      console.log("Galería guardada en la base de datos:", {
        savedGalleryLength: craftsman.workGallery.length,
        savedGalleryItems: craftsman.workGallery
      });

      // Devolver las URLs de las imágenes y la galería actualizada
      res.json({
        imageUrls,
        gallery: craftsman.workGallery,
        workGallery: craftsman.workGallery
      });
    } catch (error) {
      console.error("Error al subir imágenes:", error);
      res.status(500).json({
        message: "Error al subir imágenes",
        error: error.message,
        stack: error.stack
      });
    }
  }
);

module.exports = router;
