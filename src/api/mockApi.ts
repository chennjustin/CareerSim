import { ChatSession, Interview, Report, User, Message } from '../types';
import { mockInterviews, mockReports, mockUser } from '../data/mockData';
import { generateInterviewReport } from './llmApi';

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

const normalizeChat = (chat: Partial<ChatSession>, fallbackCreatedAt: string, interviewId: string, index: number): ChatSession => {
  const messages = Array.isArray(chat.messages) ? chat.messages : [];
  const createdAt = chat.createdAt || fallbackCreatedAt;
  const updatedAt =
    chat.updatedAt ||
    (messages.length ? messages[messages.length - 1].timestamp : createdAt);
  return {
    id: chat.id || `${interviewId}-chat-${index + 1}`,
    title: chat.title || '新對話',
    createdAt,
    updatedAt,
    messages,
  };
};

const normalizeInterview = (rawInterview: any): Interview => {
  const {
    chats: storedChats = [],
    messages: legacyMessages = [],
    createdAt: storedCreatedAt,
    ...rest
  } = rawInterview;

  const interviewId = rest.id || `${rest.title ?? 'interview'}-${Date.now()}`;
  const createdAt = storedCreatedAt || new Date().toISOString();
  const fallbackMessages = Array.isArray(legacyMessages) ? legacyMessages : [];

  const normalizedChats =
    Array.isArray(storedChats) && storedChats.length > 0
      ? storedChats.map((chat: Partial<ChatSession>, index: number) =>
          normalizeChat(chat, createdAt, interviewId, index)
        )
      : fallbackMessages.length > 0
      ? [
          {
            id: `${interviewId}-chat-1`,
            title: '新對話',
            createdAt,
            updatedAt: fallbackMessages[fallbackMessages.length - 1].timestamp,
            messages: fallbackMessages,
          },
        ]
      : []; // Don't create a chat if there are no messages

  return {
    ...rest,
    id: interviewId,
    createdAt,
    chats: normalizedChats,
  } as Interview;
};

const normalizeInterviews = (rawInterviews: any[]): Interview[] => {
  if (!Array.isArray(rawInterviews)) return [];
  return rawInterviews.map(normalizeInterview);
};

const getStoredInterviews = (): Interview[] => {
  const stored = getStorageData<any[]>('interviews', mockInterviews);
  return normalizeInterviews(stored);
};

const persistInterviews = (interviews: Interview[]) => {
  // Store interviews as-is without normalization
  // Normalization only happens when reading from storage (in getStoredInterviews)
  setStorageData('interviews', interviews);
};

// 初始化数据
const initStorage = () => {
  const storedInterviews = getStorageData<any[]>('interviews', mockInterviews);
  setStorageData('interviews', normalizeInterviews(storedInterviews));
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
    return getStoredInterviews();
  },

  getInterview: async (id: string): Promise<Interview | null> => {
    await delay(300);
    return getStoredInterviews().find(i => i.id === id) || null;
  },

  createInterview: async (interview: Omit<Interview, 'id' | 'createdAt' | 'chats'>): Promise<Interview> => {
    await delay(500);
    const newInterview: Interview = {
      ...interview,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      chats: [],
    };
    const interviews = getStoredInterviews();
    interviews.push(newInterview);
    persistInterviews(interviews);
    return newInterview;
  },

  updateInterview: async (id: string, updates: Partial<Interview>): Promise<Interview> => {
    await delay(400);
    const interviews = getStoredInterviews();
    const index = interviews.findIndex(i => i.id === id);
    if (index === -1) throw new Error('Interview not found');
    interviews[index] = { ...interviews[index], ...updates };
    persistInterviews(interviews);
    return interviews[index];
  },

  createChat: async (interviewId: string, title?: string): Promise<ChatSession> => {
    await delay(300);
    const interviews = getStoredInterviews();
    const interview = interviews.find(i => i.id === interviewId);
    if (!interview) throw new Error('Interview not found');

    // Count only chats that have messages (exclude empty chats)
    const existingChats = interview.chats || [];
    const chatsWithMessages = existingChats.filter(chat => chat.messages && chat.messages.length > 0);
    const chatNumber = chatsWithMessages.length + 1;

    const newChat: ChatSession = {
      id: Date.now().toString(),
      title: title || `新對話 ${chatNumber}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };

    // Add new chat to the list
    interview.chats = [...existingChats, newChat];
    persistInterviews(interviews);
    return newChat;
  },

  addMessage: async (interviewId: string, chatId: string, message: Omit<Message, 'id' | 'timestamp'>): Promise<Message> => {
    await delay(300);
    const interviews = getStoredInterviews();
    const interview = interviews.find(i => i.id === interviewId);
    if (!interview) throw new Error('Interview not found');

    const chat = interview.chats.find(c => c.id === chatId);
    if (!chat) throw new Error('Chat session not found');
    
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    
    chat.messages = [...chat.messages, newMessage];
    chat.updatedAt = newMessage.timestamp;
    persistInterviews(interviews);
    return newMessage;
  },

  updateChatTitle: async (interviewId: string, chatId: string, title: string): Promise<ChatSession> => {
    await delay(300);
    const interviews = getStoredInterviews();
    const interview = interviews.find(i => i.id === interviewId);
    if (!interview) throw new Error('Interview not found');

    const chat = interview.chats.find(c => c.id === chatId);
    if (!chat) throw new Error('Chat session not found');
    
    chat.title = title;
    persistInterviews(interviews);
    return chat;
  },

  // Report API
  getReport: async (interviewId: string, chatId?: string): Promise<Report | null> => {
    await delay(300);
    const reports = getStorageData<Report[]>('reports', mockReports);
    if (chatId) {
      return reports.find(r => r.interviewId === interviewId && r.chatId === chatId) || null;
    }
    return reports.find(r => r.interviewId === interviewId && !r.chatId) || null;
  },

  getReportsForInterview: async (interviewId: string): Promise<Report[]> => {
    await delay(300);
    const reports = getStorageData<Report[]>('reports', mockReports);
    return reports.filter(r => r.interviewId === interviewId);
  },

  generateReport: async (interviewId: string, chatId?: string): Promise<Report> => {
    const interviews = getStoredInterviews();
    const interview = interviews.find(i => i.id === interviewId);
    if (!interview) throw new Error('Interview not found');

    // 获取对话历史
    let conversationHistory: Message[] = [];
    if (chatId) {
      const chat = interview.chats.find(c => c.id === chatId);
      if (chat) {
        conversationHistory = chat.messages;
      }
    } else {
      // 如果没有指定 chatId，使用第一个有消息的聊天
      const firstChatWithMessages = interview.chats.find(c => c.messages && c.messages.length > 0);
      if (firstChatWithMessages) {
        conversationHistory = firstChatWithMessages.messages;
      }
    }

    // 使用 ChatGPT 生成报告
    let reportData;
    try {
      reportData = await generateInterviewReport(conversationHistory, interview.type);
    } catch (error) {
      console.error('Failed to generate report with ChatGPT, using fallback:', error);
      // 如果 ChatGPT 失败，使用默认报告
      reportData = {
        overallScore: 75,
        expression: 75,
        content: 75,
        structure: 75,
        language: 75,
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
      };
    }

    const newReport: Report = {
      id: Date.now().toString(),
      interviewId,
      chatId,
      ...reportData,
      createdAt: new Date().toISOString(),
    };

    const reports = getStorageData<Report[]>('reports', mockReports);
    reports.push(newReport);
    setStorageData('reports', reports);
    return newReport;
  },
};

