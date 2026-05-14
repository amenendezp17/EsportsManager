import { Router } from 'express';
import { playerController } from '../controllers/playerController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Rutas específicas ANTES que las dinámicas (/:id capturaría "my", "user", etc.)
router.get('/my/profile', authenticateToken, playerController.getMyProfile);
router.put('/my/profile', authenticateToken, playerController.updateMyProfile);
router.delete('/my/leave-team', authenticateToken, playerController.leaveMyTeam);
router.get('/my/join-requests', authenticateToken, playerController.getMyJoinRequests);
router.get('/user/:userId', playerController.getPlayerByUserId);

// Rutas públicas dinámicas
router.get('/', playerController.getAllPlayers);
router.get('/:id', playerController.getPlayerById);

// Rutas autenticadas
router.post('/', authenticateToken, playerController.createPlayer);
router.put('/:id', authenticateToken, playerController.updatePlayer);
router.patch('/:id/role', authenticateToken, playerController.updatePlayerRole);
router.delete('/:id', authenticateToken, playerController.deletePlayer);

export default router;
