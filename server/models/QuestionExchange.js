const mongoose = require('mongoose');

const QuestionExchangeSchema = new mongoose.Schema({
    session_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InterviewSession',
        required: true
    },
    sequence_index: {
        type: Number,
        required: true
    },
    question_text: {
        type: String,
        required: true
    },
    topic: {
        type: String
    },
    complexity: {
        type: String,
        enum: ['Easy', 'Medium', 'Hard'],
        default: 'Medium'
    },
    answer_quality: {
        type: String,
        enum: ['STRONG', 'PARTIAL', 'WEAK', 'BLUFFING', 'N/A'],
        default: 'N/A'
    },
    user_answer_text: {
        type: String
    },
    response_time_ms: {
        type: Number
    },
    feedback: {
        score: { type: Number }, // 1-10
        critique: { type: String },
        improvement_tip: { type: String },
        tone_analysis: { type: String }
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('QuestionExchange', QuestionExchangeSchema);
