import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { generateId } from '../utils.js';
import { authMiddleware, type AuthRequest } from '../middleware.js';
import type { CreateProjectRequest, Project } from '@careersim/shared';

const router = Router();
router.use(authMiddleware);

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
});

// GET /api/projects
router.get('/', async (req: AuthRequest, res) => {
  await db.read();
  
  const projects = db.data!.projects.filter(p => p.userId === req.userId);
  res.json(projects);
});

// GET /api/projects/:id
router.get('/:id', async (req: AuthRequest, res) => {
  await db.read();
  
  const project = db.data!.projects.find(
    p => p.id === req.params.id && p.userId === req.userId
  );
  
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  
  res.json(project);
});

// POST /api/projects
router.post('/', async (req: AuthRequest, res) => {
  try {
    const data = createProjectSchema.parse(req.body) as CreateProjectRequest;
    
    await db.read();
    
    const project: Project = {
      id: generateId(),
      userId: req.userId!,
      name: data.name,
      description: data.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    db.data!.projects.push(project);
    await db.write();
    
    res.status(201).json(project);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

