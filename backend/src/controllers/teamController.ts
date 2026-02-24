import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase';

export const teamController = {
  async getAllTeams(req: Request, res: Response): Promise<any> {
    try {
      const { game } = req.query;

      let query = supabase.from('teams').select('*');

      if (game) {
        query = query.eq('game', game);
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

  async getTeamById(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          players:players(*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        return res.status(404).json({ error: 'Equipo no encontrado' });
      }

      return res.json(data);
    } catch (error) {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  async createTeam(req: Request, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const { name, abbreviation, logoUrl, description, game } = req.body;

      // Validar campos requeridos
      if (!name || !abbreviation || !game) {
        return res.status(400).json({ error: 'Faltan datos requeridos: name, abbreviation, game' });
      }

      // Validar que la abreviatura sea de 3 letras mayúsculas
      if (!/^[A-Z]{3}$/.test(abbreviation)) {
        return res.status(400).json({ error: 'La abreviatura debe ser de 3 letras mayúsculas' });
      }

      // Verificar si el manager ya tiene un equipo en este juego
      const { data: existingTeam } = await supabaseAdmin
        .from('teams')
        .select('id')
        .eq('manager_id', req.user.id)
        .eq('game', game)
        .single();

      if (existingTeam) {
        return res.status(400).json({ error: 'Ya tienes un equipo en este juego' });
      }

      console.log('📝 Creating team:', { name, abbreviation, game, manager_id: req.user.id });

      const { data, error } = await supabaseAdmin
        .from('teams')
        .insert({
          name,
          abbreviation,
          logo_url: logoUrl,
          description,
          game,
          manager_id: req.user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating team:', error);
        return res.status(400).json({ error: error.message });
      }

      console.log('✅ Team created successfully:', data);

      // Crear automáticamente un registro de player para el manager
      const { data: playerData, error: playerError } = await supabaseAdmin
        .from('players')
        .insert({
          user_id: req.user.id,
          team_id: data.id,
          game: game,
          role: 'Manager', // Rol especial para identificar que es el manager
        })
        .select()
        .single();

      if (playerError) {
        console.error('⚠️ Warning: Could not create player record for manager:', playerError);
        // No falla la creación del equipo si falla crear el jugador
      } else {
        console.log('✅ Manager added as player:', playerData);
      }

      return res.status(201).json(data);
    } catch (error) {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  async updateTeam(req: Request, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const { id } = req.params;
      const { name, abbreviation, logoUrl, description } = req.body;

      // Validar abreviatura si se proporciona
      if (abbreviation && !/^[A-Z]{3}$/.test(abbreviation)) {
        return res.status(400).json({ error: 'La abreviatura debe ser de 3 letras mayúsculas' });
      }

      // Verificar que es el manager o admin
      const { data: team, error: fetchError } = await supabase
        .from('teams')
        .select('manager_id')
        .eq('id', id)
        .single();

      if (fetchError) {
        return res.status(404).json({ error: 'Equipo no encontrado' });
      }

      if (team.manager_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'No tienes permisos para editar este equipo' });
      }

      const updateData: any = {};
      if (name) updateData.name = name;
      if (abbreviation) updateData.abbreviation = abbreviation;
      if (logoUrl !== undefined) updateData.logo_url = logoUrl;
      if (description !== undefined) updateData.description = description;

      const { data, error } = await supabase
        .from('teams')
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

  async deleteTeam(req: Request, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const { id } = req.params;

      // Verificar que es el manager o admin
      const { data: team, error: fetchError } = await supabase
        .from('teams')
        .select('manager_id')
        .eq('id', id)
        .single();

      if (fetchError) {
        return res.status(404).json({ error: 'Equipo no encontrado' });
      }

      if (team.manager_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'No tienes permisos para eliminar este equipo' });
      }

      console.log('🗑️ Deleting team:', id);

      const { error } = await supabaseAdmin.from('teams').delete().eq('id', id);

      if (error) {
        console.error('❌ Error deleting team:', error);
        return res.status(400).json({ error: error.message });
      }

      console.log('✅ Team deleted successfully');
      return res.json({ message: 'Equipo eliminado' });
    } catch (error) {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  // Obtener el equipo del manager actual
  async getMyTeam(req: Request, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const { game } = req.query;

      let query = supabase
        .from('teams')
        .select(`
          *,
          players:players(*)
        `)
        .eq('manager_id', req.user.id);

      if (game) {
        query = query.eq('game', game);
      }

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'No tienes equipo en este juego' });
        }
        return res.status(400).json({ error: error.message });
      }

      return res.json(data);
    } catch (error) {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  // Obtener solicitudes de un equipo
  async getTeamRequests(req: Request, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const { id } = req.params;

      // Verificar que es el manager del equipo
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('manager_id')
        .eq('id', id)
        .single();

      if (teamError || team.manager_id !== req.user.id) {
        return res.status(403).json({ error: 'No tienes permisos para ver las solicitudes de este equipo' });
      }

      const { data, error } = await supabase
        .from('team_join_requests')
        .select(`
          *,
          player:users!player_id(*)
        `)
        .eq('team_id', id)
        .eq('status', 'pending');

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.json(data);
    } catch (error) {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  // Aceptar o rechazar solicitud
  async respondToRequest(req: Request, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const { requestId } = req.params;
      const { action } = req.body; // 'accept' o 'reject'

      if (!['accept', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Acci\u00f3n inv\u00e1lida' });
      }

      // Obtener la solicitud
      const { data: request, error: requestError } = await supabase
        .from('team_join_requests')
        .select('*, team:teams!team_id(manager_id)')
        .eq('id', requestId)
        .single();

      if (requestError || !request) {
        return res.status(404).json({ error: 'Solicitud no encontrada' });
      }

      // Verificar que es el manager del equipo
      if (request.team.manager_id !== req.user.id) {
        return res.status(403).json({ error: 'No tienes permisos' });
      }

      const newStatus = action === 'accept' ? 'accepted' : 'rejected';

      // Actualizar el estado de la solicitud
      const { error: updateError } = await supabase
        .from('team_join_requests')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (updateError) {
        return res.status(400).json({ error: updateError.message });
      }

      // Si se acepta, agregar al jugador al equipo
      if (action === 'accept') {
        const { error: playerError } = await supabase
          .from('players')
          .update({ team_id: request.team_id })
          .eq('user_id', request.player_id);

        if (playerError) {
          return res.status(400).json({ error: 'Error al agregar jugador al equipo' });
        }
      }

      return res.json({ message: `Solicitud ${newStatus}` });
    } catch (error) {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  // Eliminar jugador del equipo
  async removePlayer(req: Request, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const { teamId, playerId } = req.params;

      // Verificar que es el manager del equipo
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('manager_id')
        .eq('id', teamId)
        .single();

      if (teamError || team.manager_id !== req.user.id) {
        return res.status(403).json({ error: 'No tienes permisos para eliminar jugadores de este equipo' });
      }

      // Eliminar al jugador del equipo (poner team_id a null)
      const { error } = await supabase
        .from('players')
        .update({ team_id: null })
        .eq('id', playerId)
        .eq('team_id', teamId);

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.json({ message: 'Jugador eliminado del equipo' });
    } catch (error) {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  }
};
