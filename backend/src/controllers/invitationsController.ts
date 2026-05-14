import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { createNotification } from './notificationController';

export const invitationsController = {
  // Jugador: ver invitaciones pendientes
  async getMyInvitations(req: Request, res: Response): Promise<any> {
    try {
      if (!req.user) return res.status(401).json({ error: 'No autenticado' });

      const { data, error } = await supabaseAdmin
        .from('team_join_requests')
        .select('*, team:teams!team_id(id, name, abbreviation, logo_url, game)')
        .eq('player_id', req.user.id)
        .eq('status', 'pending');

      if (error) return res.status(400).json({ error: error.message });

      return res.json(data);
    } catch {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  // Jugador: ver todas las invitaciones (pendientes + historial)
  async getAllMyInvitations(req: Request, res: Response): Promise<any> {
    try {
      if (!req.user) return res.status(401).json({ error: 'No autenticado' });

      const { data, error } = await supabaseAdmin
        .from('team_join_requests')
        .select('*, team:teams!team_id(id, name, abbreviation, logo_url, game)')
        .eq('player_id', req.user.id)
        .order('created_at', { ascending: false });

      if (error) return res.status(400).json({ error: error.message });

      return res.json(data);
    } catch {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  // Jugador: aceptar invitación/solicitud
  async acceptInvitation(req: Request, res: Response): Promise<any> {
    try {
      if (!req.user) return res.status(401).json({ error: 'No autenticado' });

      const { invitationId } = req.params;

      const { data: invitation, error: fetchError } = await supabaseAdmin
        .from('team_join_requests')
        .select('*, team:teams!team_id(id, game)')
        .eq('id', invitationId)
        .eq('player_id', req.user.id)
        .single();

      if (fetchError || !invitation) {
        return res.status(404).json({ error: 'Invitación no encontrada' });
      }

      if (invitation.status !== 'pending') {
        return res.status(400).json({ error: 'Esta invitación ya fue respondida' });
      }

      const { error: updateError } = await supabaseAdmin
        .from('team_join_requests')
        .update({ status: 'accepted' })
        .eq('id', invitationId);

      if (updateError) return res.status(400).json({ error: updateError.message });

      // Asignar el jugador al equipo en la tabla players
      const { error: playerError } = await supabaseAdmin
        .from('players')
        .update({ team_id: invitation.team_id })
        .eq('user_id', req.user.id)
        .eq('game', invitation.team.game);

      if (playerError) {
        console.error('Warning: no se pudo actualizar team del jugador:', playerError);
      }

      const teamData: any = Array.isArray((invitation as any)?.team) ? (invitation as any).team[0] : (invitation as any)?.team;

      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('full_name, email')
        .eq('id', req.user.id)
        .single();

      const playerName = userData?.full_name || userData?.email || 'Un jugador';

      if (teamData?.manager_id) {
        await createNotification(
          teamData.manager_id,
          `${playerName} aceptó la invitación de tu equipo.`
        );
      }

      return res.json({ message: 'Invitación aceptada' });
    } catch {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  // Jugador: rechazar invitación/solicitud
  async rejectInvitation(req: Request, res: Response): Promise<any> {
    try {
      if (!req.user) return res.status(401).json({ error: 'No autenticado' });

      const { invitationId } = req.params;

      const { data: invitation, error: fetchError } = await supabaseAdmin
        .from('team_join_requests')
        .select('id, status, team:teams!team_id(manager_id)')
        .eq('id', invitationId)
        .eq('player_id', req.user.id)
        .single();

      if (fetchError || !invitation) {
        return res.status(404).json({ error: 'Invitación no encontrada' });
      }

      if (invitation.status !== 'pending') {
        return res.status(400).json({ error: 'Esta invitación ya fue respondida' });
      }

      const { error } = await supabaseAdmin
        .from('team_join_requests')
        .update({ status: 'rejected' })
        .eq('id', invitationId);

      if (error) return res.status(400).json({ error: error.message });

      const teamData: any = Array.isArray((invitation as any)?.team) ? (invitation as any).team[0] : (invitation as any)?.team;

      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('full_name, email')
        .eq('id', req.user.id)
        .single();

      const playerName = userData?.full_name || userData?.email || 'Un jugador';

      if (teamData?.manager_id) {
        await createNotification(
          teamData.manager_id,
          `${playerName} rechazó la invitación de tu equipo.`
        );
      }

      return res.json({ message: 'Invitación rechazada' });
    } catch {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  // Manager: enviar invitación a un jugador
  async sendTeamInvitation(req: Request, res: Response): Promise<any> {
    try {
      if (!req.user) return res.status(401).json({ error: 'No autenticado' });

      const { playerId, teamId } = req.body;

      if (!playerId || !teamId) {
        return res.status(400).json({ error: 'Se requieren playerId y teamId' });
      }

      const { data: team, error: teamError } = await supabaseAdmin
        .from('teams')
        .select('id, name, game, manager_id')
        .eq('id', teamId)
        .single();

      if (teamError || !team) {
        return res.status(404).json({ error: 'Equipo no encontrado' });
      }

      if (team.manager_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'No tienes permisos para invitar a este equipo' });
      }

      const { data: player, error: playerError } = await supabaseAdmin
        .from('players')
        .select('id, user_id, game, users:users!user_id(full_name, email)')
        .eq('game', team.game)
        .or(`id.eq.${playerId},user_id.eq.${playerId}`)
        .single();

      if (playerError || !player) {
        return res.status(404).json({ error: 'Jugador no encontrado para este juego' });
      }

      const { error: insertError } = await supabaseAdmin
        .from('team_join_requests')
        .upsert(
          { player_id: player.user_id, team_id: teamId, status: 'pending' },
          { onConflict: 'player_id,team_id', ignoreDuplicates: true }
        );

      if (insertError) {
        return res.status(400).json({ error: insertError.message });
      }

      const playerUser = player.users as any;
      const playerName = playerUser?.full_name || playerUser?.email || 'Jugador';

      await createNotification(
        player.user_id,
        `Tienes una invitación para unirte a ${team.name}`
      );

      return res.status(201).json({
        message: 'Invitación enviada',
        playerName,
        teamName: team.name,
      });
    } catch {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },
};
