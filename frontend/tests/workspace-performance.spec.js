import { expect, test } from "@playwright/test";

const pageChunk = /\/assets\/(?:Overview|SkillGapReport|ResumeUpload|MatchSalary|Jobs|JobDetail|SavedJobs|Trends|Skills|RoleGraph|SkillGraph|Companies|History|Settings|AdminStats|AdminUsers|SharedReport)-[^/]+\.js$/;

function watchPages(page) {
  const requests = [];
  page.on("request", (request) => {
    if (pageChunk.test(request.url())) requests.push(new URL(request.url()).pathname);
  });
  return requests;
}

async function signIn(page) {
  await page.addInitScript(() => localStorage.setItem("nextskill_token", "fixture-token"));
  await page.route(/\/auth\/me$/, (route) => route.fulfill({
    json: { id: 1, email: "test@example.com", skills: [], tier: "free", is_admin: false },
  }));
  await page.route("**/auth/me/digest", (route) => route.fulfill({ json: { changes: [] } }));
  for (const path of ["auth/me/saved-jobs", "auth/me/history", "jobs"]) {
    await page.route(`**/${path}?*`, (route) => route.fulfill({ json: { total: 0, results: [] } }));
  }
}

test("landing and guest redirects fetch no workspace chunks", async ({ page }) => {
  const requests = watchPages(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.goto("/app/settings");
  await expect(page).toHaveURL(/\/login$/);
  expect(requests).toEqual([]);
});

test("nested routes load on demand and support reload and history", async ({ page }) => {
  await signIn(page);
  const requests = watchPages(page);
  const settings = page.getByRole("heading", { name: "Settings" });
  const jobs = page.getByRole("heading", { name: "Jobs", exact: true });
  await page.goto("/app/settings");
  await expect(settings).toBeVisible();
  expect(requests).toEqual([expect.stringMatching(/\/Settings-/)]);
  await page.reload();
  await expect(settings).toBeVisible();
  await page.getByRole("link", { name: "Jobs", exact: true }).click();
  await expect(jobs).toBeVisible();
  expect(requests).toContainEqual(expect.stringMatching(/\/Jobs-/));
  await page.goBack();
  await expect(settings).toBeVisible();
  await page.goForward();
  await expect(jobs).toBeVisible();
});

test("a non-admin direct visit does not fetch admin chunks", async ({ page }) => {
  await signIn(page);
  const requests = watchPages(page);
  await page.goto("/app/admin/users");
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("link", { name: "Jobs", exact: true })).toBeVisible();
  expect(requests.filter((path) => /\/Admin(?:Stats|Users)-/.test(path))).toEqual([]);
});

test.describe("mobile loading", () => {
  test.use({ viewport: { width: 390, height: 740 }, reducedMotion: "reduce" });

  test("a slow chunk keeps the workspace menu available", async ({ page }) => {
    await signIn(page);
    let release;
    const held = new Promise((resolve) => { release = resolve; });
    await page.route(/\/assets\/Settings-[^/]+\.js$/, async (route) => {
      await held;
      await route.continue();
    });
    await page.goto("/app/settings");
    const loading = page.getByRole("status").filter({ hasText: "Loading page" });
    await expect(loading).toBeVisible();
    await expect(loading).toHaveCSS("animation-name", "none");
    await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
    release();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });
});

test("a failed chunk allows navigation and reload retries it", async ({ page }) => {
  await signIn(page);
  await page.route(/\/assets\/Trends-[^/]+\.js$/, (route) => route.abort("failed"), { times: 1 });
  await page.goto("/app/trends");
  await expect(page.getByRole("alert")).toContainText("This page couldn’t load");
  await page.getByRole("link", { name: "Jobs", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Jobs", exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("alert")).toContainText("This page couldn’t load");
  await page.getByRole("button", { name: "Reload page" }).click();
  await expect(page.getByRole("heading", { name: "Trends" })).toBeVisible();
});

for (const failure of ["list", "top"]) {
  test(`Companies retries only the failed ${failure} request`, async ({ page }) => {
    await signIn(page);
    let listRequests = 0;
    let topRequests = 0;
    await page.route("**/companies/top?*", (route) => {
      topRequests++;
      return failure === "top" && topRequests === 1
        ? route.fulfill({ status: 503, json: { detail: "fixture" } })
        : route.fulfill({ json: { results: [{ company: "Top Company", postings: 8 }] } });
    });
    await page.route("**/companies?*", (route) => {
      listRequests++;
      return failure === "list" && listRequests === 1
        ? route.fulfill({ status: 503, json: { detail: "fixture" } })
        : route.fulfill({ json: { total: 1, results: [{ company: "List Company", postings: 3 }] } });
    });
    await page.goto("/app/companies");
    const list = page.getByText("List Company", { exact: true });
    const top = page.getByRole("heading", { name: "Top companies" });
    await expect(page.getByText(failure === "list"
      ? "We couldn't load the company list."
      : "We couldn't load the top companies.")).toBeVisible();
    await expect(failure === "list" ? top : list).toBeVisible();
    await expect(page.getByText("No companies found")).toHaveCount(0);
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(list).toBeVisible();
    await expect(top).toBeVisible();
    expect(listRequests).toBe(failure === "list" ? 2 : 1);
    expect(topRequests).toBe(failure === "top" ? 2 : 1);
  });
}
