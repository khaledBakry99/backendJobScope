const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb+srv://jobscope_user:KK381kk4831kk@jobscope.yes86va.mongodb.net/jobscope?retryWrites=true&w=majority&appName=JobScope');
    console.log('✅ تم الاتصال بقاعدة البيانات');
    
    const craftsmanSchema = new mongoose.Schema({}, { strict: false });
    const Craftsman = mongoose.model('Craftsman', craftsmanSchema);
    
    const craftsmen = await Craftsman.find({ workGallery: { $exists: true, $ne: [] } });
    console.log('🔍 تم العثور على', craftsmen.length, 'حرفي لديهم صور');
    
    let updatedCount = 0;
    let removedCount = 0;
    
    for (const craftsman of craftsmen) {
      const originalLength = craftsman.workGallery.length;
      craftsman.workGallery = craftsman.workGallery.filter(img => img && img.startsWith('data:image/'));
      const newLength = craftsman.workGallery.length;
      
      if (originalLength !== newLength) {
        await craftsman.save();
        updatedCount++;
        removedCount += (originalLength - newLength);
        console.log('🧹 تم تنظيف معرض الحرفي', craftsman._id, '- حذف', (originalLength - newLength), 'صورة قديمة');
      }
    }
    
    console.log('📊 النتائج:');
    console.log('- عدد الحرفيين المحدثين:', updatedCount);
    console.log('- عدد الصور المحذوفة:', removedCount);
    
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ خطأ:', error.message);
    process.exit(1);
  }
};

connectDB();
