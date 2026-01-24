const express = require('express');
const { checkStatus, generateResponse } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/status', checkStatus);
router.post('/generate', protect, generateResponse);

module.exports = router;
