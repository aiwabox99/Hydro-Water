# Hydro Customer Mobile App

A React Native mobile application for customers to order purified water delivery in South Africa.

## Features

- **User Registration**: Phone/email registration with OTP verification
- **Address Management**: GPS-enabled address management
- **Water Ordering**: One-time and subscription-based orders
- **Payment Integration**: Yoco payment gateway and cash on delivery
- **Order Tracking**: Real-time order and delivery tracking
- **Subscription Management**: Flexible subscription plans
- **Push Notifications**: Order updates and delivery notifications
- **Multi-language Support**: English and Afrikaans support

## Technology Stack

- **Framework**: React Native with Expo
- **Navigation**: Expo Router
- **UI Components**: React Native Paper
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Storage**: AsyncStorage
- **Maps**: React Native Maps
- **Notifications**: Expo Notifications
- **Camera**: Expo Camera & Image Picker

## Installation

1. **Install dependencies**:
   ```bash
   cd hydro-mobile-customer
   npm install
   ```

2. **Install Expo CLI** (if not already installed):
   ```bash
   npm install -g @expo/cli
   ```

3. **Start the development server**:
   ```bash
   npx expo start
   ```

4. **Run on device/simulator**:
   - **iOS**: `npx expo start --ios`
   - **Android**: `npx expo start --android`
   - **Web**: `npx expo start --web`

## App Structure

### Navigation Structure
```
App
├── Auth Flow
│   ├── Welcome/Onboarding
│   ├── Registration
│   ├── OTP Verification
│   └── Login
└── Main App (Tabs)
    ├── Home
    ├── Orders
    ├── Subscriptions
    └── Profile
```

### Key Features

#### User Authentication
- **Registration**: Phone or email with OTP verification
- **Login**: Secure authentication with JWT tokens
- **Profile Management**: Update personal information

#### Address Management
- **GPS Integration**: Automatic location detection
- **Multiple Addresses**: Save home, work, and other addresses
- **Address Validation**: Ensure accurate delivery locations

#### Water Ordering
- **Product Selection**: Choose water volume (20L minimum)
- **Pricing**: R1.20 per liter, no delivery fee
- **Payment Options**: Yoco card payments or cash on delivery
- **Order Scheduling**: Choose delivery time slots

#### Subscription Management
- **Flexible Plans**: Weekly, bi-weekly, or monthly deliveries
- **Subscription Control**: Pause, resume, or cancel subscriptions
- **Automated Billing**: Recurring payment processing

#### Order Tracking
- **Real-time Updates**: Live order status updates
- **Driver Tracking**: See driver location on map
- **Delivery Confirmation**: Photo confirmation of delivery

#### Push Notifications
- **Order Updates**: Status changes and delivery notifications
- **Subscription Reminders**: Upcoming delivery notifications
- **Promotional Offers**: Special deals and discounts

## API Integration

The app communicates with the Node.js backend:

- **Base URL**: Configurable API endpoint
- **Authentication**: JWT token-based authentication
- **Error Handling**: Comprehensive error handling with user feedback
- **Offline Support**: Basic offline functionality

## Configuration

### Environment Variables
Create a `.env` file in the root directory:
```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### App Configuration
The app is configured via `app.json`:
- **App Name**: Hydro Water
- **Bundle ID**: com.hydropurified.customer
- **Permissions**: Location, Camera, Notifications
- **Splash Screen**: Hydro branding

## Styling

The app uses a consistent design system:

- **Colors**: Hydro brand blue (#007BFF) theme
- **Typography**: System fonts with proper scaling
- **Components**: React Native Paper components
- **Responsive**: Adaptive layouts for different screen sizes

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Client-side validation for all forms
- **Secure Storage**: Encrypted storage for sensitive data
- **API Security**: HTTPS communication with backend

## Development

### Project Structure
```
hydro-mobile-customer/
├── app/
│   ├── (tabs)/
│   ├── auth/
│   └── _layout.js
├── components/
├── contexts/
├── services/
├── assets/
└── package.json
```

### Key Components
- **AuthContext**: Authentication state management
- **Navigation**: Tab-based navigation with Expo Router
- **API Services**: Centralized API communication
- **UI Components**: Reusable component library

## Building for Production

### Android
1. **Configure app signing**:
   ```bash
   expo build:android
   ```

2. **Generate APK**:
   ```bash
   expo build:android -t apk
   ```

### iOS
1. **Configure certificates**:
   ```bash
   expo build:ios
   ```

2. **Submit to App Store**:
   ```bash
   expo upload:ios
   ```

## Testing

### Running Tests
```bash
npm test
```

### Device Testing
- Use Expo Go app for quick testing
- Test on multiple device sizes
- Verify GPS and camera functionality

## Deployment

### Expo Application Services (EAS)
1. **Install EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```

2. **Configure EAS**:
   ```bash
   eas build:configure
   ```

3. **Build for stores**:
   ```bash
   eas build --platform all
   ```

### Over-the-Air Updates
```bash
expo publish
```

## Features Roadmap

- [ ] Offline order queuing
- [ ] Social sharing features
- [ ] Loyalty program integration
- [ ] Advanced analytics
- [ ] Voice ordering
- [ ] AR water level detection

## Support

For technical support or app-related questions, please contact our support team or refer to the main project documentation.

## License

This project is part of the Hydro Purified Water delivery system. All rights reserved.