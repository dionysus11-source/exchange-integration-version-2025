'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
    // Try to load token from localStorage on initial load
    const storedToken = localStorage.getItem('jwt_token');
    if (storedToken) {
      setToken(storedToken);
    }
    setLoading(false);
  }, []);

  const login = (newToken: string) => {
    setToken(newToken);
    localStorage.setItem('jwt_token', newToken);
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('jwt_token');
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