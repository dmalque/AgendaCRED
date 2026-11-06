import { describe, expect, it } from 'vitest';
import { authMessage, loginSchema, passwordSchema } from './auth.schema';

describe('access validation', () => {
  it('normalizes email without modifying the password', () => {
    expect(loginSchema.parse({ email: '  Enfermera@Centro.pe ', password: ' Keep spaces ' })).toEqual({ email: 'enfermera@centro.pe', password: ' Keep spaces ' });
  });
  it('rejects missing credentials', () => {
    expect(loginSchema.safeParse({ email: 'invalid', password: '' }).success).toBe(false);
  });
  it('permits existing passwords shorter than the new-password policy', () => {
    expect(loginSchema.safeParse({ email: 'ana@centro.pe', password: 'old-pass' }).success).toBe(true);
    expect(passwordSchema.safeParse({ password: 'old-pass', confirmation: 'old-pass' }).success).toBe(false);
  });
  it('rejects mismatched new passwords', () => {
    expect(passwordSchema.safeParse({ password: 'A long password 123', confirmation: 'Different password' }).success).toBe(false);
  });
  it('does not expose raw authentication errors', () => {
    expect(authMessage({ code: 'invalid_credentials', message: 'internal secret detail' })).not.toContain('internal');
    expect(authMessage({ code: 'over_request_rate_limit' })).toContain('Demasiados intentos');
  });
});
