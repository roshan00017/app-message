export interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
