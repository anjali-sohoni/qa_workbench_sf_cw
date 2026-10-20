import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Look for spec files in all subdirectories of tests/
  testDir: './tests',
  testMatch: '**/*.spec.ts',

  // Per-test timeout. Cross-app beforeAll authenticates two apps — needs headroom.
  timeout: 180_000,
  expect: { timeout: 15_000 },

  // Run tests in a single worker in CI (avoids SF rate-limit / session conflicts)
  workers: process.env.CI ? 1 : undefined,
  fullyParallel: false,

  // Retry once on failure (flaky network / SF load)
  retries: process.env.CI ? 1 : 0,

  reporter: [
    ['list'],
    ['json',  { outputFile: 'test-results.json' }],
    ['html',  { outputFolder: 'playwright-report', open: 'never' }],
  ],

  use: {
    // Headed everywhere, including CI: audit requirement is a full OS-level screen
    // recording of the run (browser window + native OS taskbar/clock), which is only
    // possible against a real rendered display, not Chromium's headless mode. The CI
    // workflow supplies that display via Xvfb + openbox + tint2 (see
    // .github/workflows/run-playwright.yml) and wraps the whole job in an ffmpeg
    // x11grab recording -- see HEADED_MODE_AUDIT_RECORDING_ARCHITECTURE.md.
    headless: false,
    viewport: { width: 1280, height: 800 },
    // 'only-on-failure' captures screenshots at the exact point of failure (not test end).
    // 'on' captures end-of-test state which is often post-cleanup and doesn't show the error.
    // Video: 'on' covers the full flow including beforeAll login for auth debugging.
    screenshot: 'only-on-failure',
    video:      'on',
    trace:      'on',

    launchOptions: {
      // Xvfb has no real GPU/compositor. Attempt 1 (--disable-gpu + --use-gl=swiftshader)
      // made no visible difference at all -- on newer Chromium, --disable-gpu can disable
      // the GPU process entirely, which SwiftShader needs in order to run, so the two
      // flags were likely fighting each other. This attempt drops --disable-gpu and adds
      // --use-angle=swiftshader (ANGLE's own software path) plus --ozone-platform=x11
      // (avoid Chromium's Ozone backend auto-detection misbehaving under a bare Xvfb
      // session with no compositor) and --no-sandbox (rules out a silent sandbox-init
      // failure as a cause). See HEADED_MODE_AUDIT_RECORDING_ARCHITECTURE.md §12 for
      // the diagnostic step (window list + mid-run screenshot) added alongside this in
      // run-playwright.yml, in case this attempt still doesn't fix it.
      args: [
        '--use-gl=swiftshader',
        '--use-angle=swiftshader',
        '--ozone-platform=x11',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
