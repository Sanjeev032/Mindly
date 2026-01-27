const ollamaService = require('../services/ollamaService');

// @desc    Check AI Status
// @route   GET /api/ai/status
// @access  Public
exports.checkStatus = async (req, res) => {
    const isRunning = await ollamaService.isRunning();
    if (isRunning) {
        res.status(200).json({ success: true, message: 'Ollama is online' });
    } else {
        res.status(503).json({ success: false, message: 'Ollama is offline or unreachable' });
    }
};

// @desc    Generate basic response
// @route   POST /api/ai/generate
// @access  Private
exports.generateResponse = async (req, res) => {
    try {
        const { prompt, model } = req.body;
        if (!prompt) {
            return res.status(400).json({ success: false, error: 'Prompt is required' });
        }

        const response = await ollamaService.generate(prompt, model);
        res.status(200).json({ success: true, data: response });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Conduct Interview Turn
// @route   POST /api/ai/interview
// @access  Private
exports.conductInterview = async (req, res) => {
    try {
        const { role, topic, previousQuestion, answer, difficulty } = req.body;

        if (!role || !topic) {
            return res.status(400).json({ success: false, error: 'Role and Topic are required' });
        }

        const systemPrompt = `
You are an AI interviewer conducting a REAL technical interview.

STRICT RULES:
- You must NOT ask random or pre-written questions
- Every next question MUST depend on the candidate’s LAST answer
- You must behave like a human interviewer who probes depth, clarity, and honesty
- Use ONLY reasoning, not external APIs
- Assume the model runs locally via Ollama (open-source LLM)

INPUT YOU RECEIVE EACH TURN:
1. Interview role: ${role}
2. Topic being tested: ${topic}
3. Previous question: "${previousQuestion || 'N/A'}"
4. Candidate’s answer: "${answer || 'N/A'}"
5. Difficulty level: ${difficulty || 'Medium'}

YOUR TASK:
1. Analyze the candidate’s answer and classify it into ONE category:
   - STRONG (correct + depth + example)
   - PARTIAL (correct but shallow or vague)
   - WEAK (confused or incorrect)
   - BLUFFING (buzzwords without explanation)

2. Based on the classification, generate the NEXT question:

   IF STRONG:
   - Ask a deeper "HOW / WHY / EDGE CASE" question
   - Increase difficulty slightly
   - Example: performance, internals, trade-offs

   IF PARTIAL:
   - Ask a clarifying follow-up
   - Force the candidate to give an example or explain internals

   IF WEAK:
   - Ask a simpler foundational question
   - Test basic understanding without embarrassment

   IF BLUFFING:
   - Ask a very specific implementation-level question
   - Force concrete explanation (syntax, flow, lifecycle, steps)

3. The counter-question MUST:
   - Be directly connected to the candidate’s answer
   - Feel like a natural human follow-up
   - Be no longer than 2–3 sentences
   - Increase or decrease difficulty logically

4. NEVER reveal your classification.
5. NEVER explain the answer.
6. ONLY ask the next question.

OUTPUT FORMAT (STRICT JSON):
{
  "answer_quality": "STRONG | PARTIAL | WEAK | BLUFFING",
  "counter_question": "Next interview question here"
}
`;

        const response = await ollamaService.generate(systemPrompt, 'llama3.2', { format: 'json' });

        let jsonResponse;
        try {
            jsonResponse = JSON.parse(response);
        } catch (e) {
            // Fallback if JSON parsing fails, though format: 'json' should prevent this
            console.error("Failed to parse JSON response:", response);
            return res.status(500).json({ success: false, error: 'AI response was not valid JSON' });
        }

        res.status(200).json({ success: true, data: jsonResponse });

    } catch (err) {
        console.error("Interview Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};
