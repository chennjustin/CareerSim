import { randomBytes } from 'crypto';

export function generateId(): string {
  return randomBytes(16).toString('hex');
}

export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

// Deterministic stub for generating AI responses
export function generateMockAIResponse(userMessage: string, scenario: string): string {
  const responses = [
    `That's an interesting point about "${userMessage.slice(0, 30)}...". Can you elaborate more on your experience with that?`,
    `I see. Based on what you've shared, how would you handle a challenging situation in this context?`,
    `Thank you for sharing. Can you provide a specific example from your past experience?`,
    `That's a good perspective. What do you think are the key skills needed for this ${scenario} scenario?`,
    `Interesting. How would you approach this differently if you had more resources?`,
  ];
  
  const index = userMessage.length % responses.length;
  return responses[index];
}

// Deterministic stub for generating report
export function generateMockReport(messages: { role: string; content: string }[]) {
  const userMessages = messages.filter(m => m.role === 'user');
  const totalWords = userMessages.reduce((sum, m) => sum + m.content.split(' ').length, 0);
  const avgLength = totalWords / Math.max(userMessages.length, 1);
  
  // Simple scoring based on message count and length
  const clarityScore = Math.min(100, 50 + userMessages.length * 5);
  const contentScore = Math.min(100, 40 + Math.floor(avgLength * 2));
  const coherenceScore = Math.min(100, 60 + userMessages.length * 3);
  const overallScore = Math.floor((clarityScore + contentScore + coherenceScore) / 3);
  
  return {
    overallScore,
    dimensions: [
      {
        name: 'Clarity',
        score: clarityScore,
        description: 'How clearly you express your thoughts',
      },
      {
        name: 'Content Quality',
        score: contentScore,
        description: 'Depth and relevance of your responses',
      },
      {
        name: 'Coherence',
        score: coherenceScore,
        description: 'Logical flow and structure',
      },
    ],
    strengths: [
      'Good engagement with the interviewer',
      'Clear communication style',
      userMessages.length > 5 ? 'Detailed responses' : 'Concise answers',
    ],
    weaknesses: [
      overallScore < 70 ? 'Could provide more detailed examples' : 'Minor pacing improvements',
      'Consider asking clarifying questions',
    ],
    suggestions: [
      'Practice the STAR method (Situation, Task, Action, Result)',
      'Prepare specific examples from your experience',
      'Work on your opening and closing statements',
    ],
  };
}

