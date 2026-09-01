import { describe, expect, it, beforeEach } from 'vitest';

import { usePresenceStore } from '@/stores/usePresenceStore';

describe('usePresenceStore', () => {
  beforeEach(() => {
    usePresenceStore.setState({ statuses: {} });
  });

  it('initializes with empty statuses and offline default', () => {
    const { getStatus } = usePresenceStore.getState();
    const status = getStatus('missing-user');

    expect(status.status).toBe('offline');
  });

  it('sets a user status', () => {
    usePresenceStore.getState().setStatus('user-1', 'online', new Date('2024-01-01'));
    const status = usePresenceStore.getState().getStatus('user-1');
    expect(status.status).toBe('online');
    expect(status.lastSeen).toBeInstanceOf(Date);
  });

  it('overwrites an existing status', () => {
    usePresenceStore.getState().setStatus('user-1', 'online', new Date());
    usePresenceStore.getState().setStatus('user-1', 'busy', new Date());
    expect(usePresenceStore.getState().getStatus('user-1').status).toBe('busy');
  });

  it('applies bulk statuses', () => {
    usePresenceStore.getState().setBulkStatuses({
      'user-1': { status: 'online', lastSeen: new Date() },
      'user-2': { status: 'away', lastSeen: new Date() },
    });

    const state = usePresenceStore.getState();
    expect(state.getStatus('user-1').status).toBe('online');
    expect(state.getStatus('user-2').status).toBe('away');
  });

  it('preserves existing statuses when applying bulk updates', () => {
    usePresenceStore.getState().setStatus('user-1', 'busy', new Date());
    usePresenceStore.getState().setBulkStatuses({
      'user-2': { status: 'online', lastSeen: new Date() },
    });

    expect(usePresenceStore.getState().getStatus('user-1').status).toBe('busy');
    expect(usePresenceStore.getState().getStatus('user-2').status).toBe('online');
  });

  it('returns a default offline status with epoch lastSeen for unknown users', () => {
    const { getStatus } = usePresenceStore.getState();
    const status = getStatus('ghost');
    expect(status.lastSeen.getTime()).toBe(0);
  });
});