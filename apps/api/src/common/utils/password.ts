import * as bcrypt from 'bcrypt';

export const BCRYPT_ROUNDS = 12;

/** Único punto donde se hashea una contraseña: API y seed comparten el costo. */
export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}
