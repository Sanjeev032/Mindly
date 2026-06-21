const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const pdfParse = require('pdf-parse');
// pdf-parse v2 exports a class; destructure it. Fall back to v1 callable if present.
const PDFParse = pdfParse.PDFParse || null;
const pdfParseFn = typeof pdfParse === 'function' ? pdfParse : null;
const jwt = require('jsonwebtoken');
const createApolloServer = require('./graphql/apolloServer');

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️  GEMINI_API_KEY is not set. AI features will return fallback responses until updated in .env');
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const app = express();

const corsOptions = {
    origin: process.env.ALLOWED_ORIGIN || '*',
    credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Configure Multer
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Resume Upload Endpoint
app.post('/api/resume/upload', upload.single('file'), async (req, res) => {
    try {
        const authHeader = req.headers.authorization || '';
        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authentication token required' });
        }
        const token = authHeader.substring(7);
        try {
            jwt.verify(token, JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ error: 'Invalid or expired authentication token' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        if (req.file.mimetype !== 'application/pdf') {
            return res.status(400).json({ error: 'Only PDF files are accepted' });
        }

        let resumeText = '';
        // pdf-parse v2 API: PDFParse class with .getText({ data: buffer })
        // pdf-parse v1 API: callable function returning { text }
        if (PDFParse) {
            const parser = new PDFParse({ data: req.file.buffer });
            const result = await parser.getText();
            resumeText = result.text || '';
        } else if (pdfParseFn) {
            const data = await pdfParseFn(req.file.buffer);
            resumeText = data.text || '';
        } else {
            throw new Error('pdf-parse module could not be initialized');
        }

        // Return a mock success for now, we could store this in the session or User model later
        console.log('Resume Parsed:', resumeText.substring(0, 100) + '...');
        
        res.json({ 
            message: 'Resume uploaded and parsed successfully',
            summary: 'Extracted text from ' + req.file.originalname,
            parsedContent: resumeText.substring(0, 5000), // Increased limit
            charCount: resumeText.length,
            warning: resumeText.length < 50 ? 'The uploaded PDF appears to be scanned or image-only; text extraction may be incomplete.' : undefined
        });
    } catch (err) {
        console.error('Resume Upload Error:', err);
        res.status(500).json({ error: 'Failed to process resume' });
    }
});

// Initialize Apollo
createApolloServer(app).then(() => {
    console.log('🚀 Apollo Server Ready at /graphql');
}).catch(err => {
    console.error('Failed to start Apollo Server', err);
});

app.get('/', (req, res) => {
    res.send('AI Career Coach API is running');
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
