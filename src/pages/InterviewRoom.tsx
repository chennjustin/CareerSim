import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Mic, Settings } from 'lucide-react';
import { Interview, Message, AIPersonality } from '../types';
import { api } from '../api/mockApi';
import { format } from 'date-fns';

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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [personality, setPersonality] = useState<AIPersonality>('friendly');
  const [isLoading, setIsLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (id) {
      loadInterview();
    }
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadInterview = async () => {
    if (!id) return;
    try {
      const data = await api.getInterview(id);
      if (data) {
        setInterview(data);
        const existingMessages = data.messages || [];
        setMessages(existingMessages);
        const existingQuestionCount = existingMessages.filter(m => m.role === 'interviewer').length;
        setQuestionCount(existingQuestionCount);
        
        // 如果沒有訊息，自動發送第一個問題
        if (existingMessages.length === 0 && data.status !== 'completed') {
          setTimeout(() => {
            sendFirstQuestion();
          }, 500);
        }
      }
    } catch (error) {
      console.error('Failed to load interview:', error);
    }
  };

  const sendFirstQuestion = async () => {
    if (!id) return;
    const firstQuestion = '您好，歡迎參加這次模擬面試。請先簡單介紹一下您自己。';
    const aiMessage: Message = {
      id: Date.now().toString(),
      role: 'interviewer',
      content: firstQuestion,
      timestamp: new Date().toISOString(),
    };
    
    setMessages([aiMessage]);
    setQuestionCount(1);
    await api.addMessage(id, { role: 'interviewer', content: firstQuestion });
    await api.updateInterview(id, { status: 'in-progress' });
  };

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
    if (!inputValue.trim() || !id) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date().toISOString(),
    };

    setMessages([...messages, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // 儲存使用者訊息
    await api.addMessage(id, { role: 'user', content: inputValue });

    // 模擬 AI 回應延遲
    setTimeout(async () => {
      setQuestionCount((prev) => {
        const newCount = prev + 1;
        const aiResponse = generateAIResponse(inputValue, newCount);
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'interviewer',
          content: aiResponse,
          timestamp: new Date().toISOString(),
        };

        setMessages((prevMessages) => [...prevMessages, aiMessage]);
        
        // 非同步操作在 setState 外部執行
        (async () => {
          await api.addMessage(id, { role: 'interviewer', content: aiResponse });
          
          // 更新面試狀態
          if (newCount >= 5) {
            await api.updateInterview(id, { status: 'completed', completedAt: new Date().toISOString() });
          } else {
            await api.updateInterview(id, { status: 'in-progress' });
          }
        })();

        setIsLoading(false);
        return newCount;
      });
    }, 1000);
  };

  const handleFinish = () => {
    if (!id) return;
    navigate(`/report/${id}`);
  };

  if (!interview) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gunmetal">載入中...</div>
      </div>
    );
  }

  const isFinished = questionCount >= 5;

  return (
    <div className="min-h-screen bg-white-smoke flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-white-smoke shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-white-smoke rounded-lg transition-smooth"
              >
                <ArrowLeft className="w-5 h-5 text-gunmetal" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gunmetal">{interview.title}</h1>
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
                    className="w-full px-3 py-2 border border-white-smoke rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-xl font-semibold text-gunmetal mb-2">面試開始</h3>
              <p className="text-gunmetal/70">AI 面試官將開始提問，請準備好您的回答。</p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 animate-slide-up ${
                    message.role === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === 'interviewer' ? 'bg-gunmetal/20' : 'bg-primary/20'
                  }`}>
                    {message.role === 'interviewer' ? '🤖' : '👤'}
                  </div>
                  <div className={`flex-1 ${message.role === 'user' ? 'flex justify-end' : ''}`}>
                    <div
                      className={`inline-block max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === 'interviewer'
                          ? 'bg-white text-gunmetal shadow-md'
                          : 'bg-gradient-to-r from-primary to-accent text-white shadow-md'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      <p className={`text-xs mt-2 ${
                        message.role === 'interviewer' ? 'text-gunmetal/50' : 'text-white/70'
                      }`}>
                        {format(new Date(message.timestamp), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4 animate-slide-up">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gunmetal/20 flex items-center justify-center">
                    🤖
                  </div>
                  <div className="bg-white rounded-2xl px-4 py-3 shadow-md">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gunmetal/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gunmetal/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gunmetal/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-white-smoke shadow-lg">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {isFinished ? (
            <div className="flex justify-center">
              <button
                onClick={handleFinish}
                className="bg-primary text-white px-8 py-3 rounded-xl shadow-md hover:brightness-110 transition-smooth font-medium"
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
                  className="w-full px-4 py-3 pr-12 border border-white-smoke rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
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
                className="p-3 bg-primary text-white rounded-xl hover:brightness-110 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

