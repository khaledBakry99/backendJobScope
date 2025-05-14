const asyncHandler = require('express-async-handler');
const Craftsman = require('../models/craftsmanModel');
const User = require('../models/userModel');

/**
 * @desc    الحصول على جميع الحرفيين
 * @route   GET /api/craftsmen
 * @access  Public
 */
const getCraftsmen = asyncHandler(async (req, res) => {
  const craftsmen = await Craftsman.find()
    .populate('user', 'name email profilePicture')
    .populate('professions', 'name')
    .populate('specializations', 'name');
  
  res.status(200).json(craftsmen);
});

/**
 * @desc    الحصول على حرفي واحد
 * @route   GET /api/craftsmen/:id
 * @access  Public
 */
const getCraftsman = asyncHandler(async (req, res) => {
  const craftsman = await Craftsman.findById(req.params.id)
    .populate('user', 'name email profilePicture phone')
    .populate('professions', 'name')
    .populate('specializations', 'name');
  
  if (!craftsman) {
    res.status(404);
    throw new Error('لم يتم العثور على الحرفي');
  }
  
  // تحويل ساعات العمل من كائن إلى مصفوفة إذا لم تكن موجودة
  if (!craftsman.workingHoursArray || craftsman.workingHoursArray.length === 0) {
    const daysOfWeek = ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"];
    const workingHoursArray = [];
    
    daysOfWeek.forEach(day => {
      if (craftsman.workingHours && craftsman.workingHours[day]) {
        workingHoursArray.push({
          day,
          isWorking: !!craftsman.workingHours[day].isWorking,
          start: craftsman.workingHours[day].start || craftsman.workingHours[day].from || "",
          end: craftsman.workingHours[day].end || craftsman.workingHours[day].to || ""
        });
      } else {
        workingHoursArray.push({
          day,
          isWorking: false,
          start: "",
          end: ""
        });
      }
    });
    
    craftsman.workingHoursArray = workingHoursArray;
    await craftsman.save();
  }
  
  res.status(200).json(craftsman);
});

/**
 * @desc    الحصول على الحرفي الحالي
 * @route   GET /api/craftsmen/me
 * @access  Private (Craftsman only)
 */
const getCurrentCraftsman = asyncHandler(async (req, res) => {
  const craftsman = await Craftsman.findOne({ user: req.user.id })
    .populate('user', 'name email profilePicture phone')
    .populate('professions', 'name')
    .populate('specializations', 'name');
  
  if (!craftsman) {
    res.status(404);
    throw new Error('لم يتم العثور على الحرفي');
  }
  
  // تحويل ساعات العمل من كائن إلى مصفوفة إذا لم تكن موجودة
  if (!craftsman.workingHoursArray || craftsman.workingHoursArray.length === 0) {
    const daysOfWeek = ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"];
    const workingHoursArray = [];
    
    daysOfWeek.forEach(day => {
      if (craftsman.workingHours && craftsman.workingHours[day]) {
        workingHoursArray.push({
          day,
          isWorking: !!craftsman.workingHours[day].isWorking,
          start: craftsman.workingHours[day].start || craftsman.workingHours[day].from || "",
          end: craftsman.workingHours[day].end || craftsman.workingHours[day].to || ""
        });
      } else {
        workingHoursArray.push({
          day,
          isWorking: false,
          start: "",
          end: ""
        });
      }
    });
    
    craftsman.workingHoursArray = workingHoursArray;
    await craftsman.save();
  }
  
  res.status(200).json(craftsman);
});

/**
 * @desc    إنشاء حرفي جديد
 * @route   POST /api/craftsmen
 * @access  Private
 */
const createCraftsman = asyncHandler(async (req, res) => {
  const {
    name,
    phone,
    bio,
    professions,
    specializations,
    features,
    location,
    workingHours
  } = req.body;
  
  // التحقق من أن المستخدم ليس لديه حساب حرفي بالفعل
  const existingCraftsman = await Craftsman.findOne({ user: req.user.id });
  if (existingCraftsman) {
    res.status(400);
    throw new Error('لديك حساب حرفي بالفعل');
  }
  
  // تحويل ساعات العمل من كائن إلى مصفوفة
  let workingHoursArray = [];
  if (workingHours) {
    const daysOfWeek = ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"];
    
    daysOfWeek.forEach(day => {
      if (workingHours[day]) {
        workingHoursArray.push({
          day,
          isWorking: !!workingHours[day].isWorking,
          start: workingHours[day].start || workingHours[day].from || "",
          end: workingHours[day].end || workingHours[day].to || ""
        });
      } else {
        workingHoursArray.push({
          day,
          isWorking: false,
          start: "",
          end: ""
        });
      }
    });
  }
  
  // إنشاء الحرفي
  const craftsman = await Craftsman.create({
    user: req.user.id,
    name: name || req.user.name,
    phone: phone || req.user.phone,
    bio,
    professions: professions || [],
    specializations: specializations || [],
    features: features || [],
    location: location || {
      type: 'Point',
      coordinates: [0, 0],
      address: '',
      city: '',
      state: '',
      country: '',
      workRange: 5,
      neighborhoodsInWorkRange: []
    },
    workingHours: workingHours || {},
    workingHoursArray
  });
  
  // تحديث نوع المستخدم إلى حرفي
  await User.findByIdAndUpdate(req.user.id, { userType: 'craftsman' });
  
  res.status(201).json(craftsman);
});

module.exports = {
  getCraftsmen,
  getCraftsman,
  getCurrentCraftsman,
  createCraftsman
};
