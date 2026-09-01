import { describe, expect, it } from 'vitest';

import {
  cn,
  debounce,
  formatRelativeTime,
  generateId,
  throttle,
  truncateText,
} from '@/utils/index.js';

describe('cn', () => {
  it('joins values and resolves conflicts via tailwind-merge', () => {
    const result = cn('px-2 px-4', 'bg-red-500', undefined, null, false);
    expect(result).toContain('px-4');
    expect(result).toContain('bg-red-500');
  });
});

describe('generateId', () => {
  it('produces unique ids', () => {
    const a = generateId();
    const b = generateId();
    expect(a).not.toBe(b);
  });

  it('returns a non-empty string', () => {
    expect(generateId().length).toBeGreaterThan(0);
  });
});

describe('formatRelativeTime', () => {
  it('returns "just now" for timestamps within a minute', () => {
    expect(formatRelativeTime(new Date())).toBe('just now');
  });

  it('returns minutes ago', () => {
    const date = new Date(Date.now() - 2 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe('2m ago');
  });

  it('returns hours ago', () => {
    const date = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe('3h ago');
  });

  it('returns days ago for less than a week', () => {
    const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe('2d ago');
  });

  it('returns localized date for a week or more', () => {
    const date = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const result = formatRelativeTime(date);
    expect(result).not.toMatch(/ago$/);
  });
});

describe('truncateText', () => {
  it('returns text unchanged when within maxLength', () => {
    expect(truncateText('hello', 10)).toBe('hello');
  });

  it('truncates long text with ellipsis', () => {
    const result = truncateText('This is a very long sentence', 10);
    expect(result).toBe('This is...');
    expect(result.length).toBe(10);
  });
});

describe('debounce', () => {
  it('calls the function after the wait period', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('arg');
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith('arg');
    vi.useRealTimers();
  });

  it('coalesces rapid calls into a single invocation', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    vi.advanceTimersByTime(50);
    debounced();
    vi.advanceTimersByTime(50);
    debounced();
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});

describe('throttle', () => {
  it('invokes immediately and then respects the limit', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    expect(fn).toHaveBeenCalledTimes(1);

    throttled();
    throttled();
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);

    throttled();
    expect(fn).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it('passes the latest arguments to the trailing call', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled('first');
    throttled('second');
    throttled('third');

    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenNthCalledWith(1, 'first');
    expect(fn).toHaveBeenNthCalledWith(2, 'third');
    vi.useRealTimers();
  });
});