import type { Role } from '../../generated/prisma/client';

declare global {
  namespace Express {
    /** Identidad que arma la estrategia `jwt` a partir del access token: es lo que ven las rutas autenticadas. */
    interface User {
      userId: string;
      username: string;
      role: Role;
    }
  }
}
