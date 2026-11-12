import { expect, test } from "@playwright/test";

test("the hero labels sample values, expands on click, and keeps the signup CTA", async ({ page }) => {
  await page.goto("/");
  const hero = page.locator("#top");
  const toggle = hero.getByRole("button", { name: "Explore the sample report" });
  const explanation = hero.getByText(/each percentage shows the share/);

  await expect(hero.getByText("Illustrative example.", { exact: true })).toBeVisible();
  await expect(hero.getByText(/Percentages are demonstration values only/)).toBeVisible();
  await expect(hero.getByText("React · 84%")).toBeVisible();
  await expect(hero.getByText(/see a real report/i)).toHaveCount(0);
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(explanation).toBeHidden();
  const panelId = await toggle.getAttribute("aria-controls");
  await expect(hero.locator("[id]").filter({ hasText: /each percentage shows the share/ })).toHaveAttribute("id", panelId);

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(explanation).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(explanation).toBeHidden();

  await hero.getByRole("link", { name: "Get Your Free Skill Report" }).click();
  await expect(page).toHaveURL(/\/signup$/);
});

test("Enter and Space toggle the native disclosure without moving focus", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Explore the sample report" });

  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(toggle).toBeFocused();

  await page.keyboard.press("Space");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
});

test.describe("mobile landing page", () => {
  test.use({ viewport: { width: 320, height: 720 }, isMobile: true, hasTouch: true });

  test("touch expands the preview without horizontal overflow", async ({ page }) => {
    await page.goto("/");
    const hero = page.locator("#top");
    const toggle = hero.getByRole("button", { name: "Explore the sample report" });
    await toggle.tap();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(hero.getByText(/each percentage shows the share/)).toBeVisible();
    const sizes = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth,
    }));
    expect(sizes.page).toBe(sizes.viewport);
  });
});

test("the secondary CTA and evidence selector still work", async ({ page }) => {
  await page.goto("/");
  await page.locator("#top").getByRole("link", { name: "See How It Works" }).click();
  await expect(page).toHaveURL(/#how-it-works$/);

  const evidence = page.getByRole("heading", { name: /Market-aware matching/ }).locator("xpath=ancestor::section");
  await evidence.getByRole("button", { name: "Data Scientist" }).click();
  await expect(evidence.getByText(/Percentages are demonstration values only/)).toBeVisible();
  await expect(evidence.getByText("React · 84%")).toBeVisible();
});
