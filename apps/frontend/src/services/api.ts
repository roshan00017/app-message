import axios, { AxiosError } from 'axios';

import { toast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/useAuthStore';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track if initial auth check has completed
let initialAuthCheckDone = false;

export function markInitialAuthDone() {
  initialAuthCheckDone = true;
}

// Read a cookie by name (document.cookie only in browser via getCookie below)
export function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)')
  );
  return match ? decodeURIComponent(match[1]) : undefined;
}

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const method = (config.method ?? 'get').toLowerCase();
    if (method !== 'get' && method !== 'head' && method !== 'options') {
      const csrfToken = getCookie('csrfToken');
      if (csrfToken) {
        config.headers['x-csrf-token'] = csrfToken;
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string; message?: string }>) => {
    const { logout } = useAuthStore.getState();

    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401:
          // Only show toast if user was previously logged in (session expired)
          // Skip if this is the initial /auth/me check on app load
          logout();
          if (initialAuthCheckDone) {
            toast({
              variant: 'destructive',
              title: 'Session expired',
              description: 'Please log in again.',
            });
          }
          break;
        case 403:
          toast({
            variant: 'destructive',
            title: 'Access denied',
            description: 'You do not have permission to perform this action.',
          });
          break;
        case 404:
          // Don't show toast for 404s on auth checks
          if (!error.config?.url?.includes('/auth/me')) {
            toast({
              variant: 'default',
              title: 'Not found',
              description: 'Resource not found.',
            });
          }
          break;
        case 429:
          toast({
            variant: 'destructive',
            title: 'Rate limited',
            description: 'Too many requests. Please try again later.',
          });
          break;
        case 500:
          toast({
            variant: 'destructive',
            title: 'Server error',
            description: 'Something went wrong. Please try again later.',
          });
          break;
        default:
          toast({
            variant: 'destructive',
            title: 'Error',
            description: data?.error || 'An error occurred.',
          });
      }
    } else if (error.request) {
      toast({
        variant: 'destructive',
        title: 'Network error',
        description: 'Please check your connection.',
      });
    }

    return Promise.reject(error);
  }
);
