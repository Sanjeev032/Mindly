const express = require('express');
const { startInterview, sendMessage, getInterview, getUserInterviews } = require('../controllers/interviewController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/')
    .get(getUserInterviews)
    .post(startInterview);

router.route('/:id')
    .get(getInterview);

router.route('/:id/message')
    .post(sendMessage);

module.exports = router;
