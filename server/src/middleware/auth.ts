import { Request, Response, NextFunction } from 'express';

export type UserRole = 'ADMINISTRATOR' | 'OPERATOR' | 'AUDITOR';

export interface AuthenticatedUser {
  id: string;
  name: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const roleHeader = req.headers['x-user-role'] as string | undefined;
  const idHeader = req.headers['x-user-id'] as string | undefined;

  let role: UserRole = 'ADMINISTRATOR'; // Default for demo environment if not specified
  if (roleHeader === 'OPERATOR' || roleHeader === 'AUDITOR' || roleHeader === 'ADMINISTRATOR') {
    role = roleHeader;
  }

  req.user = {
    id: idHeader || (role === 'ADMINISTRATOR' ? 'admin-1' : role === 'OPERATOR' ? 'operator-1' : 'auditor-1'),
    name: role === 'ADMINISTRATOR' ? 'Chief Admin' : role === 'OPERATOR' ? 'Duty Operator' : 'Compliance Auditor',
    role,
  };

  next();
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Access denied',
        message: `Action requires one of the following roles: ${allowedRoles.join(', ')}. Current role: ${req.user?.role || 'UNKNOWN'}`,
      });
      return;
    }
    next();
  };
}
