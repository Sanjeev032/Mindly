// client/tests/e2e_script.cjs
// Plain Playwright script (no test runner) for full Mindly user journey.
// Runs headless; grants microphone permission for speech‑recognition steps.

const { chromium } = require('playwright');
const path = require('path');

// Configuration – adjust via env if needed
const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const RESUME_PATH = process.env.RESUME_PATH || path.resolve(__dirname, '../../../../../OneDrive/Desktop/Resume/Sanjeev_Kumar_Resume.pdf');

function randomEmail() {
  return `testuser_${Date.now()}@example.com`;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ permissions: ['microphone'] });
  const page = await context.newPage();

  // Helper to capture console messages
  const consoleMsgs = [];
  page.on('console', msg => consoleMsgs.push({ type: msg.type(), text: msg.text() }));

  // 1. Register
  await page.goto(`${APP_URL}/signup`);
  await page.fill('input[name="name"]', 'Test User');
  const email = randomEmail();
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', 'Password123!');
  await page.selectOption('select[name="targetRole"]', 'Developer');
  await page.selectOption('select[name="experienceLevel"]', 'Mid');
  await page.click('button[type="submit"]');
  await page.waitForNavigation();

  // 2. Login if redirected to login page
  if (page.url().includes('/login')) {
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
  }

  // Verify JWT token in localStorage
  const token = await page.evaluate(() => localStorage.getItem('token'));
  if (!token) {
    console.error('JWT token missing after login');
    process.exit(1);
  }

  // 3. Upload resume
  await page.goto(`${APP_URL}/resume`);
  const [uploadResponse] = await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/uploadResume') && resp.status() === 200),
    page.setInputFiles('input[type="file"]', RESUME_PATH),
  ]);
  const uploadJson = await uploadResponse.json();
  if (!uploadJson.parsedContent || !uploadJson.charCount) {
    console.error('Resume upload response missing fields');
    process.exit(1);
  }
  console.log('Resume uploaded, charCount:', uploadJson.charCount);

  // 4. Start interview
  await page.goto(`${APP_URL}/interview`);
  await page.click('button[data-testid="start-interview"]');

  // 5. Go through 5 rounds
  for (let i = 1; i <= 5; i++) {
    const question = await page.locator('[data-testid="question-text"]').textContent({ timeout: 15000 });
    console.log(`Round ${i} question: ${question}`);
    // Simulate answering via textarea (bypassing speech)
    await page.fill('textarea[data-testid="answer-input"]', `Test answer for round ${i} exceeding ten characters.`);
    await page.click('button[data-testid="send-answer"]');
    // Wait for feedback
    await page.locator('[data-testid="feedback-text"]').waitFor({ timeout: 20000 });
  }

  // Verify interview completion UI
  await page.locator('[data-testid="interview-complete"]').waitFor({ timeout: 5000 });

  // Logout
  await page.click('button[data-testid="logout-button"]');
  await page.waitForNavigation();

  console.log('E2E script completed successfully');
  console.log('Collected console messages:', consoleMsgs);

  await browser.close();
})();
