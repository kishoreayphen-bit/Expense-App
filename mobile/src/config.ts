import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Default backend URL configuration
const getDefaultApiUrl = () => {
  // In development, use localhost with platform-specific IP
  if (__DEV__) {
    // For physical devices, use your computer's local IP address
    // For emulator/simulator, use the emulator-specific address
    const isPhysicalDevice = !Constants.isDevice || Constants.isDevice;
    
    if (Platform.OS === 'android') {
      // Android Emulator: Use 10.0.2.2 (maps to host's localhost)
      // For physical device, use: http://10.111.29.25:18080
      return 'http://10.0.2.2:18080';  // Android Emulator special IP
    } else {
      // iOS Simulator: Use localhost
      // For physical device, use: http://10.111.29.25:18080
      return 'http://localhost:18080';
    }
  }
  
  // In production, use the production API URL
  return 'https://api.expenseapp.com';
};

// Get the API URL from environment variables or use the default
const API_URL = Constants.expoConfig?.extra?.apiUrl || getDefaultApiUrl();

// Configuration object
export default {
  // API Configuration
  api: {
    baseUrl: API_URL,
    timeout: 15000, // 15 seconds
    endpoints: {
      auth: {
        login: '/api/v1/auth/login',
        refresh: '/api/v1/auth/refresh',
        logout: '/api/v1/auth/logout',
      },
      user: {
        profile: '/api/v1/users/me',
      },
      expenses: {
        list: '/api/v1/expenses',
        create: '/api/v1/expenses',
        get: (id: string) => `/api/v1/expenses/${id}`,
        update: (id: string) => `/api/v1/expenses/${id}`,
        delete: (id: string) => `/api/v1/expenses/${id}`,
      },
    },
  },
  
  // Feature Flags
  features: {
    enableAnalytics: !__DEV__, // Disable analytics in development
    enableCrashReporting: !__DEV__, // Disable crash reporting in development
  },
  
  // App Settings
  app: {
    name: 'Expense Tracker',
    version: Constants.expoConfig?.version || '1.0.0',
    environment: __DEV__ ? 'development' : 'production',
  },
  
  // Logging
  logging: {
    level: __DEV__ ? 'debug' : 'error',
    enableNetworkLogs: true,
  },
  
  // Local Storage Keys
  storageKeys: {
    authToken: 'auth_token',
    refreshToken: 'refresh_token',
    userProfile: 'user_profile',
    settings: 'app_settings',
  },
};
