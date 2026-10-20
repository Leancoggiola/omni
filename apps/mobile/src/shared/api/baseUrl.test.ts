import { toUrl } from './baseUrl';

describe('toUrl', () => {
  const original = process.env.EXPO_PUBLIC_API_URL;

  afterEach(() => {
    if (original === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = original;
  });

  it('antepone la base de la API, sin la barra final', () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://api.test:3000/';
    expect(toUrl('/api/health')).toBe('http://api.test:3000/api/health');
  });

  it('siempre cuelga el path de la base de la API', () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://api.test:3000';
    expect(toUrl('/api/media?x=1')).toBe('http://api.test:3000/api/media?x=1');
  });

  it('sin EXPO_PUBLIC_API_URL tira un ApiError', () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    expect(() => toUrl('/api/health')).toThrow('Falta EXPO_PUBLIC_API_URL');
  });
});
