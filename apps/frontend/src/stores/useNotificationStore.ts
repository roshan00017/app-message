import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

type PushPermission = 'default' | 'granted' | 'denied';

interface NotificationState {
  permission: PushPermission;
  isSubscribed: boolean;
  isSupported: boolean;

  setPermission: (permission: PushPermission) => void;
  setSubscribed: (subscribed: boolean) => void;
  setSupported: (supported: boolean) => void;
}

export const useNotificationStore = create<NotificationState>()(
  devtools(
    persist(
      (set) => ({
        permission: 'default',
        isSubscribed: false,
        isSupported: false,

        setPermission: (permission) => set({ permission }),

        setSubscribed: (isSubscribed) => set({ isSubscribed }),

        setSupported: (isSupported) => set({ isSupported }),
      }),
      { name: 'notification-store' }
    )
  )
);
