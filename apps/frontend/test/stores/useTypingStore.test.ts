import { describe, expect, it, beforeEach } from 'vitest';

import { useTypingStore, EMPTY_ARRAY } from '@/stores/useTypingStore';

describe('useTypingStore', () => {
  beforeEach(() => {
    useTypingStore.setState({
      typing: {},
    });
  });

  it('returns a stable empty array reference when nobody is typing', () => {
    const first = useTypingStore.getState().getTypingUsers('conv-1');
    const second = useTypingStore.getState().getTypingUsers('conv-1');

    // This is the regression test for the "maximum update depth exceeded" bug —
    // Zustand useSyncExternalStore treats new references as a change and loops forever.
    expect(first).toBe(EMPTY_ARRAY);
    expect(second).toBe(EMPTY_ARRAY);
    expect(first).toBe(second);
  });

  it('returns a stable array reference across calls while typing is empty', () => {
    const a = useTypingStore.getState().getTypingUsers('missing-conv');
    const b = useTypingStore.getState().getTypingUsers('missing-conv');
    expect(a).toBe(b);
  });

  it('adds a user to a conversation typing list', () => {
    useTypingStore.getState().setTyping('conv-1', 'user-a', true);
    expect(useTypingStore.getState().typing['conv-1']).toEqual(['user-a']);
  });

  it('does not duplicate users already in the typing list', () => {
    useTypingStore.getState().setTyping('conv-1', 'user-a', true);
    useTypingStore.getState().setTyping('conv-1', 'user-a', true);
    useTypingStore.getState().setTyping('conv-1', 'user-a', true);

    expect(useTypingStore.getState().typing['conv-1']).toEqual(['user-a']);
  });

  it('is a no-op when setting a user as typing who is already typing (no new reference)', () => {
    useTypingStore.getState().setTyping('conv-1', 'user-a', true);
    const stateBefore = useTypingStore.getState();
    const refBefore = stateBefore.typing['conv-1'];

    useTypingStore.getState().setTyping('conv-1', 'user-a', true);

    const stateAfter = useTypingStore.getState();
    expect(stateAfter.typing['conv-1']).toBe(refBefore);
  });

  it('removes a user from the typing list', () => {
    useTypingStore.getState().setTyping('conv-1', 'user-a', true);
    useTypingStore.getState().setTyping('conv-1', 'user-b', true);
    useTypingStore.getState().setTyping('conv-1', 'user-a', false);

    expect(useTypingStore.getState().typing['conv-1']).toEqual(['user-b']);
  });

  it('does not create a new reference when stopping typing for a non-typing user', () => {
    useTypingStore.getState().setTyping('conv-1', 'user-a', true);
    const refBefore = useTypingStore.getState().typing['conv-1'];

    useTypingStore.getState().setTyping('conv-1', 'nobody', false);

    expect(useTypingStore.getState().typing['conv-1']).toBe(refBefore);
  });

  it('clearTyping empties the conversation typing list and skips no-ops', () => {
    useTypingStore.getState().setTyping('conv-1', 'user-a', true);
    useTypingStore.getState().clearTyping('conv-1');
    expect(useTypingStore.getState().typing['conv-1']).toEqual([]);

    const refBefore = useTypingStore.getState().typing['conv-1'];
    useTypingStore.getState().clearTyping('conv-1');
    expect(useTypingStore.getState().typing['conv-1']).toBe(refBefore);
  });

  it('handles multiple conversations independently', () => {
    useTypingStore.getState().setTyping('conv-1', 'user-a', true);
    useTypingStore.getState().setTyping('conv-2', 'user-b', true);

    expect(useTypingStore.getState().getTypingUsers('conv-1')).toEqual(['user-a']);
    expect(useTypingStore.getState().getTypingUsers('conv-2')).toEqual(['user-b']);
  });
});