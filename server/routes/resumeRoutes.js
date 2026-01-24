const express = require('express');
const multer = require('multer');
const { uploadResume } = require('../controllers/resumeController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// 1. Configure Multer (Senior Level Config)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        // Reject file
        cb(new Error('INVALID_FILE_TYPE'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1
    },
    fileFilter: fileFilter
});

// Wrapper to handle Multer errors gracefully
const uploadMiddleware = (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ success: false, error: 'File too large. Max size is 5MB.' });
            }
            return res.status(400).json({ success: false, error: err.message });
        } else if (err) {
            if (err.message === 'INVALID_FILE_TYPE') {
                return res.status(400).json({ success: false, error: 'Only PDF files are allowed.' });
            }
            return res.status(500).json({ success: false, error: 'Upload unknown error.' });
        }
        next();
    });
};

router.post('/upload', protect, uploadMiddleware, uploadResume);

module.exports = router;
