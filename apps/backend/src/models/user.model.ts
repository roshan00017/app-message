import bcrypt from 'bcrypt';
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IUser {
  _id: mongoose.Types.ObjectId;
  email: string;
  name: string;
  password: string;
  avatar: string | null;
  role: 'user' | 'agent' | 'admin';
  status: 'online' | 'offline' | 'busy' | 'away';
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends Omit<IUser, '_id'>, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    avatar: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ['user', 'agent', 'admin'],
      default: 'user',
      index: true,
    },
    status: {
      type: String,
      enum: ['online', 'offline', 'busy', 'away'],
      default: 'offline',
      index: true,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, __v, password, ...rest } = ret;
    return rest;
  },
});

export const UserModel: Model<IUserDocument> = mongoose.model<IUserDocument>('User', userSchema);
