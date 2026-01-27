const InterviewSession = require('../models/InterviewSession');
const QuestionExchange = require('../models/QuestionExchange');
const User = require('../models/User');
const ollamaService = require('../services/ollamaService');

// @desc    Start user interview
// @route   POST /api/interviews
// @access  Private
exports.startInterview = async (req, res) => {
    try {
        const { type } = req.body;

        // 1. Fetch User Context
        const user = await User.findById(req.user.id).select('+resumeText');

        // 2. Generate First Question
        let systemPrompt = `You are a professional ${type} Interviewer. 
        Your goal is to assess the candidate. 
        Start by introducing yourself and asking the first question.
        Keep responses concise.`;

        if (user.profile && user.profile.skills && user.profile.skills.length > 0) {
            const skill = user.profile.skills[Math.floor(Math.random() * user.profile.skills.length)];
            systemPrompt += `\nCONTEXT: The candidate specifically knows ${skill}.
            Ask your FIRST question about ${skill}.`;
        }

        let aiGreeting;
        try {
            aiGreeting = await ollamaService.generate(systemPrompt);
        } catch (aiErr) {
            console.error('Ollama Greeting Failed, using fallback:', aiErr);
            aiGreeting = `Hello ${user.name}, I am your ${type} Interviewer. Let's get started. Tell me about your experience.`;
        }

        // 3. Create Session
        const session = await InterviewSession.create({
            user_id: req.user.id,
            type: type || 'HR',
            status: 'ACTIVE'
        });

        // 4. Create First Exchange (The greeting/question)
        await QuestionExchange.create({
            session_id: session._id,
            sequence_index: 1,
            question_text: aiGreeting,
            topic: 'Opening',
            complexity: 'Easy'
        });

        res.status(201).json({ success: true, data: { session_id: session._id, message: aiGreeting } });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Send message (Answer)
// @route   POST /api/interviews/:id/message
// @access  Private
exports.sendMessage = async (req, res) => {
    try {
        const { message } = req.body; // User's answer
        const sessionId = req.params.id;

        // 1. Get Session
        const session = await InterviewSession.findById(sessionId);
        if (!session) return res.status(404).json({ success: false, error: 'Session not found' });

        // 2. Find the MOST RECENT Exchange (to save this answer to)
        const lastExchange = await QuestionExchange.findOne({ session_id: sessionId })
            .sort({ sequence_index: -1 });

        if (lastExchange) {
            lastExchange.user_answer_text = message;
            lastExchange.response_time_ms = 0; // measurement pending
            await lastExchange.save();
        }

        // 3. Prepare Logic for Next Question
        const role = session.type || 'Software Engineer';
        const topic = lastExchange?.topic || 'General Technical';
        const previousQuestion = lastExchange?.question_text || 'Intro';
        const difficulty = lastExchange?.complexity || 'Medium';

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
3. Previous question: "${previousQuestion}"
4. Candidate’s answer: "${message}"
5. Difficulty level: ${difficulty}

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

        let aiResponse;
        try {
            const rawResponse = await ollamaService.generate(systemPrompt, 'llama3.2', { format: 'json' });
            aiResponse = JSON.parse(rawResponse);
        } catch (e) {
            console.error("AI Generation/Parsing Failed:", e);
            // Fallback
            aiResponse = {
                answer_quality: "N/A",
                counter_question: "Could you elaborate on that?"
            };
        }

        // Update previous exchange with quality
        if (lastExchange) {
            lastExchange.answer_quality = aiResponse.answer_quality;
            // Also store as feedback for backward compat if needed, or just rely on global feedback later
            lastExchange.feedback = {
                score: aiResponse.answer_quality === 'STRONG' ? 9 : aiResponse.answer_quality === 'PARTIAL' ? 6 : 3,
                critique: `Rated as ${aiResponse.answer_quality}`,
                improvement_tip: "Keep practicing."
            };
            await lastExchange.save();
        }

        // 4. Create NEW Exchange
        const nextSequence = (lastExchange?.sequence_index || 0) + 1;
        const newExchange = await QuestionExchange.create({
            session_id: sessionId,
            sequence_index: nextSequence,
            question_text: aiResponse.counter_question,
            topic: topic, // Maintain topic or let AI suggest? For now maintain.
            complexity: difficulty // Could adjust based on quality, but let's keep simple for now
        });

        res.status(200).json({
            success: true,
            data: {
                ai_message: aiResponse.counter_question,
                feedback: lastExchange?.feedback
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Get session details
// @route   GET /api/interviews/:id
// @access  Private
exports.getInterview = async (req, res) => {
    try {
        const session = await InterviewSession.findById(req.params.id);
        const exchanges = await QuestionExchange.find({ session_id: req.params.id }).sort({ sequence_index: 1 });

        // Transform to old "messages" format for Frontend Compatibility (Temporary)
        // OR we update frontend. Let's send raw data and we will update frontend.
        const messages = [];
        exchanges.forEach(ex => {
            messages.push({ role: 'assistant', content: ex.question_text });
            if (ex.user_answer_text) {
                messages.push({
                    role: 'user',
                    content: ex.user_answer_text,
                    feedback: ex.feedback
                });
            }
        });

        res.status(200).json({ success: true, data: { session, messages } });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Get all user interviews
// @route   GET /api/interviews
// @access  Private
exports.getUserInterviews = async (req, res) => {
    try {
        const interviews = await InterviewSession.find({ user_id: req.user.id }).sort({ started_at: -1 });
        res.status(200).json({ success: true, count: interviews.length, data: interviews });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
