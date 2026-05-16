const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');

/**
 * Generate a comprehensive safety report using Google Gemini 1.5 Flash.
 * It analyzes the image for contextual safety compliance (gloves, boots, eye protection)
 * and outputs a concise suggestion.
 * @param {string} imagePath - Path to the image file on disk.
 * @returns {Promise<string|null>} - The AI generated report or null if it fails/disabled.
 */
async function generateSafetyReport(imagePath) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.warn('⚠️  No GEMINI_API_KEY set — skipping AI Suggestion.');
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Read the image file and convert to base64
    const fileBytes = fs.readFileSync(imagePath);
    const base64Data = fileBytes.toString('base64');
    
    // Determine mime type based on extension
    const ext = imagePath.split('.').pop().toLowerCase();
    const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

    console.log(`🧠 Calling Gemini API for advanced safety analysis...`);

    const prompt = `You are an expert industrial safety inspector.
Analyze this image of a worker/worksites. Pay close attention to:
1. The type of work being performed (e.g. electrical, construction, heavy machinery).
2. The presence or absence of necessary PPE for that specific field, such as:
   - Protective gloves
   - Safety boots/footwear
   - Eye protection/goggles
   - High-visibility vests
   - Hardhats

Provide a short, highly conversational "AI Safety Suggestion" speaking directly to the worker. 
Do not sound like a robot or a list. Speak like a friendly, caring, but firm human site supervisor. Tell them what they are doing right, and gently remind them of any missing safety gear based on what they are doing.

IMPORTANT: Your response must be valid JSON containing two keys: 
1. "english": the suggestion in conversational, friendly English.
2. "hindi": the exact same suggestion translated to highly natural, everyday conversational Hindi. CRITICAL: The "hindi" value MUST be written in the Devanagari script (Hindi characters like देखो भाइयों), NEVER in Latin/English script (Hinglish). Ensure the Hindi sentences feel like a real person talking to them directly on a site, using warm but clear language.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
      }
    });

    const reportText = response.text;
    console.log(`✅ Gemini Report generated: ${reportText.substring(0, 50)}...`);
    
    // Parse the JSON
    try {
      const reportData = JSON.parse(reportText);
      return reportData; // Should contain { english, hindi }
    } catch (e) {
      console.error('Failed to parse Gemini JSON:', e);
      return { english: reportText, hindi: '' }; // Fallback
    }

  } catch (error) {
    console.error('❌ Gemini AI Error:', error.message);
    return null;
  }
}

module.exports = { generateSafetyReport };
