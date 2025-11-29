import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { generateId, generateMockAIResponse, generateMockReport } from '../utils.js';
import { authMiddleware, type AuthRequest } from '../middleware.js';
import type {
  CreateSessionRequest,
  Session,
  SessionWithProject,
  SessionsQuery,
  SendMessageRequest,
  ChatMessage,
  Report,
} from '@careersim/shared';

const router = Router();
router.use(authMiddleware);

const createSessionSchema = z.object({
  projectId: z.string(),
  scenario: z.enum(['job', 'grad', 'ielts', 'toefl', 'custom']),
  keywords: z.array(z.string()),
  startedAt: z.string(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1),
});

// GET /api/sessions
router.get('/', async (req: AuthRequest, res) => {
  await db.read();
  
  const query = req.query as SessionsQuery;
  
  let sessions = db.data!.sessions.filter(s => s.userId === req.userId);
  
  // Filter by date (YYYY-MM-DD)
  if (query.on) {
    sessions = sessions.filter(s => s.startedAt.startsWith(query.on!));
  }
  
  // Filter by project
  if (query.projectId) {
    sessions = sessions.filter(s => s.projectId === query.projectId);
  }
  
  // Filter by scenario
  if (query.scenario) {
    sessions = sessions.filter(s => s.scenario === query.scenario);
  }
  
  // Filter by status
  if (query.status) {
    sessions = sessions.filter(s => s.status === query.status);
  }
  
  // Attach project info
  const sessionsWithProject: SessionWithProject[] = sessions.map(s => {
    const project = db.data!.projects.find(p => p.id === s.projectId)!;
    return { ...s, project };
  });
  
  res.json(sessionsWithProject);
});

// GET /api/sessions/:id
router.get('/:id', async (req: AuthRequest, res) => {
  await db.read();
  
  const session = db.data!.sessions.find(
    s => s.id === req.params.id && s.userId === req.userId
  );
  
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  
  const project = db.data!.projects.find(p => p.id === session.projectId)!;
  const sessionWithProject: SessionWithProject = { ...session, project };
  
  res.json(sessionWithProject);
});

// POST /api/sessions
router.post('/', async (req: AuthRequest, res) => {
  try {
    const data = createSessionSchema.parse(req.body) as CreateSessionRequest;
    
    await db.read();
    
    // Verify project ownership
    const project = db.data!.projects.find(
      p => p.id === data.projectId && p.userId === req.userId
    );
    
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    
    const session: Session = {
      id: generateId(),
      projectId: data.projectId,
      userId: req.userId!,
      scenario: data.scenario,
      keywords: data.keywords,
      status: 'active',
      startedAt: data.startedAt,
      createdAt: new Date().toISOString(),
    };
    
    db.data!.sessions.push(session);
    
    // Add initial AI greeting message
    const greetingMessage: ChatMessage = {
      id: generateId(),
      sessionId: session.id,
      role: 'assistant',
      content: `Hello! I'll be conducting your ${data.scenario} interview today. Let's begin. Can you start by introducing yourself?`,
      timestamp: new Date().toISOString(),
    };
    
    db.data!.messages.push(greetingMessage);
    
    await db.write();
    
    const sessionWithProject: SessionWithProject = { ...session, project };
    res.status(201).json(sessionWithProject);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/sessions/:id/messages
router.post('/:id/messages', async (req: AuthRequest, res) => {
  try {
    const data = sendMessageSchema.parse(req.body) as SendMessageRequest;
    
    await db.read();
    
    const session = db.data!.sessions.find(
      s => s.id === req.params.id && s.userId === req.userId
    );
    
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    
    if (session.status !== 'active') {
      res.status(400).json({ error: 'Session is not active' });
      return;
    }
    
    // Add user message
    const userMessage: ChatMessage = {
      id: generateId(),
      sessionId: session.id,
      role: 'user',
      content: data.content,
      timestamp: new Date().toISOString(),
    };
    
    db.data!.messages.push(userMessage);
    
    // Generate AI response
    const aiResponse = generateMockAIResponse(data.content, session.scenario);
    const aiMessage: ChatMessage = {
      id: generateId(),
      sessionId: session.id,
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString(),
    };
    
    db.data!.messages.push(aiMessage);
    
    await db.write();
    
    res.status(201).json(aiMessage);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/sessions/:id/messages
router.get('/:id/messages', async (req: AuthRequest, res) => {
  await db.read();
  
  const session = db.data!.sessions.find(
    s => s.id === req.params.id && s.userId === req.userId
  );
  
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  
  const messages = db.data!.messages.filter(m => m.sessionId === session.id);
  res.json(messages);
});

// POST /api/sessions/:id/end
router.post('/:id/end', async (req: AuthRequest, res) => {
  await db.read();
  
  const session = db.data!.sessions.find(
    s => s.id === req.params.id && s.userId === req.userId
  );
  
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  
  if (session.status !== 'active') {
    res.status(400).json({ error: 'Session is not active' });
    return;
  }
  
  // Update session status
  session.status = 'completed';
  session.endedAt = new Date().toISOString();
  
  // Generate report
  const messages = db.data!.messages.filter(m => m.sessionId === session.id);
  const reportData = generateMockReport(messages);
  
  const report: Report = {
    id: generateId(),
    sessionId: session.id,
    ...reportData,
    generatedAt: new Date().toISOString(),
  };
  
  db.data!.reports.push(report);
  
  await db.write();
  
  res.json({ session, report });
});

// GET /api/sessions/:id/report
router.get('/:id/report', async (req: AuthRequest, res) => {
  await db.read();
  
  const session = db.data!.sessions.find(
    s => s.id === req.params.id && s.userId === req.userId
  );
  
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  
  const report = db.data!.reports.find(r => r.sessionId === session.id);
  
  if (!report) {
    res.status(404).json({ error: 'Report not found' });
    return;
  }
  
  res.json(report);
});

export default router;

