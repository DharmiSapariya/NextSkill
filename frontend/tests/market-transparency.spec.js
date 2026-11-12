import { expect, test } from "@playwright/test";

const market = {
  posting_count: 2, dated_posting_count: 1, latest_posted_date: "2020-01-15",
  collection_timestamp: null, posting_age_notice_days: 30, latest_posting_older_than_notice: true,
  location_text_count: 1, remote_location_text_count: 1,
  sources: [{ source: "adzuna", posting_count: 1 }, { source: null, posting_count: 1 }],
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("nextskill_token", "fixture-token"));
  await page.route(/\/auth\/me$/, (route) => route.fulfill({
    json: { id: 1, email: "fixture@example.com", skills: [], tier: "free", is_admin: false },
  }));
  await page.route("**/auth/me/digest", (route) => route.fulfill({ json: { changes: [] } }));
  await page.route("**/auth/me/saved-jobs?*", (route) => route.fulfill({ json: { total: 0, results: [] } }));
});

test("Jobs attributes observations and distinguishes posting age from collection time", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 740 });
  await page.route(/:8000\/jobs\?/, (route) => route.fulfill({
    json: { total: 2, results: [
      { id: 1, title: "Engineer", source: "adzuna", source_attribution: "adzuna", posted_date: "2020-01-15" },
      { id: 2, title: "Analyst", source: "", source_attribution: null, posted_date: null },
    ], market_metadata: market },
  }));
  await page.goto("/app/jobs");
  await page.getByText("Data sources and coverage", { exact: true }).click();
  await expect(page.getByText("Adzuna: 1", { exact: true })).toBeVisible();
  await expect(page.getByText("Source unavailable: 1", { exact: true })).toBeVisible();
  await expect(page.getByText(/2 stored posting records/)).toBeVisible();
  await expect(page.getByText(/more than 30 days old/)).toBeVisible();
  await expect(page.getByText(/Collection time is unavailable/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test("Jobs distinguishes no matches from unavailable provenance", async ({ page }) => {
  await page.route(/:8000\/jobs\?/, (route) => route.fulfill({ json: { total: 0, results: [] } }));
  await page.goto("/app/jobs?role=missing");
  await expect(page.getByText("No postings match those filters")).toBeVisible();
  await page.getByText("Data sources and coverage", { exact: true }).click();
  await expect(page.getByText("Source counts and posting dates are unavailable.")).toBeVisible();
});

test("a trend with no observations does not render a zero-percent prior share", async ({ page }) => {
  await page.route("**/trends/Python", (route) => route.fulfill({ json: {
    skill: "Python", total_mentions: 1, window_days: 30,
    previous_period: { start: "2020-01-01", end: "2020-01-31", share_pct: null, mentions: 0, of_postings: 0 },
    current_period: { start: "2020-01-31", end: "2020-03-01", share_pct: 50, mentions: 1, of_postings: 2 },
    trend: "insufficient_data", lifecycle: "insufficient_data", change_pct: null, market_metadata: market,
  } }));
  await page.goto("/app/trends");
  await page.getByPlaceholder("e.g. PyTorch").fill("Python");
  await page.getByRole("button", { name: "Check trend" }).click();
  await expect(page.getByText("No observations", { exact: true })).toBeVisible();
  await expect(page.getByText("50%", { exact: true })).toBeVisible();
  await expect(page.getByText("0%", { exact: true })).toHaveCount(0);
});

for (const availability of ["sparse", "legacy", "unavailable"]) {
  test(`salary disclosure handles ${availability} data without inventing money units`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.route("**/match-score", (route) => route.fulfill({ json: { match_pct: null } }));
    await page.route("**/predict-salary", (route) => {
      if (availability === "unavailable") return route.fulfill({ status: 503, json: { detail: "No salary model" } });
      return route.fulfill({ json: {
        predicted_salary_low: 123456, predicted_salary_high: 234567, predicted_salary_midpoint: 180000,
        matched_role_bucket: "backend developer",
        estimate_metadata: availability === "sparse" ? {
          currency: null, pay_period: null, observation_count: 40, role_observation_count: 2,
          latest_posted_date: market.latest_posted_date, sources: [market.sources[0]],
          latest_posting_older_than_notice: true, posting_age_notice_days: 30,
        } : undefined,
      } });
    });
    await page.goto("/app/match");
    const role = page.getByPlaceholder("e.g. Backend Developer");
    await role.fill("backend developer");
    await page.getByRole("option", { name: "backend developer", exact: true }).click();
    await page.getByRole("button", { name: "Check", exact: true }).click();
    if (availability === "unavailable") {
      await expect(page.getByRole("alert")).toContainText("Salary estimate unavailable");
    } else {
      await expect(page.getByText("Salary amount withheld. Currency and pay period are unverified.")).toBeVisible();
      await expect(page.getByText(/123,456|234,567|Higher salary/)).toHaveCount(0);
      if (availability === "sparse") {
        await expect(page.getByText(/Small role sample/)).toBeVisible();
        await expect(page.getByText(/Sources: Adzuna/)).toBeVisible();
        await expect(page.getByText(/latest dated salary observation is more than 30 days old/)).toBeVisible();
      } else {
        await expect(page.getByText("Dataset observations: Unavailable.")).toBeVisible();
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  });
}

test("Jobs links to Remote OK and separates source dates on the detail page", async ({ page }) => {
  const original = "https://remoteok.com/remote-jobs/fixture";
  const job = { id: 77, title: "Remote Developer", source: "remoteok", remoteok_url: original, posted_date: "2026-06-01" };
  await page.route(/:8000\/jobs\?/, (route) => route.fulfill({
    json: { total: 1, results: [job], market_metadata: { ...market, collection_timestamp: "2026-06-05T12:00:00Z" } },
  }));
  await page.route(/:8000\/jobs\/77$/, (route) => route.fulfill({
    json: { ...job, source_observations: [
      { source: "remoteok", source_job_id: "fixture", source_url: original,
        first_collected_at: "2026-06-04T12:00:00Z", last_observed_at: "2026-06-05T12:00:00Z", expires_at: null },
    ] },
  }));
  await page.goto("/app/jobs");
  await expect(page.getByRole("link", { name: "Original posting on Remote OK" })).toHaveAttribute("href", original);
  await page.getByText("Data sources and coverage", { exact: true }).click();
  await expect(page.getByText(/Latest source observation/)).toBeVisible();
  await page.getByText("Remote Developer", { exact: true }).click();
  await expect(page.getByRole("link", { name: "Remote OK", exact: true })).toHaveAttribute("href", original);
  await expect(page.getByText(/First collected.*Last observed.*Expiry Unavailable/)).toBeVisible();
});
