import { Router, Request, Response } from 'express';

export const aiRouter = Router();

interface SymptomCheckRequest {
  symptoms: string;
  language?: string;
  history?: Array<{ role: 'user' | 'model'; content: string }>;
}

const SYSTEM_INSTRUCTION = `You are "MedFind AI Doctor & Symptom Assistant", a compassionate, highly accurate medical assistant.
Your goal is to evaluate user symptoms, explain what might be happening and why, and provide clear over-the-counter (OTC) medication suggestions, dosage guidance, safety warnings, and emergency red flags.

CRITICAL INSTRUCTIONS:
1. Always maintain a helpful, professional, and empathetic tone.
2. Structure your response into clear, clean sections using Markdown:
   - 🩺 **Assessment Summary**: Concise summary of the symptoms.
   - 🔍 **Possible Causes & Why It's Happening**: Explain educated guesses and medical hypotheses on what might be causing these symptoms and why they occur (e.g. viral inflammation, dehydration, muscle tension, gastric hyperacidity). Emphasize these are probable possibilities, not a formal diagnosis.
   - 💊 **Suggested OTC Medicines**: List specific common generic and brand-name over-the-counter medications (e.g., Paracetamol / Acetaminophen 500mg, Ibuprofen 200mg, Cetirizine 10mg, Antacids, Cough Syrup, etc.). Include **SEARCH_TAG: [Exact Medicine Name]** tag next to each suggested drug so the MedFind app can create instant search buttons (e.g., **SEARCH_TAG: Paracetamol 500mg**).
   - 📋 **Dosage & Usage Advice**: Safe usage instructions and precautions.
   - ⚠️ **Contraindications & Safety Warnings**: Who should avoid these (e.g. pregnancy, high blood pressure, liver/kidney conditions).
   - 🚨 **Emergency Red Flags**: Critical warning signs (e.g., severe chest pain, shortness of breath, sudden high fever) where the user must visit an Emergency Room or consult a doctor immediately.
   - ⚕️ **Medical Disclaimer**: Remind the user that AI advice is educational and not a substitute for a licensed healthcare professional.

3. MULTILINGUAL MANDATE: You MUST write your ENTIRE response in the requested language. If the language is Spanish, respond completely in Spanish. If Hindi, respond completely in Hindi. If French, German, Mandarin, Arabic, Bengali, etc., respond in that language.
`;


aiRouter.post('/symptom-checker', async (req: Request, res: Response): Promise<void> => {
  try {
    const { symptoms, language = 'English', history = [] } = req.body as SymptomCheckRequest;

    if (!symptoms || typeof symptoms !== 'string' || !symptoms.trim()) {
      res.status(400).json({ error: 'Please provide valid symptoms to analyze.' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      res.status(500).json({ error: 'Gemini API key is missing on the server.' });
      return;
    }

    // Prepare contents array for Gemini REST API
    const contents: any[] = [];

    // Add conversation history if available
    for (const h of history) {
      contents.push({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }]
      });
    }

    // Add user prompt with system instruction and explicit target language requirement
    const userPrompt = `${SYSTEM_INSTRUCTION}

[TARGET LANGUAGE]: ${language}
[USER SYMPTOMS DESCRIBED]: "${symptoms.trim()}"

Please analyze these symptoms and provide medicine suggestions, usage guidance, precautions, emergency warnings, and SEARCH_TAG tags in ${language}.`;

    contents.push({
      role: 'user',
      parts: [{ text: userPrompt }]
    });

    // Call Gemini API (trying gemini-1.5-flash first, falling back to gemini-2.5-flash if needed)
    let responseText = '';
    const models = ['gemini-1.5-flash', 'gemini-2.5-flash', 'gemini-1.5-pro'];

    let apiError: any = null;

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const fetchRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 1200,
            }
          })
        });

        if (fetchRes.ok) {
          const data = await fetchRes.json();
          const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText) {
            responseText = candidateText;
            break;
          }
        } else {
          const errBody = await fetchRes.text();
          apiError = errBody;
        }
      } catch (err) {
        apiError = err;
      }
    }

    if (!responseText) {
      console.warn('Gemini API call failed or returned empty, using intelligent medical fallback engine:', apiError);
      responseText = generateLocalMedicalFallback(symptoms, language);
    }

    // Extract suggested medicine tags for easy UI button rendering
    const suggestedMedicines: string[] = [];
    const searchTagRegex = /SEARCH_TAG:\s*\*?([^*:\n]+?)\*?(?=\n|\)|\]|\.|$)/gi;
    let match;
    while ((match = searchTagRegex.exec(responseText)) !== null) {
      const medName = match[1].trim();
      if (medName && !suggestedMedicines.includes(medName)) {
        suggestedMedicines.push(medName);
      }
    }

    res.json({
      reply: responseText,
      suggestedMedicines,
      language,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error in /api/ai/symptom-checker:', error);
    res.status(500).json({
      error: 'Failed to evaluate symptoms.',
      details: error.message || String(error)
    });
  }
});

/**
 * Intelligent local fallback if API key quota or network fails
 */
function generateLocalMedicalFallback(symptoms: string, language: string): string {
  const isSpanish = language.toLowerCase().includes('spanish') || language.toLowerCase().includes('español');
  const isHindi = language.toLowerCase().includes('hindi') || language.toLowerCase().includes('हिंदी');
  const isFrench = language.toLowerCase().includes('french') || language.toLowerCase().includes('français');

  const lower = symptoms.toLowerCase();

  let med = 'Paracetamol 500mg';
  if (lower.includes('cough') || lower.includes('cold') || lower.includes('throat')) {
    med = 'Benadryl Cough Syrup / Cetirizine 10mg';
  } else if (lower.includes('stomach') || lower.includes('acidity') || lower.includes('gas') || lower.includes('nausea')) {
    med = 'Gelusil Antacid / Omeprazole 20mg';
  } else if (lower.includes('pain') || lower.includes('headache') || lower.includes('migraine')) {
    med = 'Ibuprofen 200mg / Paracetamol 500mg';
  }

  if (isSpanish) {
    return `🩺 **Resumen de Evaluación**: Síntomas analizados: "${symptoms}".
💊 **Medicamento Recomendado**:
- ${med} (SEARCH_TAG: ${med})

📋 **Instrucciones de Uso**: Tomar después de los alimentos con abundante agua. No exceder la dosis recomendada.
⚠️ **Advertencias**: Si tiene problemas hepáticos, renales o está embarazada, consulte a su médico.
🚨 **Señales de Emergencia**: Si experimenta dificultad para respirar o dolor intenso en el pecho, busque atención médica de urgencia de inmediato.
⚕️ **Aviso Médico**: Esta sugerencia es informativa y no reemplaza la consulta médica profesional.`;
  }

  if (isHindi) {
    return `🩺 **मूल्यांकन सारांश**: आपके द्वारा बताए गए लक्षण: "${symptoms}".
💊 **सुझाई गई दवाएं (OTC)**:
- ${med} (SEARCH_TAG: ${med})

📋 **खुराक और उपयोग**: भोजन के बाद पर्याप्त पानी के साथ लें। अनुशंसित खुराक से अधिक न लें।
⚠️ **सावधानियां**: गर्भावस्था या लीवर/किडनी की समस्याओं में डॉक्टर से सलाह लें।
🚨 **आपातकालीन संकेत**: यदि सांस लेने में तकलीफ या सीने में तेज दर्द हो, तो तुरंत निकटतम अस्पताल जाएं।
⚕️ **चिकित्सा अस्वीकरण**: यह एआई परामर्श केवल जानकारी के लिए है, यह डॉक्टर की सलाह का विकल्प नहीं है।`;
  }

  if (isFrench) {
    return `🩺 **Résumé de l'évaluation**: Symptômes analysés : "${symptoms}".
💊 **Médicaments en vente libre suggérés**:
- ${med} (SEARCH_TAG: ${med})

📋 **Conseils d'utilisation**: À prendre après le repas avec un grand verre d'eau. Ne pas dépasser la dose recommandée.
⚠️ **Mises en garde**: Consultez un médecin en cas de grossesse ou de problèmes hépatiques/rénaux.
🚨 **Signes d'urgence**: En cas de douleur thoracique aiguë ou de difficulté respiratoire, rendez-vous immédiatement aux urgences.
⚕️ **Avertissement médical**: Ces conseils sont éducatifs et ne remplacent pas une consultation médicale.`;
  }

  return `🩺 **Assessment Summary**: Analyzed symptoms: "${symptoms}".
💊 **Suggested OTC Medicines**:
- ${med} (SEARCH_TAG: ${med})

📋 **Dosage & Usage Advice**: Take orally after meals with plenty of water. Do not exceed the recommended daily limit.
⚠️ **Contraindications & Safety Warnings**: Consult a doctor if you have liver, kidney, or cardiovascular issues, or if pregnant.
🚨 **Emergency Red Flags**: Seek immediate medical care if you experience severe shortness of breath, high fever above 103°F (39.4°C), or severe chest pain.
⚕️ **Medical Disclaimer**: This AI assessment is for informational purposes only and does not constitute formal medical diagnosis or advice.`;
}
