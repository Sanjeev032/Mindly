const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false
    },
    profile: {
        target_role: { type: String, default: 'Software Engineer' },
        experience_level: { type: String, default: 'Junior' },
        skills: [String],
        // Extracted "Attack Vectors" from resume
        resume_claims: [String]
    },
    stats: {
        interviews_completed: { type: Number, default: 0 },
        avg_score: { type: Number, default: 0 }
    },
    // Keep raw resume text for context regeneration (protected)
    resumeText: {
        type: String,
        select: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Backward compatibility (virtuals) or migration strategy might be needed.
// For now, we will map old fields to new structure if accessed directly?
// Actually, easier to just update the Controller to use .profile

// Encrypt password using bcrypt
UserSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
