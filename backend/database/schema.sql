-- Cycle-Bees Database Schema
-- SQLite compatible schema for offline-first development

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone VARCHAR(15) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    age INTEGER,
    pincode VARCHAR(10),
    address TEXT,
    profile_photo VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Admin table (fixed credentials)
CREATE TABLE IF NOT EXISTS admin (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Repair Services table
CREATE TABLE IF NOT EXISTS repair_services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    special_instructions TEXT,
    price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Service Mechanic Charge table
CREATE TABLE IF NOT EXISTS service_mechanic_charge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Time Slots table
CREATE TABLE IF NOT EXISTS time_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Bicycles table (for rental)
CREATE TABLE IF NOT EXISTS bicycles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    model VARCHAR(100),
    description TEXT,
    special_instructions TEXT,
    daily_rate DECIMAL(10,2) NOT NULL,
    weekly_rate DECIMAL(10,2) NOT NULL,
    delivery_charge DECIMAL(10,2) NOT NULL,
    specifications TEXT, -- JSON format
    is_available BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Bicycle Photos table
CREATE TABLE IF NOT EXISTS bicycle_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bicycle_id INTEGER NOT NULL,
    photo_url VARCHAR(255) NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bicycle_id) REFERENCES bicycles(id) ON DELETE CASCADE
);

-- Repair Requests table
CREATE TABLE IF NOT EXISTS repair_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    contact_number VARCHAR(15) NOT NULL,
    alternate_number VARCHAR(15),
    email VARCHAR(100),
    notes TEXT,
    preferred_date DATE NOT NULL,
    time_slot_id INTEGER NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('online', 'offline')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'waiting_payment', 'active', 'completed', 'expired')),
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (time_slot_id) REFERENCES time_slots(id)
);

-- Repair Request Services table (many-to-many)
CREATE TABLE IF NOT EXISTS repair_request_services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repair_request_id INTEGER NOT NULL,
    repair_service_id INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (repair_request_id) REFERENCES repair_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (repair_service_id) REFERENCES repair_services(id)
);

-- Repair Request Files table
CREATE TABLE IF NOT EXISTS repair_request_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repair_request_id INTEGER NOT NULL,
    file_url VARCHAR(255) NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video')),
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (repair_request_id) REFERENCES repair_requests(id) ON DELETE CASCADE
);

-- Rental Requests table
CREATE TABLE IF NOT EXISTS rental_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    bicycle_id INTEGER NOT NULL,
    contact_number VARCHAR(15) NOT NULL,
    alternate_number VARCHAR(15),
    delivery_address TEXT NOT NULL,
    special_instructions TEXT,
    duration_type TEXT NOT NULL CHECK (duration_type IN ('daily', 'weekly')),
    duration_count INTEGER NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('online', 'offline')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'waiting_payment', 'arranging_delivery', 'active_rental', 'completed', 'expired')),
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (bicycle_id) REFERENCES bicycles(id)
);

-- Coupons table
CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10,2) NOT NULL,
    min_amount DECIMAL(10,2) DEFAULT 0,
    max_discount DECIMAL(10,2),
    applicable_items TEXT, -- JSON array of item types
    usage_limit INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    expires_at DATETIME,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Coupon Usage table
CREATE TABLE IF NOT EXISTS coupon_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    coupon_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    request_type TEXT NOT NULL CHECK (request_type IN ('repair', 'rental')),
    request_id INTEGER NOT NULL,
    discount_amount DECIMAL(10,2) NOT NULL,
    used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coupon_id) REFERENCES coupons(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Promotional Cards table
CREATE TABLE IF NOT EXISTS promotional_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    image_url VARCHAR(255),
    external_link VARCHAR(255),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    starts_at DATETIME,
    ends_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- OTP table (for temporary storage)
CREATE TABLE IF NOT EXISTS otp_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone VARCHAR(15) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    expires_at DATETIME NOT NULL,
    is_used BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Payment Transactions table (for mock payments)
CREATE TABLE IF NOT EXISTS payment_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_type TEXT NOT NULL CHECK (request_type IN ('repair', 'rental')),
    request_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('online', 'offline')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    transaction_id VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_repair_requests_user_id ON repair_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_repair_requests_status ON repair_requests(status);
CREATE INDEX IF NOT EXISTS idx_rental_requests_user_id ON rental_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_rental_requests_status ON rental_requests(status);
CREATE INDEX IF NOT EXISTS idx_otp_codes_phone ON otp_codes(phone);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_promotional_cards_active ON promotional_cards(is_active); 