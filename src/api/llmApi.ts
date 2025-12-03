import { AIPersonality, Message } from '../types';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// 获取 API Key
const getApiKey = (): string => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_OPENAI_API_KEY 未設置，請在 .env.local 文件中配置');
  }
  return apiKey;
};

// 根据性格生成系统提示词
const getSystemPrompt = (personality: AIPersonality, interviewType: string): string => {
  const basePrompt = `你是一位專業的面試官，正在進行一場${interviewType}的面試。你的任務是：
1. 根據應試者的回答提出深入且相關的問題
2. 評估應試者的回答質量
3. 引導對話深入，幫助應試者展現最佳表現

`;

  const personalityPrompts = {
    friendly: `你的面試風格是友善和鼓勵性的。你應該：
- 使用溫和、支持的語氣
- 給予積極的反饋
- 幫助應試者放鬆並展現真實能力
- 在應試者回答不完整時，友善地引導他們補充更多細節`,
    formal: `你的面試風格是正式和專業的。你應該：
- 使用正式、專業的語氣
- 提出結構化的問題
- 要求具體的案例和證據
- 保持客觀和專業的態度`,
    'stress-test': `你的面試風格是挑戰性和壓力測試型的。你應該：
- 提出具有挑戰性的問題
- 質疑應試者的回答，要求更深入的解釋
- 模擬真實面試中的壓力情境
- 測試應試者在壓力下的表現`,
  };

  return basePrompt + personalityPrompts[personality];
};

// 构建消息历史（转换为 OpenAI 格式）
const buildMessages = (
  conversationHistory: Message[],
  systemPrompt: string
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> => {
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  // 转换消息格式：interviewer -> assistant, user -> user
  conversationHistory.forEach((msg) => {
    if (msg.role === 'interviewer') {
      messages.push({ role: 'assistant', content: msg.content });
    } else if (msg.role === 'user') {
      messages.push({ role: 'user', content: msg.content });
    }
  });

  return messages;
};

// 调用 OpenAI API
export const callChatGPT = async (
  conversationHistory: Message[],
  personality: AIPersonality,
  interviewType: string,
  userMessage?: string
): Promise<string> => {
  try {
    const apiKey = getApiKey();
    const systemPrompt = getSystemPrompt(personality, interviewType);

    // 如果有新的用户消息，先添加到历史中
    const messagesToSend = userMessage
      ? [...conversationHistory, { id: '', role: 'user' as const, content: userMessage, timestamp: new Date().toISOString() }]
      : conversationHistory;

    const messages = buildMessages(messagesToSend, systemPrompt);

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // 可以使用 gpt-4o-mini 或 gpt-4o
        messages: messages,
        temperature: personality === 'stress-test' ? 0.8 : 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `API 請求失敗: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('API 回應中沒有內容');
    }

    return aiResponse.trim();
  } catch (error) {
    console.error('ChatGPT API 錯誤:', error);
    throw error;
  }
};

// 生成第一个面试问题
export const generateFirstQuestion = async (
  interviewType: string,
  personality: AIPersonality
): Promise<string> => {
  try {
    const apiKey = getApiKey();
    const systemPrompt = getSystemPrompt(personality, interviewType);

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: '請提出第一個面試問題，這應該是讓應試者自我介紹或開始對話的問題。問題應該簡潔、專業，並且符合面試類型。',
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `API 請求失敗: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const question = data.choices[0]?.message?.content;

    if (!question) {
      // 如果 API 失敗，返回默認問題
      return '您好，歡迎參加這次模擬面試。請先簡單介紹一下您自己。';
    }

    return question.trim();
  } catch (error) {
    console.error('生成第一個問題失敗:', error);
    // 如果 API 失敗，返回默認問題
    return '您好，歡迎參加這次模擬面試。請先簡單介紹一下您自己。';
  }
};

// 生成面试报告
export const generateInterviewReport = async (
  conversationHistory: Message[],
  interviewType: string
): Promise<{
  overallScore: number;
  expression: number;
  content: number;
  structure: number;
  language: number;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
}> => {
  try {
    const apiKey = getApiKey();

    // 构建对话摘要
    const conversationSummary = conversationHistory
      .map((msg) => `${msg.role === 'interviewer' ? '面試官' : '應試者'}: ${msg.content}`)
      .join('\n');

    const prompt = `請根據以下面試對話，生成一份詳細的面試評估報告。

面試類型：${interviewType}

對話內容：
${conversationSummary}

請以 JSON 格式返回評估結果，包含以下字段：
{
  "overallScore": 85,  // 總體分數 (0-100)
  "expression": 85,     // 表達能力分數 (0-100)
  "content": 85,       // 內容質量分數 (0-100)
  "structure": 85,     // 結構邏輯分數 (0-100)
  "language": 85,      // 語言運用分數 (0-100)
  "strengths": ["優點1", "優點2", "優點3"],  // 優點列表（至少3個）
  "improvements": ["改進點1", "改進點2", "改進點3"],  // 改進建議（至少3個）
  "recommendations": ["建議1", "建議2", "建議3"]  // 練習建議（至少3個）
}

請確保返回的是有效的 JSON 格式，不要包含任何額外的文字說明。`;

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '你是一位專業的面試評估專家，擅長分析面試表現並提供建設性反饋。',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `API 請求失敗: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const reportText = data.choices[0]?.message?.content;

    if (!reportText) {
      throw new Error('API 回應中沒有內容');
    }

    // 尝试解析 JSON（可能包含 markdown 代码块）
    let reportJson = reportText.trim();
    // 移除可能的 markdown 代码块标记
    reportJson = reportJson.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const report = JSON.parse(reportJson);

    // 验证和规范化数据
    return {
      overallScore: Math.min(100, Math.max(0, report.overallScore || 75)),
      expression: Math.min(100, Math.max(0, report.expression || 75)),
      content: Math.min(100, Math.max(0, report.content || 75)),
      structure: Math.min(100, Math.max(0, report.structure || 75)),
      language: Math.min(100, Math.max(0, report.language || 75)),
      strengths: Array.isArray(report.strengths) ? report.strengths : ['回答結構清晰', '能夠提供具體案例', '語言表達流暢'],
      improvements: Array.isArray(report.improvements) ? report.improvements : ['可以更詳細解釋技術細節', '建議增加深入分析', '可以準備更多量化資料'],
      recommendations: Array.isArray(report.recommendations) ? report.recommendations : ['繼續練習 STAR 方法', '準備更多技術深度問題', '練習快速思考能力'],
    };
  } catch (error) {
    console.error('生成面試報告失敗:', error);
    // 如果 API 失敗，返回默認報告
    return {
      overallScore: 75,
      expression: 75,
      content: 75,
      structure: 75,
      language: 75,
      strengths: ['回答結構清晰', '能夠提供具體案例', '語言表達流暢'],
      improvements: ['可以更詳細解釋技術細節', '建議增加深入分析', '可以準備更多量化資料'],
      recommendations: ['繼續練習 STAR 方法', '準備更多技術深度問題', '練習快速思考能力'],
    };
  }
};

