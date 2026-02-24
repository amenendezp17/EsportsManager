import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes';
import teamRoutes from './routes/teamRoutes';
import tournamentRoutes from './routes/tournamentRoutes';
import playerRoutes from './routes/playerRoutes';
import { supabase } from './config/supabase';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/players', playerRoutes);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'Backend funcionando correctamente' });
});

// Debug endpoint - prueba conexión a Supabase
app.get('/api/debug/supabase', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.auth.getSession();
    res.json({
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKeyExists: !!process.env.SUPABASE_KEY,
      serviceKeyExists: !!process.env.SUPABASE_SERVICE_KEY,
      session: data,
      error: error?.message,
    });
  } catch (err: any) {
    res.status(500).json({
      error: err.message,
    });
  }
});

// Error handling
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`📚 Health check: http://localhost:${PORT}/api/health`);
});
