import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 740 }, reducedMotion: "reduce" });

test("mobile navigation traps and restores keyboard focus", async ({ page }) => {
  await page.goto("/");
  const opener = page.getByRole("button", { name: "Open menu" });
  const menu = page.getByRole("dialog", { name: "Menu", exact: true });
  const close = menu.getByRole("button", { name: "Close menu" });
  const signup = menu.getByRole("link", { name: "Get Started Free" });

  await expect(opener).toHaveAttribute("aria-expanded", "false");
  await opener.focus();
  await page.keyboard.press("Enter");
  await expect(menu).toBeVisible();
  await expect(opener).toHaveAttribute("aria-expanded", "true");
  await expect(close).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(menu.getByRole("link", { name: "How It Works" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(signup).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(opener).toHaveAttribute("aria-expanded", "false");
  await expect(opener).toBeFocused();
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
});

test("mobile navigation dismisses and retains section and account links", async ({ page }) => {
  await page.goto("/");
  const opener = page.getByRole("button", { name: "Open menu" });
  const menu = page.getByRole("dialog", { name: "Menu", exact: true });
  const close = menu.getByRole("button", { name: "Close menu" });

  await opener.click();
  await close.click();
  await expect(opener).toBeFocused();

  await opener.click();
  await page.mouse.click(10, 100);
  await expect(menu).toBeHidden();
  await expect(opener).toBeFocused();

  await opener.click();
  await menu.getByRole("link", { name: "Features" }).press("Enter");
  await expect(page).toHaveURL(/#features$/);
  await expect(menu).toBeHidden();

  await opener.click();
  await menu.getByRole("link", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
});

test("resizing to desktop closes the mobile menu and unlocks scrolling", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.getByRole("dialog", { name: "Menu", exact: true });
  await expect(menu).toBeVisible();

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(menu).toBeHidden();
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  const header = page.getByRole("banner").filter({ has: page.getByRole("link", { name: "NextSkill", exact: true }) });
  await expect(header.getByRole("link", { name: "NextSkill", exact: true })).toBeFocused();
  await expect(header.getByRole("link", { name: /Features/ })).toBeVisible();
});
