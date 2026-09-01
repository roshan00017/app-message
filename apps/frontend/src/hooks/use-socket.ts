import { useSocketContext } from '@/contexts/socket-context';

/**
 * Hook to access the shared socket connection.
 * All socket state is managed by the SocketProvider context.
 */
export function useSocket() {
  return useSocketContext();
}
