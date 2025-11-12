import { Interview, Report, User, Message } from '../types';
import { mockInterviews, mockReports, mockUser } from '../data/mockData';

// 模拟 API 延迟
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 从 localStorage 获取数据
const getStorageData = <T>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
};

// 保存数据到 localStorage
const setStorageData = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

// 初始化数据
const initStorage = () => {
  if (!localStorage.getItem('interviews')) {
    setStorageData('interviews', mockInterviews);
  }
  if (!localStorage.getItem('reports')) {
    setStorageData('reports', mockReports);
  }
  if (!localStorage.getItem('user')) {
    setStorageData('user', mockUser);
  }
};

initStorage();

export const api = {
  // User API
  getUser: async (): Promise<User> => {
    await delay(300);
    return getStorageData('user', mockUser);
  },

  // Interview API
  getInterviews: async (): Promise<Interview[]> => {
    await delay(500);
    return getStorageData('interviews', mockInterviews);
  },

  getInterview: async (id: string): Promise<Interview | null> => {
    await delay(300);
    const interviews = getStorageData<Interview[]>('interviews', mockInterviews);
    return interviews.find(i => i.id === id) || null;
  },

  createInterview: async (interview: Omit<Interview, 'id' | 'createdAt'>): Promise<Interview> => {
    await delay(500);
    const newInterview: Interview = {
      ...interview,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    const interviews = getStorageData<Interview[]>('interviews', mockInterviews);
    interviews.push(newInterview);
    setStorageData('interviews', interviews);
    return newInterview;
  },

  updateInterview: async (id: string, updates: Partial<Interview>): Promise<Interview> => {
    await delay(400);
    const interviews = getStorageData<Interview[]>('interviews', mockInterviews);
    const index = interviews.findIndex(i => i.id === id);
    if (index === -1) throw new Error('Interview not found');
    interviews[index] = { ...interviews[index], ...updates };
    setStorageData('interviews', interviews);
    return interviews[index];
  },

  addMessage: async (interviewId: string, message: Omit<Message, 'id' | 'timestamp'>): Promise<Message> => {
    await delay(300);
    const interviews = getStorageData<Interview[]>('interviews', mockInterviews);
    const interview = interviews.find(i => i.id === interviewId);
    if (!interview) throw new Error('Interview not found');
    
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    
    if (!interview.messages) {
      interview.messages = [];
    }
    interview.messages.push(newMessage);
    setStorageData('interviews', interviews);
    return newMessage;
  },

  // Report API
  getReport: async (interviewId: string): Promise<Report | null> => {
    await delay(300);
    const reports = getStorageData<Report[]>('reports', mockReports);
    return reports.find(r => r.interviewId === interviewId) || null;
  },

  generateReport: async (interviewId: string): Promise<Report> => {
    await delay(1500); // 模拟生成报告的时间
    const interviews = getStorageData<Interview[]>('interviews', mockInterviews);
    const interview = interviews.find(i => i.id === interviewId);
    if (!interview) throw new Error('Interview not found');

    // 简单的模拟报告生成逻辑
    const newReport: Report = {
      id: Date.now().toString(),
      interviewId,
      overallScore: Math.floor(Math.random() * 20) + 75, // 75-95
      expression: Math.floor(Math.random() * 20) + 75,
      content: Math.floor(Math.random() * 20) + 75,
      structure: Math.floor(Math.random() * 20) + 75,
      language: Math.floor(Math.random() * 20) + 75,
      strengths: [
        '回答結構清晰，邏輯性強',
        '能夠提供具體的專案案例',
        '語言表達流暢自然',
      ],
      improvements: [
        '可以更詳細地解釋技術細節',
        '建議增加對問題背後原理的深入分析',
        '可以準備更多量化的成果資料',
      ],
      recommendations: [
        '繼續練習 STAR 方法回答行為問題',
        '準備更多技術深度問題的回答',
        '練習在壓力下的快速思考能力',
      ],
      createdAt: new Date().toISOString(),
    };

    const reports = getStorageData<Report[]>('reports', mockReports);
    reports.push(newReport);
    setStorageData('reports', reports);
    return newReport;
  },
};

