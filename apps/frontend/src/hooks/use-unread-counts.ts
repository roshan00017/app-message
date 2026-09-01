import { useQuery } from '@tanstack/react-query';

import { api } from '@/services/api';

export function useUnreadCounts() {
  return useQuery({
    queryKey: ['unread-counts'],
    queryFn: async () => {
      const { data } = await api.get('/conversations/unread-counts');
      return data.data as Record<string, number>;
    },
    refetchInterval: 30000,
  });
}

export function useTotalUnreadCount() {
  const { data } = useUnreadCounts();
  return data ? Object.values(data).reduce((sum, count) => sum + count, 0) : 0;
}
