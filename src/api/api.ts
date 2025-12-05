// 统一的 API 接口，自动处理用户认证
import { useAuth } from '../contexts/AuthContext';
import { firestoreApi } from './firestoreApi';
import { Interview, Report, User, ChatSession, Message } from '../types';

// 这个文件导出一个 hook，用于在组件中获取带用户上下文的 API
export const useApi = () => {
  const { currentUser } = useAuth();

  const userId = currentUser?.uid || null;

  return {
    // User API
    getUser: async (): Promise<User> => {
      return firestoreApi.getUser(userId);
    },

    // Interview API
    getInterviews: async (): Promise<Interview[]> => {
      return firestoreApi.getInterviews(userId);
    },

    getInterview: async (interviewId: string): Promise<Interview | null> => {
      return firestoreApi.getInterview(userId, interviewId);
    },

    createInterview: async (
      interview: Omit<Interview, 'id' | 'createdAt' | 'chats'>
    ): Promise<Interview> => {
      return firestoreApi.createInterview(userId, interview);
    },

    updateInterview: async (
      interviewId: string,
      updates: Partial<Interview>
    ): Promise<Interview> => {
      return firestoreApi.updateInterview(userId, interviewId, updates);
    },

    createChat: async (interviewId: string, title?: string): Promise<ChatSession> => {
      return firestoreApi.createChat(userId, interviewId, title);
    },

    addMessage: async (
      interviewId: string,
      chatId: string,
      message: Omit<Message, 'id' | 'timestamp'>
    ): Promise<Message> => {
      return firestoreApi.addMessage(userId, interviewId, chatId, message);
    },

    updateChatTitle: async (
      interviewId: string,
      chatId: string,
      title: string
    ): Promise<ChatSession> => {
      return firestoreApi.updateChatTitle(userId, interviewId, chatId, title);
    },

    // Report API
    getReport: async (interviewId: string, chatId?: string): Promise<Report | null> => {
      return firestoreApi.getReport(userId, interviewId, chatId);
    },

    getReportsForInterview: async (interviewId: string): Promise<Report[]> => {
      return firestoreApi.getReportsForInterview(userId, interviewId);
    },

    generateReport: async (interviewId: string, chatId?: string): Promise<Report> => {
      return firestoreApi.generateReport(userId, interviewId, chatId);
    },
  };
};

// 为了向后兼容，也导出一个可以直接使用的 API（需要手动传入 userId）
export { firestoreApi as api };

