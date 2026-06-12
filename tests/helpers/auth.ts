import { type Page, expect } from "@playwright/test";

// Credentials for authenticated E2E runs. NEVER hardcode real credentials —
// supply them via env (e.g. in .env.local, which Playwright's `npm run dev`
// webServer loads, or exported in the shell before `npm run test:e2e`).
export const E2E_EMAIL = process.env.E2E_TEST_EMAIL;
export const E2E_PASSWORD = process.env.E2E_TEST_PASSWORD;

/** True when both test credentials are present; gate authenticated specs on this. */
export const hasTestCreds = Boolean(E2E_EMAIL && E2E_PASSWORD);

/**
 * Log in through the real password form and wait for the post-login redirect.
 * Mirrors src/app/(auth)/login/page.tsx: #email / #password fields, "Anmelden"
 * button, then a hard navigation to the target (default /dashboard).
 */
export async function login(
  page: Page,
  opts: { email?: string; password?: string; expectUrl?: RegExp } = {},
): Promise<void> {
  const email = opts.email ?? E2E_EMAIL;
  const password = opts.password ?? E2E_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "login() requires E2E_TEST_EMAIL and E2E_TEST_PASSWORD to be set.",
    );
  }

  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();

  await page.waitForURL(opts.expectUrl ?? /\/(dashboard|portal)/, {
    timeout: 15_000,
  });
  await expect(page).toHaveURL(opts.expectUrl ?? /\/(dashboard|portal)/);
}
