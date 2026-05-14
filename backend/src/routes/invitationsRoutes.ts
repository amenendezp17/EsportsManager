import { Router } from 'express';
import { invitationsController } from '../controllers/invitationsController';
import { authenticateToken } from '../middleware/auth';
import { authorize } from '../middleware/authorization';

const router = Router();

// Jugador: consultar sus invitaciones/solicitudes
router.get('/my-invitations', authenticateToken, authorize('player'), invitationsController.getMyInvitations);
router.get('/all-invitations', authenticateToken, authorize('player'), invitationsController.getAllMyInvitations);

// Jugador: responder a invitación
router.patch('/:invitationId/accept', authenticateToken, authorize('player'), invitationsController.acceptInvitation);
router.patch('/:invitationId/reject', authenticateToken, authorize('player'), invitationsController.rejectInvitation);

// Manager: enviar invitación a un jugador
router.post('/send', authenticateToken, authorize('manager', 'admin'), invitationsController.sendTeamInvitation);

export default router;
