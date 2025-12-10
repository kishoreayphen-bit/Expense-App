import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { Buffer } from 'buffer';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  api, 
  setAuthToken, 
  setRefreshToken, 
  getAuthToken, 
  getRefreshToken, 
  clearAuthTokens, 
  LoginResponse
} from '../api/client';
import { navigationRef, isNavigationReady, safeResetToLogin } from '../navigation/navigationRef';

// Types
interface AuthState {
  token: string | null;
  email: string | null;
  isLoading: boolean;
  error: string | null;
  isRefreshing: boolean;
  user: Record<string, any> | null;
}

type AuthContextType = {
  token: string | null;
  email: string | null;
  isLoading: boolean;
  error: string | null;
  backendUrl: string;
  user: Record<string, any> | null;
  login: (email: string, password: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
  setBackendUrl: (url: string) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Parse JWT token to get expiration (base64url-safe, no atob dependency)
const parseJwt = (token?: string | null) => {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const json = Buffer.from(payload, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch (e) {
    console.error('Error parsing JWT', e);
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // For Android Emulator, use 10.0.2.2 (maps to host's localhost)
  // For physical device, use your PC's IP (e.g., http://10.111.29.25:18080)
  const [backendUrl, setBackendUrl] = useState<string>('http://10.0.2.2:18080');
  
  const [state, setState] = useState<AuthState>({
    token: null,
    email: null,
    isLoading: true,
    error: null,
    isRefreshing: false,
    user: null,
  });

  const refreshTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const refreshTokenRef = useRef<() => Promise<string | null>>(async () => null);

  // Update state helper
  const updateState = (updates: Partial<AuthState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  // Clear refresh timeout
  const clearRefreshTimeout = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = undefined;
    }
  }, []);

  // Schedule token refresh
  const scheduleTokenRefresh = useCallback((token: string, expiresInSeconds?: number) => {
    clearRefreshTimeout();
    let refreshTime = 0;
    if (typeof expiresInSeconds === 'number' && isFinite(expiresInSeconds)) {
      const ttlMs = expiresInSeconds * 1000;
      refreshTime = Math.max(ttlMs - 5 * 60 * 1000, 0);
    } else {
      const tokenData = parseJwt(token);
      if (!tokenData?.exp) return;
      const expiresIn = (tokenData.exp * 1000) - Date.now();
      refreshTime = Math.max(expiresIn - 5 * 60 * 1000, 0);
    }
    
    console.log(`[Auth] Scheduling token refresh in ${Math.floor(refreshTime / 1000 / 60)} minutes`);
    
    refreshTimeoutRef.current = setTimeout(() => {
      refreshTokenRef.current?.().catch(console.error);
    }, refreshTime);
  }, [clearRefreshTimeout]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      updateState({ isLoading: true, error: null });
      
      // Clear tokens and timeout
      await clearAuthTokens();
      await AsyncStorage.removeItem('userRole');
      clearRefreshTimeout();
      
      // Reset navigation to login screen safely (queued until ready)
      try { safeResetToLogin(); } catch {}
      
      updateState({ 
        token: null, 
        email: null, 
        isLoading: false,
        user: null,
      });
    } catch (error) {
      console.error('Logout error:', error);
      updateState({ 
        error: 'Failed to log out', 
        isLoading: false 
      });
    }
  }, [clearRefreshTimeout]);

  // Refresh token function
  const refreshToken = useCallback(async (): Promise<string | null> => {
    if (state.isRefreshing) {
      console.log('[Auth] Refresh already in progress');
      return state.token;
    }

    updateState({ isRefreshing: true });
    
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        await logout();
        return null;
      }

      const response = await api.post<LoginResponse>('/api/v1/auth/refresh', { refreshToken });
      const { accessToken, refreshToken: newRefreshToken, expiresIn } = response.data;
      
      if (!accessToken) {
        throw new Error('No access token in refresh response');
      }

      // Store new tokens
      await setAuthToken(accessToken);
      if (newRefreshToken) {
        await setRefreshToken(newRefreshToken);
      }

      // Update state and schedule next refresh
      updateState({ token: accessToken });
      scheduleTokenRefresh(accessToken, expiresIn);
      
      return accessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
      return null;
    } finally {
      updateState({ isRefreshing: false });
    }
  }, [state.isRefreshing, logout, scheduleTokenRefresh]);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        updateState({ isLoading: true });
        
        const token = await getAuthToken();
        if (!token) {
          updateState({ isLoading: false });
          return;
        }

        // Verify token is still valid
        const tokenData = parseJwt(token);
        const isTokenValid = tokenData?.exp && tokenData.exp * 1000 > Date.now();
        
        if (!isTokenValid) {
          await logout();
          return;
        }

        // Update state and schedule refresh
        updateState({ 
          token,
          email: tokenData.email || tokenData.sub || null,
          isLoading: false,
          user: tokenData || null,
        });
        
        scheduleTokenRefresh(token);
      } catch (error) {
        console.error('Auth initialization error:', error);
        updateState({ 
          error: 'Failed to initialize authentication', 
          isLoading: false 
        });
      }
    };

    initAuth();
    
    // Cleanup on unmount
    return () => {
      clearRefreshTimeout();
    };
  }, [logout, scheduleTokenRefresh, clearRefreshTimeout]);

  // Update the refresh token ref
  useEffect(() => {
    refreshTokenRef.current = refreshToken;
  }, [refreshToken]);

  // Login function
  // Update the API base URL when backendUrl changes
  useEffect(() => {
    if (api.setBaseUrl) {
      api.setBaseUrl(backendUrl);
    }
  }, [backendUrl]);

  const login = useCallback(async (email: string, password: string): Promise<LoginResponse> => {
    updateState({ isLoading: true, error: null });
    
    try {
      // Ensure the API base URL is set before making the request
      if (api.setBaseUrl) {
        api.setBaseUrl(backendUrl);
      }
      
      const response = await api.post<LoginResponse>('/api/v1/auth/login', { email, password });
      const { accessToken, refreshToken: newRefreshToken } = response.data;
      
      if (!accessToken) {
        throw new Error('No access token in response');
      }

      // Store tokens
      await setAuthToken(accessToken);
      if (newRefreshToken) {
        await setRefreshToken(newRefreshToken);
      }
      
      // Update state and schedule refresh
      const tokenData = parseJwt(accessToken);
      
      console.log('[Auth] ===== LOGIN DEBUG =====');
      console.log('[Auth] Token data:', JSON.stringify(tokenData, null, 2));
      console.log('[Auth] Authorities:', tokenData?.authorities);
      
      let roleSaved = false;
      
      // Extract and store role from token
      if (tokenData?.authorities && Array.isArray(tokenData.authorities)) {
        const roleAuthority = tokenData.authorities.find((auth: any) => 
          typeof auth === 'string' && auth.startsWith('ROLE_')
        );
        console.log('[Auth] Found role authority:', roleAuthority);
        if (roleAuthority) {
          const role = roleAuthority.replace('ROLE_', '');
          await AsyncStorage.setItem('userRole', role);
          console.log('[Auth] ✅ User role saved to AsyncStorage:', role);
          
          // Verify it was saved
          const savedRole = await AsyncStorage.getItem('userRole');
          console.log('[Auth] ✅ Verified saved role:', savedRole);
          roleSaved = true;
        } else {
          console.warn('[Auth] ⚠️ No ROLE_ authority found in token');
        }
      } else {
        console.warn('[Auth] ⚠️ No authorities array in token');
      }
      
      // Fallback: If role not in token, fetch from API
      if (!roleSaved) {
        console.log('[Auth] 🔄 Fetching user role from API...');
        try {
          const userResponse = await api.get('/api/v1/auth/me');
          const userRole = userResponse.data?.role;
          if (userRole) {
            await AsyncStorage.setItem('userRole', userRole);
            console.log('[Auth] ✅ User role fetched and saved:', userRole);
            roleSaved = true;
          } else {
            console.warn('[Auth] ⚠️ No role in user API response');
          }
        } catch (error) {
          console.error('[Auth] ❌ Failed to fetch user role:', error);
        }
      }
      
      console.log('[Auth] ========================');
      
      updateState({ 
        token: accessToken, 
        email: tokenData?.email || email,
        isLoading: false,
        user: tokenData || null,
      });
      
      // Notify RoleContext to reload
      try {
        const { DeviceEventEmitter } = require('react-native');
        DeviceEventEmitter.emit('roleUpdated');
        console.log('[Auth] 📢 Emitted roleUpdated event');
      } catch (e) {
        console.warn('[Auth] Failed to emit roleUpdated event:', e);
      }
      
      scheduleTokenRefresh(accessToken, response.data.expiresIn);
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';
      updateState({ 
        error: errorMessage, 
        isLoading: false 
      });
      throw error;
    }
  }, [scheduleTokenRefresh]);

  const value = {
    token: state.token,
    email: state.email,
    isLoading: state.isLoading,
    error: state.error,
    backendUrl,
    user: state.user,
    login,
    logout,
    refreshToken,
    setBackendUrl,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
