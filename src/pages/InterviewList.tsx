import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, CheckCircle, Circle, PlayCircle } from 'lucide-react';
import { Interview } from '../types';
import { api } from '../api/mockApi';
import { format } from 'date-fns';

const statusIcons = {
  scheduled: Circle,
  'in-progress': PlayCircle,
  completed: CheckCircle,
};

const statusColors = {
  scheduled: 'text-beaver',
  'in-progress': 'text-gunmetal',
  completed: 'text-gunmetal',
};

const statusLabels = {
  scheduled: '已排程',
  'in-progress': '進行中',
  completed: '已完成',
};

export default function InterviewList() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | Interview['status']>('all');
  const navigate = useNavigate();

  useEffect(() => {
    loadInterviews();
  }, []);

  const loadInterviews = async () => {
    try {
      setLoading(true);
      const data = await api.getInterviews();
      setInterviews(data);
    } catch (error) {
      console.error('Failed to load interviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInterviews = filter === 'all' 
    ? interviews 
    : interviews.filter(i => i.status === filter);

  const handleInterviewClick = (interview: Interview) => {
    if (interview.status === 'completed') {
      navigate(`/report/${interview.id}`);
    } else {
      navigate(`/interview/${interview.id}/chats`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white-smoke">
        <div className="text-gunmetal">載入中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white-smoke">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gunmetal hover:text-gunmetal/80 mb-4 transition-smooth"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>返回日曆</span>
          </button>
          <h1 className="text-3xl font-bold text-gunmetal mb-2">所有面試</h1>
          <p className="text-gunmetal/70">檢視和管理所有面試活動</p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-smooth ${
              filter === 'all'
                ? 'bg-gunmetal text-white'
                : 'bg-white text-gunmetal hover:bg-white-smoke'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setFilter('scheduled')}
            className={`px-4 py-2 rounded-lg transition-smooth ${
              filter === 'scheduled'
                ? 'bg-gunmetal text-white'
                : 'bg-white text-gunmetal hover:bg-white-smoke'
            }`}
          >
            已排程
          </button>
          <button
            onClick={() => setFilter('in-progress')}
            className={`px-4 py-2 rounded-lg transition-smooth ${
              filter === 'in-progress'
                ? 'bg-gunmetal text-white'
                : 'bg-white text-gunmetal hover:bg-white-smoke'
            }`}
          >
            進行中
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg transition-smooth ${
              filter === 'completed'
                ? 'bg-gunmetal text-white'
                : 'bg-white text-gunmetal hover:bg-white-smoke'
            }`}
          >
            已完成
          </button>
        </div>

        {/* List */}
        {filteredInterviews.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-white-smoke p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gunmetal mb-2">暫無面試</h3>
            <p className="text-gunmetal/70 mb-6">
              {filter === 'all' 
                ? '建立您的第一個模擬面試來開始練習吧！'
                : `沒有${statusLabels[filter as Interview['status']]}狀態的面試`}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => navigate('/dashboard')}
                className="bg-gunmetal text-white px-6 py-3 rounded-lg shadow-sm hover:bg-black transition-smooth font-medium"
              >
                建立面試
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInterviews.map((interview) => {
              const StatusIcon = statusIcons[interview.status];
              return (
                <div
                  key={interview.id}
                  onClick={() => handleInterviewClick(interview)}
                  className="bg-white rounded-lg shadow-sm border border-white-smoke p-6 cursor-pointer transition-smooth hover:shadow-md hover:border-beaver/30 animate-fade-in"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <StatusIcon className={`w-5 h-5 ${statusColors[interview.status]}`} />
                        <h3 className="text-lg font-semibold text-gunmetal">{interview.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          interview.status === 'scheduled' ? 'bg-beaver/20 text-walnut' :
                          interview.status === 'in-progress' ? 'bg-gunmetal/15 text-gunmetal' :
                          'bg-gunmetal/20 text-gunmetal'
                        }`}>
                          {statusLabels[interview.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-gunmetal/70">
                        <span className="font-medium text-beaver">{interview.type}</span>
                        {interview.date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{format(new Date(interview.date), 'yyyy年MM月dd日')}</span>
                          </div>
                        )}
                        {interview.time && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{interview.time}</span>
                          </div>
                        )}
                        <span className="text-gunmetal/50">
                          建立於 {format(new Date(interview.createdAt), 'yyyy年MM月dd日')}
                        </span>
                      </div>
                    </div>
                    <div className="text-gunmetal/30">
                      →
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

