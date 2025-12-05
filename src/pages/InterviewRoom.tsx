import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Mic, Settings, Edit2, Check, X } from 'lucide-react';
import { ChatSession, Interview, Message, AIPersonality } from '../types';
import { useApi } from '../api/api';
import { callChatGPT, generateFirstQuestion } from '../api/llmApi';
import { format } from 'date-fns';

// Web Speech API 类型定义
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

export default function InterviewRoom() {
  const api = useApi();
  const { id, chatId } = useParams<{ id: string; chatId?: string }>();
  const navigate = useNavigate();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChat, setActiveChat] = useState<ChatSession | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [personality, setPersonality] = useState<AIPersonality>('friendly');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  
  // 语音识别相关状态
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

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
    if (!id || !interview) return;
    setIsLoading(true);
    try {
      // 使用 ChatGPT 生成第一个问题
      const firstQuestion = await generateFirstQuestion(interview.type, personality);
      const newMessage = await api.addMessage(id, chatId, {
        role: 'interviewer',
        content: firstQuestion,
      });
      appendMessageToChat(chatId, newMessage);
      await api.updateInterview(id, { status: 'in-progress' });
      setInterview((prev) => (prev ? { ...prev, status: 'in-progress' } : prev));
    } catch (error) {
      console.error('Failed to send first question:', error);
      // 如果 API 失败，使用默认问题
      const defaultQuestion = '您好，歡迎參加這次模擬面試。請先簡單介紹一下您自己。';
      const newMessage = await api.addMessage(id, chatId, {
        role: 'interviewer',
        content: defaultQuestion,
      });
      appendMessageToChat(chatId, newMessage);
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
          const chat = data.chats.find((c: ChatSession) => c.id === chatId);
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

  // 初始化语音识别
  useEffect(() => {
    // 检查浏览器是否支持语音识别
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('您的瀏覽器不支持語音識別功能');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // 单次识别
    recognition.interimResults = false; // 不返回中间结果
    recognition.lang = 'zh-TW'; // 设置为繁体中文

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join('')
        .trim();
      
      if (transcript) {
        // 将识别结果填入输入框（追加到现有内容）
        setInputValue((prev) => {
          const trimmedPrev = prev.trim();
          return trimmedPrev ? `${trimmedPrev} ${transcript}` : transcript;
        });
      }
      setIsListening(false);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('語音識別錯誤:', event.error);
      setIsListening(false);
      
      // 显示错误提示
      if (event.error === 'no-speech') {
        // 没有检测到语音，不显示错误
        return;
      } else if (event.error === 'not-allowed') {
        alert('請允許瀏覽器使用麥克風權限');
      } else {
        alert('語音識別失敗，請重試');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    // 清理函数
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // 此函数已不再使用，保留用于向后兼容
  // const generateAIResponse = (_userMessage: string, currentQuestionCount: number): string => {
  //   // 已迁移到 callChatGPT
  // };

  const handleSend = async () => {
    if (!inputValue.trim() || !id || !activeChat || !interview) return;
    const chatId = activeChat.id;
    const text = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    try {
      const savedUserMessage = await api.addMessage(id, chatId, {
        role: 'user',
        content: text,
      });
      appendMessageToChat(chatId, savedUserMessage);
      // 使用 ChatGPT 生成 AI 响应
      try {
        // 获取当前对话历史（不包括刚发送的用户消息）
        const conversationHistory = activeChat.messages;
        
        // 调用 ChatGPT API
        const aiResponse = await callChatGPT(
          conversationHistory,
          personality,
          interview.type,
          text
        );
        
        const savedAIMessage = await api.addMessage(id, chatId, {
          role: 'interviewer',
          content: aiResponse,
        });
        appendMessageToChat(chatId, savedAIMessage);
        
        // Don't auto-complete interviews - only set to in-progress if scheduled
        // Interviews should only be marked as completed when their date/time passes
        const currentInterview = interview;
        if (currentInterview && currentInterview.status === 'scheduled') {
          await api.updateInterview(id, { status: 'in-progress' });
          setInterview((prev) => (prev ? { ...prev, status: 'in-progress' } : prev));
        }
      } catch (error) {
        console.error('Failed to generate AI response:', error);
        // 如果 API 失败，显示错误消息
        const errorMessage = '抱歉，AI 回應生成失敗，請稍後再試。';
        const savedAIMessage = await api.addMessage(id, chatId, {
          role: 'interviewer',
          content: errorMessage,
        });
        appendMessageToChat(chatId, savedAIMessage);
      } finally {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Failed to send user message:', error);
        setIsLoading(false);
    }
  };

  // 处理语音输入
  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('您的瀏覽器不支持語音識別功能。請使用 Chrome、Edge 或 Safari 瀏覽器。');
      return;
    }

    if (isListening) {
      // 停止录音
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('停止語音識別失敗:', error);
        setIsListening(false);
      }
    } else {
      // 开始录音
      try {
        recognitionRef.current.start();
      } catch (error: any) {
        console.error('啟動語音識別失敗:', error);
        setIsListening(false);
        
        // 更详细的错误提示
        if (error.name === 'NotAllowedError' || error.message?.includes('permission')) {
          alert('請允許瀏覽器使用麥克風權限。\n\n在瀏覽器地址欄左側點擊鎖定圖標，然後允許麥克風權限。');
        } else if (error.name === 'NotFoundError' || error.message?.includes('microphone')) {
          alert('未檢測到麥克風設備，請檢查您的麥克風連接。');
        } else {
          alert('無法啟動語音識別，請稍後再試。\n\n如果問題持續，請檢查瀏覽器設置中的麥克風權限。');
        }
      }
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
        const updatedChat = updatedInterview.chats.find((c: ChatSession) => c.id === chatId);
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

          {isListening && (
            <div className="flex gap-4 animate-slide-up">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
              </div>
              <div className="bg-red-50 rounded-lg px-4 py-3 shadow-sm border border-red-200">
                <p className="text-sm text-red-700 font-medium">🎤 正在錄音中...</p>
                <p className="text-xs text-red-600 mt-1">點擊麥克風圖標停止錄音</p>
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
                <button
                  onClick={handleVoiceInput}
                  disabled={isLoading}
                  className={`absolute right-3 bottom-3 p-2 transition-smooth ${
                    isListening
                      ? 'text-red-500 animate-pulse'
                      : 'text-gunmetal/50 hover:text-gunmetal'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={isListening ? '正在錄音，點擊停止' : '語音輸入'}
                >
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

