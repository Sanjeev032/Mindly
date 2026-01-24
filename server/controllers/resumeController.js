const resumeService = require('../services/resumeService');
const User = require('../models/User');

// @desc    Upload and Analyze Resume
// @route   POST /api/resume/upload
// @access  Private
exports.uploadResume = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded.' });
        }

        console.log(`[ResumeController] Processing: ${req.file.originalname} (${req.file.size} bytes)`);

        // 1. Parse & Validate
        let resumeText;
        try {
            resumeText = await resumeService.parsePDF(req.file.buffer);
        } catch (parseError) {
            // Handle specific logic errors from Service
            if (parseError.message.includes('SCANNED_PDF')) {
                return res.status(400).json({
                    success: false,
                    error: 'This looks like a scanned PDF. Please upload a text-based PDF (exported from Word/Docs).'
                });
            }
            if (parseError.message.includes('CORRUPTED_PDF')) {
                return res.status(400).json({
                    success: false,
                    error: 'The PDF file appears to be corrupted or invalid.'
                });
            }
            throw parseError; // 500
        }

        // 2. AI Analysis
        console.log('[ResumeController] Text extracted efficiently. Running AI Analysis...');
        const analysis = await resumeService.analyzeResume(resumeText);

        // 3. Save to Profile
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        if (!user.profile) user.profile = {};

        user.profile.skills = analysis.skills || user.profile.skills || [];
        user.profile.experience_level = analysis.seniority_estimate || user.profile.experience_level || 'Junior';
        user.profile.resume_claims = analysis.claims || [];
        user.resumeText = resumeText;

        // Sync legacy fields if needed
        user.skills = user.profile.skills;

        await user.save();

        res.status(200).json({
            success: true,
            data: {
                message: 'Resume processed successfully.',
                analysis
            }
        });

    } catch (err) {
        console.error('[ResumeController] System Error:', err);
        res.status(500).json({
            success: false,
            error: `Server Error: ${err.message}`
        });
    }
};
