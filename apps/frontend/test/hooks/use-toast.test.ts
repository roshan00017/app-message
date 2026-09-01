import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { toast, useToast } from '@/hooks/use-toast';

describe('useToast', () => {
  it('returns an empty toast list initially', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toEqual([]);
  });

  it('returns toast, dismiss, and update helpers', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toast).toBeTypeOf('function');
    expect(result.current.dismiss).toBeTypeOf('function');
  });

  it('updates state when a toast is dispatched', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Hello', description: 'World' });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Hello');
    expect(result.current.toasts[0].description).toBe('World');
  });

  it('can dismiss a toast by id', () => {
    const { result } = renderHook(() => useToast());

    let toastId: string | undefined;
    act(() => {
      const t = toast({ title: 'Dismiss me' });
      toastId = t.id;
    });

    act(() => {
      result.current.dismiss(toastId);
    });

    // After dismiss the toast open flag is set to false
    expect(result.current.toasts[0].open).toBe(false);
  });
});