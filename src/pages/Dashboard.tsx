import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar as CalendarIcon, List } from 'lucide-react';
import { Interview, ViewMode } from '../types';
import { api } from '../api/mockApi';
import ActivityCard from '../components/ActivityCard';
import NewActivityForm from '../components/NewActivityForm';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek } from 'date-fns';

export default function Dashboard() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
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

  const handleNewInterview = (interview: Interview) => {
    setInterviews([...interviews, interview]);
    navigate(`/interview/${interview.id}`);
  };

  const upcomingInterviews = interviews
    .filter(i => i.status === 'scheduled' || i.status === 'in-progress')
    .sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateA - dateB;
    })
    .slice(0, 5);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // 周日开始
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const monthDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getInterviewsForDate = (date: Date) => {
    return interviews.filter(i => i.date && isSameDay(new Date(i.date), date));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gunmetal">載入中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white-smoke">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gunmetal mb-2">面試日曆</h1>
            <p className="text-gunmetal/70">管理您的模擬面試活動</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-md">
              <button
                onClick={() => setViewMode('month')}
                className={`p-2 rounded ${viewMode === 'month' ? 'bg-primary text-white' : 'text-gunmetal'}`}
              >
                <CalendarIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-primary text-white' : 'text-gunmetal'}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={() => setIsFormOpen(true)}
              className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl shadow-md hover:brightness-110 transition-smooth"
            >
              <Plus className="w-5 h-5" />
              <span>新增活動</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {viewMode === 'month' ? (
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gunmetal">
                    {format(currentDate, 'yyyy年MM月')}
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                      className="px-3 py-1 text-gunmetal hover:bg-white-smoke rounded-lg transition-smooth"
                    >
                      上個月
                    </button>
                    <button
                      onClick={() => setCurrentDate(new Date())}
                      className="px-3 py-1 text-gunmetal hover:bg-white-smoke rounded-lg transition-smooth"
                    >
                      今天
                    </button>
                    <button
                      onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                      className="px-3 py-1 text-gunmetal hover:bg-white-smoke rounded-lg transition-smooth"
                    >
                      下個月
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2 mb-4">
                  {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
                    <div key={day} className="text-center text-sm font-medium text-gunmetal/70 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {monthDays.map((day) => {
                    const dayInterviews = getInterviewsForDate(day);
                    const isToday = isSameDay(day, new Date());
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                    return (
                      <div
                        key={day.toISOString()}
                        className={`min-h-[100px] p-2 rounded-lg border ${
                          isToday ? 'bg-primary/10 border-primary' : 'border-white-smoke'
                        } ${!isCurrentMonth ? 'opacity-40' : ''}`}
                      >
                        <div className={`text-sm mb-1 ${isToday ? 'font-bold text-primary' : 'text-gunmetal'}`}>
                          {format(day, 'd')}
                        </div>
                        <div className="space-y-1">
                          {dayInterviews.slice(0, 2).map((interview) => (
                            <div
                              key={interview.id}
                              onClick={() => navigate(`/interview/${interview.id}`)}
                              className="text-xs p-1 bg-beaver/20 text-walnut rounded cursor-pointer hover:bg-beaver/30 transition-smooth truncate"
                            >
                              {interview.title}
                            </div>
                          ))}
                          {dayInterviews.length > 2 && (
                            <div className="text-xs text-gunmetal/50">+{dayInterviews.length - 2} 更多</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {interviews.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-md p-12 text-center">
                    <div className="text-6xl mb-4">📅</div>
                    <h3 className="text-xl font-semibold text-gunmetal mb-2">還沒有面試活動</h3>
                    <p className="text-gunmetal/70 mb-6">建立您的第一個模擬面試來開始練習吧！</p>
                    <button
                      onClick={() => setIsFormOpen(true)}
                      className="bg-primary text-white px-6 py-3 rounded-xl shadow-md hover:brightness-110 transition-smooth"
                    >
                      建立第一個面試
                    </button>
                  </div>
                ) : (
                  interviews.map((interview) => (
                    <ActivityCard key={interview.id} interview={interview} />
                  ))
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gunmetal mb-4">即將到來的面試</h3>
              {upcomingInterviews.length === 0 ? (
                <p className="text-gunmetal/70 text-sm">暫無即將到來的面試</p>
              ) : (
                <div className="space-y-3">
                  {upcomingInterviews.map((interview) => (
                    <div
                      key={interview.id}
                      onClick={() => navigate(`/interview/${interview.id}`)}
                      className="p-3 border border-white-smoke rounded-lg cursor-pointer hover:bg-white-smoke transition-smooth"
                    >
                      <div className="font-medium text-sm text-gunmetal mb-1">{interview.title}</div>
                      {interview.date && (
                        <div className="text-xs text-gunmetal/70">
                          {format(new Date(interview.date), 'MM月dd日')} {interview.time}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gunmetal mb-4">快速操作</h3>
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/list')}
                  className="w-full text-left px-4 py-2 text-gunmetal hover:bg-white-smoke rounded-lg transition-smooth"
                >
                  檢視所有面試
                </button>
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="w-full text-left px-4 py-2 text-gunmetal hover:bg-white-smoke rounded-lg transition-smooth"
                >
                  新增面試活動
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <NewActivityForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleNewInterview}
      />
    </div>
  );
}

