import { Router } from 'express';
import { tournamentController } from '../controllers/tournamentController';
import { authenticateToken } from '../middleware/auth';
import { authorize } from '../middleware/authorization';

const router = Router();

// Rutas públicas
router.get('/', tournamentController.getAllTournaments);
router.get('/:id', tournamentController.getTournamentById);

// Rutas autenticadas
router.post('/', authenticateToken, authorize('manager', 'admin'), tournamentController.createTournament);
router.put('/:id', authenticateToken, tournamentController.updateTournament);
router.delete('/:id', authenticateToken, tournamentController.deleteTournament);

export default router;
