import { Router } from 'express';
import { teamController } from '../controllers/teamController';
import { authenticateToken } from '../middleware/auth';
import { authorize } from '../middleware/authorization';

const router = Router();

// Rutas específicas ANTES que las dinámicas (/:id capturaría "my", "requests", etc.)
router.get('/my/team', authenticateToken, authorize('manager', 'admin'), teamController.getMyTeam);
router.post('/requests/:requestId/respond', authenticateToken, authorize('manager', 'admin'), teamController.respondToRequest);

// Rutas públicas
router.get('/', teamController.getAllTeams);
router.get('/:id', teamController.getTeamById);

// Rutas autenticadas con parámetro dinámico
router.post('/:id/request', authenticateToken, authorize('player'), teamController.sendJoinRequest);
router.get('/:id/requests', authenticateToken, authorize('manager', 'admin'), teamController.getTeamRequests);
router.delete('/:teamId/players/:playerId', authenticateToken, authorize('manager', 'admin'), teamController.removePlayer);

// CRUD de equipos
router.post('/', authenticateToken, authorize('manager', 'admin'), teamController.createTeam);
router.put('/:id', authenticateToken, teamController.updateTeam);
router.delete('/:id', authenticateToken, teamController.deleteTeam);

export default router;
