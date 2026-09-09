/**
 * Valores compartidos por la config de Playwright y los fixtures.
 * Las credenciales del admin deben coincidir con `apps/api/.env.e2e`, que es lo que consume el seed.
 */

export const WEB_URL = 'http://localhost:5173';
export const API_URL = 'http://localhost:3000';
export const TMDB_STUB_URL = 'http://127.0.0.1:3199';

export const ADMIN = {
  username: 'e2eadmin',
  password: 'e2eadminpassword',
};

/** usernameSchema exige 6-20 caracteres alfanuméricos, sin guiones ni guiones bajos. */
export function workerUsername(workerIndex: number): string {
  return `e2eworker${workerIndex}`;
}

export const WORKER_PASSWORD = 'e2eworkerpassword';
