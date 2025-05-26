const cron = require('node-cron');
const Booking = require('../models/booking.model');
const Craftsman = require('../models/craftsman.model');
const User = require('../models/user.model');
const Notification = require('../models/notification.model');

// وظيفة لتحديث حالة الطلبات التي انتهت فترة التعديل الخاصة بها (10 دقائق)
const updateExpiredBookings = async () => {
  try {
    // حساب الوقت قبل 10 دقائق
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    // البحث عن الطلبات التي تم إنشاؤها قبل 10 دقائق وما زالت قابلة للتعديل وغير مرئية للحرفي
    const expiredBookings = await Booking.find({
      createdAt: { $lt: tenMinutesAgo },
      canEdit: true,
      visibleToCraftsman: false,
      status: 'pending'
    });
    
    console.log(`[${new Date().toISOString()}] تم العثور على ${expiredBookings.length} طلب منتهي الصلاحية`);
    
    // تحديث كل طلب وإنشاء إشعار للحرفي
    for (const booking of expiredBookings) {
      // تحديث الطلب
      booking.canEdit = false;
      booking.visibleToCraftsman = true;
      await booking.save();
      
      // إنشاء إشعار للحرفي
      const craftsman = await Craftsman.findById(booking.craftsman).populate('user');
      const client = await User.findById(booking.client);
      
      if (craftsman && craftsman.user) {
        const notification = new Notification({
          user: craftsman.user._id,
          type: 'booking_created',
          title: 'طلب خدمة جديد',
          message: `لديك طلب خدمة جديد من ${client.name}`,
          data: {
            bookingId: booking._id,
          },
          icon: 'clipboard-list',
        });
        
        await notification.save();
        console.log(`[${new Date().toISOString()}] تم إنشاء إشعار للحرفي ${craftsman.user.name} للطلب ${booking._id}`);
      }
    }
    
    return expiredBookings.length;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] خطأ في تحديث الطلبات المنتهية:`, error);
    return 0;
  }
};

// تشغيل المهمة كل دقيقة
const startCronJobs = () => {
  // تشغيل المهمة كل دقيقة
  cron.schedule('* * * * *', async () => {
    const count = await updateExpiredBookings();
  });
  
};

module.exports = {
  startCronJobs,
  updateExpiredBookings
};
