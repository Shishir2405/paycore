'use client';

import { create } from 'zustand';
import { api } from '@/lib/api/client';

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId: string;
  permissions: string[];
};

type AuthState = {
  user: SessionUser | null;
  ready: boolean;
  setUser: (user: SessionUser | null) => void;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: string) => boolean;
};

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  ready: false,

  setUser: (user) => set({ user }),

  /** Resolve the current session on first load. */
  bootstrap: async () => {
    try {
      const user = await api.get<SessionUser>('/auth/me');
      set({ user, ready: true });
    } catch {
      set({ user: null, ready: true });
    }
  },

  login: async (email, password) => {
    const user = await api.post<SessionUser>('/auth/login', { email, password });
    set({ user });
  },

  logout: async () => {
    await api.post('/auth/logout');
    set({ user: null });
  },

  /** SuperAdmin is a wildcard; everyone else needs the explicit grant. */
  can: (permission) => {
    const user = get().user;
    if (!user) return false;
    if (user.role === 'SuperAdmin') return true;
    return user.permissions.includes(permission);
  },
}));
