import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models';

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): any => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'No tienes permisos para acceder a este recurso',
        requiredRoles: allowedRoles,
        userRole: req.user.role,
      });
    }

    next();
  };
};
