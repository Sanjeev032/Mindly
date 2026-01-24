const mongoose = require('mongoose');

const InterviewSessionSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String, // "HR", "Technical", "System Design"
        required: true
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'COMPLETED', 'ABANDONED'],
        default: 'ACTIVE'
    },
    started_at: {
        type: Date,
        default: Date.now
    },
    ended_at: {
        type: Date
    },
    overall_score: {
        type: Number, // 0-100
        default: 0
    },
    transcript_summary: {
        type: String
    }
});

module.exports = mongoose.model('InterviewSession', InterviewSessionSchema);
