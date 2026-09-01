import { describe, expect, it } from 'vitest';

import { UserRole, UserStatus } from '@/types/user.js';

describe('UserRole enum', () => {
  it('defines user, agent, and admin roles', () => {
    expect(UserRole.enum.user).toBe('user');
    expect(UserRole.enum.agent).toBe('agent');
    expect(UserRole.enum.admin).toBe('admin');
  });
});

describe('UserStatus enum', () => {
  it('defines online, offline, busy, and away statuses', () => {
    expect(UserStatus.enum.online).toBe('online');
    expect(UserStatus.enum.offline).toBe('offline');
    expect(UserStatus.enum.busy).toBe('busy');
    expect(UserStatus.enum.away).toBe('away');
  });
});