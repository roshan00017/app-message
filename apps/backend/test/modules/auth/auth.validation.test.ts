import { loginSchema, registerSchema } from '@/modules/auth/auth.validation.js';

describe('registerSchema', () => {
  it('accepts a valid registration payload', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      name: 'Jane Doe',
      password: 'Password1',
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = registerSchema.safeParse({
      email: 'not-an-email',
      name: 'Jane Doe',
      password: 'Password1',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Invalid email format');
    }
  });

  it('rejects a name shorter than 2 characters', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      name: 'J',
      password: 'Password1',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('at least 2 characters');
    }
  });

  it('rejects passwords shorter than 8 characters', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      name: 'Jane Doe',
      password: 'Short1',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes('at least 8'))).toBe(true);
    }
  });

  it('rejects passwords without uppercase character', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      name: 'Jane Doe',
      password: 'password1',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message.includes('uppercase'))
      ).toBe(true);
    }
  });

  it('rejects passwords without lowercase character', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      name: 'Jane Doe',
      password: 'PASSWORD1',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message.includes('lowercase'))
      ).toBe(true);
    }
  });

  it('rejects passwords without a number', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      name: 'Jane Doe',
      password: 'Password',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message.includes('number'))
      ).toBe(true);
    }
  });
});

describe('loginSchema', () => {
  it('accepts valid login credentials', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'anything',
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid email format', () => {
    const result = loginSchema.safeParse({
      email: 'bad',
      password: 'anything',
    });

    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '',
    });

    expect(result.success).toBe(false);
  });
});