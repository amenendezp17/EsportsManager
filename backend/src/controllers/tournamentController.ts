import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase';

export const tournamentController = {
  async getAllTournaments(req: Request, res: Response): Promise<any> {
    try {
      const { game, status } = req.query;

      let query = supabase.from('tournaments').select('*');

      if (game) {
        query = query.eq('game', game);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.json(data);
    } catch (error) {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  async getTournamentById(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return res.status(404).json({ error: 'Torneo no encontrado' });
      }

      return res.json(data);
    } catch (error) {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  async createTournament(req: Request, res: Response): Promise<any> {
    try {
      console.log('📝 Creating tournament request:', req.body);
      
      if (!req.user) {
        console.log('❌ User not authenticated');
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      console.log('👤 Authenticated user:', { id: req.user.id, role: req.user.role });

      const {
        name,
        game,
        participants,
        registrationDeadline,
        startDate,
        hasPricePool,
        firstPlace,
        secondPlace,
        thirdPlace,
        challongeUrl,
        description,
      } = req.body;

      if (!name || !game || !participants || !registrationDeadline || !startDate) {
        console.log('❌ Missing required fields');
        return res.status(400).json({ error: 'Faltan datos requeridos' });
      }

      // Validar que registrationDeadline sea anterior a startDate
      const regDate = new Date(registrationDeadline);
      const startDt = new Date(startDate);

      console.log('📅 Dates:', { registrationDeadline: regDate, startDate: startDt });

      if (startDt <= regDate) {
        console.log('❌ Invalid dates: start date must be after registration deadline');
        return res.status(400).json({
          error: 'La fecha de inicio debe ser posterior a la fecha límite de inscripciones',
        });
      }

      const tournamentData = {
        name,
        game,
        participants,
        registration_deadline: registrationDeadline,
        start_date: startDate,
        status: 'open',
        has_price_pool: hasPricePool || false,
        first_place: firstPlace,
        second_place: secondPlace,
        third_place: thirdPlace,
        challonge_url: challongeUrl,
        description,
        creator_id: req.user.id,
      };

      console.log('💾 Inserting tournament to DB:', tournamentData);

      const { data, error } = await supabaseAdmin
        .from('tournaments')
        .insert(tournamentData)
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase error:', error);
        return res.status(400).json({ error: error.message });
      }

      console.log('✅ Tournament created successfully:', data);
      return res.status(201).json(data);
    } catch (error) {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  async updateTournament(req: Request, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const { id } = req.params;
      const updateData = req.body;

      // Verificar que es el creador o admin
      const { data: tournament, error: fetchError } = await supabaseAdmin
        .from('tournaments')
        .select('creator_id')
        .eq('id', id)
        .single();

      if (fetchError) {
        return res.status(404).json({ error: 'Torneo no encontrado' });
      }

      if (tournament.creator_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'No tienes permisos para editar este torneo' });
      }

      const { data, error } = await supabaseAdmin
        .from('tournaments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.json(data);
    } catch (error) {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  async deleteTournament(req: Request, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const { id } = req.params;

      // Verificar que es el creador o admin
      const { data: tournament, error: fetchError } = await supabaseAdmin
        .from('tournaments')
        .select('creator_id')
        .eq('id', id)
        .single();

      if (fetchError) {
        return res.status(404).json({ error: 'Torneo no encontrado' });
      }

      if (tournament.creator_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'No tienes permisos para eliminar este torneo' });
      }

      const { error } = await supabaseAdmin.from('tournaments').delete().eq('id', id);

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.json({ message: 'Torneo eliminado' });
    } catch (error) {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },
};
