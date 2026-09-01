import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IConversationLog {
  _id: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  action: 'status_change' | 'agent_assigned' | 'agent_unassigned' | 'created' | 'closed';
  performedBy: mongoose.Types.ObjectId | null;
  details: Record<string, unknown>;
  createdAt: Date;
}

export interface IConversationLogDocument extends Omit<IConversationLog, '_id'>, Document {}

const conversationLogSchema = new Schema<IConversationLogDocument>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ['status_change', 'agent_assigned', 'agent_unassigned', 'created', 'closed'],
      required: true,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

conversationLogSchema.index({ conversationId: 1, createdAt: -1 });

export const ConversationLogModel: Model<IConversationLogDocument> =
  mongoose.model<IConversationLogDocument>('ConversationLog', conversationLogSchema);
