
import { TrainingLog } from '../types';

export interface GeminiAnalysisResult {
    type: 'strength' | 'weakness' | 'suggestion';
    message: string;
    detail: string;
    recommendationCategory: string; // 'escape', 'submission', 'guard', 'pass', 'cardio'
}

export interface GeminiDashboardResult {
    insights: {
        type: 'strength' | 'weakness' | 'suggestion';
        message: string;
        detail: string;
    }[];
    recommendedFocus: {
        courseCategory: string; // e.g., 'Guard', 'Passing'
        routineFocus: string; // e.g., 'Leg Locks', 'Guard Retention'
        sparringFocus: string; // e.g., 'Escapes', 'Defense'
    };
}

export const analyzeUserDashboard = async (
    logs: TrainingLog[],
    watchedLessons: any[],
    routines: any[],
    apiKey: string
): Promise<GeminiDashboardResult | null> => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `
    You are an expert BJJ (Brazilian Jiu-Jitsu) head coach. Analyze the user's progress based on:
    
    1. Sparring Logs (${logs.length} entries):
    ${logs.length > 0 ? logs.map(l => `- ${l.date}: ${l.notes} (${l.techniques?.join(', ')})`).join('\n') : "No sparring logs yet."}
    
    2. Recently Watched Lessons (${watchedLessons.length} entries):
    ${watchedLessons.length > 0 ? watchedLessons.map(l => `- ${l.title} (from course ${l.courseTitle})`).join('\n') : "No lessons watched yet."}
    
    3. Training Routines Completed (${routines.length} entries):
    ${routines.length > 0 ? routines.map(r => `- ${r.title}`).join('\n') : "No routines completed yet."}

    IMPORTANT: If there is little to no data, provide "BJJ Starter" or "First Step" insights. 
    Focus on encouraging the user and recommending fundamental technical pillars (like escapes, posture, and simple guards).

    Provide 3 key tactical insights:
    - 1 Strength (what they are doing well, or an encouraging comment for a starter)
    - 1 Weakness (what they are struggling with, or a typical beginner hurdle)
    - 1 Suggestion (what they should focus on next)

    Also, suggest 3 technical categories for recommendations:
    - courseCategory: A BJJ category (Standing, Guard, Passing, Side, Mount, Back, Submission, Gi, No-Gi)
    - routineFocus: A specific technical theme for a drill routine (e.g., 'Guard Retention', 'Hip Escapes').
    - sparringFocus: A theme for watching sparring videos.

    Return the result strictly as a valid JSON object.
    {
      "insights": [
        { "type": "strength", "message": "Punchy Title (Korean)", "detail": "1-2 sentence explanation (Korean)" },
        ...
      ],
      "recommendedFocus": {
        "courseCategory": "...",
        "routineFocus": "...",
        "sparringFocus": "..."
      }
    }
    
    Respond only with JSON.
  `;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    response_mime_type: "application/json",
                    temperature: 0.7
                }
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            console.error('Gemini API Error Response:', errData);
            throw new Error(`Gemini API Error: ${response.status}`);
        }

        const data = await response.json();
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            console.error('Empty response from Gemini:', data);
            return null;
        }

        // Clean up the response text - remove markdown backticks if present
        text = text.trim();
        if (text.startsWith('```')) {
            text = text.replace(/^```(json)?/, '').replace(/```$/, '').trim();
        }

        return JSON.parse(text);
    } catch (error) {
        console.error('Error in analyzeUserDashboard:', error);
        return null;
    }
};

export const analyzeSparringLogs = async (logs: TrainingLog[], apiKey: string): Promise<GeminiAnalysisResult[]> => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `
    You are an expert BJJ (Brazilian Jiu-Jitsu) coach. Analyze the following sparring logs to identify 3 key insights:
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
