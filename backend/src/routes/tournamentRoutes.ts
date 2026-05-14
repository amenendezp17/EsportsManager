import { Router } from 'express';
import { tournamentController } from '../controllers/tournamentController';
import { enrollmentController } from '../controllers/enrollmentController';
import { authenticateToken } from '../middleware/auth';
import { authorize } from '../middleware/authorization';

const router = Router();

// Rutas públicas
router.get('/', tournamentController.getAllTournaments);

// Rutas autenticadas específicas — deben ir ANTES de /:id
router.get('/my/enrollments', authenticateToken, enrollmentController.getMyEnrollments);

// Rutas públicas con parámetro
router.get('/:id', tournamentController.getTournamentById);

// Rutas autenticadas con parámetro
router.get('/:id/enrollment-status', authenticateToken, enrollmentController.getEnrollmentStatus);
router.post('/:id/enroll', authenticateToken, enrollmentController.enrollInTournament);
router.delete('/:id/enroll', authenticateToken, enrollmentController.unenrollFromTournament);

// CRUD autenticado
router.post('/', authenticateToken, authorize('manager', 'admin'), tournamentController.createTournament);
router.put('/:id', authenticateToken, tournamentController.updateTournament);
router.delete('/:id', authenticateToken, tournamentController.deleteTournament);

export default router;
