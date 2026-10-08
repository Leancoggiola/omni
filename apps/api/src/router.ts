import { Router } from 'express';
import authRoutes from './auth/auth.routes';
import mediaRoutes from './media/media.routes';
import usersRoutes from './users/users.routes';
import adminRoutes from './admin/admin.routes';
import gymRoutes from './gym/gym.routes';
import pantryRoutes from './pantry/pantry.routes';
import splitExpensesRoutes from './split-expenses/split-expenses.routes';
import expensesRoutes from './expenses/expenses.routes';
import notificationsRoutes from './notifications/notifications.routes';
import holidaysRoutes from './holidays/holidays.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/media', mediaRoutes);
router.use('/users', usersRoutes);
router.use('/admin', adminRoutes);
router.use('/gym', gymRoutes);
router.use('/pantry', pantryRoutes);
router.use('/split-expenses', splitExpensesRoutes);
router.use('/expenses', expensesRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/holidays', holidaysRoutes);

export default router;
