import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Mic, Settings, Plus, Edit2, Check, X } from 'lucide-react';
import { ChatSession, Interview, Message, AIPersonality } from '../types';
import { api } from '../api/mockApi';
import { format, formatDistanceToNow } from 'date-fns';

const aiPersonalities = {
  friendly: {
    name: '友善',
    responses: [
      '很好！讓我們繼續下一個問題。',
      '不錯的回答，能再詳細說說嗎？',
      '我理解您的想法，這是一個很好的觀點。',
    ],
  },
  formal: {
    name: '正式',
    responses: [
      '請詳細闡述您的觀點。',
      '請提供具體的案例來支持您的回答。',
      '請繼續您的回答。',
    ],
  },
  'stress-test': {
    name: '壓力測試',
    responses: [
      '這個回答還不夠充分，請再想想。',
      '您能提供更有說服力的證據嗎？',
      '如果這是真實面試，您覺得這個回答足夠好嗎？',
    ],
  },
};

export default function InterviewRoom() {
  const { id, chatId } = useParams<{ id: string; chatId?: string }>();
  const navigate = useNavigate();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChat, setActiveChat] = useState<ChatSession | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [personality, setPersonality] = useState<AIPersonality>('friendly');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);

  const activeMessages = activeChat?.messages ?? [];
  const interviewerCount = activeMessages.filter((message) => message.role === 'interviewer')
    .length;
  const isFinished = interviewerCount >= 5;

  // Check if user is at bottom of scroll
  const checkScrollPosition = () => {
    if (!messagesContainerRef.current) return;
    const container = messagesContainerRef.current;
    const threshold = 100; // pixels from bottom
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    setIsScrolledToBottom(isAtBottom);
  };

  // Only auto-scroll if user was at bottom
  useEffect(() => {
    if (isScrolledToBottom && messagesContainerRef.current && activeMessages.length > 0) {
      const container = messagesContainerRef.current;
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      });
    }
  }, [activeMessages.length, isScrolledToBottom]);

  // Initial scroll to bottom when chat loads
  useEffect(() => {
    if (activeChat && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight;
          setIsScrolledToBottom(true);
        }
      });
    }
  }, [activeChat?.id]);

  const appendMessageToChat = (chatId: string, message: Message) => {
    setChatSessions((prev) => {
      const updated = prev.map((chat) =>
        chat.id === chatId
          ? { ...chat, messages: [...chat.messages, message], updatedAt: message.timestamp }
          : chat
      );
      setInterview((prevInterview) =>
        prevInterview ? { ...prevInterview, chats: updated } : prevInterview
      );
      // Update activeChat if it's the one being updated
      if (activeChat?.id === chatId) {
        const updatedChat = updated.find(c => c.id === chatId);
        if (updatedChat) {
          setActiveChat(updatedChat);
        }
      }
      return updated;
    });
  };

  const sendFirstQuestion = async (chatId: string) => {
    if (!id) return;
    const firstQuestion =
      '您好，歡迎參加這次模擬面試。請先簡單介紹一下您自己。';
    setIsLoading(true);
    try {
      const newMessage = await api.addMessage(id, chatId, {
        role: 'interviewer',
        content: firstQuestion,
      });
      appendMessageToChat(chatId, newMessage);
      await api.updateInterview(id, { status: 'in-progress' });
      setInterview((prev) => (prev ? { ...prev, status: 'in-progress' } : prev));
    } catch (error) {
      console.error('Failed to send first question:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadInterview = async () => {
    if (!id) return;
    try {
      const data = await api.getInterview(id);
      if (data) {
        setInterview(data);
        setChatSessions(data.chats);
        
        // Handle new chat creation
        const path = window.location.pathname;
        if (path.includes('/new-chat')) {
          const newChat = await api.createChat(id);
          setChatSessions((prev) => [...prev, newChat]);
          setActiveChat(newChat);
          setInterview((prev) => (prev ? { ...prev, chats: [...(prev.chats || []), newChat] } : prev));
          // Update URL to include chatId
          navigate(`/interview/${id}/chat/${newChat.id}`, { replace: true });
          sendFirstQuestion(newChat.id);
        } else if (chatId) {
          // Load specific chat
          const chat = data.chats.find(c => c.id === chatId);
          if (chat) {
            setActiveChat(chat);
            if (chat.messages.length === 0 && data.status !== 'completed') {
              setTimeout(() => {
                sendFirstQuestion(chat.id);
              }, 500);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load interview:', error);
    }
  };

  useEffect(() => {
    loadInterview();
  }, [id]);

  const generateAIResponse = (_userMessage: string, currentQuestionCount: number): string => {
    const responses = aiPersonalities[personality].responses;
    const questions = [
      '請描述一下您在團隊合作中遇到的最大挑戰。',
      '您如何平衡多個專案的優先順序？',
      '請分享一個您解決複雜技術問題的例子。',
      '您認為自己最大的優勢是什麼？',
      '您如何處理工作中的壓力？',
    ];

    if (currentQuestionCount < questions.length) {
      return questions[currentQuestionCount];
    } else {
      return responses[Math.floor(Math.random() * responses.length)];
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || !id || !activeChat) return;
    const chatId = activeChat.id;
    const text = inputValue.trim();
    const previousQuestionCount = activeChat.messages.filter((message) => message.role === 'interviewer')
      .length;
    setInputValue('');
    setIsLoading(true);

    try {
      const savedUserMessage = await api.addMessage(id, chatId, {
        role: 'user',
        content: text,
      });
      appendMessageToChat(chatId, savedUserMessage);
      setTimeout(() => {
        (async () => {
          try {
            const newCount = previousQuestionCount + 1;
            const aiResponse = generateAIResponse(text, newCount);
            const savedAIMessage = await api.addMessage(id, chatId, {
              role: 'interviewer',
              content: aiResponse,
            });
            appendMessageToChat(chatId, savedAIMessage);
          // Don't auto-complete interviews - only set to in-progress if scheduled
          // Interviews should only be marked as completed when their date/time passes
          if (interview.status === 'scheduled') {
            await api.updateInterview(id, { status: 'in-progress' });
            setInterview((prev) => (prev ? { ...prev, status: 'in-progress' } : prev));
          }
          } catch (error) {
            console.error('Failed to generate AI response:', error);
          } finally {
            setIsLoading(false);
          }
        })();
      }, 1000);
    } catch (error) {
      console.error('Failed to send user message:', error);
        setIsLoading(false);
    }
  };

  const handleFinish = async () => {
    if (!id || !chatId) return;
    try {
      // Generate report for this chat if it doesn't exist
      const existingReport = await api.getReport(id, chatId);
      if (!existingReport) {
        // Check if chat has enough messages to generate a report
        const interviewerCount = activeMessages.filter(m => m.role === 'interviewer').length;
        if (interviewerCount >= 5) {
          await api.generateReport(id, chatId);
        }
      }
      navigate(`/report/${id}?chatId=${chatId}`);
    } catch (error) {
      console.error('Failed to generate report:', error);
      navigate(`/report/${id}?chatId=${chatId}`);
    }
  };

  const handleSaveTitle = async () => {
    if (!id || !chatId || !editingTitle.trim()) return;
    try {
      await api.updateChatTitle(id, chatId, editingTitle.trim());
      const updatedInterview = await api.getInterview(id);
      if (updatedInterview) {
        setInterview(updatedInterview);
        const updatedChat = updatedInterview.chats.find(c => c.id === chatId);
        if (updatedChat) {
          setActiveChat(updatedChat);
        }
      }
      setIsEditingTitle(false);
      setEditingTitle('');
    } catch (error) {
      console.error('Failed to update chat title:', error);
    }
  };

  if (!interview || !activeChat) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gunmetal">載入中...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white-smoke flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-white-smoke shadow-sm flex-shrink-0">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/interview/${id}/chats`)}
                className="p-2 hover:bg-white-smoke rounded-lg transition-smooth"
              >
                <ArrowLeft className="w-5 h-5 text-gunmetal" />
              </button>
              <div className="flex-1">
                {isEditingTitle ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveTitle();
                        } else if (e.key === 'Escape') {
                          setIsEditingTitle(false);
                          setEditingTitle('');
                        }
                      }}
                      className="text-xl font-semibold text-gunmetal border border-gunmetal rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gunmetal/20"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveTitle}
                      className="p-1 text-gunmetal hover:bg-gunmetal/10 rounded transition-smooth"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingTitle(false);
                        setEditingTitle('');
                      }}
                      className="p-1 text-gunmetal/50 hover:bg-white-smoke rounded transition-smooth"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-semibold text-gunmetal">{activeChat?.title || interview.title}</h1>
                    <button
                      onClick={() => {
                        setEditingTitle(activeChat?.title || '');
                        setIsEditingTitle(true);
                      }}
                      className="p-1 text-gunmetal/40 hover:text-gunmetal hover:bg-white-smoke rounded transition-smooth"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <p className="text-sm text-gunmetal/70">{interview.type}</p>
              </div>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 hover:bg-white-smoke rounded-lg transition-smooth"
              >
                <Settings className="w-5 h-5 text-gunmetal" />
              </button>
              {showSettings && (
                <div className="absolute right-0 mt-2 bg-white rounded-xl shadow-lg p-4 w-48 z-10 animate-scale-in">
                  <label className="block text-sm font-medium text-gunmetal mb-2">AI 性格</label>
                  <select
                    value={personality}
                    onChange={(e) => setPersonality(e.target.value as AIPersonality)}
                    className="w-full px-3 py-2 border border-white-smoke rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gunmetal/20 focus:border-gunmetal/30"
                  >
                    <option value="friendly">友善</option>
                    <option value="formal">正式</option>
                    <option value="stress-test">壓力測試</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area - Scrollable */}
      <div className="flex-1 flex flex-col overflow-hidden w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-lg shadow-sm border border-white-smoke max-w-4xl mx-auto w-full">
          <div
            ref={messagesContainerRef}
            onScroll={checkScrollPosition}
            className="flex-1 overflow-y-auto px-6 py-6 space-y-6"
            style={{ scrollBehavior: 'smooth' }}
          >
          {activeMessages.length === 0 ? (
            <div className="text-center text-gunmetal/70 py-16 space-y-2">
              <div className="text-6xl">💬</div>
              <p className="text-lg font-semibold">準備開始，握好麥克風！</p>
              <p className="text-sm">輸入回應後，AI 面試官會開始提問。</p>
            </div>
          ) : (
            <div className="space-y-6">
              {activeMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 transition ${
                    message.role === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === 'interviewer' ? 'bg-gunmetal/10' : 'bg-gunmetal/20'
                    }`}
                  >
                    {message.role === 'interviewer' ? '🤖' : '👤'}
                  </div>
                  <div className={`flex-1 ${message.role === 'user' ? 'flex justify-end' : ''}`}>
                    <div
                      className={`inline-block max-w-[80%] rounded-lg px-4 py-3 ${
                        message.role === 'interviewer'
                          ? 'bg-white text-gunmetal shadow-sm border border-white-smoke'
                          : 'bg-gunmetal text-white shadow-sm'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      <p
                        className={`text-xs mt-2 ${
                          message.role === 'interviewer' ? 'text-gunmetal/50' : 'text-white/70'
                        }`}
                      >
                        {format(new Date(message.timestamp), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isLoading && (
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gunmetal/20 flex items-center justify-center">
                🤖
              </div>
              <div className="bg-white rounded-lg px-4 py-3 shadow-sm border border-white-smoke">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gunmetal/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gunmetal/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gunmetal/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          </div>

          {/* Input Area - Fixed at bottom */}
          <div className="flex-shrink-0 border-t border-white-smoke bg-white px-6 py-4 rounded-b-lg">
          {isFinished ? (
            <div className="flex justify-center">
              <button
                onClick={handleFinish}
                className="bg-gunmetal text-white px-8 py-3 rounded-lg shadow-sm hover:bg-black transition-smooth font-medium"
              >
                檢視報告
              </button>
            </div>
          ) : (
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="輸入您的回答..."
                  className="w-full px-4 py-3 pr-12 border border-white-smoke rounded-lg focus:outline-none focus:ring-2 focus:ring-gunmetal/20 focus:border-gunmetal/30 resize-none bg-white"
                  rows={1}
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                />
                <button className="absolute right-3 bottom-3 p-2 text-gunmetal/50 hover:text-gunmetal transition-smooth">
                  <Mic className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading}
                className="p-3 bg-gunmetal text-white rounded-lg hover:bg-black transition-smooth disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

