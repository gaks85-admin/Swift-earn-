import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { dbManager } from './db.js';
import { User, AdminUser } from './types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'swift-earn-auth-secret-key-prod-2026';

// Lightweight secure signed session tokens
export function createSessionToken(payload: { userId: string; role: 'user' | 'admin'; email: string }): string {
  const data = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 7 * 86400000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function verifySessionToken(token: string): { userId: string; role: 'user' | 'admin'; email: string } | null {
  try {
    if (!token || !token.includes('.')) return null;
    const [data, signature] = token.split('.');
    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
    if (signature !== expectedSignature) return null;

    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export interface AuthenticatedRequest extends Request {
  user?: User;
  admin?: AdminUser;
}

export function requireUserAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const payload = verifySessionToken(token);
  if (!payload || payload.role !== 'user') {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }

  const user = dbManager.findUserById(payload.userId);
  if (!user) {
    return res.status(401).json({ error: 'User account not found.' });
  }

  if (user.status === 'suspended') {
    return res.status(403).json({ error: 'Account suspended. Contact support.' });
  }

  req.user = user;
  next();
}

export function requireAdminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Admin authorization required.' });
  }

  const payload = verifySessionToken(token);
  if (!payload || payload.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin credentials required.' });
  }

  const admin = dbManager.findAdminById(payload.userId);
  if (!admin) {
    return res.status(403).json({ error: 'Admin account not found.' });
  }

  req.admin = admin;
  next();
}
