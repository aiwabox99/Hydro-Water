# Hydro Purified Water Backend API

A comprehensive Node.js/Express backend API for the Hydro Purified Water delivery system, designed for the South African market.

## 🚀 Features

- **Customer Management**: Registration, OTP verification, profile management
- **Order Processing**: One-time and subscription orders with Yoco payment integration
- **Driver Management**: Route optimization, delivery tracking, performance monitoring
- **Inventory Management**: Stock tracking with low-stock alerts
- **Analytics**: Comprehensive business intelligence and reporting
- **Admin Panel**: Full administrative control with JWT authentication
- **Automated Invoicing**: SendGrid email integration
- **Subscription Automation**: Cron job-based recurring order generation

## 🛠️ Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js (v4.18.2)
- **Database**: PostgreSQL with UUID support
- **Authentication**: JWT tokens, bcrypt password hashing
- **Payments**: Yoco payment gateway integration
- **SMS**: Twilio for OTP verification
- **Email**: SendGrid for automated invoicing
- **Maps**: Google Maps API for route optimization
- **Scheduling**: node-cron for automated tasks
- **Validation**: express-validator for input validation
- **Security**: helmet, cors, rate limiting

## 📋 Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn package manager

## 🔧 Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd hydro-backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```

4. **Configure your `.env` file**:
   ```env
   # Database Configuration
   DATABASE_URL=postgresql://user:password@localhost:5432/hydro_db
   
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   JWT_SECRET=your_jwt_secret_key_here
   
   # Yoco Payment Configuration
   YOCO_SECRET_KEY=sk_test_YOUR_YOCO_SECRET_KEY
   YOCO_PUBLIC_KEY=pk_test_YOUR_YOCO_PUBLIC_KEY
   
   # Twilio SMS Configuration
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_PHONE_NUMBER=your_twilio_phone_number
   
   # Google Maps Configuration
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   
   # SendGrid Email Configuration
   SENDGRID_API_KEY=your_sendgrid_api_key
   SENDGRID_FROM_EMAIL=invoices@hydropurified.co.za
   
   # App Configuration
   WATER_PRICE_PER_LITER=1.20
   MINIMUM_ORDER_VOLUME=20
   LOW_STOCK_THRESHOLD=200
   ```

5. **Set up the database**:
   ```bash
   # Create database
   createdb hydro_db
   
   # Run schema
   psql -d hydro_db -f database/schema.sql
   ```

6. **Start the server**:
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication
Most admin endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Endpoints Overview

#### Customer Management
- `POST /customers/register` - Register new customer
- `POST /customers/verify-otp` - Verify OTP
- `POST /customers/resend-otp` - Resend OTP
- `GET /customers` - Get all customers (admin)
- `GET /customers/:id` - Get customer by ID
- `PUT /customers/:id` - Update customer

#### Address Management
- `POST /addresses` - Add new address
- `GET /addresses` - Get customer addresses
- `GET /addresses/:id` - Get specific address
- `PUT /addresses/:id` - Update address
- `DELETE /addresses/:id` - Delete address

#### Order Management
- `POST /orders` - Create new order
- `GET /orders` - Get orders with filters
- `GET /orders/:id` - Get specific order
- `PATCH /orders/:id` - Update order
- `POST /orders/:id/pay` - Process payment
- `GET /orders/:id/track` - Track order

#### Subscription Management
- `POST /subscriptions` - Create subscription
- `GET /subscriptions` - Get subscriptions
- `GET /subscriptions/:id` - Get specific subscription
- `PATCH /subscriptions/:id` - Update subscription
- `DELETE /subscriptions/:id` - Cancel subscription
- `GET /subscriptions/:id/orders` - Get subscription orders

#### Driver Management
- `POST /drivers` - Create driver (admin)
- `GET /drivers` - Get all drivers
- `GET /drivers/:id` - Get specific driver
- `PUT /drivers/:id` - Update driver
- `POST /drivers/:id/location` - Update driver location
- `GET /drivers/:driver_id/orders` - Get driver orders
- `POST /drivers/:order_id/confirm` - Confirm delivery
- `POST /drivers/login` - Driver login

#### Route Optimization
- `POST /routes/optimize` - Optimize delivery route
- `GET /routes/:id` - Get specific route
- `PATCH /routes/:id` - Update route status
- `GET /routes` - Get all routes (admin)
- `POST /routes/:id/start` - Start route

#### Inventory Management
- `GET /inventory` - Get current inventory
- `POST /inventory` - Update inventory
- `POST /inventory/add` - Add to inventory
- `GET /inventory/history` - Get inventory history
- `GET /inventory/alerts` - Get low stock alerts
- `GET /inventory/stats` - Get inventory statistics

#### Invoicing
- `POST /invoices` - Send invoice
- `GET /invoices` - Get all invoices
- `GET /invoices/:id` - Get specific invoice
- `POST /invoices/:id/resend` - Resend invoice
- `GET /invoices/stats/summary` - Get invoice statistics

#### Analytics
- `GET /analytics/orders` - Order analytics
- `GET /analytics/subscriptions` - Subscription analytics
- `GET /analytics/drivers` - Driver analytics
- `GET /analytics/inventory` - Inventory analytics
- `GET /analytics/revenue` - Revenue analytics
- `GET /analytics/dashboard` - Dashboard summary

#### Admin Management
- `POST /admin/login` - Admin login
- `POST /admin/create` - Create admin user
- `GET /admin/profile` - Get admin profile
- `GET /admin/users` - Get all admin users
- `PUT /admin/users/:id` - Update admin user
- `POST /admin/change-password` - Change password
- `GET /admin/dashboard` - Admin dashboard
- `GET /admin/system-info` - System information

## 🔄 Automated Tasks (Cron Jobs)

The system includes several automated tasks:

### Weekly Subscription Processing
- **Schedule**: Every Monday at 00:00 (Africa/Johannesburg)
- **Function**: Processes all active subscriptions due for delivery
- **Actions**: Creates orders, updates inventory, calculates next delivery dates

### Daily Maintenance
- **OTP Cleanup**: Daily at 02:00 - Removes expired OTP records
- **Driver Status Update**: Daily at 03:00 - Resets busy drivers to active
- **Daily Summary**: Daily at 23:00 - Generates daily performance report

### Hourly Checks
- **Subscription Monitoring**: Checks for due subscriptions every hour
- **Stock Alerts**: Monitors inventory levels and logs warnings

## 🔒 Security Features

- **JWT Authentication**: Secure admin panel access
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: API request throttling
- **Input Validation**: Comprehensive request validation
- **CORS Protection**: Configurable cross-origin policies
- **Helmet Security**: HTTP security headers
- **SQL Injection Prevention**: Parameterized queries

## 📊 Database Schema

### Core Tables
- **customers**: Customer information and verification status
- **addresses**: Delivery addresses with GPS coordinates
- **orders**: Order tracking and management
- **subscriptions**: Recurring delivery subscriptions
- **drivers**: Driver profiles and status
- **driver_routes**: Optimized delivery routes
- **inventory**: Stock level tracking
- **invoices**: Invoice generation and delivery
- **admin_users**: Administrative user management
- **otp_verifications**: OTP verification records

### Key Relationships
- Customers have multiple addresses
- Orders belong to customers and addresses
- Subscriptions generate recurring orders
- Drivers are assigned to orders and routes
- Invoices are generated for completed orders

## 🧪 Testing

### Manual Testing
Test the API endpoints using tools like Postman or curl:

```bash
# Health check
curl http://localhost:3000/health

# Customer registration
curl -X POST http://localhost:3000/api/customers/register \
  -H "Content-Type: application/json" \
  -d '{"phone": "+27123456789", "email": "test@example.com", "name": "Test User"}'

# Admin login
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

### Default Credentials
- **Admin**: username: `admin`, password: `admin123`
- **Driver**: phone: `+27123456789`, password: `driver123`

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Environment Setup
- Set `NODE_ENV=production`
- Configure production database URL
- Set up SSL certificates
- Configure production API keys
- Set up monitoring and logging

### Recommended Deployment Stack
- **Server**: AWS EC2 or DigitalOcean Droplet
- **Database**: AWS RDS PostgreSQL
- **Load Balancer**: AWS ALB or Nginx
- **Process Manager**: PM2
- **Monitoring**: CloudWatch or DataDog

## 📈 Performance Optimization

### Database Optimization
- Indexed frequently queried columns
- Connection pooling configured
- Query optimization for large datasets
- Automated cleanup of old records

### API Performance
- Request rate limiting
- Response compression
- Efficient pagination
- Caching strategies for static data

### Monitoring
- Health check endpoint (`/health`)
- Performance logging
- Error tracking
- Database query monitoring

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check DATABASE_URL configuration
   - Verify PostgreSQL service is running
   - Ensure database exists and schema is applied

2. **API Key Errors**
   - Verify all third-party API keys in .env
   - Check API key permissions and quotas
   - Ensure correct environment (test/production)

3. **Cron Job Issues**
   - Check server timezone configuration
   - Verify database connectivity for scheduled tasks
   - Monitor cron job logs for errors

### Debugging
- Enable detailed logging in development
- Check console output for cron job execution
- Monitor database query performance
- Use health check endpoint for system status

## 📞 Support

For technical support or questions:
- Email: support@hydropurified.co.za
- Documentation: Check API endpoint responses for detailed error messages
- Logs: Monitor console output for detailed error information

## 📄 License

This project is proprietary software for Hydro Purified Water delivery system.

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Environment**: South Africa (ZAR currency, Africa/Johannesburg timezone)