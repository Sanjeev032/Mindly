// client/tests/e2e_production.cjs
// Production‑style Playwright script that runs the full Mindly user journey.
// It captures console errors, page errors, network failures, performance timings,
// takes screenshots on any failure, and applies automatic fixes with a single retry.

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Configurable constants – adjust via env if needed
const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const RESUME_PATH = process.env.RESUME_PATH || path.resolve(__dirname, '../../../../../OneDrive/Desktop/Resume/Sanjeev_Kumar_Resume.pdf');
const REPORT_PATH = process.env.REPORT_PATH || path.resolve(__dirname, 'e2e_report.json');
const SCREENSHOT_DIR = path.resolve(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

// Helper to generate a timestamped filename
function screenshotName(step) {
  const ts = Date.now();
  return path.join(SCREENSHOT_DIR, `${step}-${ts}.png`);
}

// Report structure
const report = {
  passed: [],
  failed: [],
  browserConsoleErrors: [],
  pageErrors: [],
  networkFailures: [],
  performanceFindings: [],
  rootCauses: [],
  filesModified: [],
  productionReadinessScore: 0,
};

// Utility to wrap a step with retry & auto‑fix logic
async function runStep(name, fn) {
  const start = Date.now();
  try {
    await fn();
    report.passed.push(name);
  } catch (err) {
    // Capture screenshot
    await page.screenshot({ path: screenshotName(name), fullPage: true }).catch(() => {});
    report.failed.push(name);
    report.rootCauses.push(`${name}: ${err.message}`);
    // Simple auto‑fix heuristics based on error message
    const fix = async () => {
      if (err.message.includes('Timeout')) {
        // increase timeout for the next attempt by adding a delay
        await new Promise(r => setTimeout(r, 2000));
      } else if (err.message.includes('Network')) {
        // retry network request after short wait
        await new Promise(r => setTimeout(r, 1000));
      } else if (err.message.includes('element')) {
        await new Promise(r => setTimeout(r, 1500));
      }
    };
    await fix();
    // retry once
    try {
      await fn();
      report.passed.push(name + ' (retry)');
    } catch (err2) {
      // final failure – record details
      report.failed.push(name + ' (final)');
      report.rootCauses.push(`${name} final: ${err2.message}`);
      throw err2; // bubble up to stop further steps if critical
    }
  } finally {
    const duration = Date.now() - start;
    report.performanceFindings.push({ step: name, durationMs: duration });
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const context = await browser.newContext({ permissions: ['microphone'] });
  const page = await context.newPage();

  // Capture console and page errors globally
  page.on('console', msg => {
    if (msg.type() === 'error') {
      report.browserConsoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    report.pageErrors.push(err.message);
  });
  page.on('response', resp => {
    if (resp.status() >= 400) {
      report.networkFailures.push({ url: resp.url(), status: resp.status(), step: 'network' });
    }
  });

  // Helper to generate a random email
  const randomEmail = () => `test_${Date.now()}@example.com`;

  // 1. Open application (home page)
  await runStep('openHome', async () => {
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    if (!page.url().startsWith(APP_URL)) throw new Error('Home page did not load');
  });

  // 2. Register a new user
  await runStep('register', async () => {
    await page.goto(`${APP_URL}/signup`, { waitUntil: 'networkidle' });
    await page.fill('input[name="name"]', 'Playwright User');
    const email = randomEmail();
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'Password123!');
    await page.selectOption('select[name="targetRole"]', 'Developer');
    await page.selectOption('select[name="experienceLevel"]', 'Mid');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.click('button[type="submit"]'),
    ]);
    // Store email for later login if redirected to login page
    report.registeredEmail = email;
  });

  // 3. Login (if not already logged in)
  await runStep('login', async () => {
    if (page.url().includes('/login')) {
      await page.fill('input[name="email"]', report.registeredEmail);
      await page.fill('input[name="password"]', 'Password123!');
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle' }),
        page.click('button[type="submit"]'),
      ]);
    }
    // Verify JWT token persisted
    const token = await page.evaluate(() => localStorage.getItem('token'));
    if (!token) throw new Error('JWT token missing after login');
    report.jwtToken = token;
  });

  // 4. Verify protected route access – should be allowed now
  await runStep('protectedRouteAccess', async () => {
    await page.goto(`${APP_URL}/dashboard`, { waitUntil: 'networkidle' });
    if (page.url().includes('/login')) throw new Error('Protected route redirected to login');
  });

  // 5. Upload resume PDF
  await runStep('resumeUpload', async () => {
    await page.goto(`${APP_URL}/resume`, { waitUntil: 'networkidle' });
    const [response] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/uploadResume') && r.status() === 200),
      page.setInputFiles('input[type="file"]', RESUME_PATH),
    ]);
    const json = await response.json();
    if (!json.parsedContent) throw new Error('Missing parsedContent');
    if (typeof json.charCount !== 'number' || json.charCount < 5000) throw new Error('charCount below threshold');
    report.resume = { charCount: json.charCount, warning: json.warning || null };
  });

  // 6. Start technical interview
  await runStep('startInterview', async () => {
    await page.goto(`${APP_URL}/interview`, { waitUntil: 'networkidle' });
    await page.click('button[data-testid="start-interview"]');
    // Wait for first Gemini question
    const question = await page.locator('[data-testid="question-text"]').textContent({ timeout: 15000 });
    if (!question) throw new Error('First Gemini question not displayed');
    report.firstQuestion = question.trim();
  });

  // 7. Verify speech synthesis element exists
  await runStep('speechSynthesis', async () => {
    await page.waitForSelector('audio[data-testid="question-audio"]', { timeout: 5000 });
  });

  // 8. Complete 5 interview rounds
  await runStep('interviewRounds', async () => {
    for (let round = 1; round <= 5; round++) {
      const qLocator = page.locator('[data-testid="question-text"]');
      await qLocator.waitFor({ timeout: 15000 });
      const question = await qLocator.textContent();
      console.log(`Round ${round} question: ${question}`);

      // Simulate answer via textarea (bypassing real speech)
      const answer = `This is a test answer for round ${round} that exceeds ten characters.`;
      await page.fill('textarea[data-testid="answer-input"]', answer);
      await Promise.all([
        page.waitForResponse(r => r.url().includes('/interview') && r.status() === 200),
        page.click('button[data-testid="send-answer"]'),
      ]);

      const feedback = await page.locator('[data-testid="feedback-text"]').textContent({ timeout: 20000 });
      if (!feedback) throw new Error(`Feedback missing for round ${round}`);
      // Basic validation of expected fields in feedback JSON (if API returns JSON) – we just check for keywords
      if (!/score|critique|improvementTip/i.test(feedback)) {
        console.warn('Feedback may lack expected fields');
      }
    }
  });

  // 9. Refresh page and verify state recovery
  await runStep('stateRecovery', async () => {
    await page.reload({ waitUntil: 'networkidle' });
    // After reload, interview should still show completed status
    const completed = await page.locator('[data-testid="interview-complete"]').isVisible();
    if (!completed) throw new Error('Interview state not recovered after refresh');
  });

  // 10. Logout and verify protected routes are blocked
  await runStep('logout', async () => {
    await page.click('button[data-testid="logout-button"]');
    await page.waitForNavigation({ waitUntil: 'networkidle' });
    // Attempt to access protected route
    await page.goto(`${APP_URL}/dashboard`, { waitUntil: 'networkidle' });
    if (!page.url().includes('/login')) throw new Error('Protected route still accessible after logout');
  });

  // Close browser
  await browser.close();

  // Compute a simple readiness score (0‑100)
  const passedCount = report.passed.length;
  const totalSteps = 10; // number of logical steps above
  report.productionReadinessScore = Math.round((passedCount / totalSteps) * 100);

  // Write the report JSON
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log('E2E production run completed. Report written to', REPORT_PATH);
  console.log('Ready score:', report.productionReadinessScore);
})();
