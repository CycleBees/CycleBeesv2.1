# Cycle-Bees

A modern bicycle repair and rental service application with offline-first architecture.

## 🚲 Project Overview

Cycle-Bees is a comprehensive platform that connects users with bicycle repair services and rental options. The application features:

- **User Mobile App**: React Native with Expo for booking repairs and rentals
- **Admin Dashboard**: React web application for managing requests and inventory
- **Backend API**: Express.js server with local database and mock services

## 🎨 Color Scheme

- Primary Yellow: `#FFD11E`
- Dark Blue: `#2D3E50`
- Light Yellow: `#FBE9A0`
- Cream: `#FFF5CC`
- Dark Brown: `#2F2500`
- Dark Green: `#2B2E00`
- Gray: `#4A4A4A`

## 🏗️ Architecture

### Offline-First MVP Approach
1. **Local Database**: PostgreSQL/SQLite with future Supabase migration
2. **Mock Services**: OTP generation, payment simulation, file storage
3. **Local Development**: All services run locally for testing
4. **Cloud Migration**: Easy transition to cloud services later

## 📁 Project Structure

```
cycle-bees/
├── backend/           # Express.js API server
├── admin-dashboard/   # React admin web application
├── mobile-app/        # React Native Expo app
├── database/          # Database schemas and migrations
└── docs/             # Documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- PostgreSQL (optional, SQLite for development)
- Expo CLI (for mobile development)

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd cycle-bees
   npm run install-all
   ```

2. **Setup database:**
   ```bash
   npm run setup-db
   ```

3. **Start all services:**
   ```bash
   npm run dev
   ```

### Individual Services

- **Backend API**: `npm run server` (runs on http://localhost:3000)
- **Admin Dashboard**: `npm run admin` (runs on http://localhost:3001)
- **Mobile App**: `npm run mobile` (Expo development server)

## 🔧 Development

### Backend (Express.js)
- Local database with PostgreSQL/SQLite
- JWT authentication for users and admin
- Mock OTP generation and payment processing
- File upload handling with multer
- Request expiration handling

### Admin Dashboard (React)
- Modern UI with the specified color scheme
- Sidebar navigation with sections for:
  - Repair request management
  - Rental request management
  - Bicycle inventory management
  - Coupon management
  - Home page cards system
  - Dashboard analytics

### Mobile App (React Native + Expo)
- Phone OTP authentication
- User registration flow
- Repair booking with multi-step process
- Rental booking with bicycle catalog
- Request tracking and status updates
- Image/video upload capabilities

## 📊 Database Schema

### Core Entities
- **Users**: Phone-based authentication, profile information
- **Admin**: Fixed credentials, dashboard access
- **Repair Services**: Service catalog with pricing
- **Bicycles**: Rental inventory with specifications
- **Repair Requests**: User repair bookings with status tracking
- **Rental Requests**: User rental bookings with delivery tracking
- **Coupons**: Discount system for purchasable items
- **Promotional Cards**: Home page content management

## 🔐 Authentication

### User Authentication
- Phone number validation (10-digit Indian numbers)
- OTP generation and verification (mock for development)
- JWT token-based sessions
- Profile creation for new users

### Admin Authentication
- Fixed username/password system
- JWT token-based sessions
- Dashboard access control

## 💳 Payment System

### Mock Payment Integration
- Online payment simulation
- Offline cash payment option
- Payment status tracking
- Future Razorpay integration ready

## 📱 Features

### User Features
- Phone OTP login/signup
- Repair service booking
- Bicycle rental booking
- Request tracking
- Image/video upload
- Coupon application
- Payment processing

### Admin Features
- Request management (repair & rental)
- Inventory management
- Coupon creation and management
- Promotional content management
- Analytics dashboard
- User management

## 🚀 Deployment

### Development
- All services run locally
- Mock services for testing
- Local database for data persistence

### Production (Future)
- Supabase for database and auth
- Twilio for OTP services
- Razorpay for payments
- Vercel/Heroku for backend deployment
- Expo EAS for mobile app builds

## 📝 License

MIT License - see LICENSE file for details 