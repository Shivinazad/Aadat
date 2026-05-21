const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
    static async generateRoadmap(habitTitle, description) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is not configured.');
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
            model: 'gemini-2.5-flash',
            generationConfig: { responseMimeType: 'application/json' }
        });

        const prompt = `
You are an expert personal coach helping a user build a new habit.
The user wants to start the habit "${habitTitle}".
Their goal and background: "${description}".

Generate a personalized 30-day roadmap with 5 to 7 sequential checkpoints.
The checkpoints must have realistic days spaced out (e.g. Day 1, Day 5, Day 10, Day 15, Day 20, Day 25, Day 30).
The difficulty of checkpoints should gradually increase from "Easy" to "Medium" and then "Hard".

Return a JSON object matching this exact schema:
{
  "aiDescription": "An encouraging, brief (2-3 sentences) coach's summary/overview of this habit journey.",
  "roadmap": [
    {
      "checkpoint": 1,
      "day": 1,
      "title": "Checkpoint Title",
      "overview": "Overview of what the user needs to focus on in this checkpoint.",
      "difficulty": "Easy",
      "actionSteps": [
        "First specific actionable step",
        "Second specific actionable step",
        "Third specific actionable step"
      ],
      "tips": [
        "First tip or helpful resource",
        "Second tip or helpful resource"
      ]
    }
  ]
}

Ensure the output is valid JSON and nothing else.
`;

        const result = await model.generateContent(prompt);
        let responseText = result.response.text().trim();
        
        // Remove markdown formatting if present
        if (responseText.startsWith('```')) {
            responseText = responseText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
        }
        
        return JSON.parse(responseText);
    }
}

module.exports = GeminiService;
