import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

export async function createNotification(userId: string, message: string): Promise<void> {
  try {
    await supabaseAdmin.from('notifications').insert({ user_id: userId, message, read: false });
  } catch (e) {
    console.error('Error creating notification:', e);
  }
}

export const notificationController = {
  async getMyNotifications(req: Request, res: Response): Promise<any> {
    try {
      if (!req.user) return res.status(401).json({ error: 'No autenticado' });
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .select('*')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) return res.status(400).json({ error: error.message });
      return res.json(data);
    } catch {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  async markAsRead(req: Request, res: Response): Promise<any> {
    try {
      if (!req.user) return res.status(401).json({ error: 'No autenticado' });
      const { id } = req.params;
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
        .eq('user_id', req.user.id);
      if (error) return res.status(400).json({ error: error.message });
      return res.json({ message: 'Notificación leída' });
    } catch {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  async markAllAsRead(req: Request, res: Response): Promise<any> {
    try {
      if (!req.user) return res.status(401).json({ error: 'No autenticado' });
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ read: true })
        .eq('user_id', req.user.id)
        .eq('read', false);
      if (error) return res.status(400).json({ error: error.message });
      return res.json({ message: 'Todas las notificaciones leídas' });
    } catch {
      return res.status(500).json({ error: 'Error en el servidor' });
    }
  }
};
