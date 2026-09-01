import { z } from 'zod';

export const UserRole = z.enum(['user', 'agent', 'admin']);
export type UserRole = z.infer<typeof UserRole>;

export const UserStatus = z.enum(['online', 'offline', 'busy', 'away']);
export type UserStatus = z.infer<typeof UserStatus>;

export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  role: UserRole;
  status: UserStatus;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPublic {
  id: string;
  name: string;
  avatar: string | null;
  status: UserStatus;
}
