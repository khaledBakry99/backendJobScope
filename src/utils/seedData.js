const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const Craftsman = require('../models/craftsman.model');
const Profession = require('../models/profession.model');
require('dotenv').config();

// الاتصال بقاعدة البيانات
const connectDB = require('../config/db.config');

// بيانات المهن الافتراضية
const professions = [
  {
    name: 'كهربائي',
    specializations: ['تمديدات منزلية', 'صيانة كهربائية', 'تركيب إنارة', 'لوحات كهربائية'],
    icon: 'bolt',
  },
  {
    name: 'سباك',
    specializations: ['تمديدات صحية', 'إصلاح تسربات', 'تركيب أدوات صحية', 'صيانة سخانات'],
    icon: 'droplet',
  },
  {
    name: 'نجار',
    specializations: ['أثاث منزلي', 'أبواب وشبابيك', 'مطابخ', 'ديكورات خشبية'],
    icon: 'hammer',
  },
  {
    name: 'دهان',
    specializations: ['دهانات داخلية', 'دهانات خارجية', 'ديكورات جبسية', 'ورق جدران'],
    icon: 'brush',
  },
  {
    name: 'مكيفات',
    specializations: ['تركيب', 'صيانة', 'تنظيف', 'إصلاح'],
    icon: 'wind',
  },
  {
    name: 'بناء',
    specializations: ['بناء', 'ترميم', 'تشطيبات', 'بلاط'],
    icon: 'home',
  },
];

// بيانات المستخدمين الافتراضية
const users = [
  {
    name: 'أحمد محمد',
    email: 'ahmed@example.com',
    password: 'password123',
    phone: '0923456789',
    address: 'دمشق، سوريا',
    userType: 'client',
    profilePicture: 'https://randomuser.me/api/portraits/men/1.jpg',
  },
  {
    name: 'سارة أحمد',
    email: 'sara@example.com',
    password: 'password123',
    phone: '0934567890',
    address: 'حلب، سوريا',
    userType: 'client',
    profilePicture: 'https://randomuser.me/api/portraits/women/2.jpg',
  },
  {
    name: 'محمد الخطيب',
    email: 'mohammad@example.com',
    password: 'password123',
    phone: '0912345678',
    address: 'دمشق، سوريا',
    userType: 'craftsman',
    profilePicture: 'https://randomuser.me/api/portraits/men/3.jpg',
  },
  {
    name: 'عمر السيد',
    email: 'omar@example.com',
    password: 'password123',
    phone: '0945678901',
    address: 'حمص، سوريا',
    userType: 'craftsman',
    profilePicture: 'https://randomuser.me/api/portraits/men/4.jpg',
  },
  {
    name: 'مدير النظام',
    email: 'admin@jobscope.com',
    password: 'admin123',
    phone: '0911111111',
    address: 'دمشق، سوريا',
    userType: 'admin',
    profilePicture: 'https://randomuser.me/api/portraits/men/10.jpg',
  },
];

// بيانات الحرفيين الافتراضية
const craftsmen = [
  {
    // محمد الخطيب
    professions: ['سباك'],
    specializations: ['إصلاح تسربات المياه', 'تركيب حنفيات', 'صيانة سخانات'],
    bio: 'خبرة 15 عام في مجال السباكة وإصلاح تسربات المياه وتركيب الأدوات الصحية',
    workRadius: 10,
    location: { lat: 33.52, lng: 36.3 },
    available: true,
    rating: 4.8,
    reviewCount: 24,
    workGallery: [
      'https://images.unsplash.com/photo-1621905251189-08b45d6a269e',
      'https://images.unsplash.com/photo-1558538337-aab544368de8',
    ],
    workingHours: {
      monday: { start: '', end: '', isWorking: true },
      tuesday: { start: '', end: '', isWorking: true },
      wednesday: { start: '', end: '', isWorking: true },
      thursday: { start: '', end: '', isWorking: true },
      friday: { start: '', end: '', isWorking: true },
      saturday: { start: '10:00', end: '15:00', isWorking: true },
      sunday: { start: '00:00', end: '00:00', isWorking: false },
    },
  },
  {
    // عمر السيد
    professions: ['نجار'],
    specializations: ['أثاث منزلي', 'أبواب وشبابيك', 'مطابخ'],
    bio: 'نجار محترف متخصص في صناعة وتصليح الأثاث المنزلي بجودة عالية',
    workRadius: 8,
    location: { lat: 33.51, lng: 36.28 },
    available: true,
    rating: 4.5,
    reviewCount: 18,
    workGallery: [
      'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1',
      'https://images.unsplash.com/photo-1585704032915-c3400ca199e7',
    ],
    workingHours: {
      monday: { start: '', end: '', isWorking: true },
      tuesday: { start: '', end: '', isWorking: true },
      wednesday: { start: '', end: '', isWorking: true },
      thursday: { start: '', end: '', isWorking: true },
      friday: { start: '', end: '', isWorking: true },
      saturday: { start: '', end: '', isWorking: true },
      sunday: { start: '', end: '', isWorking: false },
    },
  },
];

// دالة لإضافة البيانات الافتراضية
const seedData = async () => {
  try {
    // الاتصال بقاعدة البيانات
    await connectDB();

    // حذف البيانات الموجودة
    await User.deleteMany({});
    await Craftsman.deleteMany({});
    await Profession.deleteMany({});

    console.log('تم حذف البيانات الموجودة');

    // إضافة المهن
    const createdProfessions = await Profession.insertMany(professions);
    console.log(`تم إضافة ${createdProfessions.length} مهنة`);

    // إضافة المستخدمين
    const createdUsers = [];
    for (const user of users) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(user.password, salt);

      const newUser = new User({
        ...user,
        password: hashedPassword,
      });

      const savedUser = await newUser.save();
      createdUsers.push(savedUser);
    }
    console.log(`تم إضافة ${createdUsers.length} مستخدم`);

    // إضافة الحرفيين
    const craftsmanUsers = createdUsers.filter(user => user.userType === 'craftsman');
    
    for (let i = 0; i < craftsmanUsers.length; i++) {
      const craftsmanData = craftsmen[i];
      const newCraftsman = new Craftsman({
        user: craftsmanUsers[i]._id,
        ...craftsmanData,
      });

      await newCraftsman.save();
    }
    console.log(`تم إضافة ${craftsmanUsers.length} حرفي`);

    console.log('تم إضافة البيانات الافتراضية بنجاح');
    process.exit(0);
  } catch (error) {
    console.error('خطأ في إضافة البيانات الافتراضية:', error);
    process.exit(1);
  }
};

// تنفيذ الدالة
seedData();
