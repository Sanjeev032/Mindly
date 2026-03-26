const OpenAI = require('openai');

const client = new OpenAI({
    apiKey: process.env.XAI_API_KEY,
    baseURL: "https://api.x.ai/v1",
});

const GROK_MODEL = process.env.GROK_MODEL || "grok-beta";

const SYSTEM_PROMPT = `
You are Mindly, an elite AI Interview Coach. Your goal is to conduct a professional mock interview.
Ask one question at a time. Be encouraging but critical when providing feedback.
Your response MUST be in the following JSON format:
{
    "feedback": {
        "score": number (0-100),
        "critique": "string",
        "improvementTip": "string"
    },
    "nextQuestion": "string"
}
If this is the first question, feedback fields should be null.
`;

const generateQuestion = async (type, targetRole, experienceLevel, resumeText) => {
    try {
        const resumeContext = resumeText ? `The candidate's resume content is: "${resumeText}". ` : "";
        const response = await client.chat.completions.create({
            model: GROK_MODEL,
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: `${resumeContext}Start a ${type} interview for a ${targetRole} with ${experienceLevel} experience.` }
            ],
            response_format: { type: "json_object" }
        });
        return JSON.parse(response.choices[0].message.content);
    } catch (err) {
        console.error('Grok API Error:', err);
        return { feedback: null, nextQuestion: "I'm having trouble connecting to the AI. Let's try again." };
    }
};

const sendMessage = async (history, userMessage) => {
    try {
        const messages = [
            { role: "system", content: SYSTEM_PROMPT },
            ...history,
            { role: "user", content: userMessage }
        ];

        const response = await client.chat.completions.create({
            model: GROK_MODEL,
            messages,
            response_format: { type: "json_object" }
        });
        return JSON.parse(response.choices[0].message.content);
    } catch (err) {
        console.error('Grok API Error:', err);
        return { 
            feedback: { score: 0, critique: "Communication error.", improvementTip: "Check API keys." }, 
            nextQuestion: "Sorry, I lost my train of thought. Can you repeat that?" 
        };
    }
};

module.exports = { generateQuestion, sendMessage };
