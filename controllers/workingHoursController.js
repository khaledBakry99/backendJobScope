const asyncHandler = require('express-async-handler');
const Craftsman = require('../models/craftsmanModel');

/**
 * @desc    الحصول على ساعات العمل للحرفي
 * @route   GET /api/craftsmen/:id/working-hours
 * @access  Public
 */
const getCraftsmanWorkingHours = asyncHandler(async (req, res) => {
  const craftsmanId = req.params.id;

  // التحقق من وجود معرف الحرفي
  if (!craftsmanId) {
    res.status(400);
    throw new Error('لم يتم توفير معرف الحرفي');
  }

  try {
    // البحث عن الحرفي في قاعدة البيانات
    const craftsman = await Craftsman.findById(craftsmanId);

    if (!craftsman) {
      res.status(404);
      throw new Error('لم يتم العثور على الحرفي');
    }

    // تحقق من وجود ساعات العمل
    let workingHours = [];

    // إذا كان لدى الحرفي مصفوفة workingHoursArray، استخدمها
    if (craftsman.workingHoursArray && craftsman.workingHoursArray.length > 0) {
      workingHours = craftsman.workingHoursArray;
    } 
    // وإلا، إذا كان لديه كائن workingHours، قم بتحويله إلى مصفوفة
    else if (craftsman.workingHours) {
      const daysOfWeek = ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"];
      
      daysOfWeek.forEach(day => {
        if (craftsman.workingHours[day]) {
          workingHours.push({
            day,
            isWorking: !!craftsman.workingHours[day].isWorking,
            start: craftsman.workingHours[day].start || craftsman.workingHours[day].from || "",
            end: craftsman.workingHours[day].end || craftsman.workingHours[day].to || ""
          });
        } else {
          // إضافة يوم بقيم افتراضية إذا لم يكن موجوداً
          workingHours.push({
            day,
            isWorking: false,
            start: "",
            end: ""
          });
        }
      });
    }
    // إذا لم يكن لديه أي من الاثنين، قم بإنشاء مصفوفة افتراضية
    else {
      const daysOfWeek = ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"];
      
      daysOfWeek.forEach(day => {
        workingHours.push({
          day,
          isWorking: false,
          start: "",
          end: ""
        });
      });
    }

    // إرجاع ساعات العمل
    res.status(200).json({
      success: true,
      workingHours
    });
  } catch (error) {
    console.error('خطأ في الحصول على ساعات العمل:', error);
    res.status(500);
    throw new Error('حدث خطأ أثناء الحصول على ساعات العمل');
  }
});

/**
 * @desc    تحديث ساعات العمل للحرفي
 * @route   PUT /api/craftsmen/:id/working-hours
 * @access  Private (Craftsman only)
 */
const updateCraftsmanWorkingHours = asyncHandler(async (req, res) => {
  const craftsmanId = req.params.id;
  const { workingHours } = req.body;

  // التحقق من وجود معرف الحرفي
  if (!craftsmanId) {
    res.status(400);
    throw new Error('لم يتم توفير معرف الحرفي');
  }

  // التحقق من وجود بيانات ساعات العمل
  if (!workingHours || !Array.isArray(workingHours)) {
    res.status(400);
    throw new Error('لم يتم توفير بيانات ساعات العمل بالشكل الصحيح');
  }

  try {
    // البحث عن الحرفي في قاعدة البيانات
    const craftsman = await Craftsman.findById(craftsmanId);

    if (!craftsman) {
      res.status(404);
      throw new Error('لم يتم العثور على الحرفي');
    }

    // التحقق من أن المستخدم هو صاحب الحساب
    if (craftsman.user.toString() !== req.user.id) {
      res.status(401);
      throw new Error('غير مصرح لك بتحديث ساعات العمل لهذا الحرفي');
    }

    // تحديث ساعات العمل
    craftsman.workingHoursArray = workingHours;

    // تحديث كائن workingHours أيضاً للتوافق مع الكود القديم
    const workingHoursObj = {};
    workingHours.forEach(day => {
      workingHoursObj[day.day] = {
        isWorking: day.isWorking,
        start: day.start,
        end: day.end
      };
    });
    craftsman.workingHours = workingHoursObj;

    // حفظ التغييرات
    await craftsman.save();

    // إرجاع ساعات العمل المحدثة
    res.status(200).json({
      success: true,
      workingHours: craftsman.workingHoursArray
    });
  } catch (error) {
    console.error('خطأ في تحديث ساعات العمل:', error);
    res.status(500);
    throw new Error('حدث خطأ أثناء تحديث ساعات العمل');
  }
});

module.exports = {
  getCraftsmanWorkingHours,
  updateCraftsmanWorkingHours
};
