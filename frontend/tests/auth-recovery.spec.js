import { expect, test } from "@playwright/test";

const profileRoute = /\/auth\/me$/;
const tokenKey = "nextskill_token";
const token = "fixture-token";
const profile = { id: 1, email: "test@example.com", skills: [], tier: "free", is_admin: false };

async function seedToken(page) {
  await page.addInitScript(({ key, value }) => {
    if (sessionStorage.getItem("auth-test-seeded")) return;
    localStorage.setItem(key, value);
    sessionStorage.setItem("auth-test-seeded", "yes");
  }, { key: tokenKey, value: token });
}

function storedToken(page) {
  return page.evaluate((key) => localStorage.getItem(key), tokenKey);
}

test.beforeEach(async ({ page }) => {
  await page.route("**/auth/me/saved-jobs?*", (route) => route.fulfill({ json: { total: 0 } }));
  await page.route("**/auth/me/digest", (route) => route.fulfill({ json: { changes: [] } }));
});

test("no token redirects without requesting a profile", async ({ page }) => {
  let requests = 0;
  await page.route(profileRoute, (route) => {
    requests++;
    return route.fulfill({ json: profile });
  });
  await page.goto("/app/settings");
  await expect(page).toHaveURL(/\/login$/);
  expect(requests).toBe(0);
});

test("a valid token restores the protected page after reload without flashing login", async ({ page }) => {
  await seedToken(page);
  let requests = 0;
  let release;
  const delayed = new Promise((resolve) => { release = resolve; });
  await page.route(profileRoute, async (route) => {
    requests++;
    expect(route.request().headers().authorization).toBe(`Bearer ${token}`);
    if (requests === 1) await delayed;
    await route.fulfill({ json: profile });
  });

  await page.goto("/app/settings");
  await expect(page.getByRole("status", { name: "Checking your session" })).toBeVisible();
  await expect(page).toHaveURL(/\/app\/settings$/);
  release();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  expect(requests).toBe(2);
  expect(await storedToken(page)).toBe(token);
});

test("401 clears the token and login returns to the original route", async ({ page }) => {
  await seedToken(page);
  let requests = 0;
  await page.route(profileRoute, (route) => {
    requests++;
    return requests === 1
      ? route.fulfill({ status: 401, json: { detail: "Invalid or expired token" } })
      : route.fulfill({ json: profile });
  });
  await page.route("**/auth/login", (route) => route.fulfill({ json: { access_token: "new-token" } }));

  await page.goto("/app/settings");
  await expect(page).toHaveURL(/\/login$/);
  expect(await storedToken(page)).toBeNull();
  expect(requests).toBe(1);
  await page.getByPlaceholder("you@example.com").fill(profile.email);
  await page.locator('input[type="password"]').fill("fixture-password");
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/app\/settings$/);
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  expect(await storedToken(page)).toBe("new-token");
  expect(requests).toBe(2);
  await page.getByRole("link", { name: "Skill-Gap Report", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/report$/);
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(await storedToken(page)).toBeNull();
  await page.goBack();
  await expect(page).toHaveURL(/\/login$/);
});

for (const status of [403, 500, 502, 503, 429, 200]) {
  test(`profile HTTP ${status}${status === 200 ? " with a malformed body" : ""} preserves the token and gates the workspace`, async ({ page }) => {
    await seedToken(page);
    await page.route(profileRoute, (route) => route.fulfill({ status, json: { detail: "fixture" } }));
    await page.goto("/app/settings");
    const alert = page.getByRole("alert");
    const message = status === 403 ? "permission to access" : "your profile";
    await expect(alert).toContainText(message);
    await expect(page.getByRole("heading", { name: "Settings" })).toHaveCount(0);
    await expect(page).toHaveURL(/\/app\/settings$/);
    expect(await storedToken(page)).toBe(token);
  });
}

test("network failure recovers on retry without concurrent profile requests", async ({ page }) => {
  await seedToken(page);
  let requests = 0;
  let release;
  const retry = new Promise((resolve) => { release = resolve; });
  await page.route(profileRoute, async (route) => {
    requests++;
    if (requests === 1) return route.abort("failed");
    await retry;
    await route.fulfill({ json: profile });
  });

  await page.goto("/app/settings");
  await expect(page.getByRole("alert")).toContainText("Check your connection");
  expect(await storedToken(page)).toBe(token);
  const button = page.getByRole("button", { name: "Try again" });
  await button.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status", { name: "Checking your session" })).toBeVisible();
  await expect.poll(() => requests).toBe(2);
  release();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  expect(requests).toBe(2);
});

test("a stalled profile request times out and keeps the token", async ({ page }) => {
  await seedToken(page);
  await page.clock.install();
  await page.route(profileRoute, () => {});
  const requested = page.waitForRequest(profileRoute);
  await page.goto("/app/settings");
  await requested;
  await page.clock.fastForward(10_001);
  await expect(page.getByRole("alert")).toContainText("took too long");
  await expect(page).toHaveURL(/\/app\/settings$/);
  expect(await storedToken(page)).toBe(token);
});

test("a superseded profile failure cannot clear a new signup session", async ({ page }) => {
  await seedToken(page);
  let release;
  const oldResponse = new Promise((resolve) => { release = resolve; });
  await page.route(profileRoute, async (route) => {
    if (route.request().headers().authorization === `Bearer ${token}`) {
      await oldResponse;
      return route.fulfill({ status: 401, json: { detail: "Invalid token" } });
    }
    await route.fulfill({ json: profile });
  });
  await page.route("**/auth/signup", (route) => route.fulfill({ json: { access_token: "signup-token" } }));
  await page.route("**/auth/me/history?*", (route) => route.fulfill({ json: { results: [] } }));

  const requested = page.waitForRequest(profileRoute);
  await page.goto("/signup");
  await requested;
  await page.getByPlaceholder("you@example.com").fill(profile.email);
  await page.getByPlaceholder("At least 8 characters").fill("fixture-password");
  const aborted = page.waitForEvent("requestfailed", (request) => profileRoute.test(request.url()));
  await page.locator('button[type="submit"]').click();
  await aborted;
  release();
  await expect(page).toHaveURL(/\/app$/);
  expect(await storedToken(page)).toBe("signup-token");
});

test("leaving the document cancels a pending restoration before the next load", async ({ page }) => {
  await seedToken(page);
  let requests = 0;
  await page.route(profileRoute, (route) => {
    requests++;
    if (requests === 1) return;
    return route.fulfill({ json: profile });
  });
  const requested = page.waitForRequest(profileRoute);
  await page.goto("/app/settings");
  await requested;
  await page.reload();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  expect(requests).toBe(2);
  expect(await storedToken(page)).toBe(token);
});
