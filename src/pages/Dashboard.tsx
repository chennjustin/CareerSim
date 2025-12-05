import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar as CalendarIcon, List, CalendarDays, Check } from 'lucide-react';
import { Interview, ViewMode } from '../types';
import { useApi } from '../api/api';
import ActivityCard from '../components/ActivityCard';
import NewActivityForm from '../components/NewActivityForm';
import UserMenu from '../components/UserMenu';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, isPast, isToday as isTodayDate, isTomorrow } from 'date-fns';

interface DashboardTodo {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
  dueDate?: string;
}

export default function Dashboard() {
  const api = useApi();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [prefillDate, setPrefillDate] = useState<string | null>(null);
  const monthInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [todos, setTodos] = useState<DashboardTodo[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = window.localStorage.getItem('careersim-dashboard-todos');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [todoInput, setTodoInput] = useState('');
  const [todoDueDate, setTodoDueDate] = useState<string>('');
  const [draggedTodoId, setDraggedTodoId] = useState<string | null>(null);
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editingTodoTitle, setEditingTodoTitle] = useState('');
  const [editingTodoDate, setEditingTodoDate] = useState('');
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
    navigate(`/interview/${interview.id}/chats`);
  };

  const openFormWithDate = (date?: string) => {
    setPrefillDate(date ?? null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setPrefillDate(null);
  };

  const upcomingInterviews = interviews
    .filter(i => {
      // Only filter by date - show all future interviews regardless of status
      if (i.date) {
        const interviewDate = new Date(i.date + 'T00:00:00'); // Add time to avoid timezone issues
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        interviewDate.setHours(0, 0, 0, 0);
        // Include today and future dates only
        return interviewDate.getTime() >= today.getTime();
      }
      // If no date, don't show it in upcoming (only show dated ones)
      return false;
    })
    .sort((a, b) => {
      const dateA = a.date ? new Date(a.date + 'T00:00:00').getTime() : Infinity;
      const dateB = b.date ? new Date(b.date + 'T00:00:00').getTime() : Infinity;
      return dateA - dateB;
    })
    .slice(0, 5);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('careersim-dashboard-todos', JSON.stringify(todos));
  }, [todos]);

  // Group todos by date sections - only show sections that have incomplete todos
  const groupedTodos = todos.reduce((groups, todo) => {
    // Only include incomplete todos in grouping
    if (todo.done) return groups;
    
    if (!todo.dueDate) {
      if (!groups['No Date']) groups['No Date'] = [];
      groups['No Date'].push(todo);
      return groups;
    }
    
    const todoDate = new Date(todo.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    todoDate.setHours(0, 0, 0, 0);
    
    let section: string;
    if (isPast(todoDate) && !isTodayDate(todoDate)) {
      section = 'Past Due';
    } else if (isTodayDate(todoDate)) {
      section = 'Today';
    } else if (isTomorrow(todoDate)) {
      section = 'Tomorrow';
    } else {
      section = format(todoDate, 'EEE MMM d');
    }
    
    if (!groups[section]) groups[section] = [];
    groups[section].push(todo);
    return groups;
  }, {} as Record<string, typeof todos>);

  // Sort sections: No Date first, then Past Due, Today, Tomorrow, then dates ascending
  const sortedSections = Object.keys(groupedTodos).sort((a, b) => {
    // No Date comes first
    if (a === 'No Date' && b !== 'No Date') return -1;
    if (b === 'No Date' && a !== 'No Date') return 1;
    if (a === 'No Date' && b === 'No Date') return 0;
    
    // Then special sections
    const order = ['Past Due', 'Today', 'Tomorrow'];
    const aIndex = order.indexOf(a);
    const bIndex = order.indexOf(b);
    
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    
    // For date sections, compare using the actual dates from todos in those sections
    // Get the first todo's date from each section to compare
    const aTodos = groupedTodos[a];
    const bTodos = groupedTodos[b];
    if (aTodos.length > 0 && bTodos.length > 0 && aTodos[0].dueDate && bTodos[0].dueDate) {
      const dateA = new Date(aTodos[0].dueDate + 'T00:00:00').getTime();
      const dateB = new Date(bTodos[0].dueDate + 'T00:00:00').getTime();
      return dateA - dateB; // Ascending order (earlier dates first)
    }
    
    // Fall back to string comparison if dates can't be compared
    return a.localeCompare(b);
  });

  // Sort todos within each section
  sortedSections.forEach(section => {
    groupedTodos[section].sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  });

  const updateTodoDueDate = (todoId: string, date: string) => {
    setTodos((prev) => {
      const updated = prev.map((todo) => {
        if (todo.id === todoId) {
          // Only set undefined if date is explicitly empty, otherwise use the date
          const newDueDate = date && date.trim() !== '' ? date : undefined;
          return { ...todo, dueDate: newDueDate };
        }
        return todo;
      });
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('careersim-dashboard-todos', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const startEditingTodo = (todo: DashboardTodo, focusDate = false) => {
    setEditingTodoId(todo.id);
    setEditingTodoTitle(todo.title);
    setEditingTodoDate(todo.dueDate || '');
    // Focus on date input if focusDate is true
    if (focusDate) {
      setTimeout(() => {
        const dateInput = document.querySelector(`[data-todo-date-input="${todo.id}"]`) as HTMLInputElement;
        if (dateInput) {
          if ('showPicker' in dateInput && typeof dateInput.showPicker === 'function') {
            try {
              dateInput.showPicker();
            } catch {
              dateInput.focus();
            }
          } else {
            dateInput.focus();
          }
        }
      }, 0);
    }
  };

  const saveTodoEdit = (todoId: string) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === todoId
          ? { ...todo, title: editingTodoTitle.trim() || todo.title, dueDate: editingTodoDate || undefined }
          : todo
      )
    );
    setEditingTodoId(null);
    setEditingTodoTitle('');
    setEditingTodoDate('');
  };

  const cancelTodoEdit = () => {
    setEditingTodoId(null);
    setEditingTodoTitle('');
    setEditingTodoDate('');
  };

  const handleAddTodo = (dueDate?: string) => {
    const title = todoInput.trim();
    if (!title) return;
    setTodos((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title,
        done: false,
        createdAt: new Date().toISOString(),
        dueDate: dueDate || todoDueDate || undefined,
      },
    ]);
    setTodoInput('');
    setTodoDueDate('');
  };

  const toggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo))
    );
  };

  const handleDragStart = (e: React.DragEvent, todoId: string) => {
    setDraggedTodoId(todoId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', todoId);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnDate = (e: React.DragEvent, date: string) => {
    e.preventDefault();
    e.stopPropagation();
    // Try to get todoId from dataTransfer first, then from state
    const todoId = e.dataTransfer.getData('text/plain') || draggedTodoId;
    if (!todoId || !date) {
      return;
    }
    // Date should already be in yyyy-MM-dd format from format(day, 'yyyy-MM-dd')
    // Ensure it's a valid date string
    if (date && date.trim() !== '') {
      updateTodoDueDate(todoId, date.trim());
    }
    setDraggedTodoId(null);
  };

  const handleDropOnRemove = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedTodoId) {
      updateTodoDueDate(draggedTodoId, '');
      setDraggedTodoId(null);
    }
  };
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // 周日开始
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const monthDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const monthValue = format(currentDate, 'yyyy-MM');

  const handleMonthSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (!value) return;
    const [year, month] = value.split('-').map((v) => Number(v));
    if (!Number.isFinite(year) || !Number.isFinite(month)) return;
    setCurrentDate(new Date(year, month - 1));
  };

  const openMonthPicker = () => {
    const inputElement = monthInputRef.current;
    if (!inputElement) return;
    const picker = inputElement as HTMLInputElement & { showPicker?: () => void };
    picker.showPicker?.();
    inputElement.focus();
  };

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
            <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm border border-white-smoke">
              <button
                onClick={() => setViewMode('month')}
                className={`p-2 rounded transition-smooth ${viewMode === 'month' ? 'bg-gunmetal text-white shadow-sm' : 'text-gunmetal hover:bg-white-smoke'}`}
              >
                <CalendarIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-smooth ${viewMode === 'list' ? 'bg-gunmetal text-white shadow-sm' : 'text-gunmetal hover:bg-white-smoke'}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={() => openFormWithDate()}
              className="flex items-center gap-2 bg-gunmetal text-white px-6 py-3 rounded-lg shadow-sm hover:bg-black transition-smooth font-medium"
            >
              <Plus className="w-5 h-5" />
              <span>新增活動</span>
            </button>
            <UserMenu />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {viewMode === 'month' ? (
              <div className="bg-white rounded-lg shadow-sm border border-white-smoke p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gunmetal">
                    {format(currentDate, 'yyyy年MM月')}
                  </h2>
                  <div className="flex gap-2 items-center">
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
                    <div className="relative">
                      <button
                        onClick={openMonthPicker}
                        type="button"
                        className="p-2 text-gunmetal hover:bg-white-smoke rounded-lg transition-smooth border border-white-smoke"
                        title="選擇月份"
                      >
                        <CalendarIcon className="w-4 h-4" />
                      </button>
                      <input
                        type="month"
                        ref={monthInputRef}
                        value={monthValue}
                        onChange={handleMonthSelect}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        aria-label="選擇月份"
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>
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
                    const dayLabel = format(day, 'yyyy年MM月dd日');
                    return (
                      <div
                        key={day.toISOString()}
                        role="button"
                        tabIndex={0}
                        aria-label={`在 ${dayLabel} 新增面試`}
                        onClick={() => {
                          // Don't open form if we're dragging a todo
                          if (!draggedTodoId) {
                            openFormWithDate(format(day, 'yyyy-MM-dd'));
                          }
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openFormWithDate(format(day, 'yyyy-MM-dd'));
                          }
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDragOver(e);
                        }}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (draggedTodoId || e.dataTransfer.getData('text/plain')) {
                            const dropDate = format(day, 'yyyy-MM-dd');
                            handleDropOnDate(e, dropDate);
                          }
                        }}
                        className={`min-h-[100px] p-2 rounded-lg border cursor-pointer transition-all ${
                          isToday ? 'bg-beaver/10 border-beaver' : 'border-white-smoke'
                        } ${!isCurrentMonth ? 'opacity-40' : ''} ${
                          draggedTodoId ? 'hover:border-beaver/50 hover:bg-beaver/5 border-beaver' : ''
                        }`}
                      >
                        <div className={`text-sm mb-1 font-medium ${isToday ? 'text-beaver' : 'text-gunmetal'}`}>
                          {format(day, 'd')}
                        </div>
                        <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                          {dayInterviews.slice(0, 2).map((interview) => (
                            <div
                              key={interview.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/interview/${interview.id}/chats`);
                              }}
                              className="text-xs p-1.5 bg-beaver/15 text-walnut rounded-md cursor-pointer hover:bg-beaver/25 transition-smooth truncate font-medium"
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
                  <div className="bg-white rounded-lg shadow-sm border border-white-smoke p-12 text-center">
                    <div className="text-5xl mb-4">📅</div>
                    <h3 className="text-lg font-semibold text-gunmetal mb-2">還沒有面試活動</h3>
                    <p className="text-gunmetal/60 mb-6 text-sm">建立您的第一個模擬面試來開始練習吧！</p>
                    <button
                      onClick={() => openFormWithDate()}
                      className="bg-gunmetal text-white px-6 py-3 rounded-lg shadow-sm hover:bg-black transition-smooth font-medium"
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
          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-white-smoke p-6 flex flex-col" style={{ height: '300px' }}>
              <h3 className="text-base font-semibold text-gunmetal mb-4 flex-shrink-0 tracking-tight">即將到來的面試</h3>
              {upcomingInterviews.length === 0 ? (
                <p className="text-gunmetal/60 text-sm">暫無即將到來的面試</p>
              ) : (
                <div className="space-y-2 overflow-y-auto flex-1" style={{ minHeight: 0 }}>
                  {upcomingInterviews.map((interview) => (
                    <div
                      key={interview.id}
                      onClick={() => navigate(`/interview/${interview.id}/chats`)}
                      className="p-3 border border-white-smoke rounded-md cursor-pointer hover:border-beaver/30 hover:bg-beaver/5 transition-smooth group"
                    >
                      <div className="font-medium text-sm text-gunmetal mb-1 group-hover:text-gunmetal">{interview.title}</div>
                      {interview.date && (
                        <div className="text-xs text-gunmetal/60">
                          {format(new Date(interview.date), 'MM月dd日')} {interview.time}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-white-smoke p-5 flex flex-col gap-3" style={{ height: '472px' }}>
              <div className="flex items-center justify-between flex-shrink-0">
                <h3 className="text-base font-semibold text-gunmetal tracking-tight">提醒事項</h3>
                <span className="text-xs text-gunmetal/50 font-medium">
                  {todos.filter((todo) => !todo.done).length} 項待完成
                </span>
              </div>
              
              {/* Add todo input - Apple Reminders style */}
              <div className="flex items-center gap-2 border-b border-white-smoke pb-2.5 flex-shrink-0">
                <div className="w-5 h-5 rounded-full border-2 border-gunmetal/20 flex items-center justify-center flex-shrink-0">
                  <Plus className="w-3 h-3 text-gunmetal/50" />
                </div>
                <input
                  value={todoInput}
                  onChange={(e) => setTodoInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTodo();
                    }
                  }}
                  placeholder="新增提醒事項..."
                  className="flex-1 text-sm text-gunmetal bg-transparent border-0 focus:outline-none placeholder:text-gunmetal/50"
                />
              </div>
              
              {/* Date picker for new todo */}
              {todoInput.trim() && (
                <div className="flex items-center gap-2 px-7 flex-shrink-0">
                  <CalendarDays className="w-4 h-4 text-gunmetal/50" />
                  <input
                    type="date"
                    value={todoDueDate}
                    onChange={(e) => {
                      const selectedDate = e.target.value;
                      setTodoDueDate(selectedDate);
                      // Auto-add todo when date is selected
                      if (selectedDate && todoInput.trim()) {
                        handleAddTodo(selectedDate);
                      }
                    }}
                    className="text-xs text-gunmetal/70 bg-white border border-white-smoke rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer"
                    placeholder="選擇日期"
                  />
                </div>
              )}

              {/* Todo list - Grouped by date sections */}
              <div 
                className="space-y-0 flex-1 overflow-y-auto"
                onDragOver={handleDragOver}
                onDrop={handleDropOnRemove}
                style={{ minHeight: 0 }}
              >
                {sortedSections.length === 0 ? (
                  <p className="text-sm text-gunmetal/50 text-center py-6">尚未建立任何提醒事項</p>
                ) : (
                  sortedSections.map((section) => (
                    <div key={section} className="mb-4">
                      {/* Section Header */}
                      <h4 className="text-sm font-semibold text-gunmetal mb-2 px-2">
                        {section === 'Past Due' ? 'Past Due' : section === 'Today' ? 'Today' : section === 'Tomorrow' ? 'Tomorrow' : section === 'No Date' ? '無日期' : section}
                      </h4>
                      
                      {/* Todos in this section */}
                      <div className="space-y-0">
                        {groupedTodos[section].map((todo) => (
                              <div
                                key={todo.id}
                                draggable={editingTodoId !== todo.id}
                                onDragStart={(e) => handleDragStart(e, todo.id)}
                                className={`flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-white-smoke/50 transition-colors ${
                                  editingTodoId === todo.id ? '' : 'cursor-move'
                                } ${draggedTodoId === todo.id ? 'opacity-50' : ''}`}
                              >
                                {/* Checkbox */}
                                <button
                                  onClick={() => toggleTodo(todo.id)}
                                  className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                    todo.done
                                      ? 'bg-gunmetal border-gunmetal'
                                      : 'border-gunmetal/25 hover:border-gunmetal/50'
                                  }`}
                                >
                                  {todo.done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                </button>
                                
                                <div className="flex-1 min-w-0">
                                  {editingTodoId === todo.id ? (
                                    <div className="space-y-2">
                                      <input
                                        type="text"
                                        value={editingTodoTitle}
                                        onChange={(e) => setEditingTodoTitle(e.target.value)}
                                        onBlur={() => saveTodoEdit(todo.id)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            saveTodoEdit(todo.id);
                                          } else if (e.key === 'Escape') {
                                            cancelTodoEdit();
                                          }
                                        }}
                                        className="w-full text-sm text-gunmetal bg-white border border-gunmetal rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-gunmetal/20"
                                        autoFocus
                                      />
                                      <div className="flex items-center gap-2">
                                        <CalendarDays className="w-3 h-3 text-gunmetal/50" />
                                        <input
                                          type="date"
                                          data-todo-date-input={todo.id}
                                          value={editingTodoDate}
                                          onChange={(e) => {
                                            const newDate = e.target.value;
                                            setEditingTodoDate(newDate);
                                            updateTodoDueDate(todo.id, newDate);
                                          }}
                                          onBlur={() => saveTodoEdit(todo.id)}
                                          onClick={(e) => {
                                            // Try to show native date picker on mobile
                                            if ('showPicker' in e.currentTarget) {
                                              (e.currentTarget as any).showPicker?.();
                                            }
                                          }}
                                          className="text-xs text-gunmetal/70 bg-white border border-white-smoke rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gunmetal/20 focus:border-gunmetal/30 cursor-pointer"
                                        />
                                        <button
                                          onClick={() => cancelTodoEdit()}
                                          className="text-xs text-gunmetal/50 hover:text-gunmetal"
                                        >
                                          取消
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <p
                                        onClick={() => startEditingTodo(todo)}
                                        className={`text-sm leading-relaxed cursor-text ${
                                          todo.done
                                            ? 'line-through text-gunmetal/40'
                                            : 'text-gunmetal'
                                        }`}
                                      >
                                        {todo.title}
                                      </p>
                                      {todo.dueDate ? (
                                        <div className="flex items-center gap-1 mt-1">
                                          <CalendarDays className="w-3 h-3 text-gunmetal/40" />
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              startEditingTodo(todo, true);
                                            }}
                                            className="text-xs text-gunmetal/50 hover:text-gunmetal/70 cursor-pointer"
                                          >
                                            {format(new Date(todo.dueDate), 'MM月dd日')}
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            startEditingTodo(todo, true);
                                          }}
                                          className="text-xs text-gunmetal/40 hover:text-gunmetal/60 mt-1 flex items-center gap-1"
                                        >
                                          <CalendarDays className="w-3 h-3" />
                                          <span>新增日期</span>
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <NewActivityForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={handleNewInterview}
        initialDate={prefillDate ?? undefined}
      />
    </div>
  );
}

