const mongoose = require('mongoose');

const InterviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String, // 'HR', 'Technical', 'System Design'
        default: 'HR'
    },
    status: {
        type: String, // 'active', 'completed'
        default: 'active'
    },
    messages: [{
        role: {
            type: String, // 'user', 'assistant', 'system'
            required: true
        },
        content: {
            type: String,
            required: true
        },
        feedback: {
            score: Number, // 1-10
            critique: String,
            improvement: String
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Interview', InterviewSchema);
