import { adminRoute } from '@/features/admin';
import { loginRoute } from '@/features/auth';
import { homeRoute } from '@/features/home';
import { mediaRoute } from '@/features/media';
import { profileRoute } from '@/features/profile';
import { splitExpensesRoute } from '@/features/split-expenses';

export const protectedRoutes = [homeRoute, mediaRoute, splitExpensesRoute, profileRoute, adminRoute];
export const guestRoutes = [loginRoute];
