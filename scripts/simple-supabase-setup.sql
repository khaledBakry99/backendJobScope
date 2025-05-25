-- إنشاء جدول المستخدمين البسيط
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id VARCHAR(255),
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

-- إنشاء فهرس للبريد الإلكتروني
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- إنشاء فهرس لمعرف MongoDB
CREATE INDEX IF NOT EXISTS idx_users_mongo_id ON public.users(mongo_id);

-- إنشاء فهرس لمعرف Supabase
CREATE INDEX IF NOT EXISTS idx_users_supabase_uid ON public.users(supabase_uid);

-- تفعيل Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسة أمان أساسية
CREATE POLICY "Users can view their own data" ON public.users
    FOR SELECT USING (auth.uid() = supabase_uid);

-- إنشاء سياسة للتحديث
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
