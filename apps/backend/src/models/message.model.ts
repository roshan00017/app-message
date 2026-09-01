import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IMessageStatus {
  recipientId: mongoose.Types.ObjectId;
  status: 'sent' | 'delivered' | 'read';
  timestamp: Date;
}

export interface IMessage {
  _id: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  content: string;
  type: 'text' | 'image' | 'file';
  statuses: IMessageStatus[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessageDocument extends Omit<IMessage, '_id'>, Document {}

const messageStatusSchema = new Schema<IMessageStatus>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const messageSchema = new Schema<IMessageDocument>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'file'],
      default: 'text',
    },
    statuses: [messageStatusSchema],
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ 'statuses.recipientId': 1, 'statuses.status': 1 });
messageSchema.index({ 'statuses.recipientId': 1, conversationId: 1 });

messageSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, __v, ...rest } = ret;
    return rest;
  },
});

export const MessageModel: Model<IMessageDocument> = mongoose.model<IMessageDocument>(
  'Message',
  messageSchema
);
