import { Router } from 'express';
import { db } from '../db.js';
import { authMiddleware, type AuthRequest } from '../middleware.js';
import type { StatsQuery, MonthStats, DayStats, ScenarioType } from '@careersim/shared';

const router = Router();
router.use(authMiddleware);

// GET /api/stats/daily
router.get('/daily', async (req: AuthRequest, res) => {
  await db.read();
  
  const query = req.query as StatsQuery;
  
  if (!query.month) {
    res.status(400).json({ error: 'month parameter is required (YYYY-MM)' });
    return;
  }
  
  // Get all sessions for the user
  let sessions = db.data!.sessions.filter(s => s.userId === req.userId);
  
  // Filter by project if specified
  if (query.projectId) {
    sessions = sessions.filter(s => s.projectId === query.projectId);
  }
  
  // Filter by scenario if specified
  if (query.scenario) {
    sessions = sessions.filter(s => s.scenario === query.scenario);
  }
  
  // Filter by month and group by day
  const monthPrefix = query.month;
  const sessionsByDay = new Map<string, typeof sessions>();
  
  for (const session of sessions) {
    // Extract date from startedAt (YYYY-MM-DDTHH:mm:ss.sssZ -> YYYY-MM-DD)
    const date = session.startedAt.split('T')[0];
    
    if (date.startsWith(monthPrefix)) {
      if (!sessionsByDay.has(date)) {
        sessionsByDay.set(date, []);
      }
      sessionsByDay.get(date)!.push(session);
    }
  }
  
  // Build day stats
  const days: DayStats[] = [];
  
  for (const [date, daySessions] of sessionsByDay.entries()) {
    const byScenario: Partial<Record<ScenarioType, number>> = {};
    
    for (const session of daySessions) {
      byScenario[session.scenario] = (byScenario[session.scenario] || 0) + 1;
    }
    
    days.push({
      date,
      totalSessions: daySessions.length,
      byScenario,
    });
  }
  
  const monthStats: MonthStats = { days };
  res.json(monthStats);
});

export default router;

