const express = require("express");
const router = express.Router();
const { uploadMultipleImages } = require("../middleware/upload.middleware");
const { authorize } = require("../middleware/auth.middleware");

// نموذج بسيط للصور في الذاكرة (يمكن استبداله بقاعدة بيانات)
let images = [];
let nextId = 1;

// POST /api/Image - رفع صورة جديدة
router.post("/", authorize("craftsman"), uploadMultipleImages("Image", 1), async (req, res) => {
  try {
    console.log("📤 POST /api/Image - رفع صورة جديدة");

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "لم يتم رفع أي صورة" 
      });
    }

    const file = req.files[0];
    const { Url, Title } = req.body;

    console.log("📁 معلومات الملف:", {
      name: file.originalname,
      size: file.size,
      type: file.mimetype
    });

    // تحويل إلى Base64 (بسيط وسريع)
    const base64String = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

    // إنشاء كائن الصورة
    const newImage = {
      id: nextId++,
      Image: base64String,
      Url: Url || "",
      Title: Title || file.originalname,
      userId: req.user.id || req.user._id,
      createdAt: new Date(),
      size: file.size,
      type: file.mimetype
    };

    // حفظ الصورة
    images.push(newImage);

    console.log("✅ تم حفظ الصورة بنجاح:", {
      id: newImage.id,
      title: newImage.Title,
      size: newImage.size
    });

    // إرجاع الاستجابة
    res.status(200).json({
      success: true,
      message: "تم رفع الصورة بنجاح",
      data: newImage
    });

  } catch (error) {
    console.error("❌ خطأ في رفع الصورة:", error);
    res.status(500).json({
      success: false,
      message: "خطأ في رفع الصورة",
      error: error.message
    });
  }
});

// PUT /api/Image/{id} - تحديث صورة
router.put("/:id", authorize("craftsman"), async (req, res) => {
  try {
    const imageId = parseInt(req.params.id);
    const { Title } = req.body;

    console.log("📝 PUT /api/Image - تحديث صورة:", { id: imageId, title: Title });

    // البحث عن الصورة
    const imageIndex = images.findIndex(img => img.id === imageId && img.userId === (req.user.id || req.user._id));
    
    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "الصورة غير موجودة"
      });
    }

    // تحديث العنوان
    if (Title) {
      images[imageIndex].Title = Title;
      images[imageIndex].updatedAt = new Date();
    }

    console.log("✅ تم تحديث الصورة بنجاح");

    res.status(200).json({
      success: true,
      message: "تم تحديث الصورة بنجاح",
      data: images[imageIndex]
    });

  } catch (error) {
    console.error("❌ خطأ في تحديث الصورة:", error);
    res.status(500).json({
      success: false,
      message: "خطأ في تحديث الصورة",
      error: error.message
    });
  }
});

// GET /api/Image/{id} - جلب صورة واحدة
router.get("/:id", async (req, res) => {
  try {
    const imageId = parseInt(req.params.id);

    console.log("📖 GET /api/Image - جلب صورة:", { id: imageId });

    // البحث عن الصورة
    const image = images.find(img => img.id === imageId);
    
    if (!image) {
      return res.status(404).json({
        success: false,
        message: "الصورة غير موجودة"
      });
    }

    console.log("✅ تم العثور على الصورة");

    res.status(200).json({
      success: true,
      data: image
    });

  } catch (error) {
    console.error("❌ خطأ في جلب الصورة:", error);
    res.status(500).json({
      success: false,
      message: "خطأ في جلب الصورة",
      error: error.message
    });
  }
});

// DELETE /api/Image/{id} - حذف صورة
router.delete("/:id", authorize("craftsman"), async (req, res) => {
  try {
    const imageId = parseInt(req.params.id);

    console.log("🗑️ DELETE /api/Image - حذف صورة:", { id: imageId });

    // البحث عن الصورة
    const imageIndex = images.findIndex(img => img.id === imageId && img.userId === (req.user.id || req.user._id));
    
    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "الصورة غير موجودة"
      });
    }

    // حذف الصورة
    const deletedImage = images.splice(imageIndex, 1)[0];

    console.log("✅ تم حذف الصورة بنجاح");

    res.status(200).json({
      success: true,
      message: "تم حذف الصورة بنجاح",
      data: deletedImage
    });

  } catch (error) {
    console.error("❌ خطأ في حذف الصورة:", error);
    res.status(500).json({
      success: false,
      message: "خطأ في حذف الصورة",
      error: error.message
    });
  }
});

// GET /api/Image - جلب جميع صور المستخدم
router.get("/", authorize("craftsman"), async (req, res) => {
  try {
    console.log("📖 GET /api/Image - جلب جميع الصور للمستخدم");

    // فلترة الصور حسب المستخدم
    const userImages = images.filter(img => img.userId === (req.user.id || req.user._id));

    console.log("✅ تم جلب الصور:", { count: userImages.length });

    res.status(200).json({
      success: true,
      data: userImages,
      count: userImages.length
    });

  } catch (error) {
    console.error("❌ خطأ في جلب الصور:", error);
    res.status(500).json({
      success: false,
      message: "خطأ في جلب الصور",
      error: error.message
    });
  }
});

module.exports = router;
