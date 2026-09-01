import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IPushSubscription {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
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

export interface IPushSubscriptionDocument extends Omit<IPushSubscription, '_id'>, Document {}

const pushSubscriptionSchema = new Schema<IPushSubscriptionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
      unique: true,
    },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

pushSubscriptionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PushSubscriptionModel: Model<IPushSubscriptionDocument> =
  mongoose.model<IPushSubscriptionDocument>('PushSubscription', pushSubscriptionSchema);
