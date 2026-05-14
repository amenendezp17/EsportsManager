import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase';
import { createNotification } from './notificationController';

export const playerController = {
  async getAllPlayers(req: Request, res: Response): Promise<any> {
    try {
      // Primero obtener todos los jugadores
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('*');

      if (playersError) {
        console.error('❌ Error getting players:', playersError);
        return res.status(400).json({ error: playersError.message });
      }

      // Luego obtener todos los usuarios con el cliente admin para bypassear RLS
      const { data: users, error: usersError } = await supabaseAdmin
        .from('users')
        .select('id, email, full_name, role');

      if (usersError) {
        return res.status(400).json({ error: usersError.message });
      }

      // Crear un mapa de usuarios por ID para búsqueda rápida
      const usersMap = new Map(users?.map(u => [u.id, u]) || []);

      // Combinar los datos
      const playersWithUsers = players?.map(player => ({
        ...player,
        users: usersMap.get(player.user_id) || null
      })) || [];
      
      return res.json(playersWithUsers);
    } catch (error: any) {
      console.error('Error en getAllPlayers:', error);
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  async getPlayerById(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from('players')
        .select(`
          id,
          user_id,
          team_id,
          game,
          role,
          rank,
          created_at,
          updated_at,
          users!players_user_id_fkey (
            id,
            email,
            full_name,
            role
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.json(data);
    } catch (error: any) {
      console.error('Error en getPlayerById:', error);
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  async getPlayerByUserId(req: Request, res: Response): Promise<any> {
    try {
      const { userId } = req.params;

      const { data, error } = await supabase
        .from('players')
        .select(`
          id,
          user_id,
          team_id,
          game,
          role,
          rank,
          created_at,
          updated_at,
          users!players_user_id_fkey (
            id,
            email,
            full_name,
            role
          )
        `)
        .eq('user_id', userId);

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.json(data);
    } catch (error: any) {
      console.error('Error en getPlayerByUserId:', error);
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  async createPlayer(req: Request, res: Response): Promise<any> {
    try {
      const { game, role, rank } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      if (!game) {
        return res.status(400).json({ error: 'El juego es requerido' });
      }

      // Check if player already exists for this user and game
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('id')
        .eq('user_id', userId)
        .eq('game', game)
        .single();

      if (existingPlayer) {
        return res.status(409).json({ error: 'Este jugador ya existe para este juego' });
      }

      // Create player
      const { data, error } = await supabaseAdmin
        .from('players')
        .insert({
          user_id: userId,
          game,
          role: role || null,
          rank: rank || null,
        })
        .select(`
          id,
          user_id,
          team_id,
          game,
          role,
          rank,
          created_at,
          updated_at,
          users!players_user_id_fkey (
            id,
            email,
            full_name,
            role
          )
        `)
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(201).json({
        message: 'Jugador creado exitosamente',
        data,
      });
    } catch (error: any) {
      console.error('Error en createPlayer:', error);
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  async updatePlayer(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const { game, role, rank, team_id } = req.body;
      const userId = (req as any).user?.id;

      // Verify player belongs to current user or is admin
      const { data: player } = await supabase
        .from('players')
        .select('user_id')
        .eq('id', id)
        .single();

      if (!player) {
        return res.status(404).json({ error: 'Jugador no encontrado' });
      }

      const userRole = (req as any).user?.role;
      if (player.user_id !== userId && userRole !== 'admin') {
        return res.status(403).json({ error: 'No tienes permisos para actualizar este jugador' });
      }

      const { data, error } = await supabaseAdmin
        .from('players')
        .update({
          game: game || undefined,
          role: role !== undefined ? role : undefined,
          rank: rank !== undefined ? rank : undefined,
          team_id: team_id !== undefined ? team_id : undefined,
        })
        .eq('id', id)
        .select(`
          id,
          user_id,
          team_id,
          game,
          role,
          rank,
          created_at,
          updated_at,
          users!players_user_id_fkey (
            id,
            email,
            full_name,
            role
          )
        `)
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.json({
        message: 'Jugador actualizado exitosamente',
        data,
      });
    } catch (error: any) {
      console.error('Error en updatePlayer:', error);
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  async deletePlayer(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      // Verify player belongs to current user or is admin
      const { data: player } = await supabase
        .from('players')
        .select('user_id')
        .eq('id', id)
        .single();

      if (!player) {
        return res.status(404).json({ error: 'Jugador no encontrado' });
      }

      const userRole = (req as any).user?.role;
      if (player.user_id !== userId && userRole !== 'admin') {
        return res.status(403).json({ error: 'No tienes permisos para eliminar este jugador' });
      }

      const { error } = await supabaseAdmin
        .from('players')
        .delete()
        .eq('id', id);

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.json({ message: 'Jugador eliminado exitosamente' });
    } catch (error: any) {
      console.error('Error en deletePlayer:', error);
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  // Obtener perfil de jugador del usuario actual para un juego específico
  async getMyProfile(req: Request, res: Response): Promise<any> {
    try {
      const userId = (req as any).user?.id;
      const { game } = req.query;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      if (!game) {
        return res.status(400).json({ error: 'El parámetro game es requerido' });
      }

      const { data: profiles, error } = await supabaseAdmin
        .from('players')
        .select('*, team:teams(id, name, abbreviation, game, manager_id)')
        .eq('user_id', userId)
        .eq('game', game)
        .order('created_at', { ascending: false })
        .limit(1);

      let data = profiles?.[0] || null;

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      if (!data) {
        // Auto-create a player profile for any user who doesn't have one yet
        const { data: newProfile, error: createError } = await supabaseAdmin
          .from('players')
          .insert({ user_id: userId, game, role: null, rank: null })
          .select('*, team:teams(id, name, abbreviation, game, manager_id)')
          .single();

        if (createError) {
          return res.status(404).json({ error: 'Perfil de jugador no encontrado' });
        }
        data = newProfile;
      }

      return res.json(data);
    } catch (error: any) {
      console.error('Error en getMyProfile:', error);
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  // Actualizar perfil de jugador del usuario actual
  async updateMyProfile(req: Request, res: Response): Promise<any> {
    try {
      const userId = (req as any).user?.id;
      const { game } = req.query;
      const { role, rank } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      if (!game) {
        return res.status(400).json({ error: 'El parámetro game es requerido' });
      }

      // Buscar el player existente o crear uno nuevo
      const { data: existingPlayers, error: existingPlayersError } = await supabaseAdmin
        .from('players')
        .select('id')
        .eq('user_id', userId)
        .eq('game', game)
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingPlayersError) {
        return res.status(400).json({ error: existingPlayersError.message });
      }

      let existingPlayer = existingPlayers?.[0] || null;

      if (!existingPlayer) {
        const { data: newPlayer, error: createErr } = await supabaseAdmin
          .from('players')
          .insert({ user_id: userId, game, role: null, rank: null })
          .select('id')
          .single();
        if (createErr || !newPlayer) {
          return res.status(500).json({ error: 'No se pudo crear el perfil de jugador' });
        }
        existingPlayer = newPlayer;
      }

      // Actualizar role y rank
      const updateData: any = {};
      if (role !== undefined) updateData.role = role;
      if (rank !== undefined) updateData.rank = rank;

      const { data, error } = await supabaseAdmin
        .from('players')
        .update(updateData)
        .eq('id', existingPlayer.id)
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.json({
        message: 'Perfil actualizado exitosamente',
        data,
      });
    } catch (error: any) {
      console.error('Error en updateMyProfile:', error);
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  async leaveMyTeam(req: Request, res: Response): Promise<any> {
    try {
      const userId = (req as any).user?.id;
      const { game } = req.query;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      if (!game) {
        return res.status(400).json({ error: 'El parámetro game es requerido' });
      }

      const { data: player, error: playerError } = await supabaseAdmin
        .from('players')
        .select('id, team_id, team:teams(id, name, manager_id)')
        .eq('user_id', userId)
        .eq('game', game)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (playerError) {
        return res.status(400).json({ error: playerError.message });
      }

      const teamData: any = Array.isArray((player as any)?.team) ? (player as any).team[0] : (player as any)?.team;

      if (!player || !player.team_id || !teamData) {
        return res.status(400).json({ error: 'No perteneces a ningún equipo en este juego' });
      }

      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('full_name, email')
        .eq('id', userId)
        .single();

      const playerName = userData?.full_name || userData?.email || 'Un jugador';

      const { error: updateError } = await supabaseAdmin
        .from('players')
        .update({ team_id: null })
        .eq('id', player.id);

      if (updateError) {
        return res.status(400).json({ error: updateError.message });
      }

      await createNotification(userId, `Has salido del equipo "${teamData.name}".`);
      if (teamData.manager_id && teamData.manager_id !== userId) {
        await createNotification(teamData.manager_id, `${playerName} ha abandonado tu equipo "${teamData.name}".`);
      }

      return res.json({ message: 'Has abandonado el equipo correctamente' });
    } catch (error: any) {
      console.error('Error en leaveMyTeam:', error);
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  // Obtener solicitudes de unión enviadas por el jugador actual
  async getMyJoinRequests(req: Request, res: Response): Promise<any> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: 'Usuario no autenticado' });

      const { data, error } = await supabaseAdmin
        .from('team_join_requests')
        .select(`
          id,
          status,
          created_at,
          teams (
            id,
            name,
            abbreviation,
            game
          )
        `)
        .eq('player_id', userId)
        .order('created_at', { ascending: false });

      if (error) return res.status(400).json({ error: error.message });

      return res.json(data || []);
    } catch (error: any) {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  // Actualizar el rol de un jugador (manager o admin)
  async updatePlayerRole(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!role) {
        return res.status(400).json({ error: 'El campo role es requerido' });
      }

      const { data, error } = await supabaseAdmin
        .from('players')
        .update({ role })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.json({ message: 'Rol actualizado', data });
    } catch (error: any) {
      console.error('Error en updatePlayerRole:', error);
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },
};
