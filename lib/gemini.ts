
import { TrainingLog } from '../types';

interface GeminiAnalysisResult {
    type: 'strength' | 'weakness' | 'suggestion';
    message: string;
    detail: string;
    recommendationCategory: string; // 'escape', 'submission', 'guard', 'pass', 'cardio'
}

export const analyzeSparringLogs = async (logs: TrainingLog[], apiKey: string): Promise<GeminiAnalysisResult[]> => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `
    You are an expert BJJ (Brazilian Jiu-Jitsu) coach. Analyze the following sparring logs and identify 3 key insights:
    1. A Strength (what they are doing well)
    2. A Weakness (what they are struggling with)
    3. A Suggestion (what they should focus on)

    Logs:
    ${logs.map(l => `- ${l.date}: ${l.notes} (Techniques: ${l.techniques?.join(', ')})`).join('\n')}

    Return the result strictly as a valid JSON object with a "results" array. Each item should have:
    - "type": "strength", "weakness", or "suggestion"
    - "message": A short, punchy title (max 7 words, Korean)
    - "detail": A 1-2 sentence explanation (Korean)
    - "recommendationCategory": One of "escape", "submission", "guard", "pass", "cardio"

    Example format:
    {
      "results": [
        { "type": "strength", "message": "...", "detail": "... ", "recommendationCategory": "submission" }
      ]
    }
    
    Respond only with the JSON.
  `;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    response_mime_type: "application/json"
                }
            })
        });

        if (!response.ok) {
            const err = await response.json();
            console.error('Gemini API Error:', err);
            throw new Error('Failed to fetch from Gemini API');
        }

        const data = await response.json();
        const text = data.candidates[0].content.parts[0].text;

        const parsed = JSON.parse(text);
        return parsed.results || [];
    } catch (error) {
        console.error('Error analyzing logs with Gemini:', error);
        return [];
    }
};
