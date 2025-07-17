# Hydro Purified Water Delivery System

A complete water delivery management system built for the South African market, featuring customer mobile apps, driver mobile apps, admin web panel, and backend infrastructure.

## 🚀 Project Overview

This is a comprehensive water delivery platform that includes:

- **Customer Mobile App** (React Native) - For ordering water delivery
- **Driver Mobile App** (React Native) - For managing deliveries
- **Admin Web Panel** (React) - For business management
- **Backend API** (Node.js/Express) - Core business logic and integrations

## 💧 Key Features

### For Customers
- **Easy Registration**: Phone/email with OTP verification
- **Address Management**: GPS-enabled multiple address support
- **Flexible Ordering**: One-time orders and subscriptions
- **Multiple Payment Options**: Yoco payments and cash on delivery
- **Real-time Tracking**: Live order and driver tracking
- **Subscription Management**: Weekly, bi-weekly, monthly plans

### For Drivers
- **Order Management**: View assigned deliveries
- **Route Optimization**: Google Maps integration
- **Payment Processing**: Khumo/Neo Touch device integration
- **Delivery Confirmation**: Photo confirmation system
- **Performance Tracking**: Delivery metrics and ratings

### For Administrators
- **Dashboard Analytics**: Real-time business metrics
- **Customer Management**: User accounts and profiles
- **Order Management**: Track all orders and payments
- **Driver Management**: Driver registration and performance
- **Inventory Management**: Stock tracking with alerts
- **Route Optimization**: Efficient delivery planning
- **Financial Reporting**: Revenue and payment analytics

## 🛠 Technology Stack

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with UUID support
- **Authentication**: JWT tokens
- **Payments**: Yoco payment gateway
- **SMS**: Twilio for OTP verification
- **Email**: SendGrid for invoicing
- **Maps**: Google Maps API for routing
- **Scheduling**: Cron jobs for automation

### Frontend (Admin Panel)
- **Framework**: React 18
- **Styling**: Tailwind CSS
- **Charts**: Chart.js with react-chartjs-2
- **HTTP Client**: Axios
- **Routing**: React Router v6
- **State Management**: React Context API
- **Notifications**: React Hot Toast

### Mobile Apps
- **Framework**: React Native with Expo
- **Navigation**: Expo Router
- **UI Components**: React Native Paper
- **Maps**: React Native Maps
- **Storage**: AsyncStorage
- **Notifications**: Expo Notifications
- **Camera**: Expo Camera & Image Picker

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Hydro Delivery System                    │
├─────────────────────────────────────────────────────────────┤
│  Customer App     │  Driver App      │  Admin Panel        │
│  (React Native)   │  (React Native)  │  (React)           │
├─────────────────────────────────────────────────────────────┤
│                    Backend API (Node.js)                    │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL  │  Yoco    │  Twilio   │  SendGrid  │  Google │
│  Database    │  Payment │  SMS      │  Email     │  Maps   │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Project Structure

```
hydro-delivery-system/
├── hydro-backend/              # Node.js backend API
│   ├── config/                 # Database and service configs
│   ├── database/              # PostgreSQL schema and migrations
│   ├── routes/                # API endpoints
│   ├── jobs/                  # Cron job automation
│   └── server.js              # Main server file
├── hydro-admin/               # React admin panel
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── contexts/          # React contexts
│   │   ├── pages/             # Page components
│   │   └── services/          # API services
│   └── package.json
├── hydro-mobile-customer/     # React Native customer app
│   ├── app/                   # Expo Router pages
│   ├── components/            # Mobile UI components
│   ├── contexts/              # App state management
│   └── services/              # API services
├── hydro-mobile-driver/       # React Native driver app
│   ├── app/                   # Expo Router pages
│   ├── components/            # Mobile UI components
│   └── services/              # API services
└── README.md                  # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn
- Expo CLI (for mobile apps)

### 1. Backend Setup

```bash
# Navigate to backend directory
cd hydro-backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Set up database
psql -U postgres -c "CREATE DATABASE hydro_delivery;"
psql -U postgres -d hydro_delivery -f database/schema.sql

# Start the server
npm start
```

### 2. Admin Panel Setup

```bash
# Navigate to admin directory
cd hydro-admin

# Install dependencies
npm install

# Set up environment variables
echo "REACT_APP_API_URL=http://localhost:3000/api" > .env

# Start development server
npm start
```

### 3. Mobile Apps Setup

```bash
# Customer app
cd hydro-mobile-customer
npm install
npx expo start

# Driver app (in another terminal)
cd hydro-mobile-driver
npm install
npx expo start
```

## 💰 Pricing & Business Model

### Water Pricing
- **Rate**: R1.20 per liter
- **Minimum Order**: 20 liters (R24.00)
- **Delivery**: Free delivery
- **Currency**: South African Rand (ZAR)

### Payment Options
- **Yoco Card Payments**: 2.55%-3.4% transaction fees
- **Cash on Delivery**: No additional fees
- **Subscription Billing**: Automated recurring payments

### Service Fees
- **Twilio SMS**: R0.75 per OTP message
- **SendGrid Email**: R225/month for invoicing
- **Payment Devices**: Khumo (R1,299) or Neo Touch (R999) + R49/month

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/hydro_delivery

# JWT
JWT_SECRET=your-jwt-secret-key

# Twilio
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-phone

# Yoco
YOCO_SECRET_KEY=your-yoco-secret-key

# SendGrid
SENDGRID_API_KEY=your-sendgrid-api-key

# Google Maps
GOOGLE_MAPS_API_KEY=your-google-maps-key
```

#### Admin Panel (.env)
```env
REACT_APP_API_URL=http://localhost:3000/api
```

#### Mobile Apps (.env)
```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
```

## 📊 Database Schema

The system uses PostgreSQL with the following key tables:

- **customers**: User accounts and profiles
- **addresses**: GPS-enabled delivery addresses
- **orders**: Order management and tracking
- **subscriptions**: Recurring delivery plans
- **drivers**: Driver profiles and availability
- **driver_routes**: Route optimization data
- **inventory**: Water stock management
- **invoices**: Billing and payment records
- **admin_users**: Administrative access

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **Input Validation**: Comprehensive validation on all inputs
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS Protection**: Cross-origin request security
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Input sanitization

## 📱 Mobile App Features

### Customer App
- User-friendly water ordering interface
- GPS-enabled address management
- Real-time order tracking
- Subscription management
- Payment integration
- Push notifications

### Driver App
- Order assignment and management
- Route optimization
- Payment collection
- Delivery confirmation
- Performance tracking

## 🌍 Deployment

### Backend Deployment
- Deploy to cloud providers (AWS, Google Cloud, Azure)
- Use PM2 for process management
- Configure PostgreSQL database
- Set up SSL certificates

### Admin Panel Deployment
- Build for production: `npm run build`
- Deploy to web hosting (Netlify, Vercel, etc.)
- Configure environment variables

### Mobile App Deployment
- Use Expo Application Services (EAS)
- Submit to Google Play Store and Apple App Store
- Configure over-the-air updates

## 📈 Analytics & Reporting

The system provides comprehensive analytics:

- **Order Analytics**: Daily, weekly, monthly order trends
- **Revenue Analytics**: Financial performance tracking
- **Customer Analytics**: User acquisition and retention
- **Driver Analytics**: Performance and efficiency metrics
- **Inventory Analytics**: Stock level optimization
- **Subscription Analytics**: Recurring revenue tracking

## 🔄 Automation Features

- **Subscription Processing**: Automated Monday 00:00 cron jobs
- **Inventory Alerts**: Low stock notifications (<200L)
- **Invoice Generation**: Automated SendGrid email invoices
- **Route Optimization**: Google Maps route planning
- **Payment Processing**: Automated Yoco payment handling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For technical support or questions:
- Check the individual README files in each directory
- Review the API documentation
- Contact the development team

## 📄 License

This project is proprietary software for Hydro Purified Water delivery system. All rights reserved.

---

**Built with ❤️ for the South African water delivery market**
