const { validationResult } = require('express-validator');
const Request = require('../models/request.model');
const Craftsman = require('../models/craftsman.model');
const User = require('../models/user.model');
const { asyncHandler } = require('../middleware/error.middleware');

// إنشاء طلب جديد
exports.createRequest = asyncHandler(async (req, res) => {
  // التحقق من أخطاء التحقق
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    craftsmanId,
    service,
    description,
    location,
    images,
    preferredDates,
  } = req.body;

  // التحقق من وجود الحرفي
  const craftsman = await Craftsman.findById(craftsmanId);
  if (!craftsman) {
    return res.status(404).json({ message: 'الحرفي غير موجود' });
  }

  // إنشاء طلب جديد
  const request = new Request({
    client: req.user._id,
    craftsman: craftsmanId,
    service,
    description,
    location,
    images: images || [],
    preferredDates,
    status: 'pending',
  });

  await request.save();

  // إرجاع الطلب مع بيانات الحرفي والعميل
  const populatedRequest = await Request.findById(request._id)
    .populate('client', 'name phone email profilePicture')
    .populate({
      path: 'craftsman',
      populate: {
        path: 'user',
        select: 'name phone email profilePicture',
      },
    });

  res.status(201).json(populatedRequest);
});

// الحصول على طلبات العميل
exports.getClientRequests = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  
  // بناء الاستعلام
  const query = { client: req.user._id };
  
  // إضافة حالة الطلب إذا تم تحديدها
  if (status) {
    query.status = status;
  }
  
  // حساب عدد الصفحات
  const count = await Request.countDocuments(query);
  const totalPages = Math.ceil(count / limit);
  
  // الحصول على الطلبات مع التصفح
  const requests = await Request.find(query)
    .populate('client', 'name phone email profilePicture')
    .populate({
      path: 'craftsman',
      populate: {
        path: 'user',
        select: 'name phone email profilePicture',
      },
    })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));
  
  res.json({
    requests,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalItems: count,
      itemsPerPage: parseInt(limit),
    },
  });
});

// الحصول على طلبات الحرفي
exports.getCraftsmanRequests = asyncHandler(async (req, res) => {
  // التحقق من أن المستخدم حرفي
  const craftsman = await Craftsman.findOne({ user: req.user._id });
  if (!craftsman) {
    return res.status(404).json({ message: 'ملف الحرفي غير موجود' });
  }
  
  const { status, page = 1, limit = 10 } = req.query;
  
  // بناء الاستعلام
  const query = { craftsman: craftsman._id };
  
  // إضافة حالة الطلب إذا تم تحديدها
  if (status) {
    query.status = status;
  }
  
  // حساب عدد الصفحات
  const count = await Request.countDocuments(query);
  const totalPages = Math.ceil(count / limit);
  
  // الحصول على الطلبات مع التصفح
  const requests = await Request.find(query)
    .populate('client', 'name phone email profilePicture')
    .populate({
      path: 'craftsman',
      populate: {
        path: 'user',
        select: 'name phone email profilePicture',
      },
    })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));
  
  res.json({
    requests,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalItems: count,
      itemsPerPage: parseInt(limit),
    },
  });
});

// الحصول على تفاصيل طلب
exports.getRequestDetails = asyncHandler(async (req, res) => {
  const request = await Request.findById(req.params.id)
    .populate('client', 'name phone email profilePicture')
    .populate({
      path: 'craftsman',
      populate: {
        path: 'user',
        select: 'name phone email profilePicture',
      },
    });
  
  if (!request) {
    return res.status(404).json({ message: 'الطلب غير موجود' });
  }
  
  // التحقق من أن المستخدم هو صاحب الطلب أو الحرفي المعني
  const isClient = request.client._id.toString() === req.user._id.toString();
  const craftsman = await Craftsman.findOne({ user: req.user._id });
  const isCraftsman = craftsman && request.craftsman._id.toString() === craftsman._id.toString();
  
  if (!isClient && !isCraftsman) {
    return res.status(403).json({ message: 'غير مصرح لك بالوصول إلى هذا الطلب' });
  }
  
  res.json(request);
});

// تحديث حالة الطلب (قبول، رفض، إكمال، إلغاء)
exports.updateRequestStatus = asyncHandler(async (req, res) => {
  // التحقق من أخطاء التحقق
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { status, acceptedDate, price, notes } = req.body;
  
  const request = await Request.findById(req.params.id);
  if (!request) {
    return res.status(404).json({ message: 'الطلب غير موجود' });
  }
  
  // التحقق من الصلاحيات
  const isClient = request.client.toString() === req.user._id.toString();
  const craftsman = await Craftsman.findOne({ user: req.user._id });
  const isCraftsman = craftsman && request.craftsman.toString() === craftsman._id.toString();
  
  // التحقق من الصلاحيات حسب الحالة المطلوبة
  if (status === 'accepted' || status === 'rejected') {
    // فقط الحرفي يمكنه قبول أو رفض الطلب
    if (!isCraftsman) {
      return res.status(403).json({ message: 'فقط الحرفي يمكنه قبول أو رفض الطلب' });
    }
    
    // التحقق من أن الطلب في حالة معلقة
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'لا يمكن تغيير حالة الطلب لأنه ليس معلقًا' });
    }
  } else if (status === 'completed') {
    // فقط الحرفي يمكنه تحديد الطلب كمكتمل
    if (!isCraftsman) {
      return res.status(403).json({ message: 'فقط الحرفي يمكنه تحديد الطلب كمكتمل' });
    }
    
    // التحقق من أن الطلب مقبول
    if (request.status !== 'accepted') {
      return res.status(400).json({ message: 'لا يمكن تحديد الطلب كمكتمل لأنه لم يتم قبوله بعد' });
    }
  } else if (status === 'cancelled') {
    // فقط العميل يمكنه إلغاء الطلب
    if (!isClient) {
      return res.status(403).json({ message: 'فقط العميل يمكنه إلغاء الطلب' });
    }
    
    // التحقق من أن الطلب ليس مكتملًا
    if (request.status === 'completed') {
      return res.status(400).json({ message: 'لا يمكن إلغاء طلب مكتمل' });
    }
  }
  
  // تحديث حالة الطلب
  request.status = status;
  
  // إذا تم قبول الطلب، قم بتحديث التاريخ المقبول والسعر والملاحظات
  if (status === 'accepted') {
    if (!acceptedDate) {
      return res.status(400).json({ message: 'يجب تحديد التاريخ المقبول عند قبول الطلب' });
    }
    
    request.acceptedDate = acceptedDate;
    
    if (price) {
      request.price = price;
    }
    
    if (notes) {
      request.notes = notes;
    }
  }
  
  await request.save();
  
  // إرجاع الطلب المحدث مع بيانات الحرفي والعميل
  const updatedRequest = await Request.findById(request._id)
    .populate('client', 'name phone email profilePicture')
    .populate({
      path: 'craftsman',
      populate: {
        path: 'user',
        select: 'name phone email profilePicture',
      },
    });
  
  res.json(updatedRequest);
});

// إضافة تقييم ومراجعة للطلب
exports.addReview = asyncHandler(async (req, res) => {
  // التحقق من أخطاء التحقق
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { rating, review } = req.body;
  
  const request = await Request.findById(req.params.id);
  if (!request) {
    return res.status(404).json({ message: 'الطلب غير موجود' });
  }
  
  // التحقق من أن المستخدم هو العميل
  if (request.client.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'فقط العميل يمكنه إضافة تقييم' });
  }
  
  // التحقق من أن الطلب مكتمل
  if (request.status !== 'completed') {
    return res.status(400).json({ message: 'لا يمكن إضافة تقييم لطلب غير مكتمل' });
  }
  
  // التحقق من عدم وجود تقييم سابق
  if (request.rating) {
    return res.status(400).json({ message: 'تم إضافة تقييم لهذا الطلب بالفعل' });
  }
  
  // إضافة التقييم والمراجعة
  request.rating = rating;
  request.review = review;
  await request.save();
  
  // تحديث متوسط تقييم الحرفي
  const craftsman = await Craftsman.findById(request.craftsman);
  if (craftsman) {
    // الحصول على جميع التقييمات للحرفي
    const requests = await Request.find({
      craftsman: craftsman._id,
      rating: { $exists: true, $ne: null },
    });
    
    // حساب متوسط التقييم
    const totalRating = requests.reduce((sum, req) => sum + req.rating, 0);
    const averageRating = requests.length > 0 ? totalRating / requests.length : 0;
    
    // تحديث تقييم الحرفي
    craftsman.rating = averageRating;
    await craftsman.save();
  }
  
  // إرجاع الطلب المحدث
  const updatedRequest = await Request.findById(request._id)
    .populate('client', 'name phone email profilePicture')
    .populate({
      path: 'craftsman',
      populate: {
        path: 'user',
        select: 'name phone email profilePicture',
      },
    });
  
  res.json(updatedRequest);
});

// تعديل طلب (فقط إذا كان معلقًا)
exports.updateRequest = asyncHandler(async (req, res) => {
  // التحقق من أخطاء التحقق
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const {
    service,
    description,
    location,
    images,
    preferredDates,
  } = req.body;
  
  const request = await Request.findById(req.params.id);
  if (!request) {
    return res.status(404).json({ message: 'الطلب غير موجود' });
  }
  
  // التحقق من أن المستخدم هو العميل
  if (request.client.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'فقط العميل يمكنه تعديل الطلب' });
  }
  
  // التحقق من أن الطلب معلق
  if (request.status !== 'pending') {
    return res.status(400).json({ message: 'لا يمكن تعديل طلب غير معلق' });
  }
  
  // التحقق من أن الطلب تم إنشاؤه منذ أقل من 5 دقائق
  const creationTime = new Date(request.createdAt).getTime();
  const currentTime = new Date().getTime();
  const timeDifference = (currentTime - creationTime) / (1000 * 60); // بالدقائق
  
  if (timeDifference > 5) {
    return res.status(400).json({ message: 'لا يمكن تعديل الطلب بعد مرور 5 دقائق من إنشائه' });
  }
  
  // تحديث الطلب
  if (service) request.service = service;
  if (description) request.description = description;
  if (location) request.location = location;
  if (images) request.images = images;
  if (preferredDates) request.preferredDates = preferredDates;
  
  await request.save();
  
  // إرجاع الطلب المحدث
  const updatedRequest = await Request.findById(request._id)
    .populate('client', 'name phone email profilePicture')
    .populate({
      path: 'craftsman',
      populate: {
        path: 'user',
        select: 'name phone email profilePicture',
      },
    });
  
  res.json(updatedRequest);
});

// حذف طلب (فقط إذا كان معلقًا)
exports.deleteRequest = asyncHandler(async (req, res) => {
  const request = await Request.findById(req.params.id);
  if (!request) {
    return res.status(404).json({ message: 'الطلب غير موجود' });
  }
  
  // التحقق من أن المستخدم هو العميل
  if (request.client.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'فقط العميل يمكنه حذف الطلب' });
  }
  
  // التحقق من أن الطلب معلق
  if (request.status !== 'pending') {
    return res.status(400).json({ message: 'لا يمكن حذف طلب غير معلق' });
  }
  
  // التحقق من أن الطلب تم إنشاؤه منذ أقل من 5 دقائق
  const creationTime = new Date(request.createdAt).getTime();
  const currentTime = new Date().getTime();
  const timeDifference = (currentTime - creationTime) / (1000 * 60); // بالدقائق
  
  if (timeDifference > 5) {
    return res.status(400).json({ message: 'لا يمكن حذف الطلب بعد مرور 5 دقائق من إنشائه' });
  }
  
  await request.remove();
  
  res.json({ message: 'تم حذف الطلب بنجاح' });
});
