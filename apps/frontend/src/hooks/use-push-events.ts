import { useEffect } from 'react';

import { api } from '@/services/api';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

export function usePushEvents() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      const { type, conversationId } = event.data || {};

      switch (type) {
        case 'MARK_READ':
          if (conversationId) {
            api
              .patch(`/conversations/${conversationId}/read`)
              .then(() => {
                queryClient.invalidateQueries({ queryKey: ['unread-counts'] });
                queryClient.invalidateQueries({ queryKey: ['messages'] });
              })
              .catch(console.error);
          }
          break;

        case 'NAVIGATE':
          if (conversationId) {
            navigate({
              to: '/customer/chat/$conversationId',
              params: { conversationId },
            });
          }
          break;
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [queryClient, navigate]);
}
