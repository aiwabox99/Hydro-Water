# Hydro Admin Panel

A modern React-based admin panel for managing the Hydro Purified Water delivery system.

## Features

- **Dashboard**: Real-time analytics and key metrics
- **Customer Management**: View and manage customer accounts
- **Order Management**: Track and manage water delivery orders
- **Subscription Management**: Handle recurring delivery subscriptions
- **Driver Management**: Manage delivery drivers and routes
- **Route Optimization**: Optimize delivery routes with Google Maps
- **Inventory Management**: Track water stock levels with alerts
- **Analytics**: Comprehensive business intelligence and reporting
- **Invoice Management**: Automated invoice generation via SendGrid

## Technology Stack

- **Frontend**: React 18 with modern hooks
- **Styling**: Tailwind CSS with custom design system
- **Charts**: Chart.js with react-chartjs-2
- **HTTP Client**: Axios with interceptors
- **Routing**: React Router v6
- **State Management**: React Context API
- **Notifications**: React Hot Toast
- **Icons**: Heroicons and Lucide React

## Installation

1. **Install dependencies**:
   ```bash
   cd hydro-admin
   npm install
   ```

2. **Environment Configuration**:
   Create a `.env` file in the root directory:
   ```env
   REACT_APP_API_URL=http://localhost:3000/api
   ```

3. **Start the development server**:
   ```bash
   npm start
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

## Usage

### Default Login Credentials
- Username: `admin`
- Password: `admin123`

### Key Features

#### Dashboard
- Real-time metrics (orders, customers, revenue)
- Interactive charts for orders and revenue trends
- Low stock alerts
- Recent activity feed

#### Customer Management
- View all registered customers
- Customer profile details
- Order history per customer
- Registration analytics

#### Order Management
- View all orders with filtering
- Order status tracking
- Driver assignment
- Payment status monitoring

#### Subscription Management
- Active subscription monitoring
- Subscription modification
- Automated billing management
- Cancellation handling

#### Driver Management
- Driver registration and profiles
- Route assignment
- Performance tracking
- Delivery confirmation

#### Inventory Management
- Current stock levels
- Low stock alerts (< 200L threshold)
- Stock addition/removal
- Inventory history

#### Analytics
- Business intelligence dashboard
- Revenue analytics
- Customer acquisition metrics
- Order trend analysis

## API Integration

The admin panel communicates with the Node.js backend via REST APIs:

- **Authentication**: JWT-based admin authentication
- **Real-time Updates**: Polling for live data updates
- **Error Handling**: Comprehensive error handling with user feedback
- **Loading States**: Loading indicators for better UX

## Styling

The application uses a custom design system built on Tailwind CSS:

- **Colors**: Hydro brand blue (#007BFF) primary theme
- **Typography**: Inter font family
- **Components**: Reusable component classes
- **Responsive**: Mobile-first responsive design
- **Accessibility**: WCAG compliant color contrasts

## Security Features

- JWT token-based authentication
- Automatic token refresh
- Role-based access control
- Input validation
- XSS protection

## Development

### Project Structure
```
hydro-admin/
├── src/
│   ├── components/
│   │   └── Layout/
│   ├── contexts/
│   ├── pages/
│   ├── services/
│   └── styles/
├── public/
└── package.json
```

### Key Components
- **AuthContext**: Authentication state management
- **Layout**: Sidebar and header components
- **Dashboard**: Main analytics dashboard
- **API Services**: Centralized API communication

## Deployment

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Deploy to web server**:
   - Upload the `build` folder to your web server
   - Configure your web server to serve the React app
   - Ensure the backend API is accessible

## Support

For technical support or questions about the admin panel, please refer to the main project documentation or contact the development team.

## License

This project is part of the Hydro Purified Water delivery system. All rights reserved.