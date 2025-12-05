import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download, RotateCcw, Calendar } from 'lucide-react';
import { Report, Interview } from '../types';
import { useApi } from '../api/api';
import { format } from 'date-fns';
import { exportReportToPDF } from '../utils/pdfExport';

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
            stroke="#22333B"
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
  const api = useApi();
  const { interviewId } = useParams<{ interviewId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const chatId = searchParams.get('chatId') || undefined;
  const [report, setReport] = useState<Report | null>(null);
  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (interviewId) {
      loadData();
    }
  }, [interviewId, chatId]);

  const loadData = async () => {
    if (!interviewId) return;
    try {
      setLoading(true);
      const interviewData = await api.getInterview(interviewId);
      setInterview(interviewData);
      
      // Get report for specific chat or interview
      let reportData = await api.getReport(interviewId, chatId);

      if (!reportData && interviewData) {
        // Check if chat has enough messages to generate a report
        if (chatId) {
          const chat = interviewData.chats.find(c => c.id === chatId);
          const interviewerCount = chat?.messages.filter(m => m.role === 'interviewer').length || 0;
          const totalMessages = chat?.messages.length || 0;
          
          if (interviewerCount >= 5 && totalMessages > 0) {
            // 如果沒有報告，產生一個
            try {
              setGenerating(true);
              const newReport = await api.generateReport(interviewId, chatId);
              setReport(newReport);
            } catch (error) {
              console.error('生成報告失敗:', error);
              alert('生成報告時發生錯誤，請稍後再試。\n\n錯誤訊息: ' + (error instanceof Error ? error.message : '未知錯誤'));
            } finally {
              setGenerating(false);
            }
          } else {
            // 消息不足，显示提示
            alert('對話內容不足，無法生成報告。\n\n需要至少 5 個面試官問題才能生成報告。');
          }
        } else {
          // Generate report for interview
          try {
            setGenerating(true);
            const newReport = await api.generateReport(interviewId);
            setReport(newReport);
          } catch (error) {
            console.error('生成報告失敗:', error);
            alert('生成報告時發生錯誤，請稍後再試。\n\n錯誤訊息: ' + (error instanceof Error ? error.message : '未知錯誤'));
          } finally {
            setGenerating(false);
          }
        }
      } else {
        setReport(reportData);
      }
    } catch (error) {
      console.error('Failed to load report:', error);
      alert('載入報告時發生錯誤: ' + (error instanceof Error ? error.message : '未知錯誤'));
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    if (!report || !interview) {
      alert('無法匯出 PDF：報告或面試資訊缺失');
      return;
    }

    try {
      setIsExporting(true);
      await exportReportToPDF(report, interview, chatId);
    } catch (error) {
      console.error('PDF 匯出失敗:', error);
      alert('PDF 匯出時發生錯誤，請稍後再試。\n\n錯誤訊息: ' + (error instanceof Error ? error.message : '未知錯誤'));
    } finally {
      setIsExporting(false);
    }
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
            onClick={() => chatId ? navigate(`/interview/${interviewId}/chats`) : navigate('/dashboard')}
            className="flex items-center gap-2 text-gunmetal hover:text-gunmetal/80 mb-4 transition-smooth"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{chatId ? '返回對話列表' : '返回日曆'}</span>
          </button>
          <h1 className="text-3xl font-bold text-gunmetal mb-2">{interview.title}</h1>
          {chatId && (() => {
            const chat = interview.chats.find(c => c.id === chatId);
            return chat && <p className="text-gunmetal/70 mb-1">{chat.title}</p>;
          })()}
          <p className="text-gunmetal/70">
            {format(new Date(report.createdAt), 'yyyy年MM月dd日 HH:mm')}
          </p>
        </div>

        {/* Overall Score */}
        <div className="bg-white rounded-lg shadow-sm border border-white-smoke p-8 mb-6 animate-fade-in">
          <h2 className="text-2xl font-semibold text-gunmetal mb-6 text-center">總體評分</h2>
          <div className="flex justify-center">
            <ScoreCircle score={report.overallScore} label="總分" size={120} />
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="bg-white rounded-lg shadow-sm border border-white-smoke p-8 mb-6 animate-slide-up">
          <h2 className="text-xl font-semibold text-gunmetal mb-6">詳細評分</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <ScoreCircle score={report.expression} label="表達" />
            <ScoreCircle score={report.content} label="內容" />
            <ScoreCircle score={report.structure} label="結構" />
            <ScoreCircle score={report.language} label="語言" />
          </div>
        </div>

        {/* Strengths */}
        <div className="bg-white rounded-lg shadow-sm border border-white-smoke p-8 mb-6 animate-slide-up">
          <h2 className="text-xl font-semibold text-gunmetal mb-4">優勢總結</h2>
          <ul className="space-y-3">
            {report.strengths.map((strength, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="text-gunmetal text-xl">✓</span>
                <span className="text-gunmetal">{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Improvements */}
        <div className="bg-white rounded-lg shadow-sm border border-white-smoke p-8 mb-6 animate-slide-up">
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
        <div className="bg-white rounded-lg shadow-sm border border-white-smoke p-8 mb-6 animate-slide-up">
          <h2 className="text-xl font-semibold text-gunmetal mb-4">練習建議</h2>
          <div className="space-y-3">
            {report.recommendations.map((rec, index) => (
              <div key={index} className="p-4 bg-white-smoke rounded-md">
                <p className="text-gunmetal">{rec}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 justify-center animate-slide-up">
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-2 bg-white text-gunmetal px-6 py-3 rounded-lg shadow-sm hover:shadow-md transition-smooth border border-white-smoke font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <div className="w-5 h-5 border-2 border-gunmetal border-t-transparent rounded-full animate-spin"></div>
                <span>匯出中...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>匯出 PDF</span>
              </>
            )}
          </button>
          <button
            onClick={async () => {
              if (!interviewId) return;
              try {
                const newChat = await api.createChat(interviewId);
                navigate(`/interview/${interviewId}/chat/${newChat.id}`);
              } catch (error) {
                console.error('Failed to create new chat:', error);
              }
            }}
            className="flex items-center gap-2 bg-beaver text-white px-6 py-3 rounded-lg shadow-sm hover:bg-walnut transition-smooth font-medium"
          >
            <RotateCcw className="w-5 h-5" />
            <span>重新練習此主題</span>
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 bg-gunmetal text-white px-6 py-3 rounded-lg shadow-sm hover:bg-black transition-smooth font-medium"
          >
            <Calendar className="w-5 h-5" />
            <span>返回日曆</span>
          </button>
        </div>
      </div>
    </div>
  );
}

