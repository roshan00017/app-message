import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type { User } from '@messaging/shared/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;

  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      immer((set) => ({
        user: null,
        isLoading: true,

        setUser: (user) =>
          set((state) => {
            state.user = user;
            state.isLoading = false;
          }),

        setLoading: (isLoading) =>
          set((state) => {
            state.isLoading = isLoading;
          }),

        logout: () =>
          set((state) => {
            state.user = null;
            state.isLoading = false;
          }),
      })),
      { name: 'auth-store', partialize: (state) => ({ user: state.user }) }
    )
  )
);
