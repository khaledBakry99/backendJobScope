const mongoose = require('mongoose');

// الاتصال بقاعدة البيانات
const connectDB = async () => {
  try {
    const conn = await mongoose.connect('mongodb+srv://jobscope_user:KK381kk4831kk@jobscope.yes86va.mongodb.net/jobscope?retryWrites=true&w=majority&appName=JobScope');
    console.log(`تم الاتصال بقاعدة البيانات: ${conn.connection.host}`);
  } catch (error) {
    console.error('خطأ في الاتصال بقاعدة البيانات:', error);
    process.exit(1);
  }
};

// نموذج الحرفي
const craftsmanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  professions: [String],
  specializations: [String],
  bio: String,
  features: [String],
  workRadius: { type: Number, default: 5 },
  location: {
    lat: Number,
    lng: Number,
  },
  address: String,
  streetsInWorkRange: [String],
  hospitalsInWorkRange: [String],
  mosquesInWorkRange: [String],
  neighborhoodsInWorkRange: [String],
  available: { type: Boolean, default: true },
  workGallery: [String],
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  workingHours: {
    type: Map,
    of: {
      isWorking: Boolean,
      start: String,
      end: String
    }
  },
  workingHoursArray: [Object],
}, {
  timestamps: true,
});

const Craftsman = mongoose.model("Craftsman", craftsmanSchema);

// دالة اختبار معرض الصور
const testGallery = async () => {
  try {
    console.log('🔍 بدء اختبار معرض الصور...');
    
    // البحث عن جميع الحرفيين الذين لديهم صور
    const craftsmen = await Craftsman.find({
      workGallery: { $exists: true, $ne: [] }
    });

    console.log(`تم العثور على ${craftsmen.length} حرفي لديهم صور في المعرض`);

    for (const craftsman of craftsmen) {
      console.log(`\n--- الحرفي ${craftsman._id} ---`);
      console.log(`عدد الصور: ${craftsman.workGallery.length}`);
      
      // فحص كل صورة
      craftsman.workGallery.forEach((image, index) => {
        if (image.startsWith('data:image/')) {
          console.log(`  ${index + 1}. صورة Base64 (${image.length} حرف)`);
        } else if (image.startsWith('/uploads/')) {
          console.log(`  ${index + 1}. مسار ملف: ${image}`);
        } else if (image.startsWith('http')) {
          console.log(`  ${index + 1}. رابط: ${image}`);
        } else {
          console.log(`  ${index + 1}. نوع غير معروف: ${image.substring(0, 50)}...`);
        }
      });
    }

    console.log('\n✅ انتهى اختبار معرض الصور!');
    
  } catch (error) {
    console.error('❌ خطأ في اختبار معرض الصور:', error);
  }
};

// دالة رئيسية
const main = async () => {
  console.log('🚀 بدء اختبار النظام...\n');
  
  await connectDB();
  await testGallery();
  
  mongoose.connection.close();
  process.exit(0);
};

// تشغيل السكريبت
main().catch(error => {
  console.error('خطأ في تشغيل السكريبت:', error);
  process.exit(1);
});
