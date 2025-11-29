import { Interview, Report, User } from '../types';

export const mockUser: User = {
  id: '1',
  name: 'Demo User',
  email: 'demo@careersim.com',
};

export const mockInterviews: Interview[] = [
  {
    id: '1',
    title: 'Software Engineer Mock Interview',
    type: 'Technical',
    date: '2024-01-15',
    time: '14:00',
    status: 'completed',
    createdAt: '2024-01-10T10:00:00Z',
    completedAt: '2024-01-15T14:30:00Z',
    chats: [
      {
        id: '1-chat-1',
        title: '模擬面試一',
        createdAt: '2024-01-10T10:00:00Z',
        updatedAt: '2024-01-15T14:03:00Z',
    messages: [
      {
        id: 'm1',
        role: 'interviewer',
        content: '您好，歡迎參加這次模擬面試。請先簡單介紹一下您自己。',
        timestamp: '2024-01-15T14:00:00Z',
      },
      {
        id: 'm2',
        role: 'user',
        content: '您好，我是一名電腦科學專業的應屆畢業生，對軟體開發有濃厚的興趣。',
        timestamp: '2024-01-15T14:01:00Z',
      },
      {
        id: 'm3',
        role: 'interviewer',
        content: '很好。請描述一下您在專案開發中遇到的最大挑戰，以及您是如何解決的。',
        timestamp: '2024-01-15T14:02:00Z',
      },
      {
        id: 'm4',
        role: 'user',
        content: '在開發一個電商平台時，我遇到了效能優化的問題。透過程式碼分析和資料庫優化，最終將頁面載入時間減少了50%。',
        timestamp: '2024-01-15T14:03:00Z',
          },
        ],
      },
    ],
  },
  {
    id: '2',
    title: 'Product Manager Interview',
    type: 'Behavioral',
    date: '2024-01-20',
    time: '10:00',
    status: 'scheduled',
    createdAt: '2024-01-12T09:00:00Z',
    chats: [
      {
        id: '2-chat-1',
        title: '預備練習',
        createdAt: '2024-01-12T09:00:00Z',
        updatedAt: '2024-01-12T09:00:00Z',
        messages: [],
      },
    ],
  },
  {
    id: '3',
    title: 'Frontend Developer Interview',
    type: 'Technical',
    date: '2024-01-18',
    time: '15:30',
    status: 'in-progress',
    createdAt: '2024-01-13T11:00:00Z',
    chats: [
      {
        id: '3-chat-1',
        title: '技術練習',
        createdAt: '2024-01-13T11:00:00Z',
        updatedAt: '2024-01-18T15:30:00Z',
    messages: [
      {
        id: 'm5',
        role: 'interviewer',
        content: '請解釋一下 React Hooks 的工作原理。',
        timestamp: '2024-01-18T15:30:00Z',
          },
        ],
      },
    ],
  },
];

export const mockReports: Report[] = [
  {
    id: 'r1',
    interviewId: '1',
    overallScore: 85,
    expression: 88,
    content: 82,
    structure: 85,
    language: 90,
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
    createdAt: '2024-01-15T14:35:00Z',
  },
];

