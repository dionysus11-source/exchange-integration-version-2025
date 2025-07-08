'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';

interface AuthContextType {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('jwt_token');
    if (storedToken) {
      try {
        const decodedToken: { exp: number } = jwtDecode(storedToken);
        if (decodedToken.exp * 1000 > Date.now()) {
          setToken(storedToken);
        } else {
          // Token is expired
          localStorage.removeItem('jwt_token');
        }
      } catch (error) {
        console.error('Invalid token:', error);
        localStorage.removeItem('jwt_token');
      }
    }
    setLoading(false);
  }, []);

  const login = (newToken: string) => {
    try {
      const decodedToken: { exp: number } = jwtDecode(newToken);
      if (decodedToken.exp * 1000 > Date.now()) {
        setToken(newToken);
        localStorage.setItem('jwt_token', newToken);
      } else {
        // Provided token is expired
        logout();
      }
    } catch (error) {
      console.error('Invalid token on login:', error);
      logout();
    }
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('jwt_token');
    // Redirect to login page
    window.location.href = '/login';
  };
  
  const isAuthenticated = !!token;

  const value = {
    token,
    login,
    logout,
    isAuthenticated,
    isLoading: loading,
  };

  // Render children only after loading is complete
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 