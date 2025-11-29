import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { generateId, generateToken } from '../utils.js';
import type { LoginRequest, RegisterRequest, AuthResponse } from '@careersim/shared';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body) as RegisterRequest;
    
    await db.read();
    
    // Check if user exists
    const existingUser = db.data!.users.find(u => u.email === data.email);
    if (existingUser) {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }
    
    const userId = generateId();
    const user = {
      id: userId,
      email: data.email,
      name: data.name,
      createdAt: new Date().toISOString(),
    };
    
    const token = generateToken();
    
    db.data!.users.push(user);
    db.data!.tokens[userId] = token;
    
    await db.write();
    
    const response: AuthResponse = {
      accessToken: token,
      user,
    };
    
    res.status(201).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body) as LoginRequest;
    
    await db.read();
    
    const user = db.data!.users.find(u => u.email === data.email);
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    
    // In a real app, verify password hash. For MVP, just accept any password.
    const token = generateToken();
    db.data!.tokens[user.id] = token;
    
    await db.write();
    
    const response: AuthResponse = {
      accessToken: token,
      user,
    };
    
    res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
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
  
  const user = db.data!.users.find(u => u.id === userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  
  res.json(user);
});

export default router;

