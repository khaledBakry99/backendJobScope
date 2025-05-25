-- حذف الجداول الموجودة إذا كانت موجودة (اختياري)
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.craftsmen CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- إنشاء جدول المستخدمين في Supabase
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    user_type VARCHAR(50) DEFAULT 'client',
    profile_picture TEXT,
    address TEXT,
    is_active BOOLEAN DEFAULT false,
    auth_provider VARCHAR(50) DEFAULT 'supabase',
    supabase_uid UUID,
    firebase_uid VARCHAR(255),
    google_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول الحرفيين
CREATE TABLE public.craftsmen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    mongo_id VARCHAR(255) UNIQUE,
    professions TEXT[],
    specializations TEXT[],
    work_radius INTEGER DEFAULT 5,
    location JSONB,
    bio TEXT,
    work_gallery TEXT[],
    available BOOLEAN DEFAULT true,
    streets_in_work_range TEXT[],
    hospitals_in_work_range TEXT[],
    mosques_in_work_range TEXT[],
    neighborhoods_in_work_range TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول الحجوزات
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id VARCHAR(255) UNIQUE,
    client_id UUID REFERENCES public.users(id),
    craftsman_id UUID REFERENCES public.users(id),
    service_type VARCHAR(255),
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    booking_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول المراجعات
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id VARCHAR(255) UNIQUE,
    client_id UUID REFERENCES public.users(id),
    craftsman_id UUID REFERENCES public.users(id),
    booking_id UUID REFERENCES public.bookings(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول الرسائل
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id VARCHAR(255) UNIQUE,
    sender_id UUID REFERENCES public.users(id),
    receiver_id UUID REFERENCES public.users(id),
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء الفهارس للأداء
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_mongo_id ON public.users(mongo_id);
CREATE INDEX IF NOT EXISTS idx_users_supabase_uid ON public.users(supabase_uid);
CREATE INDEX IF NOT EXISTS idx_craftsmen_user_id ON public.craftsmen(user_id);
CREATE INDEX IF NOT EXISTS idx_craftsmen_mongo_id ON public.craftsmen(mongo_id);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON public.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_craftsman_id ON public.bookings(craftsman_id);
CREATE INDEX IF NOT EXISTS idx_reviews_craftsman_id ON public.reviews(craftsman_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);

-- تفعيل Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.craftsmen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الأمان الأساسية
CREATE POLICY "Users can view their own data" ON public.users
    FOR SELECT USING (auth.uid() = supabase_uid);

CREATE POLICY "Users can update their own data" ON public.users
    FOR UPDATE USING (auth.uid() = supabase_uid);

-- إنشاء trigger لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_craftsmen_updated_at BEFORE UPDATE ON public.craftsmen
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
