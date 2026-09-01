import { describe, expect, it } from 'vitest';

import { ConversationType, CreateConversationSchema } from '@/types/conversation.js';

describe('ConversationType enum', () => {
  it('defines direct and group conversation types', () => {
    expect(ConversationType.enum.direct).toBe('direct');
    expect(ConversationType.enum.group).toBe('group');
  });
});

describe('CreateConversationSchema', () => {
  it('accepts a valid direct conversation', () => {
    const result = CreateConversationSchema.safeParse({
      type: 'direct',
      participantIds: ['user-1', 'user-2'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts a group conversation with a name', () => {
    const result = CreateConversationSchema.safeParse({
      type: 'group',
      participantIds: ['user-1', 'user-2', 'user-3'],
      name: 'Team Chat',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid conversation type', () => {
    const result = CreateConversationSchema.safeParse({
      type: 'invalid',
      participantIds: ['user-1'],
    });
    expect(result.success).toBe(false);
  });

  it('accepts missing participantIds (defaults to empty array)', () => {
    const result = CreateConversationSchema.safeParse({ type: 'direct' });
    expect(result.success).toBe(true);
  });

  it('accepts empty participant list (backend auto-assigns agents)', () => {
    const result = CreateConversationSchema.safeParse({
      type: 'direct',
      participantIds: [],
    });
    expect(result.success).toBe(true);
  });
});