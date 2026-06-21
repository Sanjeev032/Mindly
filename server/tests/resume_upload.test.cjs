'use strict';
/**
 * resume_upload.test.cjs
 *
 * Real-world resume upload testing for Mindly.
 *
 * Tests 5 resume archetypes:
 *   1. Simple ATS resume       — plain text, clean structure
 *   2. Two-page resume         — multiple pages, longer content
 *   3. Resume with icons       — icon glyphs in text stream
 *   4. Resume with tables      — tabular layout (skills matrix)
 *   5. Resume with images      — embedded image object (image-heavy layout)
 *
 * For each resume:
 *   ✓ Upload succeeds (HTTP 200)
 *   ✓ Text extraction quality (key fields found)
 *   ✓ Resume context quality (expected keywords present)
 *   ✓ AI question personalization (when GEMINI_API_KEY is set)
 *
 * Run:
 *   node tests/resume_upload.test.cjs
 *   npm run test:resume
 */

const http      = require('http');
const net       = require('net');
const path      = require('path');
const os        = require('os');
const crypto    = require('crypto');

// ── ANSI ──────────────────────────────────────────────────────────────────────

const C = {
    pass:  s => `\x1b[32m${s}\x1b[0m`,
    fail:  s => `\x1b[31m${s}\x1b[0m`,
    warn:  s => `\x1b[33m${s}\x1b[0m`,
    info:  s => `\x1b[36m${s}\x1b[0m`,
    bold:  s => `\x1b[1m${s}\x1b[0m`,
    dim:   s => `\x1b[2m${s}\x1b[0m`,
};
const PASS = C.pass('✓');
const FAIL = C.fail('✗');
const WARN = C.warn('⚠');
const INFO = C.info('ℹ');
const SKIP = C.dim('–');

// ── Test state ────────────────────────────────────────────────────────────────

const results = [];

function record(name, passed, detail = '', warn = false) {
    results.push({ name, passed, detail, warn });
    const icon = warn ? WARN : (passed ? PASS : FAIL);
    console.log(`  ${icon} ${name}${detail ? C.dim(' — ' + detail) : ''}`);
}

// ── PDF Builder ───────────────────────────────────────────────────────────────
/**
 * Builds a minimal but spec-compliant PDF containing the given text on N pages.
 * Uses only Type1 font (Helvetica) to ensure maximum parser compatibility.
 * For "images" scenario, embeds a dummy XObject image stream entry.
 */
function buildPDF(pages, opts = {}) {
    // Each page gets a content stream.
    // Use T* (next-line) with TL (text leading) — works with pdf-parse v2.
    // Strip non-printable and non-ASCII chars: PDF Type1 fonts use PDFDocEncoding.
    const streamBodies = pages.map(pageText => {
        const lines = pageText.split('\n'); // preserve blank lines for spacing
        let tf = 'BT\n/F1 10 Tf\n14 TL\n72 720 Td\n';
        lines.forEach(line => {
            // Keep ASCII printable range only (0x20–0x7E); replace others with space
            const safe = line
                .replace(/[^\x20-\x7E]/g, ' ')
                .replace(/\\/g, '\\\\')
                .replace(/\(/g, '\\(')
                .replace(/\)/g, '\\)');
            tf += `(${safe}) Tj T*\n`;
        });
        tf += 'ET';
        return tf;
    });

    // Object slot layout:
    //   1 = Catalog
    //   2 = Pages
    //   3..N+2 = Page objects (one per page)
    //   N+3..2N+2 = Content streams (one per page)
    //   2N+3 = Font resource
    //   [optional] 2N+4 = Dummy image XObject (if opts.hasImage)

    const numPages = pages.length;
    const fontObjId = 3 + numPages * 2;
    const imageObjId = fontObjId + 1;

    const body = [];
    const offsets = []; // byte offsets of each object

    function addObj(id, content) {
        offsets[id] = body.join('').length + `%PDF-1.4\n`.length;
        body.push(`${id} 0 obj\n${content}\nendobj\n`);
    }

    // Font resource dict
    const fontRef = `<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>`;

    // Resources dict (shared across all pages)
    let resourcesDict = `<</Font <</F1 ${fontObjId} 0 R>>`;
    if (opts.hasImage) {
        resourcesDict += ` /XObject <</Img1 ${imageObjId} 0 R>>`;
    }
    resourcesDict += `>>`;

    // Build page objects and content streams
    const pageIds = [];
    for (let i = 0; i < numPages; i++) {
        const pageId    = 3 + i;
        const contentId = 3 + numPages + i;
        pageIds.push(pageId);

        addObj(pageId, `<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources ${resourcesDict} /Contents ${contentId} 0 R>>`);
        const streamBytes = Buffer.from(streamBodies[i], 'latin1');
        addObj(contentId, `<</Length ${streamBytes.length}>>\nstream\n${streamBodies[i]}\nendstream`);
    }

    // Catalog + Pages
    const catalogContent = `<</Type /Catalog /Pages 2 0 R>>`;
    const pagesContent   = `<</Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${numPages}>>`;

    // Font
    addObj(fontObjId, fontRef);

    // Optional image XObject
    if (opts.hasImage) {
        // 1x1 white pixel JPEG-like stream placeholder
        const imgStream = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x01]);
        addObj(imageObjId,
            `<</Type /XObject /Subtype /Image /Width 1 /Height 1 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgStream.length}>>\nstream\n${imgStream.toString('binary')}\nendstream`
        );
    }

    // Assemble in correct order: header, obj1(catalog), obj2(pages), then body
    const header = `%PDF-1.4\n`;

    // Rebuild with correct offsets by assembling in id order
    const orderedParts = [];
    let cursor = header.length;
    const xrefOffsets = {};

    // obj 1 catalog
    const obj1 = `1 0 obj\n${catalogContent}\nendobj\n`;
    xrefOffsets[1] = cursor; cursor += obj1.length;
    orderedParts.push(obj1);

    // obj 2 pages
    const obj2 = `2 0 obj\n${pagesContent}\nendobj\n`;
    xrefOffsets[2] = cursor; cursor += obj2.length;
    orderedParts.push(obj2);

    // remaining objects from addObj calls (already ordered 3..fontObjId[+imageObjId])
    body.forEach((chunk, i) => {
        const id = i + 3;
        xrefOffsets[id] = cursor;
        cursor += chunk.length;
        orderedParts.push(chunk);
    });

    // xref
    const totalObjs = opts.hasImage ? imageObjId + 1 : fontObjId + 1;
    const xrefPos = cursor;
    let xref = `xref\n0 ${totalObjs}\n0000000000 65535 f \n`;
    for (let id = 1; id < totalObjs; id++) {
        xref += `${String(xrefOffsets[id] || 0).padStart(10, '0')} 00000 n \n`;
    }
    const trailer = `trailer\n<</Size ${totalObjs} /Root 1 0 R>>\nstartxref\n${xrefPos}\n%%EOF\n`;

    return Buffer.from(header + orderedParts.join('') + xref + trailer, 'latin1');
}

// ── Resume text fixtures ──────────────────────────────────────────────────────

const FIXTURES = {
    ats: {
        label: 'Simple ATS Resume',
        pages: [
`Sarah Chen
Senior Software Engineer
san.chen@email.com | linkedin.com/in/sarahchen | github.com/sarahchen
San Francisco, CA | (415) 555-0192

SUMMARY
Results-driven Senior Software Engineer with 7 years of experience building
scalable distributed systems at high-growth startups. Expertise in Go, Python,
Kubernetes, and PostgreSQL. Led teams of 5+ engineers. 

EXPERIENCE
Staff Engineer - DataStream Inc (2021-Present)
Architected real-time data pipeline handling 2M events/sec using Apache Kafka.
Reduced p99 latency from 800ms to 45ms via query optimization and caching.
Mentored 4 junior engineers; drove adoption of gRPC across 12 microservices.

Senior Engineer - CloudOps Ltd (2018-2021)
Built multi-tenant SaaS platform serving 500+ enterprise clients.
Designed CI/CD pipeline cutting deployment time from 3 hours to 8 minutes.
Implemented OAuth2 and RBAC across 20 internal services.

SKILLS
Languages: Go, Python, TypeScript, SQL
Infrastructure: Kubernetes, Terraform, AWS (EKS, RDS, S3)
Databases: PostgreSQL, Redis, Elasticsearch

EDUCATION
B.S. Computer Science, Stanford University, 2017`
        ],
        keywords: ['Sarah Chen', 'Senior Software Engineer', 'Go', 'Kafka', 'Kubernetes', 'PostgreSQL', 'Stanford'],
        opts: {}
    },

    twopage: {
        label: 'Two-Page Resume',
        pages: [
`Michael Okonkwo
Principal Machine Learning Engineer
m.okonkwo@protonmail.com | Seattle, WA | (206) 555-0847

PROFESSIONAL SUMMARY
Principal ML Engineer with 10+ years delivering production ML systems.
Expert in PyTorch, TensorFlow, large-scale feature engineering, and MLOps.
Published 6 peer-reviewed papers in NeurIPS and ICML.

EXPERIENCE
Principal ML Engineer - Apex AI (2022-Present)
Led training of 70B parameter LLM on 4096 A100 GPUs.
Reduced model serving latency by 60% via quantization and ONNX export.
Built real-time recommendation engine driving $12M in annual incremental revenue.

Senior ML Engineer - TechVision Corp (2019-2022)
Designed fraud detection model with 99.2% precision on 1B daily transactions.
Built AutoML pipeline reducing model iteration time from 2 weeks to 3 days.
Managed roadmap for ML Platform team of 8 engineers.

Machine Learning Engineer - DataLab Solutions (2016-2019)
Delivered NLP pipeline for medical record classification (F1: 0.94).
Implemented distributed training using Horovod + MPI on 256-node cluster.`,
`Michael Okonkwo - Page 2

SKILLS
Frameworks: PyTorch, TensorFlow, JAX, Hugging Face Transformers
MLOps: MLflow, Kubeflow, Weights & Biases, Airflow
Infrastructure: AWS SageMaker, GCP Vertex AI, CUDA, Ray
Languages: Python, C++, Scala, SQL

PUBLICATIONS
Okonkwo M. et al. "Efficient Sparse Attention for Long-Context LLMs" NeurIPS 2023.
Okonkwo M. et al. "Online Feature Stores at Scale" ICML 2022.
Okonkwo M. et al. "Adaptive Learning Rate Schedules for Transformers" NeurIPS 2021.

EDUCATION
Ph.D. Machine Learning, Carnegie Mellon University, 2016
B.S. Mathematics & Computer Science, MIT, 2011

PATENTS
US11234567: Real-time fraud signal aggregation (2022)
US10987654: Distributed feature computation framework (2020)

CERTIFICATIONS
AWS Certified Machine Learning Specialty
Google Cloud Professional ML Engineer`
        ],
        keywords: ['Michael Okonkwo', 'Principal', 'PyTorch', 'LLM', 'NeurIPS', 'CMU', 'fraud detection'],
        opts: {}
    },

    icons: {
        label: 'Resume with Icons (Unicode glyphs)',
        pages: [
`Priya Nair
UX Engineer | Frontend Developer
\u2709 priya.nair@design.io  \u260e (512) 555-0234  \ud83d\udd17 priya-nair.dev  \ud83d\udccd Austin, TX

\u2b50 SUMMARY
Creative UX Engineer bridging design and engineering. 6 years building
pixel-perfect, accessible React applications used by 2M+ users.
Figma-to-production expert. Design system architect.

\ud83d\udcbc EXPERIENCE
\u25b6 Senior UX Engineer - DesignFirst Co (2020-Present)
\u2022 Built component library (120+ components) used by 15 product teams
\u2022 Reduced design-to-dev handoff time by 70% via Storybook + Figma tokens
\u2022 Improved Lighthouse accessibility score from 62 to 98 across all products
\u2022 Led migration from CSS Modules to Tailwind CSS (40% CSS bundle reduction)

\u25b6 Frontend Developer - WebCraft Agency (2018-2020)
\u2022 Delivered 30+ client projects in React, Vue, and vanilla JavaScript
\u2022 Introduced automated visual regression testing (Percy) saving 8hrs/sprint

\u2699\ufe0f SKILLS
\u25cf Frontend: React, TypeScript, Next.js, Vue, Tailwind CSS, CSS-in-JS
\u25cf Design: Figma, Framer, Storybook, Design Systems, WCAG 2.1 AA
\u25cf Testing: Jest, Cypress, Percy, Testing Library

\ud83c\udf93 EDUCATION
B.F.A. Interaction Design, RISD, 2018`
        ],
        keywords: ['Priya Nair', 'UX Engineer', 'React', 'Figma', 'TypeScript', 'Storybook', 'accessibility'],
        opts: {}
    },

    tables: {
        label: 'Resume with Tables (tabular skills layout)',
        pages: [
`David Park
DevOps / Platform Engineer
dpark@infra.dev | New York, NY | (718) 555-0311

PROFESSIONAL SUMMARY
Platform engineer with 8 years automating infrastructure at scale.
Deep expertise across AWS, GCP, and on-premise Kubernetes deployments.
Specializes in zero-downtime migrations and cost optimization.

EXPERIENCE
Principal Platform Engineer - FinTech Corp (2021-Present)
Reduced AWS monthly spend by $480K/yr via RI purchases and rightsizing.
Migrated 200+ microservices to EKS with zero downtime over 6 months.
Built internal developer platform (Backstage) adopted by 300+ engineers.
Achieved SOC 2 Type II compliance across all production systems.

Senior DevOps Engineer - CloudBase Inc (2017-2021)
Built GitOps pipeline (ArgoCD + Flux) for 50+ production services.
Implemented Prometheus/Grafana observability stack with 150+ custom dashboards.
Led disaster recovery planning; achieved RTO < 15 min, RPO < 1 min.

SKILLS MATRIX
Category          | Technologies                      | Proficiency
Cloud             | AWS, GCP, Azure                   | Expert
Containers        | Kubernetes, Docker, Helm, Istio   | Expert
IaC               | Terraform, Pulumi, CDK            | Expert
CI/CD             | GitHub Actions, ArgoCD, Jenkins   | Advanced
Observability     | Prometheus, Grafana, Datadog, OTel| Advanced
Languages         | Python, Go, Bash, HCL             | Proficient

EDUCATION
B.S. Information Systems, NYU Tandon School of Engineering, 2017

CERTIFICATIONS
AWS Solutions Architect Professional | CKA (Kubernetes) | HashiCorp Terraform Associate`
        ],
        keywords: ['David Park', 'DevOps', 'Kubernetes', 'Terraform', 'AWS', 'ArgoCD', 'SOC 2'],
        opts: {}
    },

    images: {
        label: 'Resume with Images (embedded image XObject)',
        pages: [
`Emma Rodriguez
Creative Director | Brand Strategist
emma@creative-studio.com | Los Angeles, CA | (323) 555-0178

[Profile Photo: Professional headshot embedded in header]
[Portfolio Gallery: Brand samples shown in sidebar]

EXECUTIVE SUMMARY
Award-winning Creative Director with 12 years shaping global brand identities
for Fortune 500 clients. Expertise in visual storytelling, campaign strategy,
and cross-functional team leadership.

SELECTED EXPERIENCE
Creative Director - Studio Novo (2019-Present)
Led global rebrand of TechCorp ($2B valuation) — increased brand awareness 34%.
Directed team of 18 designers, copywriters, and motion artists.
Won 3 Cannes Lions (Gold, Silver, Bronze) for integrated campaign work.
Managed $4M annual creative budget across 6 concurrent client engagements.

Associate Creative Director - BrandWave Agency (2015-2019)
Produced award-winning campaign for Nike APAC market (200M+ impressions).
Oversaw visual identity for 12 product launches across FMCG and tech sectors.
Established agency design system reducing production time by 35%.

CORE SKILLS
Art Direction | Brand Identity | Campaign Strategy
Typography | Color Theory | Motion Design
Adobe Creative Suite | Figma | Sketch

EDUCATION
M.F.A. Graphic Design, CalArts, 2013
B.A. Fine Arts, UCLA, 2011

AWARDS
3x Cannes Lions | 2x Clio Awards | D&AD Yellow Pencil (2022)`
        ],
        keywords: ['Emma Rodriguez', 'Creative Director', 'Cannes Lions', 'CalArts', 'brand', 'campaign'],
        opts: { hasImage: true }
    }
};

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function httpPost(options, body) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, res => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                const raw = Buffer.concat(chunks).toString();
                try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
                catch { resolve({ status: res.statusCode, body: raw }); }
            });
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

function buildMultipartBody(pdfBuffer, filename) {
    const boundary = `----FormBoundary${crypto.randomBytes(8).toString('hex')}`;
    const CRLF = '\r\n';
    const header = Buffer.from(
        `--${boundary}${CRLF}` +
        `Content-Disposition: form-data; name="file"; filename="${filename}"${CRLF}` +
        `Content-Type: application/pdf${CRLF}${CRLF}`,
        'utf8'
    );
    const footer = Buffer.from(`${CRLF}--${boundary}--${CRLF}`, 'utf8');
    return {
        boundary,
        buffer: Buffer.concat([header, pdfBuffer, footer])
    };
}

async function uploadResume(port, token, pdfBuffer, filename) {
    const { boundary, buffer } = buildMultipartBody(pdfBuffer, filename);
    return httpPost(
        {
            hostname: '127.0.0.1', port,
            path: '/api/resume/upload', method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': buffer.length,
                'Authorization': `Bearer ${token}`
            }
        },
        buffer
    );
}

async function gqlPost(port, query, variables = {}, token = null) {
    const body = Buffer.from(JSON.stringify({ query, variables }));
    const headers = {
        'Content-Type': 'application/json',
        'Content-Length': body.length
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return httpPost({ hostname: '127.0.0.1', port, path: '/graphql', method: 'POST', headers }, body);
}

function getFreePort() {
    return new Promise((resolve, reject) => {
        const s = net.createServer();
        s.listen(0, () => { const { port } = s.address(); s.close(() => resolve(port)); });
        s.on('error', reject);
    });
}

// ── Server bootstrap ──────────────────────────────────────────────────────────

async function bootServer() {
    const port = await getFreePort();
    Object.keys(require.cache).forEach(k => {
        if (/graphql|apolloServer|server\.js/.test(k)) delete require.cache[k];
    });

    process.env.NODE_ENV     = 'development';
    process.env.DATABASE_URL = `file:${path.resolve(__dirname, '../prisma/dev.db')}`;
    process.env.PORT         = String(port);
    process.env.JWT_SECRET   = 'test-secret-resume';
    process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

    const express  = require('express');
    const cors     = require('cors');
    const multer   = require('multer');
    const pdfParse = require('pdf-parse');
    const PDFParseClass = pdfParse.PDFParse || null;
    const pdfParseFn    = typeof pdfParse === 'function' ? pdfParse : null;
    const jwt      = require('jsonwebtoken');
    const createApolloServer = require('../graphql/apolloServer');

    const app = express();
    app.use(cors());
    app.use(express.json());

    const upload = multer({ storage: multer.memoryStorage() });

    app.post('/api/resume/upload', upload.single('file'), async (req, res) => {
        try {
            const auth = req.headers.authorization || '';
            if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Auth required' });
            try { jwt.verify(auth.substring(7), process.env.JWT_SECRET); }
            catch { return res.status(401).json({ error: 'Invalid token' }); }
            if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
            if (req.file.mimetype !== 'application/pdf') return res.status(400).json({ error: 'Only PDF files are accepted' });

            let resumeText = '';
            if (PDFParseClass) {
                const parser = new PDFParseClass({ data: req.file.buffer });
                const result = await parser.getText();
                resumeText = result.text || '';
            } else if (pdfParseFn) {
                const data = await pdfParseFn(req.file.buffer);
                resumeText = data.text || '';
            } else {
                throw new Error('pdf-parse not available');
            }

            res.json({
                message: 'Resume uploaded and parsed successfully',
                summary: `Extracted text from ${req.file.originalname}`,
                parsedContent: resumeText.substring(0, 3000),
                charCount: resumeText.length,
                pageCount: (resumeText.match(/-- \d+ of \d+ --/g) || []).length
            });
        } catch (err) {
            res.status(500).json({ error: 'Failed to process resume', detail: err.message });
        }
    });

    await createApolloServer(app);

    const srv = http.createServer(app);
    await new Promise(res => srv.listen(port, '127.0.0.1', res));
    return { port, close: () => new Promise(res => srv.close(res)) };
}

// ── Auth setup ────────────────────────────────────────────────────────────────

async function getAuthToken(port) {
    // Mint a token directly — avoids DB dependency
    const jwt = require('jsonwebtoken');
    return jwt.sign({ id: 'test-user-resume' }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

// ── AI personalization check ──────────────────────────────────────────────────

async function checkAIPersonalization(port, token, resumeText, fixture) {
    if (!process.env.GEMINI_API_KEY) {
        record(`AI personalization — ${fixture.label}`, true,
            'SKIPPED (no GEMINI_API_KEY)', true);
        return;
    }

    // Call generateQuestion directly to avoid DB
    const aiService = require('../services/aiService');
    try {
        const result = await aiService.generateQuestion(
            'Technical',
            'Software Engineer',
            'Mid-level',
            resumeText.substring(0, 2000)
        );
        const question = result.nextQuestion || '';
        const isFallback = question.includes('Tell me about yourself');
        const hasKeyword = fixture.keywords.some(kw =>
            question.toLowerCase().includes(kw.toLowerCase())
        );
        record(
            `AI generates personalized question — ${fixture.label}`,
            !isFallback,
            isFallback ? 'Fallback response returned (AI error)' : question.substring(0, 80)
        );
        record(
            `AI question references resume content — ${fixture.label}`,
            hasKeyword,
            hasKeyword
                ? `Contains keyword: ${fixture.keywords.find(k => question.toLowerCase().includes(k.toLowerCase()))}`
                : `None of [${fixture.keywords.slice(0, 3).join(', ')}] found in: "${question.substring(0, 60)}"`
        );
    } catch (err) {
        record(`AI personalization — ${fixture.label}`, false, err.message);
    }
}

// ── Main runner ───────────────────────────────────────────────────────────────

async function runTests() {
    console.log('\n' + C.bold('═'.repeat(65)));
    console.log(C.bold('  Resume Upload Testing — Mindly Server'));
    console.log(C.bold('═'.repeat(65)));

    console.log(`\n${INFO} Booting server…`);
    const srv = await bootServer();
    const { port } = srv;
    console.log(`  Server on port ${port}`);

    const token = await getAuthToken(port);
    console.log(`  Auth token minted\n`);

    const aiAvailable = !!process.env.GEMINI_API_KEY;
    if (!aiAvailable) {
        console.log(`${WARN}  GEMINI_API_KEY not set — AI personalization tests will be skipped\n`);
    }

    for (const [key, fixture] of Object.entries(FIXTURES)) {
        console.log(`\n  ${C.bold(`── ${fixture.label} ──`)}\n`);

        // Build the PDF
        let pdfBuffer;
        try {
            pdfBuffer = buildPDF(fixture.pages, fixture.opts);
            record(`PDF fixture built — ${fixture.label}`, true,
                `${pdfBuffer.length} bytes, ${fixture.pages.length} page(s)`);
        } catch (err) {
            record(`PDF fixture built — ${fixture.label}`, false, err.message);
            continue;
        }

        // Upload
        let uploadRes;
        try {
            // Existing upload
        uploadRes = await uploadResume(port, token, pdfBuffer, `${key}.pdf`);
        // Additional checks for new limits
        if (uploadRes.status === 200) {
          // Verify warning for scanned PDFs
          if (uploadRes.body?.warning) {
            record(`Scanned PDF warning present — ${fixture.label}`, true, uploadRes.body.warning);
          }
          // Verify charCount and parsedContent limits
          if (uploadRes.body?.charCount && uploadRes.body?.parsedContent) {
            const charCount = uploadRes.body.charCount;
            const parsedLen = uploadRes.body.parsedContent.length;
            record('CharCount recorded', typeof charCount === 'number', `charCount=${charCount}`);
            record('ParsedContent truncated to 5000', parsedLen <= 5000, `len=${parsedLen}`);
          }
        }
        } catch (err) {
            record(`Upload HTTP call — ${fixture.label}`, false, err.message);
            continue;
        }

        record(
            `Upload succeeds (HTTP 200) — ${fixture.label}`,
            uploadRes.status === 200,
            `status=${uploadRes.status}` + (uploadRes.status !== 200
                ? ` — ${uploadRes.body?.error || uploadRes.body?.detail || JSON.stringify(uploadRes.body).substring(0,80)}`
                : '')
        );

        if (uploadRes.status !== 200) continue;

        const parsed    = uploadRes.body?.parsedContent || '';
        const charCount = uploadRes.body?.charCount || parsed.length;

        record(
            `Text extracted (non-empty) — ${fixture.label}`,
            charCount > 0,
            `${charCount} chars extracted`
        );

        // Keyword coverage
        const foundKws  = fixture.keywords.filter(kw =>
            parsed.toLowerCase().includes(kw.toLowerCase())
        );
        const coverage  = Math.round((foundKws.length / fixture.keywords.length) * 100);
        const qualityOk = coverage >= 70;

        record(
            `Key fields extracted — ${fixture.label}`,
            qualityOk,
            `${foundKws.length}/${fixture.keywords.length} keywords found (${coverage}%) — [${foundKws.join(', ')}]`
        );

        const missingKws = fixture.keywords.filter(kw =>
            !parsed.toLowerCase().includes(kw.toLowerCase())
        );
        if (missingKws.length > 0) {
            console.log(`    ${WARN} Missing keywords: [${missingKws.join(', ')}]`);
        }

        // Multi-page check
        if (fixture.pages.length > 1) {
            const crossPageKw = fixture.keywords[fixture.keywords.length - 1]; // last kw usually on pg2
            const hasCrossPage = parsed.toLowerCase().includes(crossPageKw.toLowerCase());
            record(
                `Multi-page content extracted — ${fixture.label}`,
                hasCrossPage,
                hasCrossPage ? `Page 2 keyword "${crossPageKw}" found` : `"${crossPageKw}" missing from extracted text`
            );
        }

        // Image-format: extraction shouldn't crash even with XObject
        if (fixture.opts.hasImage) {
            record(
                `Image-format resume: text still extracted — ${fixture.label}`,
                charCount > 100,
                `${charCount} chars despite embedded image XObject`
            );
        }

        // AI personalization
        await checkAIPersonalization(port, token, parsed, fixture);
    }

    // ── Summary ───────────────────────────────────────────────────────────────

    console.log('\n' + C.bold('═'.repeat(65)));
    const passed  = results.filter(r => r.passed && !r.warn).length;
    const failed  = results.filter(r => !r.passed).length;
    const skipped = results.filter(r => r.warn).length;
    console.log(C.bold(`  Results: ${C.pass(passed + ' passed')}, ${failed > 0 ? C.fail(failed + ' failed') : '0 failed'}, ${C.warn(skipped + ' skipped/warned')}`));
    console.log(C.bold('═'.repeat(65)) + '\n');

    await srv.close();

    if (failed > 0) process.exit(1);
}

runTests().catch(err => {
    console.error('\n[FATAL]', err);
    process.exit(1);
});
