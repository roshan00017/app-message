import { useEffect } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { SOCKET_EVENTS } from '@messaging/shared/constants';
import { api, markInitialAuthDone } from '@/services/api';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSocketContext } from '@/contexts/socket-context';

/**
 * Syncs socket events to TanStack Query cache invalidation.
 * Presence and typing are handled by the SocketProvider context.
 */
export function useSocketSync() {
  const { on } = useSocketContext();
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();

  // Fetch current user on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await api.get('/auth/me');
        setUser(data.data);
      } catch {
        setUser(null);
      } finally {
        // Mark initial auth check as done so interceptor knows to show toasts
        markInitialAuthDone();
      }
    };

    fetchUser();
  }, [setUser]);

  // Invalidate queries on relevant socket events
  useEffect(() => {
    const unsub1 = on(SOCKET_EVENTS.MESSAGE_NEW, () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-counts'] });
    });

    const unsub2 = on(SOCKET_EVENTS.MESSAGE_STATUS, () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-counts'] });
    });

    const unsub3 = on(SOCKET_EVENTS.CONVERSATION_UPDATE, () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['unread-counts'] });
    });

    // Handle unread count sync from server
    const unsub4 = on(SOCKET_EVENTS.UNREAD_SYNC, () => {
      queryClient.invalidateQueries({ queryKey: ['unread-counts'] });
    });

    // Handle conversation status changes
    const unsub5 = on(SOCKET_EVENTS.CONVERSATION_STATUS_CHANGE, () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-conversations'] });
    });

    // Handle agent assignments
    const unsub6 = on(SOCKET_EVENTS.AGENT_ASSIGNED, () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
      unsub6();
    };
  }, [on, queryClient]);
}
