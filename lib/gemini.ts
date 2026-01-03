
import { TrainingLog } from '../types';

export interface GeminiAnalysisResult {
    type: 'strength' | 'weakness' | 'suggestion';
    message: string;
    detail: string;
    recommendationCategory?: string; // Optional legacy field
}

export interface GeminiDashboardResult {
    insights: {
        type: 'strength' | 'weakness' | 'suggestion';
        message: string;
        detail: string;
        recommendationQuery: {
            courseKeyword: string;
            routineKeyword: string;
            sparringKeyword: string;
        };
    }[];
}

export const analyzeUserDashboard = async (
    logs: TrainingLog[],
    watchedLessons: any[],
    routines: any[],
    userProfile: {
        name: string;
        belt: string;
        level: number;
        age?: string;
        gender?: string;
        weightClass?: string;
        playStyle?: string;
    },
    apiKey: string
): Promise<GeminiDashboardResult | null> => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `
    You are an expert BJJ (Brazilian Jiu-Jitsu) head coach. Analyze the user's progress and provide personalized coaching.
    
    User Profile:
    - Name: ${userProfile.name}
    - Belt: ${userProfile.belt} (Level ${userProfile.level})
    - Age/Info: ${userProfile.age || 'Unknown'}, ${userProfile.gender || ''}, ${userProfile.weightClass || ''}
    - Play Style: ${userProfile.playStyle || 'All-rounder'}
    
    Activity Data:
    1. Sparring Logs (${logs.length} entries):
    ${logs.length > 0 ? logs.map(l => `- ${l.date}: ${l.notes} (${l.techniques?.join(', ')})`).join('\n') : "No sparring logs yet."}
    
    2. Recently Watched Lessons (${watchedLessons.length} entries):
    ${watchedLessons.length > 0 ? watchedLessons.map(l => `- ${l.title} (from course ${l.courseTitle})`).join('\n') : "No lessons watched yet."}
    
    3. Training Routines Completed (${routines.length} entries):
    ${routines.length > 0 ? routines.map(r => `- ${r.title}`).join('\n') : "No routines completed yet."}

    IMPORTANT: 
    - Provide 3 distinct tactical insights: 1 Strength, 1 Weakness, 1 Suggestion.
    - For EACH insight, provide SPECIFIC keywords to search for recommended content (Course, Routine, Sparring) that matches that specific insight.
    - Example: If weakness is "Guard Retention", courseKeyword might be "Guard Retention", routineKeyword "Hip Escape", sparringKeyword "Lightweight Guard".
    - Avoid generic keywords like "BJJ" or "Jiu-Jitsu". Be specific to the insight.

    Return the result strictly as a valid JSON object with the following structure:
    {
      "insights": [
        { 
          "type": "strength", 
          "message": "Punchy Title (Korean)", 
          "detail": "1-2 sentence explanation (Korean)",
          "recommendationQuery": {
            "courseKeyword": "...",
            "routineKeyword": "...",
            "sparringKeyword": "..."
          }
        },
        ... (total 3 items)
      ]
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

export interface DeepAnalysisResult {
    styleProfile: {
        identity: string; // e.g. "Smasher", "Guard Player"
        description: string;
        strength: string;
        weakness: string;
        similarPro?: string;
        fingerprint?: {
            standing: number;
            guard: number;
            passing: number;
            submission: number;
            defense: number;
        };
    };
    gapAnalysis: {
        hasGap?: boolean;
        message?: string; // "You watch Pass videos but only do Guard"
        blindSpots?: string[];
        overTrained?: string[];
        theoryPracticeGap?: string;
    };
    prescription: {
        summary: string; // "High Intensity"
        drillDurationMinutes: number;
        sparringRounds: number;
        focusPoint?: string;
        focusAreas?: string[];
    };
    recommendedContent: {
        courses: Array<{ id?: string; title: string; reason: string; thumbnail?: string; instructor?: string; duration?: string }>;
        routines: Array<{ id?: string; title: string; reason: string; thumbnail?: string; instructor?: string; duration?: string }>;
        chains: Array<{ id?: string; title: string; reason: string; thumbnail?: string; instructor?: string; duration?: string }>;
    };
    sparringMission?: {
        scenario: string;
        opponentStyle: string;
        duration: string;
        reason: string;
    };
}

export const analyzeUserDeeply = async (
    logs: TrainingLog[],
    recentVideos: { title: string; category?: string }[],
    userProfile: { name: string; belt: string },
    apiKey: string
): Promise<DeepAnalysisResult | null> => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `
    You are an expert BJJ (Brazilian Jiu-Jitsu) Head Coach.
    Analyze the user's training logs and video history to provide a deep, personalized coaching report in KOREAN.

    User: ${userProfile.name} (${userProfile.belt} Belt)

    DATA - Training Logs (Last 30 days):
    ${logs.map(l => `- [${l.date}] ${l.notes} (Tags: ${l.techniques?.join(', ')})`).join('\n')}

    DATA - Recently Watched Videos:
    ${recentVideos.map(v => `- ${v.title} (${v.category || 'General'})`).join('\n')}

    TASK:
    1. Identify their **Style/Identity** based on keywords in logs.
    2. Detect **Theory-Practice Gap**.
    3. Prescribe **Training Volume for Tomorrow** (min/rounds).
    4. Recommend **3 specific content types** with a "Why" reason.

    IMPORTANT: All text fields (identity, message, strength, weakness, summary, reason) MUST be in KOREAN language.

    OUTPUT FORMAT (JSON ONLY):
    {
      "styleProfile": {
        "identity": "스타일 명칭 (예: 압박 패서)",
        "description": "한 문장 설명",
        "strength": "강점 (한국어)",
        "weakness": "약점 (한국어)",
        "fingerprint": { "standing": 50, "guard": 50, "passing": 50, "submission": 50, "defense": 50 }
      },
      "gapAnalysis": {
        "blindSpots": ["부족한 영역1", "부족한 영역2"],
        "theoryPracticeGap": "이론과 실천의 갭에 대한 정중한 지적 (한국어)"
      },
      "prescription": {
        "summary": "한 줄 요약 (예: 오늘은 고강도 스파링 추천)",
        "drillDurationMinutes": number,
        "sparringRounds": number,
        "focusAreas": ["집중해야 할 기술1", "집중해야 할 기술2"]
      },
      "sparringMission": {
        "scenario": "스파링 시나리오 (예: 가드 패스 당한 상태에서 탈출)",
        "opponentStyle": "상대 스타일 (예: 무거운 압박러)",
        "duration": "추천 시간 (예: 5분 x 3라운드)",
        "reason": "이 미션을 추천하는 이유 (한국어)"
      },
      "recommendedContent": {
        "courses": [{ "title": "추천 강의 제목", "reason": "추천 사유 (한국어)" }],
        "routines": [{ "title": "추천 루틴 제목", "reason": "추천 사유 (한국어)" }],
        "chains": [{ "title": "추천 체인 제목", "reason": "추천 사유 (한국어)" }]
      }
    }
    
    Respond STRICTLY with valid JSON.
    `;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { response_mime_type: "application/json" }
            })
        });

        if (!response.ok) throw new Error(response.statusText);

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) return null;

        return JSON.parse(text.replace(/^```json/, '').replace(/```$/, ''));
    } catch (error) {
        console.error('Deep Analysis Failed:', error);
        return null;
    }
};
