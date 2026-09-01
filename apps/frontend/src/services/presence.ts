import { SOCKET_EVENTS } from '@messaging/shared/constants';
import { getSocket } from './socket';

const HEARTBEAT_INTERVAL_MS = 15000;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

export function startPresenceHeartbeat(): void {
  if (heartbeatInterval) return;

  const socket = getSocket();

  // Send heartbeat immediately on connect
  if (socket.connected) {
    socket.emit(SOCKET_EVENTS.PRESENCE_UPDATE, { status: 'online' });
  }

  // Send heartbeat every 15s
  heartbeatInterval = setInterval(() => {
    if (socket.connected) {
      socket.emit(SOCKET_EVENTS.PRESENCE_UPDATE, { status: 'online' });
    }
  }, HEARTBEAT_INTERVAL_MS);
}

export function stopPresenceHeartbeat(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  const socket = getSocket();
  if (socket.connected) {
    socket.emit(SOCKET_EVENTS.PRESENCE_UPDATE, { status: 'offline' });
  }
}

export function updatePresenceStatus(status: string): void {
  const socket = getSocket();
  if (socket.connected) {
    socket.emit(SOCKET_EVENTS.PRESENCE_UPDATE, { status });
  }
}
