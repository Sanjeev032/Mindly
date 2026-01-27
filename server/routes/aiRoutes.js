const express = require('express');
const { checkStatus, generateResponse, conductInterview } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/status', checkStatus);
router.post('/generate', protect, generateResponse);
router.post('/interview', protect, checkStatus, conductInterview);

module.exports = router;
