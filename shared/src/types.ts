// User & Auth types
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

// Project types
export type ScenarioType = 'job' | 'grad' | 'ielts' | 'toefl' | 'custom';

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

// Session types
export type SessionStatus = 'active' | 'completed';

export interface Session {
  id: string;
  projectId: string;
  userId: string;
  scenario: ScenarioType;
  keywords: string[];
  status: SessionStatus;
  startedAt: string;
  endedAt?: string;
  createdAt: string;
}

export interface SessionWithProject extends Session {
  project: Project;
}

// Chat message types
export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  timestamp: string;
}

// Report types
export interface ReportDimension {
  name: string;
  score: number; // 0-100
  description: string;
}

export interface Report {
  id: string;
  sessionId: string;
  overallScore: number; // 0-100
  dimensions: ReportDimension[];
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  generatedAt: string;
}

// Dashboard stats types
export interface DayStats {
  date: string; // YYYY-MM-DD
  totalSessions: number;
  byScenario: Partial<Record<ScenarioType, number>>;
}

export interface MonthStats {
  days: DayStats[];
}

// API request/response types
export interface CreateSessionRequest {
  projectId: string;
  scenario: ScenarioType;
  keywords: string[];
  startedAt: string; // ISO string
}

export interface SendMessageRequest {
  content: string;
}

export interface SessionsQuery {
  on?: string; // YYYY-MM-DD
  projectId?: string;
  scenario?: ScenarioType;
  status?: SessionStatus;
}

export interface StatsQuery {
  month: string; // YYYY-MM format
  projectId?: string;
  scenario?: ScenarioType;
}

export interface CreateProjectRequest {
  name: string;
  description: string;
}

