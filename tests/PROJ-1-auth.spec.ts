import { test, expect } from "@playwright/test";
import { hasTestCreds, login } from "./helpers/auth";

// PROJ-1 (auth) + PROJ-2 (route guards). The unauthenticated specs are
// read-only against the app and safe to run anywhere. The authenticated block
// is skipped unless E2E_TEST_EMAIL / E2E_TEST_PASSWORD are provided.

test.describe("login page", () => {
  test("renders the email + password form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Willkommen zurück")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Anmelden" })).toBeVisible();
  });

  test("switches to the Magic Link tab", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("tab", { name: "Magic Link" }).click();
    await expect(page.locator("#magic-email")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Magic Link senden" }),
    ).toBeVisible();
  });
});

test.describe("route guards (unauthenticated)", () => {
  // NOTE: the effective guard is the (app)/(portal) layout `redirect("/login")`,
  // which lands on a bare /login WITHOUT the `?redirect=` target. The
  // middleware's param-preserving redirect does not take effect in practice
  // (documented as a Low finding in docs/QA-RESULTS-2026-06-12.md). These specs
  // assert the security guarantee (no unauthenticated access), not the lost UX.
  test("protected route redirects to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login(\?|$)/);
    await expect(page.locator("#email")).toBeVisible();
  });

  test("a deep protected route is also blocked", async ({ page }) => {
    await page.goto("/kunden");
    await expect(page).toHaveURL(/\/login(\?|$)/);
  });

  test("forgot-password is publicly reachable", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page).toHaveURL(/\/forgot-password/);
  });
});

test.describe("authenticated login", () => {
  test.skip(
    !hasTestCreds,
    "Set E2E_TEST_EMAIL + E2E_TEST_PASSWORD to run authenticated E2E tests",
  );

  test("password login lands on the dashboard", async ({ page }) => {
    await login(page, { expectUrl: /\/dashboard/ });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("login with a redirect param honors the target", async ({ page }) => {
    await page.goto("/login?redirect=%2Fkunden");
    await page.locator("#email").fill(process.env.E2E_TEST_EMAIL!);
    await page.locator("#password").fill(process.env.E2E_TEST_PASSWORD!);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/kunden/);
  });
});
