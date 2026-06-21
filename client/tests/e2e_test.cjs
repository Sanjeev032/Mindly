// client/tests/e2e_test.cjs
// Playwright end‑to‑end test for Mindly application.
// This script runs after both backend (Express/Apollo) and frontend (Vite) dev servers are up.

const { test, expect } = require('@playwright/test');
const path = require('path');

// Adjust these constants as needed
const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const RESUME_PATH = process.env.RESUME_PATH || path.resolve(__dirname, '../../../../../OneDrive/Desktop/Resume/Sanjeev_Kumar_Resume.pdf');

// Helper to generate a random email for registration
function randomEmail() {
  const ts = Date.now();
  return `testuser_${ts}@example.com`;
}

test.describe('Mindly End‑to‑End User Journey', () => {
  test('Full interview flow with resume upload', async ({ page, context }) => {
    // Grant microphone permission for speech‑recognition tests
    await context.grantPermissions(['microphone']);

    // Capture console logs
    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));

    // ---- 1. Register a new user ----
    await page.goto(`${APP_URL}/signup`);
    await expect(page).toHaveURL(/\/signup/);

    const name = 'Test User';
    const email = randomEmail();
    const password = 'Password123!';
    const targetRole = 'Developer';
    const experienceLevel = 'Mid';

    await page.fill('input[name="name"]', name);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.selectOption('select[name="targetRole"]', targetRole);
    await page.selectOption('select[name="experienceLevel"]', experienceLevel);
    await page.click('button[type="submit"]');

    // Expect to be redirected to dashboard or login page
    await page.waitForNavigation();
    await expect(page).toHaveURL(/\/(dashboard|login)/);

    // ---- 2. Login with the newly created account (if not auto‑logged in) ----
    if (page.url().includes('/login')) {
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForNavigation();
      await expect(page).toHaveURL(/\/dashboard/);
    }

    // Verify JWT token is stored in localStorage (common implementation)
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();

    // ---- 3. Upload a resume ----
    await page.goto(`${APP_URL}/resume`);
    const [uploadResponse] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/uploadResume') && resp.status() === 200),
      page.setInputFiles('input[type="file"]', RESUME_PATH),
    ]);
    const uploadJson = await uploadResponse.json();
    // Verify response fields
    expect(uploadJson).toHaveProperty('parsedContent');
    expect(uploadJson).toHaveProperty('charCount');
    expect(uploadJson.charCount).toBeGreaterThanOrEqual(5000);
    expect(uploadJson).toHaveProperty('warning');
    // If warning is present, it should be a string (e.g., scanned PDF warning)
    if (uploadJson.warning) {
      console.log('Upload warning:', uploadJson.warning);
    }

    // ---- 4. Start a technical interview ----
    await page.goto(`${APP_URL}/interview`);
    await page.click('button[data-testid="start-interview"]');

    // ---- 5. Run through interview rounds (default 5) ----
    for (let round = 1; round <= 5; round++) {
      // Wait for Gemini generated question to appear
      const questionLocator = page.locator('[data-testid="question-text"]');
      await expect(questionLocator).toBeVisible({ timeout: 15000 });
      const question = await questionLocator.textContent();
      console.log(`Round ${round} question:`, question);

      // Simulate speech synthesis – we just verify an audio element exists
      const audioLocator = page.locator('audio[data-testid="question-audio"]');
      await expect(audioLocator).toBeVisible();

      // Provide answer – in the real UI this would be via SpeechRecognition,
      // but we can fill the textarea directly for automation.
      const answer = `This is a test answer for round ${round} that exceeds ten characters.`;
      await page.fill('textarea[data-testid="answer-input"]', answer);
      await page.click('button[data-testid="send-answer"]');

      // Wait for Gemini response / feedback
      const feedbackLocator = page.locator('[data-testid="feedback-text"]');
      await expect(feedbackLocator).toBeVisible({ timeout: 20000 });
      const feedback = await feedbackLocator.textContent();
      console.log(`Round ${round} feedback:`, feedback);
    }

    // ---- 6. Verify interview completed UI state ----
    await expect(page.locator('[data-testid="interview-complete"]')).toBeVisible();

    // ---- 7. Logout ----
    await page.click('button[data-testid="logout-button"]');
    await expect(page).toHaveURL(/\/login/);

    // ---- 8. Output console logs for debugging ----
    console.log('Collected browser console messages:', consoleMessages);
  });
});
