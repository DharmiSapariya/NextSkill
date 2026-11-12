import { expect, test } from "@playwright/test";

const endpoint = "**/career-plan?*";
const profile = { id: 1, email: "test@example.com", skills: ["Python"], tier: "free", is_admin: false };
const sample = {
  target_role: "software engineer",
  role_resolution: { resolved: "software engineer", matched_semantically: false, similarity: null },
  your_skills: ["Python"],
  total_market_jobs: 12,
  skill_gaps: [{
    skill_id: 2, skill: "SQL", postings_mentioning_it: 3, market_demand_pct: 25,
    resources: [{ platform: "Coursera", type: "search", url: "https://www.coursera.org/search?query=SQL" }],
  }],
  adjacent_roles: [{
    role: "backend developer", similarity: 0.75,
    skills_you_have: ["Python"], skills_you_would_need: ["Docker"],
  }],
};

async function signIn(page) {
  await page.addInitScript(() => localStorage.setItem("nextskill_token", "fixture-token"));
  await page.route(/\/auth\/me$/, (route) => route.fulfill({ json: profile }));
  await page.route("**/auth/me/saved-jobs?*", (route) => route.fulfill({ json: { total: 0, results: [] } }));
  await page.route("**/auth/me/digest", (route) => route.fulfill({ json: { changes: [] } }));
}

async function generate(page, role = "software engineer") {
  await page.getByRole("combobox", { name: "Target role" }).fill(role);
  await page.getByRole("button", { name: "Generate plan" }).click();
}

test("the public page and guest guard never fetch the Career Plan chunk", async ({ page }) => {
  const requests = [];
  page.on("request", (request) => {
    if (/\/assets\/CareerPlan-[^/]+\.js$|\/career-plan\?/.test(request.url())) requests.push(request.url());
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.goto("/app/career-plan");
  await expect(page).toHaveURL(/\/login$/);
  expect(requests).toEqual([]);
});

test("workspace navigation generates and displays the actual response fields", async ({ page }) => {
  await signIn(page);
  let release;
  const delayed = new Promise((resolve) => { release = resolve; });
  await page.route(endpoint, async (route) => {
    expect(route.request().headers().authorization).toBe("Bearer fixture-token");
    const role = new URL(route.request().url()).searchParams.get("target_role");
    expect(role).toBe("software engineer");
    await delayed;
    await route.fulfill({ json: sample });
  });
  await page.goto("/app/settings");
  await page.getByRole("link", { name: "Career Plan", exact: true }).click();
  await expect(page.getByText("Choose a target role")).toBeVisible();
  await generate(page, "  software engineer  ");
  await expect(page.getByRole("status")).toContainText("Generating career plan");
  await expect(page.getByRole("button", { name: "Generate plan" })).toBeDisabled();
  release();
  await expect(page.getByRole("heading", { name: "Career plan for software engineer" })).toBeVisible();
  await expect(page.getByText("Based on 12 matching job postings.")).toBeVisible();
  await expect(page.getByText("3 postings mention this skill (25% of matching postings).")).toBeVisible();
  await expect(page.getByRole("link", { name: "Coursera search for SQL" })).toHaveAttribute("href", sample.skill_gaps[0].resources[0].url);
  await expect(page.getByRole("heading", { name: "backend developer" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Skills shared by both roles" })).toBeVisible();
});

test("blank validation avoids a request and an empty market is explained", async ({ page }) => {
  await signIn(page);
  let requests = 0;
  await page.route(endpoint, (route) => {
    requests++;
    return route.fulfill({ json: { ...sample, total_market_jobs: 0, your_skills: [], skill_gaps: [], adjacent_roles: [] } });
  });
  await page.goto("/app/career-plan");
  await generate(page, "   ");
  await expect(page.getByRole("alert")).toContainText("Enter a target role");
  await expect(page.getByRole("combobox", { name: "Target role" })).toBeFocused();
  expect(requests).toBe(0);
  await generate(page);
  await expect(page.getByText("No matching job postings are available to identify skill gaps.")).toBeVisible();
  await expect(page.getByText("No skills saved in your profile.")).toBeVisible();
  expect(requests).toBe(1);
});

test("a server error can be retried and a different role generates a new result", async ({ page }) => {
  await signIn(page);
  let requests = 0;
  await page.route(endpoint, (route) => {
    requests++;
    const role = new URL(route.request().url()).searchParams.get("target_role");
    return requests === 1
      ? route.fulfill({ status: 503, json: { detail: "Unavailable" } })
      : route.fulfill({ json: { ...sample, target_role: role, role_resolution: { resolved: role } } });
  });
  await page.goto("/app/career-plan");
  await generate(page);
  await expect(page.getByRole("alert")).toContainText("couldn’t load");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { name: "Career plan for software engineer" })).toBeVisible();
  await generate(page, "data analyst");
  await expect(page.getByRole("heading", { name: "Career plan for data analyst" })).toBeVisible();
  expect(requests).toBe(3);
});

test("permission denial preserves the session", async ({ page }) => {
  await signIn(page);
  await page.route(endpoint, (route) => route.fulfill({ status: 403, json: { detail: "Forbidden" } }));
  await page.goto("/app/career-plan");
  await generate(page);
  await expect(page.getByRole("alert")).toContainText("don’t have permission");
  expect(await page.evaluate(() => localStorage.getItem("nextskill_token"))).toBe("fixture-token");
});

test("401 rechecks the profile and follows existing session recovery", async ({ page }) => {
  await signIn(page);
  await page.route(endpoint, (route) => route.fulfill({ status: 401, json: { detail: "Invalid or expired token" } }));
  await page.goto("/app/career-plan");
  await expect(page.getByRole("heading", { name: "Career Plan", exact: true })).toBeVisible();
  await page.route(/\/auth\/me$/, (route) => route.fulfill({ status: 401, json: { detail: "Invalid or expired token" } }));
  await generate(page);
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => localStorage.getItem("nextskill_token"))).toBeNull();
});

test("mobile results fit the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await signIn(page);
  await page.route(endpoint, (route) => route.fulfill({ json: sample }));
  await page.goto("/app/career-plan");
  await generate(page);
  await expect(page.getByRole("heading", { name: "Career plan for software engineer" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});
