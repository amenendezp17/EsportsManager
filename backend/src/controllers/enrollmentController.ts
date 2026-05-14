import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase';

export const enrollmentController = {
  async enrollInTournament(req: Request, res: Response): Promise<any> {
    try {
      if (!req.user) return res.status(401).json({ error: 'Usuario no autenticado' });

      const { id: tournamentId } = req.params;
      const userId = req.user.id;

      const { data: tournament, error: tError } = await supabase
        .from('tournaments')
        .select('id, name, game, status')
        .eq('id', tournamentId)
        .single();

      if (tError || !tournament) return res.status(404).json({ error: 'Torneo no encontrado' });
      if (tournament.status !== 'open') {
        return res.status(400).json({ error: 'El torneo no está abierto para inscripciones' });
      }

      const { data: existing } = await supabase
        .from('tournament_enrollments')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) return res.status(400).json({ error: 'Ya estás inscrito en este torneo' });

      const { data, error } = await supabaseAdmin
        .from('tournament_enrollments')
        .insert({ tournament_id: tournamentId, user_id: userId, game: tournament.game })
        .select()
        .single();

      if (error) return res.status(400).json({ error: error.message });

      return res.status(201).json({ message: 'Inscripción realizada correctamente', enrollment: data });
    } catch {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  async unenrollFromTournament(req: Request, res: Response): Promise<any> {
    try {
      if (!req.user) return res.status(401).json({ error: 'Usuario no autenticado' });

      const { id: tournamentId } = req.params;

      const { error } = await supabaseAdmin
        .from('tournament_enrollments')
        .delete()
        .eq('tournament_id', tournamentId)
        .eq('user_id', req.user.id);

      if (error) return res.status(400).json({ error: error.message });

      return res.json({ message: 'Inscripción cancelada' });
    } catch {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  async getMyEnrollments(req: Request, res: Response): Promise<any> {
    try {
      if (!req.user) return res.status(401).json({ error: 'Usuario no autenticado' });

      const { data, error } = await supabase
        .from('tournament_enrollments')
        .select('*, tournaments(*)')
        .eq('user_id', req.user.id);

      if (error) return res.status(400).json({ error: error.message });

      return res.json(data);
    } catch {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  async getEnrollmentStatus(req: Request, res: Response): Promise<any> {
    try {
      if (!req.user) return res.status(401).json({ error: 'Usuario no autenticado' });

      const { id: tournamentId } = req.params;

      const { data } = await supabase
        .from('tournament_enrollments')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('user_id', req.user.id)
        .maybeSingle();

      return res.json({ isEnrolled: !!data });
    } catch {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },
};
