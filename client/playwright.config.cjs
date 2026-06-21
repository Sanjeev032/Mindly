// client/playwright.config.cjs
// Playwright configuration for production‑style end‑to‑end validation.

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  timeout: 60000, // per test timeout
  use: {
    browserName: 'chromium',
    headless: true,
    // Fake media streams so SpeechRecognition/Synthesis work without real hardware
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
      ],
    },
    permissions: ['microphone'],
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Capture console messages
    recordVideo: { dir: 'client/tests/screenshots' },
  },
  reporter: [['list'], ['json', { outputFile: 'client/tests/playwright_report.json' }]],
};

module.exports = config;
