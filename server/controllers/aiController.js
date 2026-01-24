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
