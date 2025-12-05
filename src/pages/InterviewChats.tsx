import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, FileText, Edit2, Check, X } from 'lucide-react';
import { Interview, Report } from '../types';
import { useApi } from '../api/api';
import { format, formatDistanceToNow } from 'date-fns';

export default function InterviewChats() {
  const api = useApi();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [reports, setReports] = useState<Record<string, Report>>({});
  const [loading, setLoading] = useState(true);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  useEffect(() => {
    if (id) {
      loadInterview();
    }
  }, [id]);

  const loadInterview = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await api.getInterview(id);
      setInterview(data);
      
      // Load all reports for this interview
      const allReports = await api.getReportsForInterview(id);
      const reportsMap: Record<string, Report> = {};
      allReports.forEach(report => {
        if (report.chatId) {
          reportsMap[report.chatId] = report;
        }
      });
      setReports(reportsMap);
    } catch (error) {
      console.error('Failed to load interview:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChat = () => {
    if (!id) return;
    navigate(`/interview/${id}/new-chat`);
  };

  const handleViewChat = (chatId: string) => {
    if (!id) return;
    navigate(`/interview/${id}/chat/${chatId}`);
  };

  const handleViewReport = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (!id) return;
    navigate(`/report/${id}?chatId=${chatId}`);
  };

  const handleStartEdit = (e: React.MouseEvent, chatId: string, currentTitle: string) => {
    e.stopPropagation();
    setEditingChatId(chatId);
    setEditingTitle(currentTitle);
  };

  const handleSaveEdit = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (!id || !editingTitle.trim()) {
      setEditingChatId(null);
      setEditingTitle('');
      return;
    }
    try {
      await api.updateChatTitle(id, chatId, editingTitle.trim());
      const updatedInterview = await api.getInterview(id);
      if (updatedInterview) {
        setInterview(updatedInterview);
      }
      setEditingChatId(null);
      setEditingTitle('');
    } catch (error) {
      console.error('Failed to update chat title:', error);
    }
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(null);
    setEditingTitle('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white-smoke">
        <div className="text-gunmetal">載入中...</div>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white-smoke">
        <div className="text-gunmetal">找不到面試活動</div>
      </div>
    );
  }

  const sortedChats = [...interview.chats].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <div className="min-h-screen bg-white-smoke">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gunmetal hover:text-gunmetal/80 mb-4 transition-smooth"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>返回日曆</span>
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gunmetal mb-2">{interview.title}</h1>
              <p className="text-gunmetal/70">{interview.type}</p>
            </div>
            <button
              onClick={handleCreateChat}
              className="flex items-center gap-2 bg-gunmetal text-white px-6 py-3 rounded-lg shadow-sm hover:bg-black transition-smooth font-medium"
            >
              <Plus className="w-5 h-5" />
              <span>開始新練習</span>
            </button>
          </div>
        </div>

        {/* Chat History List */}
        <div className="bg-white rounded-lg shadow-sm border border-white-smoke">
          <div className="p-6 border-b border-white-smoke">
            <h2 className="text-lg font-semibold text-gunmetal tracking-tight">練習歷史</h2>
            <p className="text-sm text-gunmetal/60 mt-1">
              共 {sortedChats.length} 場練習會話
            </p>
          </div>

          <div className="divide-y divide-white-smoke">
            {sortedChats.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-6xl mb-4">💬</div>
                <h3 className="text-xl font-semibold text-gunmetal mb-2">還沒有練習記錄</h3>
                <p className="text-gunmetal/70">開始您的第一場模擬面試練習吧！</p>
              </div>
            ) : (
              sortedChats.map((chat) => (
                <div
                  key={chat.id}
                  className="p-6 hover:bg-white-smoke/50 transition-colors cursor-pointer"
                  onClick={() => handleViewChat(chat.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {editingChatId === chat.id ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveEdit(e as any, chat.id);
                                } else if (e.key === 'Escape') {
                                  handleCancelEdit(e as any);
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 text-lg font-semibold text-gunmetal border border-gunmetal rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gunmetal/20"
                              autoFocus
                            />
                            <button
                              onClick={(e) => handleSaveEdit(e, chat.id)}
                              className="p-1 text-gunmetal hover:bg-gunmetal/10 rounded transition-smooth"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => handleCancelEdit(e)}
                              className="p-1 text-gunmetal/50 hover:bg-white-smoke rounded transition-smooth"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <h3 className="text-lg font-semibold text-gunmetal">{chat.title}</h3>
                            <button
                              onClick={(e) => handleStartEdit(e, chat.id, chat.title)}
                              className="p-1 text-gunmetal/40 hover:text-gunmetal hover:bg-white-smoke rounded transition-smooth"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <span className="text-xs text-gunmetal/50">
                              {formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: true })}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gunmetal/70">
                        <span>{chat.messages.length} 條訊息</span>
                        <span>
                          最後更新 {format(new Date(chat.updatedAt), 'yyyy年MM月dd日 HH:mm')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Show report button if chat has enough messages (5+ interviewer questions) or has a report */}
                      {(() => {
                        const interviewerCount = chat.messages.filter(m => m.role === 'interviewer').length;
                        const hasReport = reports[chat.id];
                        const canViewReport = interviewerCount >= 5 || hasReport;
                        
                        return canViewReport ? (
                          <button
                            onClick={(e) => handleViewReport(e, chat.id)}
                            className="flex items-center gap-2 px-4 py-2 text-sm rounded-md border border-gunmetal text-gunmetal hover:bg-gunmetal/10 transition-colors font-medium"
                          >
                            <FileText className="w-4 h-4" />
                            <span>面試報告</span>
                          </button>
                        ) : null;
                      })()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

