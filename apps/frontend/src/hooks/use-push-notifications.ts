import { useCallback, useEffect, useRef, useState } from 'react';

import { useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  getExistingSubscription,
  getSubscriptionKeys,
  isPushSupported,
  registerServiceWorker,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/services/push';

export function usePushNotifications() {
  const user = useAuthStore((s) => s.user);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const hasInitialized = useRef(false);

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      const subscription = await subscribeToPush();
      const keys = getSubscriptionKeys(subscription);

      await api.post('/notifications/subscribe', {
        endpoint: subscription.endpoint,
        keys,
      });

      return subscription;
    },
    onSuccess: () => {
      setIsSubscribed(true);
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      const existing = await getExistingSubscription();
      if (existing) {
        await api.delete('/notifications/subscribe', {
          data: { endpoint: existing.endpoint },
        });
      }
      await unsubscribeFromPush();
    },
    onSuccess: () => {
      setIsSubscribed(false);
    },
  });

  // Request permission and subscribe
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isPushSupported()) {
      console.warn('Push notifications not supported');
      return false;
    }

    if (!('Notification' in window)) {
      console.warn('Notification API not available');
      return false;
    }

    const currentPermission = Notification.permission;
    setPermission(currentPermission);

    if (currentPermission === 'denied') {
      console.warn('Notification permission denied');
      return false;
    }

    if (currentPermission !== 'granted') {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        return false;
      }
    }

    try {
      await subscribeMutation.mutateAsync();
      return true;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return false;
    }
  }, [subscribeMutation]);

  // Unsubscribe
  const unsubscribe = useCallback(async () => {
    await unsubscribeMutation.mutateAsync();
  }, [unsubscribeMutation]);

  // Initialize: check existing subscription on mount
  useEffect(() => {
    if (!user || hasInitialized.current) return;
    hasInitialized.current = true;

    const init = async () => {
      try {
        // Register service worker
        if (isPushSupported()) {
          await registerServiceWorker();
        }

        // Check existing subscription
        const existing = await getExistingSubscription();
        if (existing) {
          setIsSubscribed(true);
          setPermission(Notification.permission);
        } else if ('Notification' in window) {
          setPermission(Notification.permission);
        }
      } catch (error) {
        console.error('Failed to initialize push notifications:', error);
      }
    };

    init();
  }, [user]);

  // Unsubscribe on logout
  useEffect(() => {
    if (!user && isSubscribed) {
      unsubscribeFromPush().catch(console.error);
      setIsSubscribed(false);
    }
  }, [user, isSubscribed]);

  // Refresh subscription on visibility change
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.hidden || !user || !isSubscribed) return;

      try {
        const existing = await getExistingSubscription();
        if (!existing && permission === 'granted') {
          // Subscription expired, re-subscribe
          await subscribeMutation.mutateAsync();
        }
      } catch (error) {
        console.error('Failed to refresh push subscription:', error);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user, isSubscribed, permission, subscribeMutation]);

  return {
    isSupported: isPushSupported(),
    permission,
    isSubscribed,
    isRequesting: subscribeMutation.isPending,
    requestPermission,
    unsubscribe,
  };
}
