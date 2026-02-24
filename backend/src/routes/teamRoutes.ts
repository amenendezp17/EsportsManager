import { Router } from 'express';
import { teamController } from '../controllers/teamController';
import { authenticateToken } from '../middleware/auth';
import { authorize } from '../middleware/authorization';

const router = Router();

// Rutas públicas
router.get('/', teamController.getAllTeams);
router.get('/:id', teamController.getTeamById);

// Rutas autenticadas
router.get('/my/team', authenticateToken, authorize('manager'), teamController.getMyTeam);
router.post('/', authenticateToken, authorize('manager', 'admin'), teamController.createTeam);
router.put('/:id', authenticateToken, teamController.updateTeam);
router.delete('/:id', authenticateToken, teamController.deleteTeam);

// Gestión de solicitudes
router.get('/:id/requests', authenticateToken, authorize('manager'), teamController.getTeamRequests);
router.post('/requests/:requestId/respond', authenticateToken, authorize('manager'), teamController.respondToRequest);

// Gestión de jugadores
router.delete('/:teamId/players/:playerId', authenticateToken, authorize('manager'), teamController.removePlayer);

export default router;
