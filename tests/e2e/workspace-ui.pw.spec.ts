import { expect, test } from "@playwright/test";

test("shows the finding, evidence, candidate, and validation workflow", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "1 environment issue" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Runtime dependency exists only on this machine" })
  ).toBeVisible();

  await page.getByRole("tab", { name: "Candidate" }).click();
  await expect(
    page.getByRole("heading", { name: "Declare the observed runtime dependency" })
  ).toBeVisible();

  await page.getByRole("tab", { name: /Validation/u }).click();
  await expect(page.getByRole("heading", { name: "Clean reconstruction proof" })).toBeVisible();
  await expect(page.getByText("2/2 confirmed deleted")).toBeVisible();
});

test("keeps the core workflow usable at laptop width", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");

  await expect(page.getByRole("button", { name: "Run live proof" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Product navigation" })).toBeVisible();
  await page.getByRole("button", { name: "Project settings" }).click();
  await expect(page.getByRole("heading", { name: "Project settings" })).toBeVisible();
});
