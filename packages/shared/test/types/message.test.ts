import { describe, expect, it } from 'vitest';

import { MessageStatus, MessageType, SendMessageSchema } from '@/types/message.js';

describe('MessageType enum', () => {
  it('defines text, image, and file types', () => {
    expect(MessageType.enum.text).toBe('text');
    expect(MessageType.enum.image).toBe('image');
    expect(MessageType.enum.file).toBe('file');
  });
});

describe('MessageStatus enum', () => {
  it('defines sent, delivered, and read statuses', () => {
    expect(MessageStatus.enum.sent).toBe('sent');
    expect(MessageStatus.enum.delivered).toBe('delivered');
    expect(MessageStatus.enum.read).toBe('read');
  });
});

describe('SendMessageSchema', () => {
  it('accepts a valid text message', () => {
    const result = SendMessageSchema.safeParse({ content: 'Hello there' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ content: 'Hello there', type: 'text' });
  });

  it('accepts an explicit type', () => {
    const result = SendMessageSchema.safeParse({ content: 'img', type: 'image' });
    expect(result.success).toBe(true);
  });

  it('rejects missing content', () => {
    const result = SendMessageSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects empty content', () => {
    const result = SendMessageSchema.safeParse({ content: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid message type', () => {
    const result = SendMessageSchema.safeParse({ content: 'x', type: 'video' });
    expect(result.success).toBe(false);
  });
});