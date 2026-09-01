import { describe, expect, it, beforeEach } from 'vitest';

import { useUIStore } from '@/stores/useUIStore';

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      connectionStatus: 'connecting',
      sidebarOpen: true,
      activeModal: null,
      toasts: [],
    });
  });

  it('initializes with connecting status and open sidebar', () => {
    const state = useUIStore.getState();
    expect(state.connectionStatus).toBe('connecting');
    expect(state.sidebarOpen).toBe(true);
    expect(state.activeModal).toBeNull();
    expect(state.toasts).toEqual([]);
  });

  it('sets connection status', () => {
    useUIStore.getState().setConnectionStatus('connected');
    expect(useUIStore.getState().connectionStatus).toBe('connected');
  });

  it('toggles the sidebar', () => {
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(false);
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(true);
  });

  it('sets sidebar open explicitly', () => {
    useUIStore.getState().setSidebarOpen(false);
    expect(useUIStore.getState().sidebarOpen).toBe(false);
  });

  it('opens and closes the modal', () => {
    useUIStore.getState().openModal('new-conversation');
    expect(useUIStore.getState().activeModal).toBe('new-conversation');

    useUIStore.getState().closeModal();
    expect(useUIStore.getState().activeModal).toBeNull();
  });

  it('adds a toast with an id and removes it', () => {
    useUIStore.getState().addToast({ type: 'success', message: 'Done!' });
    expect(useUIStore.getState().toasts).toHaveLength(1);
    expect(useUIStore.getState().toasts[0].message).toBe('Done!');

    const id = useUIStore.getState().toasts[0].id;
    useUIStore.getState().removeToast(id);
    expect(useUIStore.getState().toasts).toHaveLength(0);
  });

  it('supports multiple toasts', () => {
    useUIStore.getState().addToast({ type: 'success', message: 'First' });
    useUIStore.getState().addToast({ type: 'error', message: 'Second' });
    expect(useUIStore.getState().toasts).toHaveLength(2);
  });
});