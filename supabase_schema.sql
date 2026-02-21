-- BLUE CARBON INDIA REGISTRY SCHEMA

-- 1. Profiles (for users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    name TEXT,
    role TEXT CHECK (role IN ('admin', 'developer', 'verifier', 'corporate')),
    email TEXT,
    place TEXT,
    pincode TEXT,
    phone_number TEXT UNIQUE,
    developer_id TEXT UNIQUE,
    password TEXT,
    wallet_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Evolution: Add columns to profiles if they don't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS place TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pincode TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS developer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wallet_address TEXT;

-- Decouple from auth.users for simulator (Standalone Mode)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Add unique constraints if they don't exist (requires a bit of care in SQL)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_phone_number_key') THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_phone_number_key UNIQUE (phone_number);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_developer_id_key') THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_developer_id_key UNIQUE (developer_id);
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY, -- e.g. BC-MH-0042
    name TEXT NOT NULL,
    plantation_type TEXT,
    initiator_type TEXT CHECK (initiator_type IN ('farmer', 'ngo', 'panchayat')),
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    gps_accuracy DECIMAL(5, 2),
    state TEXT,
    district TEXT,
    taluk TEXT,
    village TEXT,
    panchayat_name TEXT,
    land_type TEXT,
    land_proof_url TEXT,
    species JSONB,
    saplings_count INTEGER,
    area TEXT,
    plantation_date DATE,
    evidence_photos JSONB,
    evidence_video_url TEXT,
    monitoring_frequency TEXT,
    maintenance_responsibility TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'verified', 'rejected', 'monitoring')),
    developer_id UUID REFERENCES auth.users(id),
    credits_issued INTEGER DEFAULT 0,
    verification_stage INTEGER DEFAULT 1,
    risk_score DECIMAL(3, 2) DEFAULT 0,
    last_satellite_sync TIMESTAMP WITH TIME ZONE,
    blockchain_status TEXT DEFAULT 'pending',
    blockchain_hash TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Evolution: Add columns if table already existed without them
ALTER TABLE projects ADD COLUMN IF NOT EXISTS developer_id UUID;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_developer_id_fkey;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS verification_stage INTEGER DEFAULT 1;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS risk_score DECIMAL(3, 2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_satellite_sync TIMESTAMP WITH TIME ZONE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS blockchain_status TEXT DEFAULT 'pending';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS blockchain_hash TEXT;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS plantation_type TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS initiator_type TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS lat DECIMAL(10, 8);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS lng DECIMAL(11, 8);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS gps_accuracy DECIMAL(5, 2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS taluk TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS village TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS panchayat_name TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS land_type TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS land_proof_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS species JSONB;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS saplings_count INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS plantation_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS evidence_photos JSONB;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS evidence_video_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS monitoring_frequency TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS maintenance_responsibility TEXT;

-- 3. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    action TEXT NOT NULL,
    performed_by TEXT, -- name or wallet
    log_type TEXT CHECK (log_type IN ('approved', 'rejected', 'info', 'warning')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Carbon Credits (Marketplace Inventory)
CREATE TABLE IF NOT EXISTS carbon_credits (
    id TEXT PRIMARY KEY REFERENCES projects(id),
    name TEXT NOT NULL,
    state TEXT,
    ecosystem TEXT,
    price_inr INTEGER NOT NULL,
    available_quantity INTEGER NOT NULL,
    vintage INTEGER NOT NULL,
    verifier_standard TEXT,
    rating DECIMAL(2,1),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. User Portfolio
CREATE TABLE IF NOT EXISTS user_portfolio (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    project_id TEXT REFERENCES projects(id),
    owned_quantity INTEGER DEFAULT 0,
    retired_quantity INTEGER DEFAULT 0,
    certificate_id TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbon_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_portfolio ENABLE ROW LEVEL SECURITY;

-- Basic Policies (Using DO blocks to skip if already exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Public profiles are viewable by everyone.') THEN
        CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Anyone can register.') THEN
        CREATE POLICY "Anyone can register." ON profiles FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can update their own profile.') THEN
        CREATE POLICY "Users can update their own profile." ON profiles FOR UPDATE USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Projects are viewable by everyone.') THEN
        CREATE POLICY "Projects are viewable by everyone." ON projects FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Audit logs are viewable by everyone.') THEN
        CREATE POLICY "Audit logs are viewable by everyone." ON audit_logs FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Credits are viewable by everyone.') THEN
        CREATE POLICY "Credits are viewable by everyone." ON carbon_credits FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'User portfolio is owner.') THEN
        CREATE POLICY "User portfolio is owner." ON user_portfolio FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Anyone can insert projects.') THEN
        CREATE POLICY "Anyone can insert projects." ON projects FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Anyone can insert audit logs.') THEN
        CREATE POLICY "Anyone can insert audit logs." ON audit_logs FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- 6. Auth Devices (For tracking recognized devices)
CREATE TABLE IF NOT EXISTS auth_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    phone_number TEXT, -- Added for standalone tracking
    device_identifier_hash TEXT NOT NULL, -- Browser fingerprint
    device_name TEXT,
    last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(phone_number, device_identifier_hash)
);

-- 7. Auth OTPs (For managing verification codes)
CREATE TABLE IF NOT EXISTS auth_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for new tables
ALTER TABLE auth_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_otps ENABLE ROW LEVEL SECURITY;

-- Auth Policies
DO $$ 
BEGIN
    -- Auth OTPs policies
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Anyone can request OTP' AND tablename = 'auth_otps') THEN
        CREATE POLICY "Anyone can request OTP" ON auth_otps FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Anyone can verify OTP' AND tablename = 'auth_otps') THEN
        CREATE POLICY "Anyone can verify OTP" ON auth_otps FOR SELECT USING (true);
    END IF;

    -- Auth Devices policies
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Anyone can register device' AND tablename = 'auth_devices') THEN
        CREATE POLICY "Anyone can register device" ON auth_devices FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Anyone can view their own device' AND tablename = 'auth_devices') THEN
        CREATE POLICY "Anyone can view their own device" ON auth_devices FOR SELECT USING (true);
    END IF;
END $$;
