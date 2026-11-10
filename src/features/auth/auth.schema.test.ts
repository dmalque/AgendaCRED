import { describe, expect, it } from 'vitest';
import { authMessage, loginSchema, passwordSchema } from './auth.schema';

describe('access validation', () => {
  it.each([
    [5, false],
    [6, true],
    [128, true],
    [129, false],
  ])('checks password length %i', (length, expected) => {
    const password = 'a'.repeat(length as number);
    expect(passwordSchema.safeParse({ password, confirmation: password }).success).toBe(expected);
  });

  it('normalizes username without modifying the password', () => {
    expect(loginSchema.parse({ username: '  Ana.Perez ', password: ' Keep spaces ' })).toEqual({
      username: 'ana.perez',
      password: ' Keep spaces ',
    });
  });
  it('rejects missing credentials', () => {
    expect(loginSchema.safeParse({ username: 'invalid', password: '' }).success).toBe(false);
  });
  it('permits existing passwords shorter than the new-password policy', () => {
    expect(loginSchema.safeParse({ username: 'ana.perez', password: 'old' }).success).toBe(true);
    expect(passwordSchema.safeParse({ password: 'old', confirmation: 'old' }).success).toBe(false);
  });
  it('rejects mismatched new passwords', () => {
    expect(
      passwordSchema.safeParse({
        password: 'A long password 123',
        confirmation: 'Different password',
      }).success,
    ).toBe(false);
  });
  it('does not expose raw authentication errors', () => {
    expect(
      authMessage({ code: 'invalid_credentials', message: 'internal secret detail' }),
    ).not.toContain('internal');
    expect(authMessage({ code: 'over_request_rate_limit' })).toContain('Demasiados intentos');
  });
});
