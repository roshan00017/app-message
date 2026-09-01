import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IConversation {
  _id: mongoose.Types.ObjectId;
  type: 'direct' | 'group';
  status: 'waiting' | 'active' | 'closed';
  participants: mongoose.Types.ObjectId[];
  name: string | null;
  lastMessage: mongoose.Types.ObjectId | null;
  lastMessageAt: Date;
  assignedAgent: mongoose.Types.ObjectId | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IConversationDocument extends Omit<IConversation, '_id'>, Document {}

const conversationSchema = new Schema<IConversationDocument>(
  {
    type: {
      type: String,
      enum: ['direct', 'group'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['waiting', 'active', 'closed'],
      default: 'waiting',
      index: true,
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    name: {
      type: String,
      trim: true,
      default: null,
    },
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    assignedAgent: {
      type: Schema.Types.ObjectId,
      ref: 'Agent',
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ participants: 1, lastMessageAt: -1 });
conversationSchema.index({ type: 1, lastMessageAt: -1 });
conversationSchema.index({ status: 1, lastMessageAt: -1 });

conversationSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, __v, ...rest } = ret;
    return rest;
  },
});

export const ConversationModel: Model<IConversationDocument> =
  mongoose.model<IConversationDocument>('Conversation', conversationSchema);
