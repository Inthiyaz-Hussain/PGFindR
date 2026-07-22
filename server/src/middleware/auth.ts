import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../index.js'

export interface AuthenticatedUser {
  id: string
  email: string
  role: string
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser
}

export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    res.status(401).json({ error: 'Authorization token required' })
    return
  }

  // Handle mock tokens for demo/offline testing
  if (token.startsWith('mock-token-')) {
    try {
      const userDetails = JSON.parse(token.slice(11))
      req.user = {
        id: userDetails.id,
        email: userDetails.email,
        role: userDetails.role,
      }
      next()
      return
    } catch (e) {
      res.status(401).json({ error: 'Invalid mock token structure' })
      return
    }
  }

  const { data: { user }, error = null } = await supabase.auth.getUser(token)

  if (error || !user) {
    res.status(401).json({ error: 'Invalid or expired token' })
    return
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  req.user = {
    id: user.id,
    email: user.email!,
    role: profile?.role ?? (user.user_metadata?.role as string) ?? 'seeker',
  }

  next()
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' })
      return
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: `Access restricted to: ${roles.join(', ')}` })
      return
    }
    next()
  }
}
