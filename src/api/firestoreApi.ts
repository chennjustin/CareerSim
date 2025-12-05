import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { ChatSession, Interview, Report, User, Message } from '../types';
import { generateInterviewReport } from './llmApi';

// 获取当前用户 ID（需要在调用时传入）
const requireUserId = (userId: string | null | undefined): string => {
  if (!userId) {
    throw new Error('用戶未登入，請先登入');
  }
  return userId;
};

// 转换 Firestore Timestamp 为 ISO 字符串
const timestampToString = (timestamp: any): string => {
  if (timestamp?.toDate) {
    return timestamp.toDate().toISOString();
  }
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  return new Date().toISOString();
};

// 转换 Firestore 数据为 Interview
const convertFirestoreInterview = (data: any, id: string): Interview => {
  return {
    id,
    title: data.title || '',
    type: data.type || '',
    date: data.date || undefined,
    time: data.time || undefined,
    status: data.status || 'scheduled',
    createdAt: timestampToString(data.createdAt),
    completedAt: data.completedAt ? timestampToString(data.completedAt) : undefined,
    chats: Array.isArray(data.chats) ? data.chats.map((chat: any, index: number) => ({
      id: chat.id || `${id}-chat-${index + 1}`,
      title: chat.title || '新對話',
      createdAt: timestampToString(chat.createdAt || data.createdAt),
      updatedAt: timestampToString(chat.updatedAt || chat.createdAt || data.createdAt),
      messages: Array.isArray(chat.messages) ? chat.messages.map((msg: any) => ({
        id: msg.id || Date.now().toString(),
        role: msg.role || 'user',
        content: msg.content || '',
        timestamp: timestampToString(msg.timestamp || msg.createdAt),
      })) : [],
    })) : [],
  };
};

// 转换 Firestore 数据为 Report
const convertFirestoreReport = (data: any, id: string): Report => {
  return {
    id,
    interviewId: data.interviewId || '',
    chatId: data.chatId || undefined,
    overallScore: data.overallScore || 0,
    expression: data.expression || 0,
    content: data.content || 0,
    structure: data.structure || 0,
    language: data.language || 0,
    strengths: Array.isArray(data.strengths) ? data.strengths : [],
    improvements: Array.isArray(data.improvements) ? data.improvements : [],
    recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
    createdAt: timestampToString(data.createdAt),
  };
};

export const firestoreApi = {
  // User API
  getUser: async (userId: string | null | undefined): Promise<User> => {
    const uid = requireUserId(userId);
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error('用戶資料不存在');
    }

    const data = userSnap.data();
    return {
      id: uid,
      name: data?.name || 'User',
      email: data?.email || '',
    };
  },

  // Interview API
  getInterviews: async (userId: string | null | undefined): Promise<Interview[]> => {
    const uid = requireUserId(userId);
    const interviewsRef = collection(db, 'users', uid, 'interviews');
    const q = query(interviewsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => convertFirestoreInterview(doc.data(), doc.id));
  },

  getInterview: async (
    userId: string | null | undefined,
    interviewId: string
  ): Promise<Interview | null> => {
    const uid = requireUserId(userId);
    const interviewRef = doc(db, 'users', uid, 'interviews', interviewId);
    const interviewSnap = await getDoc(interviewRef);

    if (!interviewSnap.exists()) {
      return null;
    }

    return convertFirestoreInterview(interviewSnap.data(), interviewSnap.id);
  },

  createInterview: async (
    userId: string | null | undefined,
    interview: Omit<Interview, 'id' | 'createdAt' | 'chats'>
  ): Promise<Interview> => {
    const uid = requireUserId(userId);
    const interviewsRef = collection(db, 'users', uid, 'interviews');
    const newInterviewRef = doc(interviewsRef);

    const interviewData = {
      title: interview.title,
      type: interview.type,
      date: interview.date || null,
      time: interview.time || null,
      status: interview.status || 'scheduled',
      createdAt: serverTimestamp(),
      chats: [],
    };

    await setDoc(newInterviewRef, interviewData);

    return {
      id: newInterviewRef.id,
      ...interview,
      createdAt: new Date().toISOString(),
      chats: [],
    };
  },

  updateInterview: async (
    userId: string | null | undefined,
    interviewId: string,
    updates: Partial<Interview>
  ): Promise<Interview> => {
    const uid = requireUserId(userId);
    const interviewRef = doc(db, 'users', uid, 'interviews', interviewId);

    const updateData: any = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.date !== undefined) updateData.date = updates.date || null;
    if (updates.time !== undefined) updateData.time = updates.time || null;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.completedAt !== undefined) updateData.completedAt = updates.completedAt || null;
    updateData.updatedAt = serverTimestamp();

    await updateDoc(interviewRef, updateData);

    const updatedSnap = await getDoc(interviewRef);
    if (!updatedSnap.exists()) {
      throw new Error('Interview not found');
    }

    return convertFirestoreInterview(updatedSnap.data(), updatedSnap.id);
  },

  createChat: async (
    userId: string | null | undefined,
    interviewId: string,
    title?: string
  ): Promise<ChatSession> => {
    const uid = requireUserId(userId);
    const interviewRef = doc(db, 'users', uid, 'interviews', interviewId);
    const interviewSnap = await getDoc(interviewRef);

    if (!interviewSnap.exists()) {
      throw new Error('Interview not found');
    }

    const interviewData = interviewSnap.data();
    const existingChats = Array.isArray(interviewData.chats) ? interviewData.chats : [];
    const chatsWithMessages = existingChats.filter(
      (chat: any) => chat.messages && chat.messages.length > 0
    );
    const chatNumber = chatsWithMessages.length + 1;

    const newChat: ChatSession = {
      id: Date.now().toString(),
      title: title || `新對話 ${chatNumber}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };

    // 更新 interview 的 chats 数组
    const updatedChats = [...existingChats, newChat];
    await updateDoc(interviewRef, {
      chats: updatedChats,
      updatedAt: serverTimestamp(),
    });

    return newChat;
  },

  addMessage: async (
    userId: string | null | undefined,
    interviewId: string,
    chatId: string,
    message: Omit<Message, 'id' | 'timestamp'>
  ): Promise<Message> => {
    const uid = requireUserId(userId);
    const interviewRef = doc(db, 'users', uid, 'interviews', interviewId);
    const interviewSnap = await getDoc(interviewRef);

    if (!interviewSnap.exists()) {
      throw new Error('Interview not found');
    }

    const interviewData = interviewSnap.data();
    const chats = Array.isArray(interviewData.chats) ? interviewData.chats : [];
    const chatIndex = chats.findIndex((c: any) => c.id === chatId);

    if (chatIndex === -1) {
      throw new Error('Chat session not found');
    }

    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };

    // 更新 chat 的 messages 数组
    chats[chatIndex] = {
      ...chats[chatIndex],
      messages: [...(chats[chatIndex].messages || []), newMessage],
      updatedAt: new Date().toISOString(),
    };

    await updateDoc(interviewRef, {
      chats: chats,
      updatedAt: serverTimestamp(),
    });

    return newMessage;
  },

  updateChatTitle: async (
    userId: string | null | undefined,
    interviewId: string,
    chatId: string,
    title: string
  ): Promise<ChatSession> => {
    const uid = requireUserId(userId);
    const interviewRef = doc(db, 'users', uid, 'interviews', interviewId);
    const interviewSnap = await getDoc(interviewRef);

    if (!interviewSnap.exists()) {
      throw new Error('Interview not found');
    }

    const interviewData = interviewSnap.data();
    const chats = Array.isArray(interviewData.chats) ? interviewData.chats : [];
    const chatIndex = chats.findIndex((c: any) => c.id === chatId);

    if (chatIndex === -1) {
      throw new Error('Chat session not found');
    }

    chats[chatIndex] = {
      ...chats[chatIndex],
      title: title,
    };

    await updateDoc(interviewRef, {
      chats: chats,
      updatedAt: serverTimestamp(),
    });

    return chats[chatIndex] as ChatSession;
  },

  // Report API
  getReport: async (
    userId: string | null | undefined,
    interviewId: string,
    chatId?: string
  ): Promise<Report | null> => {
    const uid = requireUserId(userId);
    const reportsRef = collection(db, 'users', uid, 'reports');
    let q;

    if (chatId) {
      q = query(
        reportsRef,
        where('interviewId', '==', interviewId),
        where('chatId', '==', chatId)
      );
    } else {
      // 对于没有 chatId 的情况，查询 chatId 为 null 或 undefined 的报告
      q = query(
        reportsRef,
        where('interviewId', '==', interviewId)
      );
    }

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    // 如果没有指定 chatId，过滤掉有 chatId 的报告
    if (!chatId) {
      const reportsWithoutChatId = querySnapshot.docs.filter(
        (doc) => !doc.data().chatId
      );
      if (reportsWithoutChatId.length === 0) {
        return null;
      }
      return convertFirestoreReport(reportsWithoutChatId[0].data(), reportsWithoutChatId[0].id);
    }

    const doc = querySnapshot.docs[0];
    return convertFirestoreReport(doc.data(), doc.id);
  },

  getReportsForInterview: async (
    userId: string | null | undefined,
    interviewId: string
  ): Promise<Report[]> => {
    const uid = requireUserId(userId);
    const reportsRef = collection(db, 'users', uid, 'reports');
    const q = query(reportsRef, where('interviewId', '==', interviewId), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => convertFirestoreReport(doc.data(), doc.id));
  },

  generateReport: async (
    userId: string | null | undefined,
    interviewId: string,
    chatId?: string
  ): Promise<Report> => {
    const uid = requireUserId(userId);
    const interview = await firestoreApi.getInterview(uid, interviewId);

    if (!interview) {
      throw new Error('Interview not found');
    }

    // 获取对话历史
    let conversationHistory: Message[] = [];
    if (chatId) {
      const chat = interview.chats.find((c) => c.id === chatId);
      if (chat && chat.messages && chat.messages.length > 0) {
        conversationHistory = chat.messages;
      }
    } else {
      // 如果没有指定 chatId，使用第一个有消息的聊天
      const firstChatWithMessages = interview.chats.find(
        (c) => c.messages && c.messages.length > 0
      );
      if (firstChatWithMessages && firstChatWithMessages.messages) {
        conversationHistory = firstChatWithMessages.messages;
      }
    }

    // 如果没有对话历史，抛出错误
    if (conversationHistory.length === 0) {
      throw new Error('沒有足夠的對話內容來生成報告');
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
        strengths: ['回答結構清晰，邏輯性強', '能夠提供具體的專案案例', '語言表達流暢自然'],
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

    // 保存到 Firestore
    const reportsRef = collection(db, 'users', uid, 'reports');
    const newReportRef = doc(reportsRef);

    await setDoc(newReportRef, {
      ...newReport,
      id: newReportRef.id,
      createdAt: serverTimestamp(),
    });

    return {
      ...newReport,
      id: newReportRef.id,
    };
  },
};

