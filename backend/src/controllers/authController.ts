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

     
      console.log('Creando user en Supabase Auth...');
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      console.log(' Auth response:', { authData, authError });

      if (authError) {
        console.error(' Auth error:', authError);
        return res.status(400).json({ error: `Auth error: ${authError.message}`, code: authError.code });
      }

      console.log('📊 Inserting user profile...');
      console.log('👤 User data:', { id: authData.user.id, email, full_name: fullName, role: role || 'player' });
      
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
        console.error(' User insert error:', userError);
        return res.status(400).json({ error: `Insert error: ${userError.message}`, code: userError.code });
      }

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
          console.error('Player insert error:', playerError);
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

      console.log(' Login correcto:', { userId: userData.id, role: userData.role });

      return res.json({
        message: 'Sesión iniciada',
        user: userData,
        token,
      });
    } catch (error: any) {
      console.error(' Error en login:', error);
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

  async forgotPassword(req: Request, res: Response): Promise<any> {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'El email es requerido' });

      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (error || !user) {
        return res.status(404).json({ error: 'No existe ninguna cuenta con ese correo electrónico' });
      }

      return res.json({ exists: true });
    } catch (error: any) {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  async resetPassword(req: Request, res: Response): Promise<any> {
    try {
      const { email, newPassword } = req.body;
      if (!email || !newPassword) return res.status(400).json({ error: 'Email y contraseña requeridos' });
      if (newPassword.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

      // Get user from Supabase Auth by email
      const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) return res.status(500).json({ error: 'Error al buscar el usuario' });

      const authUser = usersData.users.find(u => u.email === email);
      if (!authUser) return res.status(404).json({ error: 'Usuario no encontrado' });

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        password: newPassword,
      });

      if (updateError) return res.status(400).json({ error: updateError.message });

      return res.json({ message: 'Contraseña actualizada correctamente' });
    } catch (error: any) {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  async getAllUsers(req: Request, res: Response): Promise<any> {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Solo los administradores pueden ver todos los usuarios' });
      }

      const { data, error } = await supabaseAdmin
        .from('users')
        .select('id, email, full_name, role, created_at')
        .order('created_at', { ascending: false });

      if (error) return res.status(400).json({ error: error.message });

      return res.json(data);
    } catch {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  async updateUserRole(req: Request, res: Response): Promise<any> {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Solo los administradores pueden cambiar roles' });
      }

      const { id } = req.params;
      const { role } = req.body;

      if (!['player', 'manager', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Rol inválido' });
      }

      if (id === req.user.id) {
        return res.status(400).json({ error: 'No puedes cambiar tu propio rol' });
      }

      const { data, error } = await supabaseAdmin
        .from('users')
        .update({ role })
        .eq('id', id)
        .select('id, email, full_name, role')
        .single();

      if (error) return res.status(400).json({ error: error.message });

      return res.json({ message: 'Rol actualizado', user: data });
    } catch {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  async deleteUser(req: Request, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'No tienes permisos para eliminar usuarios' });
      }

      const { id } = req.params;
// no se borre su propio perfil un admin
      if (id === req.user.id) {
        return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
      }

      console.log(' Borrando user:', id);

      // Eliminar el usuario de Supabase
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

      if (authError) {
        console.error(' Error borrando user:', authError);
        return res.status(400).json({ error: authError.message });
      }

      console.log('User borrado successfully');
      return res.json({ message: 'Usuario eliminado correctamente' });
    } catch (error: any) {
      console.error(' Error in BorrarUser:', error);
      return res.status(500).json({ error: 'Error en el servidor', details: error.message });
    }
  },
};
