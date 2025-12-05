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
  const basePrompt = `你是一位專業的面試官，正在進行一場${interviewType}的面試。
  
你的核心任務如下：

1. 根據應試者的回答提出深入且相關的問題  
2. 每次只問一個問題  
3. 你的問題需能協助判斷應試者是否適合此領域或職位  
4. 問題應涵蓋：
   - 過去相關經驗
   - 技能熟練度
   - 解決問題能力
   - 動機與價值觀
   - 未來職涯規劃
5. 問題需具體、開放式，能引出深度回答，而非單純是非題  
6. 根據應試者的前一次回答調整下一題，使面試逐步深入  
7. 你不應自行作答，只負責提問與必要的反饋  
8. 語氣需保持專業，並符合選擇的面試風格  
9. 若需要，可提供簡短情境來讓問題更具體，但仍僅能提出 *單一問題*

10. **重要：當你認為已經收集到足夠資訊可以評估應試者時，請不要再提出問題，而是回覆："[REPORT_READY]"。**
     - 不要多說其他文字  
     - 在此之前你必須持續提問並深化面試  
     - 前端會根據此訊號生成面試報告  
     

請嚴格遵守以上規則。


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
    if (aiResponse.trim() === "[REPORT_READY]") {
      const report = await generateInterviewReport(messagesToSend, interviewType);
      // 將報告包成 JSON 回傳給前端
      return JSON.stringify({ report });
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

      const prompt = `你是一位專業的面試評估專家。請根據以下面試對話，生成一份「客觀、真實、與應試者表現相符」的面試評估報告。

面試類型：${interviewType}

面試對話內容：
${conversationSummary}

---

# 評分原則（請務必依據對話內容，而非範例或模板）
請你依照以下標準對應試者評分：

1. **總體評分（overallScore）**  
   - 綜合考量：內容、專業度、邏輯、語言、動機是否適合職位  
   - 0–50：表現不佳或嚴重缺乏關鍵能力  
   - 51–70：有一定能力但不穩定或缺乏深度  
   - 71–85：表現良好且具備多數所需能力  
   - 86–100：表現非常優秀，明顯適合該職位  

2. **表達能力（expression）**  
   - 是否清楚、有條理、自信、邏輯一致  
   - 依實際回答品質給分  

3. **內容深度（content）**  
   - 回答是否具體？  
   - 是否使用案例？  
   - 是否展現專業技能？  
   - 分數必須反映對話中的內容細節程度  

4. **結構邏輯（structure）**  
   - 是否具備條理（如 STAR、MECE）  
   - 回答是否跳躍或混亂  

5. **語言運用（language）**  
   - 用詞是否清楚、專業、得體  
   - 語氣是否成熟  

---

# 請以 JSON 格式回覆（不得包含任何額外文字）
請輸出以下格式，但 **請自行根據對話內容產生真實分數，而非任何示例值**：

{
  "overallScore": <number>,        // 0–100，自行評估
  "expression": <number>,          // 0–100
  "content": <number>,             // 0–100
  "structure": <number>,           // 0–100
  "language": <number>,            // 0–100

  "strengths": [
    "根據對話內容產生至少 3 個具體優點",
    "避免使用模板敘述",
    "必須與應試者的實際回答相符"
  ],

  "improvements": [
    "根據對話內容產生至少 3 個待改善項目",
    "需指出具體問題，而非泛泛之談",
    "不得胡亂捏造面試中未提及的事實"
  ],

  "recommendations": [
    "給出至少 3 個有建設性且具體的練習建議",
    "內容需與應試者實際弱點相關",
    "務必可操作、可練習"
  ]
}

重要要求：
1. 不要使用範例分數（如 85, 82, 87…），所有分數必須根據對話內容重新計算。
2. 評分需反映應試者實際表現，不可隨機。
3. 請勿添加任何 JSON 之外的文字。`;

      

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
    
    // 尝试提取 JSON 对象（如果文本中包含其他内容）
    const jsonMatch = reportJson.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      reportJson = jsonMatch[0];
    }

    let report;
    try {
      report = JSON.parse(reportJson);
    } catch (parseError) {
      console.error('JSON 解析失敗:', parseError);
      console.error('原始文本:', reportText);
      throw new Error('無法解析 ChatGPT 返回的 JSON 格式');
    }

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

