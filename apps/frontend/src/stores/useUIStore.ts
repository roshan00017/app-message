import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

type ConnectionStatus =
  'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error' | 'offline';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
}

interface UIState {
  connectionStatus: ConnectionStatus;
  sidebarOpen: boolean;
  activeModal: string | null;
  toasts: Toast[];

  setConnectionStatus: (status: ConnectionStatus) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>()(
  devtools((set) => ({
    connectionStatus: 'connecting',
    sidebarOpen: true,
    activeModal: null,
    toasts: [],

    setConnectionStatus: (status) => set({ connectionStatus: status }),

    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

    setSidebarOpen: (open) => set({ sidebarOpen: open }),

    openModal: (modalId) => set({ activeModal: modalId }),

    closeModal: () => set({ activeModal: null }),

    addToast: (toast) =>
      set((state) => ({
        toasts: [...state.toasts, { ...toast, id: Math.random().toString(36).slice(2) }],
      })),

    removeToast: (id) =>
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      })),
  }))
);
