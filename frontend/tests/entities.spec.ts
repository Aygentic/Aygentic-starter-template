import { expect, test } from "@playwright/test"
import { randomEntityDescription, randomEntityTitle } from "./utils/random.ts"

test.describe("Entity CRUD", () => {
  test("entities page loads and shows correct heading", async ({ page }) => {
    await page.goto("/entities")
    await expect(page.getByRole("heading", { name: "Entities" })).toBeVisible()
    await expect(
      page.getByText("Create and manage your entities"),
    ).toBeVisible()
  })

  test("add entity button is visible", async ({ page }) => {
    await page.goto("/entities")
    await expect(page.getByRole("button", { name: "Add Entity" })).toBeVisible()
  })

  test("create a new entity successfully", async ({ page }) => {
    const title = randomEntityTitle()
    const description = randomEntityDescription()

    await page.goto("/entities")
    await page.getByRole("button", { name: "Add Entity" }).click()

    await expect(page.getByRole("dialog")).toBeVisible()
    await page.getByPlaceholder("Title").fill(title)
    await page.getByPlaceholder("Description").fill(description)
    await page.getByRole("button", { name: "Save" }).click()

    await expect(page.getByRole("dialog")).toBeHidden()
    await expect(page.getByText(title)).toBeVisible()
  })

  test("edit an entity successfully", async ({ page }) => {
    const title = randomEntityTitle()
    const updatedTitle = randomEntityTitle()

    await page.goto("/entities")

    // Create entity first
    await page.getByRole("button", { name: "Add Entity" }).click()
    await page.getByPlaceholder("Title").fill(title)
    await page.getByRole("button", { name: "Save" }).click()
    await expect(page.getByRole("dialog")).toBeHidden()
    await expect(page.getByText(title)).toBeVisible()

    // Edit via actions menu
    const row = page.getByRole("row").filter({ hasText: title })
    await row.getByRole("button").click()
    await page.getByRole("menuitem", { name: "Edit Entity" }).click()

    await expect(page.getByRole("dialog")).toBeVisible()
    await page.getByPlaceholder("Title").clear()
    await page.getByPlaceholder("Title").fill(updatedTitle)
    await page.getByRole("button", { name: "Save" }).click()

    await expect(page.getByRole("dialog")).toBeHidden()
    await expect(page.getByText(updatedTitle)).toBeVisible()
  })

  test("delete an entity successfully", async ({ page }) => {
    const title = randomEntityTitle()

    await page.goto("/entities")

    // Create entity first
    await page.getByRole("button", { name: "Add Entity" }).click()
    await page.getByPlaceholder("Title").fill(title)
    await page.getByRole("button", { name: "Save" }).click()
    await expect(page.getByRole("dialog")).toBeHidden()
    await expect(page.getByText(title)).toBeVisible()

    // Delete via actions menu
    const row = page.getByRole("row").filter({ hasText: title })
    await row.getByRole("button").click()
    await page.getByRole("menuitem", { name: "Delete Entity" }).click()

    await expect(page.getByRole("dialog")).toBeVisible()
    await page.getByRole("button", { name: "Delete" }).click()

    await expect(page.getByRole("dialog")).toBeHidden()
    await expect(page.getByText(title)).toBeHidden()
  })

  test("title is required", async ({ page }) => {
    await page.goto("/entities")
    await page.getByRole("button", { name: "Add Entity" }).click()

    // Try to submit without title
    await page.getByPlaceholder("Description").fill("Some description")
    await page.getByRole("button", { name: "Save" }).click()

    // Form validation should prevent submission
    await expect(page.getByRole("dialog")).toBeVisible()
  })

  test("cancel entity creation", async ({ page }) => {
    await page.goto("/entities")
    await page.getByRole("button", { name: "Add Entity" }).click()

    await expect(page.getByRole("dialog")).toBeVisible()
    await page.getByRole("button", { name: "Cancel" }).click()
    await expect(page.getByRole("dialog")).toBeHidden()
  })
})
