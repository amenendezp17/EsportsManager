import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase';
import { createNotification } from './notificationController';
import { randomUUID } from 'crypto';

const TEAM_LOGOS_BUCKET = process.env.SUPABASE_TEAM_LOGOS_BUCKET || 'team-logos';

const ensureTeamLogosBucket = async () => {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = (buckets || []).some((b: any) => b.name === TEAM_LOGOS_BUCKET);
  if (!exists) {
    await supabaseAdmin.storage.createBucket(TEAM_LOGOS_BUCKET, { public: true });
  }
};

const uploadLogoIfDataUrl = async (logoUrl?: string | null): Promise<string | null | undefined> => {
  if (logoUrl === undefined) return undefined;
  if (logoUrl === null || logoUrl === '') return null;
  if (!logoUrl.startsWith('data:image/')) return logoUrl;

  const match = logoUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Formato de imagen inválido');
  }

  const mimeType = match[1];
  const base64Data = match[2];
  const ext = mimeType.split('/')[1]?.toLowerCase() || 'png';
  const buffer = Buffer.from(base64Data, 'base64');

  if (buffer.length > 2 * 1024 * 1024) {
    throw new Error('La imagen supera el máximo de 2 MB');
  }

  await ensureTeamLogosBucket();
  const filePath = `logos/${randomUUID()}.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(TEAM_LOGOS_BUCKET)
    .upload(filePath, buffer, { contentType: mimeType, upsert: false });

  if (uploadError) {
    throw new Error('No se pudo subir la imagen del logo');
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from(TEAM_LOGOS_BUCKET)
    .getPublicUrl(filePath);

  return publicUrlData?.publicUrl || null;
};

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

      let normalizedLogoUrl: string | null | undefined;
      try {
        normalizedLogoUrl = await uploadLogoIfDataUrl(logoUrl);
      } catch (e: any) {
        return res.status(400).json({ error: e?.message || 'Error al procesar el logo' });
      }


      const { data, error } = await supabaseAdmin
        .from('teams')
        .insert({
          name,
          abbreviation,
          logo_url: normalizedLogoUrl || null,
          description,
          game,
          manager_id: req.user.id,
        })
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      // Crear automáticamente un registro de player para el manager
      const { error: playerError } = await supabaseAdmin
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
        console.error('Warning: Could not create player record for manager:', playerError);
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
      const { data: team, error: fetchError } = await supabaseAdmin
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
      if (logoUrl !== undefined) {
        try {
          updateData.logo_url = await uploadLogoIfDataUrl(logoUrl);
        } catch (e: any) {
          return res.status(400).json({ error: e?.message || 'Error al procesar el logo' });
        }
      }
      if (description !== undefined) updateData.description = description;

      const { data, error } = await supabaseAdmin
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

      let teamQuery = supabaseAdmin
        .from('teams')
        .select(`*, players:players(*)`)
        .eq('manager_id', req.user.id);

      if (game) {
        teamQuery = teamQuery.eq('game', game);
      }

      const { data: team, error } = await teamQuery.single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'No tienes equipo en este juego' });
        }
        return res.status(400).json({ error: error.message });
      }

      // Fetch user data separately to avoid fragile FK join
      const players = team.players || [];
      if (players.length > 0) {
        const userIds = players.map((p: any) => p.user_id).filter(Boolean);
        const { data: users } = await supabaseAdmin
          .from('users')
          .select('id, full_name, email')
          .in('id', userIds);

        const usersMap = new Map((users || []).map((u: any) => [u.id, u]));
        team.players = players.map((p: any) => ({
          ...p,
          user: usersMap.get(p.user_id) || null
        }));
      }

      return res.json(team);
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
      const { data: team, error: teamError } = await supabaseAdmin
        .from('teams')
        .select('manager_id')
        .eq('id', id)
        .single();

      if (teamError || (team.manager_id !== req.user.id && req.user.role !== 'admin')) {
        return res.status(403).json({ error: 'No tienes permisos para ver las solicitudes de este equipo' });
      }

      const { data, error } = await supabaseAdmin
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
      const { data: request, error: requestError } = await supabaseAdmin
        .from('team_join_requests')
        .select('*, team:teams!team_id(manager_id, game, name)')
        .eq('id', requestId)
        .single();

      if (requestError || !request) {
        return res.status(404).json({ error: 'Solicitud no encontrada' });
      }

      // Verificar que es el manager del equipo
      if (request.team.manager_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'No tienes permisos' });
      }

      const newStatus = action === 'accept' ? 'accepted' : 'rejected';

      // Actualizar el estado de la solicitud
      const { error: updateError } = await supabaseAdmin
        .from('team_join_requests')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (updateError) {
        return res.status(400).json({ error: updateError.message });
      }

      // Si se acepta, agregar al jugador al equipo (solo el perfil del juego correcto)
      if (action === 'accept') {
        const { data: updatedPlayers, error: playerError } = await supabaseAdmin
          .from('players')
          .update({ team_id: request.team_id })
          .eq('user_id', request.player_id)
          .eq('game', request.team.game)
          .select('id');

        if (playerError) {
          return res.status(400).json({ error: 'Error al agregar jugador al equipo' });
        }

        if (!updatedPlayers || updatedPlayers.length === 0) {
          return res.status(400).json({ error: 'No se encontró un perfil de jugador para este juego' });
        }
      }

      await createNotification(
        request.player_id,
        action === 'accept'
          ? `Tu solicitud para unirte a "${request.team.name}" fue aceptada.`
          : `Tu solicitud para unirte a "${request.team.name}" fue rechazada.`
      );

      return res.json({ message: `Solicitud ${newStatus}` });
    } catch (error) {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  // Jugador envía solicitud para unirse a un equipo
  async sendJoinRequest(req: Request, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const { id: teamId } = req.params;

      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('id, name, manager_id, game')
        .eq('id', teamId)
        .single();

      if (teamError || !team) {
        return res.status(404).json({ error: 'Equipo no encontrado' });
      }

      // A player that already belongs to a team in this game cannot request another one.
      const { data: myPlayerProfile } = await supabaseAdmin
        .from('players')
        .select('team_id')
        .eq('user_id', req.user.id)
        .eq('game', team.game)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (myPlayerProfile?.team_id) {
        return res.status(400).json({ error: 'Ya formas parte de un equipo en este juego' });
      }

      const { error: insertError } = await supabaseAdmin
        .from('team_join_requests')
        .upsert(
          { player_id: req.user.id, team_id: teamId, status: 'pending' },
          { onConflict: 'player_id,team_id', ignoreDuplicates: true }
        );

      if (insertError) {
        return res.status(400).json({ error: insertError.message });
      }

      const { data: requester } = await supabaseAdmin
        .from('users')
        .select('full_name, email')
        .eq('id', req.user.id)
        .single();

      const requesterName = requester?.full_name || requester?.email || 'Un jugador';

      if (team.manager_id) {
        await createNotification(team.manager_id, `${requesterName} te envió una solicitud para unirse a ${team.name}.`);
      }

      return res.status(201).json({ message: 'Solicitud enviada correctamente' });
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

      // Verificar que es el manager y obtener nombre del equipo
      const { data: team, error: teamError } = await supabaseAdmin
        .from('teams')
        .select('manager_id, name')
        .eq('id', teamId)
        .single();

      if (teamError || team.manager_id !== req.user.id) {
        return res.status(403).json({ error: 'No tienes permisos para eliminar jugadores de este equipo' });
      }

      // Obtener datos del jugador para notificaciones
      const { data: player, error: playerFetchError } = await supabaseAdmin
        .from('players')
        .select('user_id')
        .eq('id', playerId)
        .eq('team_id', teamId)
        .single();

      if (playerFetchError || !player) {
        return res.status(404).json({ error: 'Jugador no encontrado en el equipo' });
      }

      if (player.user_id === req.user.id) {
        return res.status(400).json({ error: 'No puedes expulsarte a ti mismo del equipo' });
      }

      if (player.user_id === team.manager_id) {
        return res.status(400).json({ error: 'El manager no puede expulsarse a sí mismo del equipo' });
      }

      const { data: playerUser } = await supabaseAdmin
        .from('users')
        .select('full_name, email')
        .eq('id', player.user_id)
        .single();

      const playerName = playerUser?.full_name || playerUser?.email || 'Jugador';

      // Eliminar al jugador del equipo
      const { error } = await supabaseAdmin
        .from('players')
        .update({ team_id: null })
        .eq('id', playerId)
        .eq('team_id', teamId);

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      // Notificar al jugador y al manager
      await createNotification(player.user_id, `Has sido expulsado del equipo "${team.name}".`);
      await createNotification(req.user.id, `Has expulsado a ${playerName} del equipo "${team.name}".`);

      return res.json({ message: 'Jugador eliminado del equipo', playerName, teamName: team.name });
    } catch (error) {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  }
};
