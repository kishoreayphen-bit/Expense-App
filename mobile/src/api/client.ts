import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosHeaders, RawAxiosRequestHeaders } from 'axios';
import AppConfig from '../config';
import * as SecureStore from 'expo-secure-store';
import { CommonActions } from '@react-navigation/native';
import { navigationRef, isNavigationReady, safeResetToLogin } from '../navigation/navigationRef';
import { Buffer } from 'buffer';

type ApiError = Error & {
  status?: number;
  isAuthError?: boolean;
  originalError?: any;
  code?: string;
};

// Base URL configuration - This will be overridden by the AuthContext
// Docker compose exposes backend on host port 18080 by default
// For Android Emulator: Use 10.0.2.2 (maps to host's localhost)
// For physical devices: Use your computer's local IP (e.g., http://10.111.29.25:18080)
let API_BASE_URL = 'http://10.0.2.2:18080'; // Android Emulator special IP
// Active company id for scoping; set via CompanyContext
let CURRENT_COMPANY_ID: number | null = null;

export const setActiveCompanyIdForApi = (id: number | null) => {
  CURRENT_COMPANY_ID = id;
};

// Extend AxiosRequestConfig to include custom properties
declare module 'axios' {
  export interface AxiosRequestConfig {
    _retry?: boolean;
    _skipAuthRefresh?: boolean;
    [key: string]: any; // Allow any other custom properties
  }
}

// Create axios instance with proper type for headers
const api = axios.create({
  baseURL: API_BASE_URL, // Don't add /api here to prevent duplication
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // Only treat 2xx as success so 401/403 bubble into the error interceptor (for refresh)
  validateStatus: (status) => status >= 200 && status < 300,
}) as AxiosInstance & { setBaseUrl?: (url: string) => void };

// Function to set base URL
api.setBaseUrl = (url: string) => {
  try {
    if (!url) {
      console.warn('[API] No URL provided to setBaseUrl');
      return;
    }
    
    // Remove any trailing slashes
    let cleanUrl = url.trim();
    if (cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.slice(0, -1);
    }
    
    // Remove any /api suffix to prevent duplication
    if (cleanUrl.endsWith('/api')) {
      cleanUrl = cleanUrl.slice(0, -4);
    }
    
    // Add http:// if no protocol is specified
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `http://${cleanUrl}`;
    }
    
    API_BASE_URL = cleanUrl;
    api.defaults.baseURL = cleanUrl;
    
    console.log('[API] Base URL set to:', {
      originalUrl: url,
      cleanUrl,
      finalUrl: api.defaults.baseURL
    });
  } catch (error) {
    console.error('[API] Error setting base URL:', error);
    throw error;
  }
};

// Request interceptor to add auth token and ensure proper headers
api.interceptors.request.use(
  async (config) => {
    // Ensure headers object exists and is properly typed
    const headers = config.headers || {};
    
    // Set Content-Type to application/json for all non-form-data requests
    const isFormData = config.data instanceof FormData;
    if (!isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    
    // Ensure Accept header is set
    if (!headers['Accept']) {
      headers['Accept'] = 'application/json';
    }
    
    // Update config with typed headers
    config.headers = headers as any; // Cast to any to avoid TypeScript errors

    // Create a clean config object for logging (without sensitive data)
    const logConfig = {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      params: config.params,
      data: config.data ? (isFormData ? '[FormData]' : JSON.stringify(config.data)) : 'no data',
      headers: config.headers
    };

    // Skip logging for auth and token refresh requests to reduce noise
    const isAuthRequest = config.url?.includes('/auth/') || config.url?.includes('/token/refresh');
    
    if (!isAuthRequest && AppConfig.logging.enableNetworkLogs) {
      console.log(`[API] Request: ${config.method?.toUpperCase()} ${config.url}`, logConfig);
    }

    // Skip auth header for login/refresh endpoints
    if (config.url?.includes('/auth/') || config.url?.startsWith('/public/')) {
      if (AppConfig.logging.enableNetworkLogs) {
        console.log('[API] Skipping auth header for:', config.url);
      }
      return config;
    }

    try {
      // Get the auth token
      const token = await getAuthToken();
      
      if (!token) {
        console.warn('[API] No auth token found, request will be unauthenticated');
        // Optionally redirect to login here if needed
        // await clearAuthTokens();
        // navigationRef.current?.dispatch(
        //   CommonActions.reset({
        //     index: 0,
        //     routes: [{ name: 'Login' }],
        //   })
        // );
        return config;
      }
      
      // Log token for debugging (only first few characters for security)
      if (AppConfig.logging.enableNetworkLogs) {
        console.log(`[API] Adding token to request: Bearer ${token.substring(0, 10)}...`);
      }
      
      // Create new headers with proper type
      const extra: Record<string,string> = { 'Authorization': `Bearer ${token}` };
      
      // Add X-User-Id from token payload for user-scoped queries
      try {
        const parts = token.split('.');
        if (parts.length >= 2) {
          const payload = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
          const tokenData = JSON.parse(payload);
          const userId = tokenData.userId || tokenData.sub || tokenData.id;
          if (userId) {
            extra['X-User-Id'] = String(userId);
          }
        }
      } catch (e) {
        console.warn('[API] Failed to extract userId from token');
      }
      
      const urlStr = `${config.baseURL || ''}${config.url || ''}`;
      const isCompaniesEndpoint = (config.url?.includes('/companies')) === true;
      const skipCompany = (config as any)._skipCompany === true;
      const isValidCompany = CURRENT_COMPANY_ID != null && Number.isFinite(CURRENT_COMPANY_ID as number) && (CURRENT_COMPANY_ID as number) > 0;
      const shouldAttachCompany = isValidCompany && !isCompaniesEndpoint && !skipCompany;
      
      // DEBUG: Log company ID attachment decision
      if (config.url?.includes('/expenses')) {
        console.log('[API] Company ID decision:', {
          url: config.url,
          CURRENT_COMPANY_ID,
          isValidCompany,
          skipCompany,
          shouldAttachCompany,
          willAttachHeader: shouldAttachCompany
        });
      }
      
      if (shouldAttachCompany) {
        extra['X-Company-Id'] = String(CURRENT_COMPANY_ID);
      }
      const headers = new AxiosHeaders({
        ...config.headers,
        ...extra,
      });
      
      // Return a new config object with updated headers
      return {
        ...config,
        headers: headers
      };
    } catch (error) {
      console.error('[API] Error getting auth token:', error);
      return config;
    }

    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
      params: config.params,
      data: config.data,
    });

    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    // Handle network errors
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(createApiError(
        'Request timeout. Please check your internet connection and try again.',
        error,
        408,
        'REQUEST_TIMEOUT'
      ));
    }

    // Handle other HTTP errors
    if (error.response) {
      const { data, status } = error.response;
      const errorMessage = data?.message || error.message || 'An error occurred';
      
      return Promise.reject(createApiError(
        errorMessage,
        error,
        status,
        (data as any)?.code || 'API_ERROR'
      ));
    }

    // For all other errors, just pass them through with a consistent format
    return Promise.reject(createApiError(
      error.message || 'An unexpected error occurred',
      error,
      error.response?.status || 500,
      error.code || 'UNKNOWN_ERROR'
    ));
  }
);

// Helper function to create consistent API errors
function createApiError(
  message: string, 
  originalError?: any, 
  status?: number,
  code?: string
): ApiError {
  const error = new Error(message) as ApiError;
  error.status = status;
  error.code = code;
  error.originalError = originalError;
  
  // Mark as auth error for 401/403 statuses
  if (status === 401 || status === 403) {
    error.isAuthError = true;
  }
  
  return error;
}

// Token management functions
const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// Single-flight refresh lock so multiple 401s don't trigger parallel refresh calls
let refreshPromise: Promise<any> | null = null;

async function setAuthToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to save auth token', error);
    throw error;
  }
}

async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to get auth token', error);
    return null;
  }
}

async function setRefreshToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to save refresh token', error);
    throw error;
  }
}

async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to get refresh token', error);
    return null;
  }
}

async function clearAuthTokens(): Promise<void> {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(AUTH_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
    ]);
  } catch (error) {
    console.error('Failed to clear auth tokens', error);
  }
}

// Type for login response
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

// Response interceptor to handle token refresh and errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    if (AppConfig.logging.enableNetworkLogs) {
      const isAuthRequest = response.config.url?.includes('/auth/');
      const logData = isAuthRequest 
        ? { status: response.status }
        : { status: response.status };
      console.log(`[API] Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`, logData);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config;
    if (!originalRequest) {
      console.error('[API] No request configuration available in error response');
      return Promise.reject(createApiError('No request configuration available', error));
    }

    const status = error.response?.status;
    const originalRequestUrl = originalRequest.url || '';
    const isAuthRequest = originalRequestUrl.includes('/auth/');
    const isRefreshRequest = originalRequestUrl.includes('/auth/refresh');
    
    // Skip handling if this is a request that should skip auth refresh or is already a retry
    if ((originalRequest as any)._skipAuthRefresh || (originalRequest as any)._retry) {
      return Promise.reject(error);
    }
    
    // Handle 401 Unauthorized - attempt token refresh (single-flight)
    if (status === 401) {
      // Do not refresh for auth endpoints themselves
      if (isAuthRequest || isRefreshRequest) {
        return Promise.reject(error);
      }

      try {
        if (!refreshPromise) {
          const rt = await getRefreshToken();
          if (!rt) {
            await clearAuthTokens();
            return Promise.reject(createApiError('Session expired. Please log in again.', error, 401, 'SESSION_EXPIRED'));
          }
          console.log('[API] 401 Unauthorized - Starting token refresh');
          refreshPromise = axios
            .post(
              `${API_BASE_URL}/api/v1/auth/refresh`,
              { refreshToken: rt },
              { _skipAuthRefresh: true } as any
            )
            .then(async (resp: any) => {
              const data = resp?.data || {};
              if (data?.accessToken) {
                console.log('[API] Token refresh successful');
                await setAuthToken(data.accessToken);
                if (data.refreshToken) {
                  await setRefreshToken(data.refreshToken);
                }
              } else {
                throw new Error('No accessToken in refresh response');
              }
            })
            .catch(async (refreshError: any) => {
              console.error('[API] Token refresh failed:', refreshError);
              await clearAuthTokens();
              throw createApiError('Session expired. Please log in again.', refreshError, 401, 'SESSION_EXPIRED');
            })
            .finally(() => {
              refreshPromise = null;
            });
        }

        // Wait for the in-flight refresh to complete (or fail)
        await refreshPromise;

        // Retry the original request with the new token
        const newAccess = await getAuthToken();
        (originalRequest as any)._retry = true;
        originalRequest.headers = {
          ...(originalRequest.headers as RawAxiosRequestHeaders),
          Authorization: `Bearer ${newAccess}`,
        } as any;
        return api(originalRequest);
      } catch (e) {
        // Propagate session expired
        return Promise.reject(e);
      }
    }
    
    // Log the error with more context (suppress noise for optional endpoints)
    const urlStr = originalRequest.url || '';
    const isOptionalSummary = urlStr.includes('/api/v1/expenses/summary');
    const suppressLog = (originalRequest as any)._suppressErrorLog === true;
    const logPayload = {
      status,
      code: error.code,
      message: error.message,
      isAuthRequest,
      isRefreshRequest,
      statusText: error.response?.statusText,
    };
    if (suppressLog) {
      // Explicitly requested to suppress logging for this request
      // No log
    } else if (isOptionalSummary) {
      // Dedicated summary endpoint is optional; downgrade log to warn
      console.warn(`[API] Optional endpoint failed: ${originalRequest.method?.toUpperCase()} ${urlStr}`, logPayload);
    } else {
      console.error(`[API] Request failed: ${originalRequest.method?.toUpperCase()} ${urlStr}`, logPayload);
    }

    // Handle 401 Unauthorized errors (token expired or invalid)
    if (status === 401 && !isAuthRequest) {
      // At this point, refresh either failed above or was not applicable
      await clearAuthTokens();
      try { safeResetToLogin(); } catch {}
      return Promise.reject(createApiError('Session expired. Please log in again.', error, 401, 'SESSION_EXPIRED'));
    }

    // For 403 Forbidden errors
    if (status === 403) {
      return Promise.reject(createApiError(
        'You do not have permission to perform this action',
        error,
        403,
        'FORBIDDEN'
      ));
    }

    // For 500 Internal Server Error
    if (status === 500) {
      return Promise.reject(createApiError(
        'An internal server error occurred. Please try again later.',
        error,
        500,
        'SERVER_ERROR'
      ));
    }

    // For other errors, just reject with the original error
    const errorMessage = error.response?.data && typeof error.response.data === 'object' && 'message' in error.response.data
      ? String(error.response.data.message)
      : error.message || 'An unexpected error occurred';
      
    return Promise.reject(createApiError(
      errorMessage,
      error,
      status,
      error.code
    ));
  }
);

// Export everything needed by other modules
export {
  api,
  setAuthToken,
  getAuthToken,
  setRefreshToken,
  getRefreshToken,
  clearAuthTokens,
  createApiError,
  API_BASE_URL
};

export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const token = await getAuthToken();
    return !!token;
  } catch (error) {
    console.error('Error checking authentication status:', error);
    return false;
  }
};

// Export LoginResponse as an interface to avoid conflict with the type
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export type { ApiError };
