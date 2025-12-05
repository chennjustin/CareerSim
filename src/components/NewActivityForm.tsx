import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Interview } from '../types';
import { useApi } from '../api/api';

interface NewActivityFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (interview: Interview) => void;
  initialDate?: string;
}

const defaultFormData = {
    title: '',
    type: 'Technical',
    date: '',
    time: '',
};

export default function NewActivityForm({ isOpen, onClose, onSubmit, initialDate }: NewActivityFormProps) {
  const api = useApi();
  const [formData, setFormData] = useState(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFormData({
      ...defaultFormData,
      date: initialDate ?? '',
    });
  }, [isOpen, initialDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const newInterview = await api.createInterview({
        title: formData.title,
        type: formData.type,
        date: formData.date || undefined,
        time: formData.time || undefined,
        status: formData.date ? 'scheduled' : 'in-progress',
      });

      onSubmit(newInterview);
      setFormData({ ...defaultFormData });
      onClose();
    } catch (error) {
      console.error('Failed to create interview:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-lg shadow-lg border border-white-smoke w-full max-w-md mx-4 animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-white-smoke">
          <h2 className="text-xl font-semibold text-gunmetal">新增面試活動</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white-smoke rounded-lg transition-smooth"
          >
            <X className="w-5 h-5 text-gunmetal" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gunmetal mb-2">
              面試標題
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-white-smoke rounded-md focus:outline-none focus:ring-2 focus:ring-gunmetal/20 focus:border-gunmetal/30"
              placeholder="例如：Software Engineer Mock Interview"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gunmetal mb-2">
              面試類型
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-2 border border-white-smoke rounded-md focus:outline-none focus:ring-2 focus:ring-gunmetal/20 focus:border-gunmetal/30"
            >
              <option value="Technical">技術面試</option>
              <option value="Behavioral">行為面試</option>
              <option value="System Design">系統設計</option>
              <option value="Case Study">案例分析</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gunmetal mb-2">
                日期
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2 border border-white-smoke rounded-md focus:outline-none focus:ring-2 focus:ring-gunmetal/20 focus:border-gunmetal/30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gunmetal mb-2">
                時間
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-4 py-2 border border-white-smoke rounded-md focus:outline-none focus:ring-2 focus:ring-gunmetal/20 focus:border-gunmetal/30"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-white-smoke rounded-lg text-gunmetal hover:bg-white-smoke transition-smooth"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-gunmetal text-white rounded-lg hover:bg-black transition-smooth disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isSubmitting ? '建立中...' : '建立'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

