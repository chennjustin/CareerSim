import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, RotateCcw, Calendar } from 'lucide-react';
import { Report, Interview } from '../types';
import { api } from '../api/mockApi';
import { format } from 'date-fns';

interface ScoreCircleProps {
  score: number;
  label: string;
  size?: number;
}

function ScoreCircle({ score, label, size = 80 }: ScoreCircleProps) {
  const circumference = 2 * Math.PI * (size / 2 - 5);
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center animate-scale-in">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 5}
            stroke="#F2F4F3"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 5}
            stroke="#3B82F6"
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-gunmetal">{score}</span>
        </div>
      </div>
      <span className="text-sm text-gunmetal/70 mt-2">{label}</span>
    </div>
  );
}

export default function InterviewReport() {
  const { interviewId } = useParams<{ interviewId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (interviewId) {
      loadData();
    }
  }, [interviewId]);

  const loadData = async () => {
    if (!interviewId) return;
    try {
      setLoading(true);
      const [reportData, interviewData] = await Promise.all([
        api.getReport(interviewId),
        api.getInterview(interviewId),
      ]);

      if (!reportData && interviewData) {
        // 如果沒有報告，產生一個
        setGenerating(true);
        const newReport = await api.generateReport(interviewId);
        setReport(newReport);
        setGenerating(false);
      } else {
        setReport(reportData);
      }

      setInterview(interviewData);
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    // 模擬 PDF 匯出
    alert('PDF 匯出功能將在後續版本中實作');
  };

  if (loading || generating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white-smoke">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">📊</div>
          <div className="text-gunmetal text-lg">
            {generating ? '正在產生報告...' : '載入中...'}
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white-smoke">
        <div className="text-gunmetal">報告找不到</div>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white-smoke">
        <div className="text-gunmetal">面試資訊找不到</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white-smoke">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gunmetal hover:text-primary mb-4 transition-smooth"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>返回日曆</span>
          </button>
          <h1 className="text-3xl font-bold text-gunmetal mb-2">{interview.title}</h1>
          <p className="text-gunmetal/70">
            {format(new Date(report.createdAt), 'yyyy年MM月dd日 HH:mm')}
          </p>
        </div>

        {/* Overall Score */}
        <div className="bg-white rounded-xl shadow-md p-8 mb-6 animate-fade-in">
          <h2 className="text-2xl font-semibold text-gunmetal mb-6 text-center">總體評分</h2>
          <div className="flex justify-center">
            <ScoreCircle score={report.overallScore} label="總分" size={120} />
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="bg-white rounded-xl shadow-md p-8 mb-6 animate-slide-up">
          <h2 className="text-xl font-semibold text-gunmetal mb-6">詳細評分</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <ScoreCircle score={report.expression} label="表達" />
            <ScoreCircle score={report.content} label="內容" />
            <ScoreCircle score={report.structure} label="結構" />
            <ScoreCircle score={report.language} label="語言" />
          </div>
        </div>

        {/* Strengths */}
        <div className="bg-white rounded-xl shadow-md p-8 mb-6 animate-slide-up">
          <h2 className="text-xl font-semibold text-gunmetal mb-4">優勢總結</h2>
          <ul className="space-y-3">
            {report.strengths.map((strength, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="text-primary text-xl">✓</span>
                <span className="text-gunmetal">{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Improvements */}
        <div className="bg-white rounded-xl shadow-md p-8 mb-6 animate-slide-up">
          <h2 className="text-xl font-semibold text-gunmetal mb-4">改進建議</h2>
          <ul className="space-y-3">
            {report.improvements.map((improvement, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="text-beaver text-xl">•</span>
                <span className="text-gunmetal">{improvement}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Recommendations */}
        <div className="bg-white rounded-xl shadow-md p-8 mb-6 animate-slide-up">
          <h2 className="text-xl font-semibold text-gunmetal mb-4">練習建議</h2>
          <div className="space-y-3">
            {report.recommendations.map((rec, index) => (
              <div key={index} className="p-4 bg-white-smoke rounded-lg">
                <p className="text-gunmetal">{rec}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 justify-center animate-slide-up">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 bg-white text-gunmetal px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-smooth border border-white-smoke"
          >
            <Download className="w-5 h-5" />
            <span>匯出 PDF</span>
          </button>
          <button
            onClick={() => navigate(`/interview/${interviewId}`)}
            className="flex items-center gap-2 bg-beaver text-white px-6 py-3 rounded-xl shadow-md hover:brightness-110 transition-smooth"
          >
            <RotateCcw className="w-5 h-5" />
            <span>重新練習此主題</span>
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl shadow-md hover:brightness-110 transition-smooth"
          >
            <Calendar className="w-5 h-5" />
            <span>返回日曆</span>
          </button>
        </div>
      </div>
    </div>
  );
}

