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

            // ASYNC: Generate Feedback for this answer
            // We await it for MVP simplicity
            const feedback = await ollamaService.analyzeResponse(lastExchange.question_text, message);
            lastExchange.feedback = {
                score: feedback.score,
                critique: feedback.critique,
                improvement_tip: feedback.improvement
            };

            await lastExchange.save();
        }

        // 3. Generate NEXT Question
        // Context: Last 3 exchanges
        const recentExchanges = await QuestionExchange.find({ session_id: sessionId })
            .sort({ sequence_index: -1 })
            .limit(3);

        // Format history for AI
        // We act as if we are continuing the chat
        const chatHistory = recentExchanges.reverse().map(ex => [
            { role: 'assistant', content: ex.question_text },
            { role: 'user', content: ex.user_answer_text || '' } // Last one might be null if just started, but we just filled it
        ]).flat();

        const aiResponseText = await ollamaService.chat(chatHistory);

        // 4. Create NEW Exchange for this new question
        const nextSequence = (lastExchange?.sequence_index || 0) + 1;
        const newExchange = await QuestionExchange.create({
            session_id: sessionId,
            sequence_index: nextSequence,
            question_text: aiResponseText,
            topic: 'General', // N/A for now
            complexity: 'Medium'
        });

        res.status(200).json({
            success: true,
            data: {
                ai_message: aiResponseText,
                feedback: lastExchange?.feedback
            }
        });

    } catch (err) {
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
