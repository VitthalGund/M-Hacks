// lib/agents/ai-client.ts

export type GemResponse = {
    text: string;
    raw?: any;
};

// Parse API keys from environment - supports comma-separated list
const API_KEYS = process.env.GEMINI_API_KEY?.split(',').map(k => k.trim()).filter(Boolean) || [];
let currentKeyIndex = 0;

function getNextApiKey(): string {
    if (API_KEYS.length === 0) {
        throw new Error("No Gemini API keys configured");
    }
    
    const key = API_KEYS[currentKeyIndex];
    // Rotate to next key for next request
    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
    return key;
}

export async function callGemini(prompt: string, maxTokens = 400): Promise<GemResponse> {
    let lastError: any = null;
    
    // Try each API key in rotation
    for (let attempt = 0; attempt < API_KEYS.length; attempt++) {
        try {
            const apiKey = getNextApiKey();
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite-preview-02-05:generateContent?key=${apiKey}`;
            
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        maxOutputTokens: maxTokens,
                        temperature: 0.7
                    }
                })
            });

            if (!response.ok) {
                const error = await response.text();
                console.warn(`API key ${attempt + 1}/${API_KEYS.length} failed:`, error);
                lastError = new Error(`Gemini API error: ${response.status} ${error}`);
                
                // If quota exceeded or auth error, try next key
                if (response.status === 429 || response.status === 403) {
                    continue;
                }
                throw lastError;
            }

            const data = await response.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            
            console.log(`✓ Gemini API success with key ${attempt + 1}`);
            return { text };
            
        } catch (error: any) {
            lastError = error;
            console.error(`API key ${attempt + 1} error:`, error.message);
        }
    }
    
    // All keys failed
    throw lastError || new Error("All Gemini API keys exhausted");
}
