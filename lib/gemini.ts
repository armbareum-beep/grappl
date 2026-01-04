
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
    // Remove quotes and whitespace - common .env issue
    const cleanKey = apiKey.replace(/["']/g, '').trim();
    console.log('[Gemini Debug] Using Key:', cleanKey.slice(0, 10) + '...'); // Check if key starts correctly

    // Upgrading to Gemini 2.0 Flash for best performance in 2026
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${cleanKey}`;

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
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('Gemini API Error Body:', errText);
            throw new Error(`Gemini API Error (${response.status}): ${errText.slice(0, 200)}`);
        }

        const data = await response.json();
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            console.error('Empty response from Gemini:', data);
            return null;
        }

        text = text.trim();
        if (text.includes('```')) {
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        }

        return JSON.parse(text);
    } catch (error) {
        console.error('Error in analyzeUserDashboard:', error);
        return null;
    }
};

export const analyzeSparringLogs = async (logs: TrainingLog[], apiKey: string): Promise<GeminiAnalysisResult[]> => {
    // Remove quotes and whitespace - common .env issue
    const cleanKey = apiKey.replace(/["']/g, '').trim();
    console.log('[Gemini Debug] Using Key:', cleanKey.slice(0, 10) + '...'); // Check if key starts correctly

    // Upgrading to Gemini 2.0 Flash for best performance in 2026
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${cleanKey}`;


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
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('Gemini API Error Body:', errText);
            throw new Error(`Gemini API Error (${response.status}): ${errText.slice(0, 200)}`);
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
            Standing: number;
            Guard: number;
            Passing: number;
            Side: number;
            Mount: number;
            Back: number;
            topPossession: number;
            submissionRate: number;
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
    recentLogs: TrainingLog[],
    historicalSummary: {
        totalSessions: number;
        dominantTechniques: string[];
        avgTopPossession: number;
        avgSubmissionRate: number;
        periodDays: number;
    },
    recentVideos: { title: string; category?: string }[],
    userProfile: { name: string; belt: string },
    apiKey: string,
    availableContent?: {
        courses: Array<{ id: string; title: string; category?: string }>;
        routines: Array<{ id: string; title: string }>;
    }
): Promise<DeepAnalysisResult | null> => {
    // Remove quotes and whitespace - common .env issue
    const cleanKey = apiKey.replace(/["']/g, '').trim();

    // Upgrading to Gemini 2.0 Flash for best performance
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${cleanKey}`;

    const prompt = `
    You are an expert BJJ (Brazilian Jiu-Jitsu) Head Coach.
    Analyze the user's training history and recent activity to provide a deep, personalized coaching report in KOREAN.

    User: ${userProfile.name} (${userProfile.belt} Belt)

    HISTORICAL CONTEXT (Consolidated data from the past ${historicalSummary.periodDays} days):
    - Total Sessions: ${historicalSummary.totalSessions}
    - Dominant Techniques/Styles: ${historicalSummary.dominantTechniques.join(', ') || 'Various'}
    - Lifetime Top Possession: ${historicalSummary.avgTopPossession}%
    - Lifetime Submission Rate: ${historicalSummary.avgSubmissionRate}%

    RECENT ACTIVITY (Last 30 days - High detail):
    ${recentLogs.map(l => `- [${l.date}] ${l.notes} (Tags: ${l.techniques?.join(', ')})`).join('\n')}

    DATA - Recently Watched Videos:
    ${recentVideos.map(v => `- ${v.title} (${v.category || 'General'})`).join('\n')}

    REAL AVAILABLE CONTENT (Priority Recommended):
    - Courses: ${availableContent?.courses.map(c => `[ID: ${c.id}] ${c.title}`).join(', ') || 'No specific listing'}
    - Routines: ${availableContent?.routines.map(r => `[ID: ${r.id}] ${r.title}`).join(', ') || 'No specific listing'}

    TASK:
    1. Identify their **Style/Identity** (MUST be in English, MAX 3 words, e.g., "Technical Guard Player").
       - Synthesize the historical dominant styles with recent changes to see their evolution.
    2. Detect **Theory-Practice Gap**.
    3. Prescribe **Training Volume for Tomorrow** (min/rounds).
    4. Calculate **Fingerprint Stats** (Standing, Guard, Passing, Side, Mount, Back) and specific **topPossession/submissionRate** (0-100).
    5. Recommend **3 items (1 Course, 1 Routine, 1 Chain/Suggestion)** from the REAL listing.

    IMPORTANT: 
    - The "identity" field MUST be in English.
    - All other text fields MUST be in KOREAN.
    - Respond STRICTLY with valid JSON.

    OUTPUT FORMAT:
    {
      "styleProfile": {
        "identity": "...",
        "description": "...",
        "strength": "...",
        "weakness": "...",
        "similarPro": "유사한 스타일의 유명 선수 이름",
        "fingerprint": { 
            "Standing": number, "Guard": number, "Passing": number, 
            "Side": number, "Mount": number, "Back": number,
            "topPossession": number, "submissionRate": number
        }
      },
      "gapAnalysis": {
        "blindSpots": ["...", "..."],
        "theoryPracticeGap": "..."
      },
      "prescription": {
        "summary": "...",
        "drillDurationMinutes": number,
        "sparringRounds": number,
        "focusAreas": ["...", "..."]
      },
      "sparringMission": {
        "scenario": "...",
        "opponentStyle": "...",
        "duration": "...",
        "reason": "..."
      },
      "recommendedContent": {
        "courses": [{ "id": "ID", "title": "제목", "reason": "이유" }],
        "routines": [{ "id": "ID", "title": "제목", "reason": "이유" }],
        "chains": [{ "title": "제목", "reason": "이유" }]
      }
    }
    `;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('Gemini API Error Body:', errText);
            throw new Error(`Gemini API Error (${response.status}): ${errText.slice(0, 200)}`);
        }

        const data = await response.json();
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) return null;

        text = text.trim();
        if (text.includes('```')) {
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        }

        // The provided snippet for keyword recognition seems to be intended for a different context
        // or a separate analysis function. It's not directly applicable here as this function
        // expects a JSON response to be parsed.
        // If there's an `analyzeBalance` function elsewhere that needs this logic, it should be applied there.
        // For this function, we proceed with JSON parsing.

        return JSON.parse(text);
    } catch (error) {
        console.error('Deep Analysis Failed:', error);
        return null;
    }
};
