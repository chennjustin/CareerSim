export interface User {
  id: string;
  name: string;
  email: string;
}

export type InterviewStatus = 'scheduled' | 'in-progress' | 'completed';

export interface Interview {
  id: string;
  title: string;
  type: string;
  date?: string;
  time?: string;
  status: InterviewStatus;
  createdAt: string;
  completedAt?: string;
  messages?: Message[];
}

export interface Message {
  id: string;
  role: 'interviewer' | 'user';
  content: string;
  timestamp: string;
}

export interface Report {
  id: string;
  interviewId: string;
  overallScore: number;
  expression: number;
  content: number;
  structure: number;
  language: number;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  createdAt: string;
}

export type ViewMode = 'month' | 'week' | 'list';

export type AIPersonality = 'friendly' | 'formal' | 'stress-test';
