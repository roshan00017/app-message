import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';

import { useTotalUnreadCount, useUnreadCounts } from '@/hooks/use-unread-counts';
import { api } from '@/services/api';

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('useUnreadCounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and returns unread counts', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: { 'conv-1': 3, 'conv-2': 1 } },
    });

    const { result } = renderHook(() => useUnreadCounts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ 'conv-1': 3, 'conv-2': 1 });
    expect(api.get).toHaveBeenCalledWith('/conversations/unread-counts');
  });

  it('handles API errors without crashing', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useUnreadCounts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});

describe('useTotalUnreadCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sums unread counts across conversations', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: { 'conv-1': 3, 'conv-2': 1, 'conv-3': 0 } },
    });

    const { result } = renderHook(() => useTotalUnreadCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current).toBe(4));
  });

  it('returns 0 when data is undefined', () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {},
    });

    const { result } = renderHook(() => useTotalUnreadCount(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBe(0);
  });
});