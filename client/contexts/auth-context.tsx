'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi, tokenStorage, type User, type Tenant } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ user: { id: string; email: string }; tenants: Tenant[] }>;
  selectTenant: (userId: string, tenantId: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const isAuthenticated = !!user;

  useEffect(() => {
    const checkAuth = async () => {
      const token = tokenStorage.getAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const userData = await authApi.me();
        setUser(userData);
      } catch (error) {
        tokenStorage.clear();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    tokenStorage.setUserId(response.user.id);
    return response;
  };

  const selectTenant = async (userId: string, tenantId: string) => {
    const response = await authApi.selectTenant(userId, { tenantId });
    tokenStorage.setAccessToken(response.accessToken);
    tokenStorage.setRefreshToken(response.refreshToken);

    const userData = await authApi.me();
    setUser(userData);

    router.push('/app');
  };

  const register = async (email: string, password: string) => {
    await authApi.register({ email, password });
  };

  const logout = async () => {
    if (user) {
      try {
        await authApi.logout(user.tenantId);
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    tokenStorage.clear();
    setUser(null);
    router.push('/login');
  };

  const refreshUser = async () => {
    try {
      const userData = await authApi.me();
      setUser(userData);
    } catch (error) {
      tokenStorage.clear();
      setUser(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        selectTenant,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
