import { expect, test } from "@playwright/test"

test.describe("Navigation", () => {
  test("dashboard loads as default route", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
    await expect(
      page.getByText("Welcome to the microservice starter template"),
    ).toBeVisible()
  })

  test("sidebar navigation to entities", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("link", { name: "Entities" }).click()
    await expect(page.getByRole("heading", { name: "Entities" })).toBeVisible()
  })

  test("sidebar navigation back to dashboard", async ({ page }) => {
    await page.goto("/entities")
    await page.getByRole("link", { name: "Dashboard" }).click()
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
  })

  test("theme toggle works", async ({ page }) => {
    await page.goto("/")

    // Open theme menu
    await page.getByTestId("theme-button").click()

    // Switch to light mode
    await page.getByTestId("light-mode").click()

    // Verify light mode applied (html element should not have dark class)
    const html = page.locator("html")
    await expect(html).not.toHaveClass(/dark/)

    // Switch to dark mode
    await page.getByTestId("theme-button").click()
    await page.getByTestId("dark-mode").click()
    await expect(html).toHaveClass(/dark/)
  })

  test("user menu shows sign out option", async ({ page }) => {
    await page.goto("/")
    await page.getByTestId("user-menu").click()
    await expect(page.getByRole("menuitem", { name: "Sign Out" })).toBeVisible()
  })
})
