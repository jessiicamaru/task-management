import { formatEnvErrors, parseEnv } from './env';

describe('parseEnv', () => {
  it('accepts an absolute API URL', () => {
    expect(parseEnv({ VITE_API_URL: 'http://localhost:3000' })).toEqual({
      ok: true,
      env: { VITE_API_URL: 'http://localhost:3000' },
    });
  });

  it.each([undefined, ''])('names VITE_API_URL as required when it is %j', (value) => {
    expect(parseEnv({ VITE_API_URL: value })).toEqual({
      ok: false,
      errors: ['VITE_API_URL: required'],
    });
  });

  it('rejects a value that is not a URL without echoing it', () => {
    const result = parseEnv({ VITE_API_URL: 'localhost-3000' });

    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain('localhost-3000');
  });

  it('formats errors with a pointer to .env.example', () => {
    expect(formatEnvErrors(['VITE_API_URL: required'])).toContain('web/.env.example');
  });
});
