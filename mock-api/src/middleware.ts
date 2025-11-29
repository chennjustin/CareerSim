import type { Request, Response, NextFunction } from 'express';
import { db } from './db.js';

export interface AuthRequest extends Request {
  userId?: string;
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }
  
  const token = authHeader.substring(7);
  await db.read();
  
  const userId = Object.entries(db.data!.tokens).find(
    ([_, t]) => t === token
  )?.[0];
  
  if (!userId) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
  
  req.userId = userId;
  next();
}

