const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const createApolloServer = require('./graphql/apolloServer');

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️  GEMINI_API_KEY is not set. AI features will return fallback responses until updated in .env');
}

const app = express();

const corsOptions = {
    origin: process.env.ALLOWED_ORIGIN || '*',
    credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Configure Multer
const upload = multer({ storage: multer.memoryStorage() });

// Resume Upload Endpoint
app.post('/api/resume/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        let resumeText = '';
        if (req.file.mimetype === 'application/pdf') {
            // pdf-parse v2 changed its export shape — handle both v1 and v2
            const parseFn = typeof pdfParse === 'function'
                ? pdfParse
                : (pdfParse.default || pdfParse);
            const data = await parseFn(req.file.buffer);
            resumeText = data.text;
        } else {
            resumeText = req.file.buffer.toString('utf-8');
        }

        // Return a mock success for now, we could store this in the session or User model later
        console.log('Resume Parsed:', resumeText.substring(0, 100) + '...');
        
        res.json({ 
            message: 'Resume uploaded and parsed successfully',
            summary: 'Extracted text from ' + req.file.originalname,
            parsedContent: resumeText.substring(0, 1000) // Truncate for safety
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
