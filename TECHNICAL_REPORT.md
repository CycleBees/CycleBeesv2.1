# Cycle-Bees System Technical Report

## Table of Contents
1. [System Overview](#system-overview)
2. [Backend Architecture](#backend-architecture)
3. [Database Architecture](#database-architecture)
4. [Mobile Application (React Native)](#mobile-application-react-native)
5. [Admin Dashboard (React Web)](#admin-dashboard-react-web)
6. [API Endpoints Documentation](#api-endpoints-documentation)
7. [User Flow Analysis](#user-flow-analysis)
8. [Security Implementation](#security-implementation)
9. [File Structure Analysis](#file-structure-analysis)

---

## System Overview

**Cycle-Bees** is a comprehensive bicycle repair and rental service platform consisting of three main components:

- **Mobile App**: React Native (Expo) app for end users
- **Admin Dashboard**: React web application for administrators
- **Backend API**: Express.js REST API with SQLite database

### Key Features
- Phone OTP-based authentication
- Bicycle repair booking system
- Bicycle rental system
- Coupon management
- Promotional cards system
- Payment integration (mock implementation for offline development)

### Technology Stack
- **Frontend Mobile**: React Native 0.79.5 with Expo 53.0.17
- **Frontend Web**: React 19.1.0 with TypeScript
- **Backend**: Node.js with Express.js 4.18.2
- **Database**: SQLite 5.1.6 (offline development)
- **Authentication**: JWT tokens with bcryptjs
- **File Upload**: Multer for handling images/videos

---

## Backend Architecture

### Core Structure

```
backend/
├── server.js              # Main server entry point
├── package.json           # Dependencies and scripts
├── database/              # Database schema and setup
├── routes/                # API route handlers
├── middleware/            # Authentication middleware
└── uploads/               # File storage directory
```

### Dependencies Analysis

**Core Dependencies:**
- `express`: Web framework for Node.js
- `sqlite3`: SQLite database driver
- `jsonwebtoken`: JWT token generation/verification
- `bcryptjs`: Password hashing
- `multer`: File upload handling
- `cors`: Cross-origin resource sharing
- `helmet`: Security middleware
- `express-validator`: Input validation
- `node-cron`: Scheduled tasks for request expiration

**Development Dependencies:**
- `nodemon`: Development server with auto-restart

### File Analysis

#### server.js (74 lines)
**Purpose**: Main application entry point
**Key Features**:
- Express app configuration
- Middleware setup (CORS, Helmet, Morgan, Compression)
- SQLite database connection
- Route mounting
- Static file serving for uploads
- Health check endpoint

**Critical Code Sections**:
```javascript
// Database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Failed to connect to database:', err.message);
    else console.log('Connected to SQLite database');
});

// Route mounting
app.use('/api/auth', authRoutes);
app.use('/api/repair', repairRoutes);
app.use('/api/rental', rentalRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/coupon', couponRoutes);
app.use('/api/promotional', promotionalRoutes);
```

#### middleware/auth.js (54 lines)
**Purpose**: JWT authentication and authorization
**Key Functions**:
- `authenticateToken`: Verifies JWT tokens
- `requireUser`: Ensures user role access
- `requireAdmin`: Ensures admin role access

---

## Database Architecture

### Schema Overview (SQLite)

The database uses SQLite with 14 tables managing users, services, requests, and system data.

#### Core Tables

**1. Users Table**
```sql
CREATE TABLE users (
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
```
- **Purpose**: Stores user profile information
- **Key Fields**: phone (unique), email (unique), profile data
- **Relationships**: One-to-many with repair_requests, rental_requests

**2. Admin Table**
```sql
CREATE TABLE admin (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```
- **Purpose**: Fixed admin credentials storage
- **Security**: Uses bcrypt hashed passwords

**3. Repair Services Table**
```sql
CREATE TABLE repair_services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    special_instructions TEXT,
    price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```
- **Purpose**: Manages available repair services
- **Features**: Soft delete with is_active flag

**4. Bicycles Table**
```sql
CREATE TABLE bicycles (
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
```
- **Purpose**: Bicycle inventory for rentals
- **Features**: JSON specifications, availability tracking

#### Request Management Tables

**5. Repair Requests Table**
```sql
CREATE TABLE repair_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    contact_number VARCHAR(15) NOT NULL,
    alternate_number VARCHAR(15),
    email VARCHAR(100),
    address TEXT,
    notes TEXT,
    preferred_date DATE NOT NULL,
    time_slot_id INTEGER NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('online', 'offline')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'waiting_payment', 'active', 'completed', 'expired')),
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (time_slot_id) REFERENCES time_slots(id)
);
```
- **Status Flow**: pending → approved → waiting_payment/active → completed
- **Expiration**: 15-minute expiration system

**6. Rental Requests Table**
```sql
CREATE TABLE rental_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    bicycle_id INTEGER NOT NULL,
    contact_number VARCHAR(15) NOT NULL,
    alternate_number VARCHAR(15),
    email VARCHAR(100),
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
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (bicycle_id) REFERENCES bicycles(id)
);
```
- **Status Flow**: pending → approved → waiting_payment/arranging_delivery → active_rental → completed

#### Supporting Tables

**7. Coupons Table**
```sql
CREATE TABLE coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10,2) NOT NULL,
    min_amount DECIMAL(10,2) DEFAULT 0,
    max_discount DECIMAL(10,2),
    applicable_items TEXT, -- JSON array
    usage_limit INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    expires_at DATETIME,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```
- **Features**: Percentage/fixed discounts, usage limits, expiration

**8. OTP Codes Table**
```sql
CREATE TABLE otp_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone VARCHAR(15) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    expires_at DATETIME NOT NULL,
    is_used BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```
- **Purpose**: Temporary OTP storage for authentication
- **Security**: 5-minute expiration, single-use tokens

#### Performance Indexes
```sql
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_repair_requests_user_id ON repair_requests(user_id);
CREATE INDEX idx_repair_requests_status ON repair_requests(status);
CREATE INDEX idx_rental_requests_user_id ON rental_requests(user_id);
CREATE INDEX idx_rental_requests_status ON rental_requests(status);
CREATE INDEX idx_otp_codes_phone ON otp_codes(phone);
CREATE INDEX idx_coupons_code ON coupons(code);
```

### Database Relationships

- **Users** ↔ **Repair Requests** (One-to-Many)
- **Users** ↔ **Rental Requests** (One-to-Many)
- **Repair Services** ↔ **Repair Request Services** (Many-to-Many via junction table)
- **Bicycles** ↔ **Bicycle Photos** (One-to-Many)
- **Bicycles** ↔ **Rental Requests** (One-to-Many)
- **Coupons** ↔ **Coupon Usage** (One-to-Many)

---

## Mobile Application (React Native)

### Architecture Overview

```
mobile-app/
├── app/                   # Main app screens (Expo Router)
├── components/            # Reusable UI components
├── constants/             # App constants
├── hooks/                 # Custom React hooks
├── assets/                # Images, fonts, etc.
└── package.json           # Dependencies
```

### Key Dependencies
- **Core**: React 19.0.0, React Native 0.79.5, Expo 53.0.17
- **Navigation**: Expo Router 5.1.3, React Navigation 7.x
- **UI**: Expo Vector Icons, Expo Image, Expo Blur
- **Functionality**: AsyncStorage, DateTimePicker, ImagePicker, DocumentPicker
- **Development**: TypeScript, ESLint

### Screen Components Analysis

#### app/index.tsx (56 lines)
**Purpose**: App entry point with authentication check
**Features**: Redirects to login or home based on auth status

#### app/login.tsx (712 lines)
**Purpose**: Phone OTP authentication screen
**Key Features**:
- Phone number validation (Indian format)
- OTP generation and verification
- User registration flow for new users
- JWT token storage

**User Flow**:
1. Phone number input with validation
2. OTP request → Mock SMS console log
3. OTP verification
4. If new user → Registration form
5. If existing user → Direct login

#### app/home.tsx (886 lines)
**Purpose**: Main dashboard with promotional cards
**Key Features**:
- User profile display
- Promotional card carousel
- Navigation to repair/rental services
- Modern UI with animations

#### app/book-repair.tsx (1,894 lines)
**Purpose**: Complete repair booking flow
**Key Features**:
- Multi-step form process
- Service selection with pricing
- File upload (images/videos) with compression
- Date and time slot selection
- Coupon application
- Payment method selection
- 15-minute expiration timer

**Technical Implementation**:
- Expo ImagePicker for photos/videos
- File compression and validation
- Real-time price calculation
- Form validation with user feedback

#### app/book-rental.tsx (1,946 lines)
**Purpose**: Bicycle rental booking system
**Key Features**:
- Bicycle catalog with photos
- Duration selection (daily/weekly)
- Delivery address management
- Price calculation with delivery charges
- Step-by-step booking process

#### app/my-requests.tsx (1,550 lines)
**Purpose**: User's booking history and status tracking
**Key Features**:
- Active requests monitoring
- Past requests history
- Real-time status updates
- Payment handling for pending requests

#### app/profile.tsx (921 lines)
**Purpose**: User profile management
**Key Features**:
- Profile photo upload
- Personal information editing
- Account settings
- Logout functionality

### Component Structure

#### components/ModernLoginScreen.tsx (456 lines)
**Purpose**: Styled login interface
**Features**: Modern UI with animations, form validation

#### components/StepIndicator.tsx (230 lines)
**Purpose**: Multi-step form progress indicator
**Features**: Visual step tracking for booking flows

#### components/SplashAnimation.tsx (313 lines)
**Purpose**: App loading animation
**Features**: Brand animation on app startup

#### components/AuthGuard.tsx (69 lines)
**Purpose**: Route protection
**Features**: Redirects unauthenticated users to login

### API Integration

The mobile app communicates with the backend via HTTP requests to `http://localhost:3000/api/` endpoints:

- **Authentication**: `/api/auth/send-otp`, `/api/auth/verify-otp`
- **Repair Services**: `/api/repair/services`, `/api/repair/requests`
- **Rentals**: `/api/rental/bicycles`, `/api/rental/requests`
- **User Data**: `/api/auth/profile`

---

## Admin Dashboard (React Web)

### Architecture Overview

```
admin-dashboard/
├── src/
│   ├── App.tsx            # Main app component
│   ├── components/        # React components
│   ├── App.css           # Styling
│   └── index.tsx         # App entry point
└── package.json          # Dependencies
```

### Key Dependencies
- **Core**: React 19.1.0, TypeScript 4.9.5
- **Testing**: Jest, React Testing Library
- **Build**: React Scripts 5.0.1

### Component Analysis

#### App.tsx (148 lines)
**Purpose**: Main application with routing logic
**Features**:
- Admin authentication check
- Navigation sidebar
- Component routing
- Responsive layout

#### components/Sidebar.tsx (94 lines)
**Purpose**: Navigation sidebar
**Features**:
- Menu sections for different admin functions
- Active route highlighting
- Logout functionality

#### components/DashboardOverview.tsx (184 lines)
**Purpose**: Admin dashboard home page
**Features**:
- System statistics display
- Quick access to key functions
- User metrics overview

#### components/RepairManagement.tsx (1,258 lines)
**Purpose**: Repair request management
**Key Features**:
- Request list with filtering by status
- Status update functionality
- Service catalog management
- Time slot configuration
- Mechanic charge settings
- File viewing for user uploads

**Admin Actions**:
- Approve/reject repair requests
- Update request status (pending → approved → active → completed)
- Manage repair services (CRUD operations)
- Configure time slots
- Set mechanic charges

#### components/RentalManagement.tsx (1,066 lines)
**Purpose**: Bicycle rental management
**Key Features**:
- Rental request management
- Bicycle inventory management
- Photo upload for bicycles
- Pricing configuration

**Admin Actions**:
- Manage rental requests
- Add/edit/delete bicycles
- Upload bicycle photos
- Set rental rates and delivery charges

#### components/CouponManagement.tsx (525 lines)
**Purpose**: Discount coupon system
**Key Features**:
- Coupon creation with validation
- Usage tracking
- Expiration management
- Discount type configuration (percentage/fixed)

#### components/PromotionalCards.tsx (562 lines)
**Purpose**: Home page promotional content
**Key Features**:
- Card creation with images
- External link management
- Display order configuration
- Visibility scheduling

#### components/UserManagement.tsx (307 lines)
**Purpose**: User account management
**Key Features**:
- User list with search/filter
- User profile viewing
- Account status management

### Styling
- **App.css** (4,779 lines): Comprehensive CSS with modern design
- Responsive design principles
- Color scheme matching brand guidelines
- Component-specific styling

---

## API Endpoints Documentation

### Authentication Endpoints (`/api/auth`)

#### POST `/api/auth/send-otp`
- **Purpose**: Send OTP to user's phone
- **Body**: `{ phone: string }`
- **Validation**: 10-digit Indian phone number
- **Response**: `{ success: boolean, message: string, data: { phone, expiresIn } }`
- **Logic**: Generates 6-digit OTP, stores in database with 5-minute expiry

#### POST `/api/auth/verify-otp`
- **Purpose**: Verify OTP and authenticate user
- **Body**: `{ phone: string, otp: string }`
- **Response**: `{ success: boolean, data: { user?, token?, isNewUser: boolean } }`
- **Logic**: Validates OTP, checks if user exists, returns JWT token or registration flag

#### POST `/api/auth/register`
- **Purpose**: Complete user registration
- **Body**: `{ phone, full_name, email, age, pincode, address, profilePhoto? }`
- **Validation**: Email uniqueness, required fields
- **Response**: `{ success: boolean, data: { user, token } }`
- **Logic**: Creates user account, generates JWT token

#### POST `/api/auth/admin/login`
- **Purpose**: Admin authentication
- **Body**: `{ username: string, password: string }`
- **Response**: `{ success: boolean, data: { admin, token } }`
- **Logic**: Verifies credentials against admin table, generates JWT

#### GET `/api/auth/profile`
- **Purpose**: Get current user profile
- **Headers**: `Authorization: Bearer <token>`
- **Response**: User profile data
- **Middleware**: `authenticateToken`, `requireUser`

### Repair Service Endpoints (`/api/repair`)

#### Admin Routes

#### GET `/api/repair/admin/requests`
- **Purpose**: Get all repair requests with pagination
- **Query**: `{ status?, page?, limit? }`
- **Middleware**: `authenticateToken`, `requireAdmin`
- **Response**: Paginated requests with user details, services, and files
- **Logic**: Complex join query with service details and file attachments

#### PATCH `/api/repair/admin/requests/:id/status`
- **Purpose**: Update repair request status
- **Body**: `{ status: 'approved' | 'waiting_payment' | 'active' | 'completed' | 'expired' }`
- **Middleware**: `authenticateToken`, `requireAdmin`
- **Logic**: Updates request status, triggers workflow changes

#### GET `/api/repair/admin/services`
- **Purpose**: Get all repair services
- **Response**: Array of repair services
- **Logic**: Simple query with active services

#### POST `/api/repair/admin/services`
- **Purpose**: Create new repair service
- **Body**: `{ name: string, description?, special_instructions?, price: number }`
- **Validation**: Required name and price
- **Logic**: Inserts new service into database

#### PUT `/api/repair/admin/services/:id`
- **Purpose**: Update existing repair service
- **Body**: Service update data
- **Logic**: Updates service details and pricing

#### DELETE `/api/repair/admin/services/:id`
- **Purpose**: Delete repair service
- **Logic**: Hard delete from database

#### GET/PUT `/api/repair/admin/mechanic-charge`
- **Purpose**: Get/set service mechanic charge
- **Logic**: Global mechanic charge that applies to all repair requests

#### GET/POST/DELETE `/api/repair/admin/time-slots`
- **Purpose**: Manage available time slots
- **Logic**: Time slot configuration for repair scheduling

#### User Routes

#### GET `/api/repair/services`
- **Purpose**: Get available repair services for users
- **Response**: Active repair services with pricing
- **Logic**: Returns only active services

#### GET `/api/repair/time-slots`
- **Purpose**: Get available time slots
- **Response**: Active time slots for scheduling

#### POST `/api/repair/requests`
- **Purpose**: Create repair request
- **Body**: Complete repair request data with services
- **Files**: Images and video uploads via multer
- **Logic**: 
  - Creates repair request with 15-minute expiry
  - Processes service selections
  - Handles file uploads
  - Calculates total pricing

#### GET `/api/repair/requests`
- **Purpose**: Get user's repair requests
- **Middleware**: `authenticateToken`, `requireUser`
- **Response**: User's repair history with status

### Rental Service Endpoints (`/api/rental`)

#### Admin Routes

#### GET `/api/rental/admin/requests`
- **Purpose**: Get all rental requests
- **Query**: `{ status?, page?, limit? }`
- **Response**: Paginated rental requests with bicycle and user details

#### PATCH `/api/rental/admin/requests/:id/status`
- **Purpose**: Update rental request status
- **Body**: `{ status: 'waiting_payment' | 'arranging_delivery' | 'active_rental' | 'completed' | 'expired' }`

#### GET/POST/PUT/DELETE `/api/rental/admin/bicycles`
- **Purpose**: Bicycle inventory management
- **Features**: Photo upload, specifications in JSON format
- **Logic**: CRUD operations with photo handling

#### User Routes

#### GET `/api/rental/bicycles`
- **Purpose**: Get available bicycles for rental
- **Response**: Bicycles with photos and pricing

#### POST `/api/rental/requests`
- **Purpose**: Create rental request
- **Body**: Rental request with bicycle selection and duration
- **Logic**: 
  - Calculates pricing based on duration type
  - Includes delivery charges
  - Sets 15-minute expiry

### Coupon Management (`/api/coupon`)

#### POST `/api/coupon/validate`
- **Purpose**: Validate and apply coupon
- **Body**: `{ code: string, amount: number, type: 'repair' | 'rental' }`
- **Logic**: Validates coupon eligibility and calculates discount

#### Admin Routes for coupon CRUD operations

### Promotional Cards (`/api/promotional`)

#### GET `/api/promotional/cards`
- **Purpose**: Get active promotional cards for app home page
- **Response**: Cards with images and external links

#### Admin Routes for promotional card management

---

## User Flow Analysis

### User Registration & Authentication Flow

1. **App Launch**
   - Check for stored JWT token
   - If valid → Navigate to Home
   - If invalid → Navigate to Login

2. **Phone Authentication**
   - User enters 10-digit phone number
   - System validates format (Indian mobile)
   - OTP generation and mock SMS
   - User enters 6-digit OTP
   - System verifies OTP (5-minute expiry)

3. **New User Registration**
   - If phone not in database → Registration form
   - Required: Full name, email, age, pincode, address
   - Optional: Profile photo
   - Creates user account and JWT token

4. **Existing User Login**
   - If phone in database → Direct login
   - Issues JWT token for session

### Repair Booking Flow

1. **Service Selection**
   - User views available repair services
   - Multi-select services with pricing
   - Real-time total calculation

2. **Request Details**
   - Contact information (auto-filled from profile)
   - Alternate contact number
   - Service address
   - Special notes/instructions

3. **Media Upload**
   - Optional photo upload (max 6 images)
   - Optional video upload (max 1 video)
   - File compression and validation

4. **Scheduling**
   - Date picker for preferred service date
   - Time slot selection from available slots

5. **Payment & Confirmation**
   - Review order summary
   - Apply coupon codes (optional)
   - Select payment method (online/offline)
   - Submit request (15-minute expiry starts)

6. **Admin Processing**
   - Admin reviews request in dashboard
   - Approves/rejects within 15 minutes
   - If approved → Status changes based on payment method
   - If online → "waiting_payment" → payment → "active"
   - If offline → "active" (cash on service)

7. **Service Execution**
   - Mechanic visits at scheduled time
   - Completes repair work
   - Admin marks as "completed"

### Rental Booking Flow

1. **Bicycle Selection**
   - Browse available bicycles with photos
   - View specifications and pricing
   - Select duration type (daily/weekly)

2. **Duration & Delivery**
   - Choose rental duration count
   - Enter delivery address
   - View delivery charges
   - Special instructions

3. **Order Summary & Payment**
   - Review bicycle details and pricing
   - Apply coupons if available
   - Select payment method
   - Submit request (15-minute expiry)

4. **Admin Processing**
   - Admin approves request
   - If online payment → "waiting_payment" → payment → "arranging_delivery"
   - If offline → "arranging_delivery"
   - Once delivered → "active_rental"
   - After rental period → "completed"

### Admin Workflow

1. **Dashboard Overview**
   - View active requests count
   - User statistics
   - Quick access to management sections

2. **Request Management**
   - Filter requests by status
   - View detailed request information
   - Update request status
   - Communicate status changes to users

3. **Catalog Management**
   - Manage repair services (CRUD)
   - Update pricing and descriptions
   - Configure time slots
   - Set mechanic charges

4. **Inventory Management**
   - Add/edit bicycle inventory
   - Upload bicycle photos
   - Set rental rates and delivery charges
   - Manage availability status

5. **Marketing Management**
   - Create promotional cards
   - Manage coupon codes
   - Set discount rules and expiry

---

## Security Implementation

### Authentication Security

1. **JWT Tokens**
   - Signed with secret key from environment variables
   - 7-day expiration (configurable)
   - Role-based access (user/admin)
   - Token validation on protected routes

2. **Password Security**
   - Admin passwords hashed with bcryptjs
   - Salt rounds for additional security
   - No plain text password storage

3. **OTP Security**
   - 6-digit random OTP generation
   - 5-minute expiration window
   - Single-use tokens (marked as used)
   - Phone number validation

### Input Validation

1. **Express Validator**
   - Server-side validation for all inputs
   - Phone number format validation
   - Email format validation
   - Required field validation

2. **File Upload Security**
   - File type validation (images/videos only)
   - File size limits (5MB images, 50MB videos)
   - Sanitized filename generation
   - Upload count limits

### API Security

1. **Middleware Protection**
   - CORS configuration
   - Helmet for security headers
   - Rate limiting (express-rate-limit)
   - Request compression

2. **Route Protection**
   - JWT authentication required for protected routes
   - Role-based authorization (user/admin)
   - Input sanitization

3. **Database Security**
   - Parameterized queries to prevent SQL injection
   - Input validation before database operations
   - Transaction handling for data consistency

---

## File Structure Analysis

### Backend File Organization

```
backend/
├── server.js                 # App entry point (74 lines)
├── package.json              # Dependencies (45 lines)
├── middleware/
│   └── auth.js               # Authentication middleware (54 lines)
├── routes/
│   ├── auth.js               # Authentication routes (642 lines)
│   ├── repair.js             # Repair service routes (891 lines)
│   ├── rental.js             # Rental service routes (850 lines)
│   ├── dashboard.js          # Dashboard routes (505 lines)
│   ├── coupon.js             # Coupon management (262 lines)
│   └── promotional.js        # Promotional cards (426 lines)
├── database/
│   ├── schema.sql            # Database schema (223 lines)
│   ├── setup.js              # Database initialization (300 lines)
│   └── migrations/           # Database migration scripts
└── uploads/                  # File storage directory
    ├── profile-photos/       # User profile images
    ├── repair-requests/      # Repair request media
    └── bicycles/             # Bicycle photos
```

### Mobile App File Organization

```
mobile-app/
├── app/                      # Expo Router screens
│   ├── index.tsx            # App entry (56 lines)
│   ├── login.tsx            # Authentication (712 lines)
│   ├── home.tsx             # Dashboard (886 lines)
│   ├── book-repair.tsx      # Repair booking (1,894 lines)
│   ├── book-rental.tsx      # Rental booking (1,946 lines)
│   ├── my-requests.tsx      # Request history (1,550 lines)
│   ├── profile.tsx          # User profile (921 lines)
│   └── _layout.tsx          # App layout (36 lines)
├── components/              # Reusable components
│   ├── ModernLoginScreen.tsx # Login UI (456 lines)
│   ├── StepIndicator.tsx    # Multi-step progress (230 lines)
│   ├── SplashAnimation.tsx  # Loading animation (313 lines)
│   ├── AuthGuard.tsx        # Route protection (69 lines)
│   └── ui/                  # UI components
├── constants/               # App constants
├── hooks/                   # Custom React hooks
└── assets/                  # Images, fonts, icons
```

### Admin Dashboard File Organization

```
admin-dashboard/
├── src/
│   ├── App.tsx              # Main app (148 lines)
│   ├── App.css              # Comprehensive styling (4,779 lines)
│   ├── index.tsx            # React entry point (20 lines)
│   └── components/
│       ├── Sidebar.tsx      # Navigation (94 lines)
│       ├── DashboardOverview.tsx # Home dashboard (184 lines)
│       ├── RepairManagement.tsx  # Repair admin (1,258 lines)
│       ├── RentalManagement.tsx  # Rental admin (1,066 lines)
│       ├── CouponManagement.tsx  # Coupon system (525 lines)
│       ├── PromotionalCards.tsx  # Marketing (562 lines)
│       └── UserManagement.tsx    # User admin (307 lines)
└── public/                  # Static assets
```

### Code Quality Metrics

**Total Lines of Code**: ~20,000+ lines
- **Backend**: ~3,000 lines
- **Mobile App**: ~7,000 lines  
- **Admin Dashboard**: ~8,000 lines
- **Database Schema**: ~300 lines

**Complexity Analysis**:
- Large components (1,000+ lines) handle complex business logic
- Modular architecture with separation of concerns
- Extensive validation and error handling
- Comprehensive file upload handling

---

## Conclusion

The Cycle-Bees system is a well-architected, full-stack application that successfully implements a bicycle repair and rental service platform. The system demonstrates:

1. **Scalable Architecture**: Modular design with clear separation between frontend, backend, and database layers
2. **Security Best Practices**: JWT authentication, input validation, and secure file handling
3. **User Experience**: Intuitive mobile app with step-by-step flows and real-time updates
4. **Admin Efficiency**: Comprehensive dashboard for business management
5. **Offline-First Design**: SQLite database and mock services for development and testing
6. **Modern Tech Stack**: Latest versions of React, React Native, and Node.js

The system is production-ready for the offline development phase and can be easily migrated to cloud services (Supabase, Twilio, Razorpay) for live deployment.