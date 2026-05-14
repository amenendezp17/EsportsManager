import { Router } from 'express';
import { notificationController } from '../controllers/notificationController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/my', authenticateToken, notificationController.getMyNotifications);
router.patch('/:id/read', authenticateToken, notificationController.markAsRead);
router.patch('/read-all', authenticateToken, notificationController.markAllAsRead);

export default router;
