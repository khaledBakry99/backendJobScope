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

// دالة تنظيف الصور القديمة
const cleanOldImagePaths = async () => {
  try {
    console.log('🧹 بدء تنظيف مسارات الصور القديمة...');
    
    const craftsmen = await Craftsman.find({
      workGallery: { $exists: true, $ne: [] }
    });

    console.log(`تم العثور على ${craftsmen.length} حرفي لديهم صور في المعرض`);

    let updatedCount = 0;
    let removedImagesCount = 0;

    for (const craftsman of craftsmen) {
      try {
        let hasChanges = false;
        const cleanedGallery = [];

        console.log(`\n--- معالجة الحرفي ${craftsman._id} ---`);
        console.log(`عدد الصور الحالي: ${craftsman.workGallery.length}`);

        for (const imagePath of craftsman.workGallery) {
          // الاحتفاظ فقط بالصور Base64
          if (imagePath && imagePath.startsWith('data:image/')) {
            cleanedGallery.push(imagePath);
            console.log(`✅ احتفظ بصورة Base64 (${imagePath.length} حرف)`);
          } else if (imagePath && imagePath.startsWith('/uploads/')) {
            console.log(`❌ حذف صورة قديمة: ${imagePath}`);
            removedImagesCount++;
            hasChanges = true;
          } else if (imagePath && imagePath.startsWith('http')) {
            console.log(`❌ حذف رابط خارجي: ${imagePath}`);
            removedImagesCount++;
            hasChanges = true;
          } else {
            console.log(`❌ حذف مسار غير صالح: ${imagePath}`);
            removedImagesCount++;
            hasChanges = true;
          }
        }

        if (hasChanges) {
          craftsman.workGallery = cleanedGallery;
          await craftsman.save();
          updatedCount++;
          console.log(`✅ تم تحديث معرض الحرفي ${craftsman._id}`);
          console.log(`عدد الصور بعد التنظيف: ${cleanedGallery.length}`);
        } else {
          console.log(`✅ لا حاجة لتحديث معرض الحرفي ${craftsman._id}`);
        }

      } catch (error) {
        console.error(`❌ خطأ في معالجة الحرفي ${craftsman._id}:`, error.message);
      }
    }

    console.log(`\n=== ملخص التنظيف ===`);
    console.log(`عدد الحرفيين المحدثين: ${updatedCount}`);
    console.log(`عدد الصور المحذوفة: ${removedImagesCount}`);

  } catch (error) {
    console.error('❌ خطأ في تنظيف مسارات الصور:', error);
  }
};

// دالة رئيسية
const main = async () => {
  console.log('🚀 بدء تنظيف مسارات الصور القديمة...\n');
  
  await connectDB();
  await cleanOldImagePaths();
  
  console.log('\n✅ تم الانتهاء من تنظيف مسارات الصور القديمة!');
  
  mongoose.connection.close();
  process.exit(0);
};

// تشغيل السكريبت
main().catch(error => {
  console.error('خطأ في تشغيل السكريبت:', error);
  process.exit(1);
});
