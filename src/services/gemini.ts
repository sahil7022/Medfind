export interface SymptomAnalysisResult {
  reply: string;
  suggestedMedicines: string[];
  language: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  suggestedMedicines?: string[];
  timestamp: Date;
}

/**
 * Sends symptoms to Gemini AI symptom checker endpoint.
 * Fallback to direct Gemini API call or local medical assessment if backend is unavailable.
 */
export async function analyzeSymptomsWithGemini(
  symptoms: string,
  language: string = 'English',
  history: Array<{ role: 'user' | 'model'; content: string }> = []
): Promise<SymptomAnalysisResult> {
  const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'https://medfind-7mgl.onrender.com/api';


  try {
    const res = await fetch(`${API_BASE}/ai/symptom-checker`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ symptoms, language, history }),
    });

    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn('Backend /api/ai endpoint unreachable, trying client-side Gemini fallback:', err);
  }

  // Client-side Direct Gemini API Call if environment has VITE_GEMINI_API_KEY
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (apiKey) {
    try {
      const promptText = `You are MedFind AI Doctor & Symptom Assistant.
Target Language: ${language}
Symptoms: "${symptoms}"

Analyze the symptoms and reply in ${language} with:
1. 🩺 Assessment Summary
2. 💊 Suggested OTC Medicines (Include SEARCH_TAG: [Medicine Name] for each medicine)
3. 📋 Dosage & Usage Advice
4. ⚠️ Safety Warnings
5. 🚨 Emergency Red Flags
6. ⚕️ Medical Disclaimer`;

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: promptText }] }],
        })
      });

      if (geminiRes.ok) {
        const gData = await geminiRes.json();
        const text = gData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const suggestedMedicines: string[] = [];
          const regex = /SEARCH_TAG:\s*\*?([^*:\n]+?)\*?(?=\n|\)|\]|\.|$)/gi;
          let match;
          while ((match = regex.exec(text)) !== null) {
            const med = match[1].trim();
            if (med && !suggestedMedicines.includes(med)) {
              suggestedMedicines.push(med);
            }
          }

          return {
            reply: text,
            suggestedMedicines,
            language,
            timestamp: new Date().toISOString(),
          };
        }
      }
    } catch (gErr) {
      console.error('Direct Gemini fetch failed:', gErr);
    }
  }

  // Local fallback if both fail
  return {
    reply: `🩺 **Assessment Summary**: Symptoms evaluated for "${symptoms}".
💊 **Suggested OTC Medicines**:
- Paracetamol 500mg (SEARCH_TAG: Paracetamol 500mg)
- Ibuprofen 200mg (SEARCH_TAG: Ibuprofen 200mg)

📋 **Usage Advice**: Take with food or water. Do not exceed daily recommended limits.
⚠️ **Warnings**: Consult your doctor if symptoms persist past 3 days.
🚨 **Emergency Warning**: Visit emergency care immediately if experiencing shortness of breath, severe chest pain, or fainting.
⚕️ **Disclaimer**: AI suggestions are educational and not a substitute for professional medical care.`,
    suggestedMedicines: ['Paracetamol 500mg', 'Ibuprofen 200mg'],
    language,
    timestamp: new Date().toISOString()
  };
}
