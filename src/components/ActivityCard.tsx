import { Interview } from '../types';
import { format } from 'date-fns';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ActivityCardProps {
  interview: Interview;
}

const statusColors = {
  scheduled: 'bg-beaver/20 text-walnut',
  'in-progress': 'bg-primary/20 text-primary',
  completed: 'bg-gunmetal/20 text-gunmetal',
};

const statusLabels = {
  scheduled: '已排程',
  'in-progress': '進行中',
  completed: '已完成',
};

export default function ActivityCard({ interview }: ActivityCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/interview/${interview.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-xl shadow-md p-6 cursor-pointer transition-smooth hover:shadow-lg hover:scale-[1.02] animate-fade-in"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gunmetal mb-2">{interview.title}</h3>
          <div className="flex items-center gap-4 text-sm text-gunmetal/70">
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
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[interview.status]}`}>
          {statusLabels[interview.status]}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-beaver font-medium">{interview.type}</span>
        <ArrowRight className="w-5 h-5 text-gunmetal/50" />
      </div>
    </div>
  );
}

