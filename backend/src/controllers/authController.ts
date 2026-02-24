import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { AuthPayload, User } from '../models';

export const authController = {
  async signup(req: Request, res: Response): Promise<any> {
    try {
      const { email, password, fullName, role } = req.body;

      console.log('📝 Signup request:', { email, fullName, role });

      if (!email || !password || !fullName) {
        return res.status(400).json({ error: 'Faltan datos requeridos' });
      }

      // Crear usuario en Supabase Auth
      console.log('🔐 Creating user in Supabase Auth...');
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      console.log('🔐 Auth response:', { authData, authError });

      if (authError) {
        console.error('❌ Auth error:', authError);
        return res.status(400).json({ error: `Auth error: ${authError.message}`, code: authError.code });
      }

      // Crear perfil en tabla users
      console.log('📊 Inserting user profile...');
      console.log('👤 User data:', { id: authData.user.id, email, full_name: fullName, role: role || 'player' });
      
      // Use admin client to bypass RLS for initial user creation
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          full_name: fullName,
          role: role || 'player',
        })
        .select()
        .single();

      console.log('📊 User insert response:', { userData, userError });

      if (userError) {
        console.error('❌ User insert error:', userError);
        return res.status(400).json({ error: `Insert error: ${userError.message}`, code: userError.code });
      }

      // Si el usuario es jugador, crear registros en la tabla players para cada juego
      if (userData.role === 'player') {
        console.log('🎮 Creating player profiles for all games...');
        const games = ['lol', 'valorant', 'inazuma'];
        
        const playerInserts = games.map(game => ({
          user_id: userData.id,
          game: game,
          role: null,
          rank: null,
          team_id: null
        }));

        const { error: playerError } = await supabaseAdmin
          .from('players')
          .insert(playerInserts);

        if (playerError) {
          console.error('⚠️ Player insert error:', playerError);
          // No bloqueamos el registro si falla la creación del player
        } else {
          console.log('✅ Player profiles created for all games');
        }
      }

      // Generar JWT
      const token = jwt.sign(
        {
          sub: userData.id,
          email: userData.email,
          role: userData.role,
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        message: 'Usuario registrado exitosamente',
        user: userData,
        token,
      });
    } catch (error: any) {
      console.error('Error en signup:', error);
      return res.status(500).json({ 
        error: 'Error en el servidor',
        details: error.message || error
      });
    }
  },

  async login(req: Request, res: Response): Promise<any> {
    try {
      const { email, password } = req.body as AuthPayload;

      console.log('🔑 Login attempt:', { email });

      if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña requeridos' });
      }

      // Autenticar con Supabase
      console.log('🔐 Authenticating with Supabase...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('🔐 Auth response:', { user: data.user?.id, error });

      if (error) {
        console.error('❌ Auth error:', error);
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      // Obtener datos del usuario usando admin client
      console.log('📊 Fetching user profile...');
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      console.log('📊 User profile response:', { userData, userError });

      if (userError) {
        console.error('❌ User fetch error:', userError);
        return res.status(400).json({ error: `User fetch error: ${userError.message}` });
      }

      // Generar JWT
      const token = jwt.sign(
        {
          sub: userData.id,
          email: userData.email,
          role: userData.role,
          full_name: userData.full_name,
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      console.log('✅ Login successful:', { userId: userData.id, role: userData.role });

      return res.json({
        message: 'Sesión iniciada',
        user: userData,
        token,
      });
    } catch (error: any) {
      console.error('❌ Error en login:', error);
      return res.status(500).json({ 
        error: 'Error en el servidor',
        details: error.message || error
      });
    }
  },

  async logout(req: Request, res: Response): Promise<any> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.json({ message: 'Sesión cerrada' });
    } catch (error) {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  async getProfile(req: Request, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', req.user.id)
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.json(data);
    } catch (error) {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  async updateProfile(req: Request, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const { fullName, bio, avatarUrl } = req.body;

      const { data, error } = await supabase
        .from('users')
        .update({
          full_name: fullName,
          bio,
          avatar_url: avatarUrl,
        })
        .eq('id', req.user.id)
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

  async deleteUser(req: Request, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      // Solo los admins pueden eliminar usuarios
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'No tienes permisos para eliminar usuarios' });
      }

      const { id } = req.params;

      // No permitir que se elimine a sí mismo
      if (id === req.user.id) {
        return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
      }

      console.log('🗑️ Deleting user:', id);

      // Eliminar el usuario de Supabase Auth (esto también eliminará el perfil por CASCADE)
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

      if (authError) {
        console.error('❌ Error deleting user:', authError);
        return res.status(400).json({ error: authError.message });
      }

      console.log('✅ User deleted successfully');
      return res.json({ message: 'Usuario eliminado correctamente' });
    } catch (error: any) {
      console.error('❌ Error in deleteUser:', error);
      return res.status(500).json({ error: 'Error en el servidor', details: error.message });
    }
  },
};
