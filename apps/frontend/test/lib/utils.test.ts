import { describe, expect, it } from 'vitest';

import { cn, formatRelativeTime, getInitials, truncateText } from '@/lib/utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('ignores falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b');
  });

  it('resolves tailwind conflicts', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});

describe('formatRelativeTime', () => {
  it('returns "just now" for recent dates', () => {
    expect(formatRelativeTime(new Date())).toBe('just now');
  });

  it('returns minutes ago', () => {
    const date = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe('5m ago');
  });

  it('returns hours ago', () => {
    const date = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe('2h ago');
  });

  it('returns days ago', () => {
    const date = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe('3d ago');
  });

  it('returns a localized date for older times', () => {
    const date = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const result = formatRelativeTime(date);
    expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
  });
});

describe('truncateText', () => {
  it('does not truncate short text', () => {
    expect(truncateText('short', 10)).toBe('short');
  });

  it('truncates long text to maxLength', () => {
    const result = truncateText('A much longer message than expected', 10);
    expect(result).toBe('A much ...');
    expect(result.length).toBe(10);
  });

  it('truncates at exact boundary plus ellipsis', () => {
    const result = truncateText('abcdefghij', 5);
    expect(result).toBe('ab...');
  });
});

describe('getInitials', () => {
  it('returns two initials from a two-part name', () => {
    expect(getInitials('Jane Doe')).toBe('JD');
  });

  it('returns single initial for single-name input', () => {
    expect(getInitials('Cher')).toBe('C');
  });

  it('caps initials at two characters', () => {
    expect(getInitials('John Jacob Jingleheimer Smith')).toBe('JJ');
  });

  it('returns "?" for undefined, null, empty, or whitespace-only input', () => {
    expect(getInitials(undefined)).toBe('?');
    expect(getInitials(null)).toBe('?');
    expect(getInitials('')).toBe('?');
    expect(getInitials('   ')).toBe('?');
  });

  it('handles names with extra whitespace', () => {
    expect(getInitials('  Jane   Doe  ')).toBe('JD');
  });
});