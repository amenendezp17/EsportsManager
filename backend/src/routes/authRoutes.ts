import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Rutas públicas
router.post('/signup', authController.signup);
router.post('/login', authController.login);

// Rutas autenticadas
router.post('/logout', authenticateToken, authController.logout);
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, authController.updateProfile);
router.delete('/users/:id', authenticateToken, authController.deleteUser);

export default router;
