import { UserModel } from '../../models/user.model.js';
import { logger } from '../../utils/logger.js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar: string | null;
}

export class AuthService {
  async register(data: { email: string; name: string; password: string }): Promise<AuthUser> {
    const existing = await UserModel.findOne({ email: data.email });
    if (existing) {
      throw Object.assign(new Error('Email already registered'), {
        statusCode: 409,
      });
    }

    const user = await UserModel.create({
      email: data.email,
      name: data.name,
      password: data.password,
    });

    logger.info({ userId: user._id }, 'User registered');

    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
    };
  }

  async login(email: string, password: string): Promise<AuthUser> {
    const user = await UserModel.findOne({ email }).select('+password');

    if (!user) {
      throw Object.assign(new Error('Invalid credentials'), {
        statusCode: 401,
      });
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      throw Object.assign(new Error('Invalid credentials'), {
        statusCode: 401,
      });
    }

    logger.info({ userId: user._id }, 'User logged in');

    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
    };
  }

  async getUserById(userId: string): Promise<AuthUser | null> {
    const user = await UserModel.findById(userId);
    if (!user) return null;

    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
    };
  }
}
