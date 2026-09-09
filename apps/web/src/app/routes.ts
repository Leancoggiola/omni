import { loginRoute } from '@/features/auth';
import { homeRoute } from '@/features/home';
import { mediaRoute } from '@/features/media';
import { profileRoute } from '@/features/profile';
import { splitExpensesRoute } from '@/features/split-expenses';

export const protectedRoutes = [homeRoute, mediaRoute, splitExpensesRoute, profileRoute];
export const guestRoutes = [loginRoute];
