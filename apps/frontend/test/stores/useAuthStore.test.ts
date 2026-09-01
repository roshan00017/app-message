import { describe, expect, it, beforeEach } from 'vitest';

import { useAuthStore } from '@/stores/useAuthStore';

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user' as const,
  avatar: null,
  status: 'offline' as const,
  lastSeen: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isLoading: true });
  });

  it('initializes with no user and loading true', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isLoading).toBe(true);
  });

  it('sets a user and marks loading as complete', () => {
    useAuthStore.getState().setUser(mockUser);
    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isLoading).toBe(false);
  });

  it('clears the user when setUser is called with null', () => {
    useAuthStore.getState().setUser(mockUser);
    useAuthStore.getState().setUser(null);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('sets loading state explicitly', () => {
    useAuthStore.getState().setLoading(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('logs out by clearing user and loading', () => {
    useAuthStore.getState().setUser(mockUser);
    useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it('persists only the user (never isLoading) so refresh re-checks auth', () => {
    useAuthStore.setState({ isLoading: false });
    useAuthStore.getState().setUser(mockUser);

    const stored = JSON.parse((localStorage.getItem('auth-store') ?? 'null')) as {
      state?: { user?: unknown; isLoading?: unknown };
    };

    // Dates are JSON-serialized, so compare the stable string fields only.
    expect(stored.state?.user).toMatchObject({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
    });
    expect(stored.state).not.toHaveProperty('isLoading');

    // Persisted isLoading must never leak back into memory state.
    expect(useAuthStore.getState().isLoading).toBe(false);
    useAuthStore.setState({ isLoading: true });
    expect(useAuthStore.getState().isLoading).toBe(true);
    localStorage.removeItem('auth-store');
  });
});