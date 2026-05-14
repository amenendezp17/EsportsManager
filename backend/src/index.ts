import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import authRoutes from './routes/authRoutes';
import teamRoutes from './routes/teamRoutes';
import tournamentRoutes from './routes/tournamentRoutes';
import playerRoutes from './routes/playerRoutes';
import invitationsRoutes from './routes/invitationsRoutes';
import notificationRoutes from './routes/notificationRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const STATIC_PATH = process.env.STATIC_PATH || '';

// Middlewares
app.use(cors());
// Allow base64 team logos from the frontend modals.
app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ extended: true, limit: '6mb' }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/invitations', invitationsRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'Backend funcionando correctamente' });
});

// Error handling
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Modo Electron: sirve el frontend Angular compilado
if (STATIC_PATH) {
  app.use(express.static(STATIC_PATH));
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(STATIC_PATH, 'index.html'));
  });
  console.log(`📁 Sirviendo frontend desde: ${STATIC_PATH}`);
}

app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`📚 Health check: http://localhost:${PORT}/api/health`);
  if (STATIC_PATH) {
    console.log(`🖥️  Modo Electron activo`);
  }
});
