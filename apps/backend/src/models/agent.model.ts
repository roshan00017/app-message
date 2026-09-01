import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IAgent {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  skills: string[];
  maxConcurrentChats: number;
  currentChats: number;
  isAvailable: boolean;
  status: 'online' | 'offline' | 'busy';
  createdAt: Date;
  updatedAt: Date;
}

export interface IAgentDocument extends Omit<IAgent, '_id'>, Document {}

const agentSchema = new Schema<IAgentDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    skills: [
      {
        type: String,
        trim: true,
      },
    ],
    maxConcurrentChats: {
      type: Number,
      default: 5,
      min: 1,
      max: 20,
    },
    currentChats: {
      type: Number,
      default: 0,
      min: 0,
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['online', 'offline', 'busy'],
      default: 'offline',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

agentSchema.index({ isAvailable: 1, currentChats: 1 });
agentSchema.index({ skills: 1, isAvailable: 1 });

export const AgentModel: Model<IAgentDocument> = mongoose.model<IAgentDocument>(
  'Agent',
  agentSchema
);
