import { Router } from 'express';
import { playerController } from '../controllers/playerController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public endpoints
router.get('/', playerController.getAllPlayers);
router.get('/:id', playerController.getPlayerById);
router.get('/user/:userId', playerController.getPlayerByUserId);

// Protected endpoints
router.get('/my/profile', authenticateToken, playerController.getMyProfile);
router.put('/my/profile', authenticateToken, playerController.updateMyProfile);
router.post('/', authenticateToken, playerController.createPlayer);
router.put('/:id', authenticateToken, playerController.updatePlayer);
router.delete('/:id', authenticateToken, playerController.deletePlayer);

export default router;
