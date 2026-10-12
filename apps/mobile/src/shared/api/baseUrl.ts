import { ApiError } from './ApiError';

function getBaseUrl(): string {
  const base = (typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_API_URL : undefined)?.replace(/\/$/, '');
  if (!base) {
    throw new ApiError('Falta EXPO_PUBLIC_API_URL (ej. http://192.168.x.x:3000). Ver apps/mobile/README.md', 0);
  }
  return base;
}

export function toUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${getBaseUrl()}${path}`;
}
