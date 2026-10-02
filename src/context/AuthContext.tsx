'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: 'CUSTOMER' | 'ADMIN';
  orders?: any[];
  wishlists?: any[];
  createdAt?: string | Date;
  isSubscribedNewsletter?: boolean;
  twoFactorEnabled?: boolean;
}

/** `mfaRequired`: the password was right, a second factor (or, with `setup`, first-time 2FA setup) is next. */
export type LoginResult = { success: boolean; error?: string; code?: string; mfaRequired?: boolean; setup?: boolean };
/** Registration never signs in: the account opens from the e-mailed link (`verificationSent`). */
export type RegisterResult = { success: boolean; error?: string; field?: string; verificationSent?: boolean; message?: string };

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  register: (name: string, email: string, password: string, phone?: string, turnstileToken?: string | null) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data.error || 'Giriş başarısız.', code: data.code };
      }
      if (data.mfaRequired) return { success: true, mfaRequired: true, setup: Boolean(data.setup) };
      await refreshUser();
      return { success: true };
    } catch {
      return { success: false, error: 'Bağlantı hatası oluştu.' };
    }
  };

  const register = async (name: string, email: string, password: string, phone?: string, turnstileToken?: string | null) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone, turnstileToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data.error || 'Kayıt başarısız.', field: data.field };
      }
      return { success: true, verificationSent: Boolean(data.verificationSent), message: data.message };
    } catch {
      return { success: false, error: 'Bağlantı hatası oluştu.' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
    } catch {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
