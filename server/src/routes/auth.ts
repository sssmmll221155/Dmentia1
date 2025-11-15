/**
 * Authentication Routes
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import crypto from 'crypto';

const router = Router();

// Simple token storage (in production, use Redis or proper session management)
const activeSessions = new Map<string, { userId: string; expiresAt: Date }>();

/**
 * Generate authentication token
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash password (simple version - use bcrypt in production)
 */
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Validation schemas
 */
const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  deviceId: z.string().optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  deviceId: z.string().optional(),
});

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  try {
    const data = RegisterSchema.parse(req.body);

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'User already exists',
      });
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash: hashPassword(data.password),
        name: data.name,
        deviceId: data.deviceId,
      },
    });

    // Generate token
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    activeSessions.set(token, {
      userId: user.id,
      expiresAt,
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
      expiresAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    } else {
      console.error('[Auth] Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req, res) => {
  try {
    const data = LoginSchema.parse(req.body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Verify password
    const passwordHash = hashPassword(data.password);
    if (passwordHash !== user.passwordHash) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Update device ID if provided
    if (data.deviceId && data.deviceId !== user.deviceId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { deviceId: data.deviceId },
      });
    }

    // Generate token
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    activeSessions.set(token, {
      userId: user.id,
      expiresAt,
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
      expiresAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    } else {
      console.error('[Auth] Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
});

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post('/logout', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (token) {
    activeSessions.delete(token);
  }

  res.json({ success: true });
});

/**
 * GET /api/auth/me
 * Get current user
 */
router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No token provided',
    });
  }

  const session = activeSessions.get(token);

  if (!session || session.expiresAt < new Date()) {
    activeSessions.delete(token);
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
    });
  }

  res.json({
    success: true,
    user,
  });
});

/**
 * Middleware to authenticate requests
 */
export function authenticate(req: any, res: any, next: any) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No token provided',
    });
  }

  const session = activeSessions.get(token);

  if (!session || session.expiresAt < new Date()) {
    activeSessions.delete(token);
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }

  req.userId = session.userId;
  next();
}

export default router;
