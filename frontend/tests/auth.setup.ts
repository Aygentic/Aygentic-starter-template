import { test as setup } from "@playwright/test"
import { TEST_TOKEN } from "./config.ts"

setup("inject auth token", async ({ page }) => {
  // Inject token directly into localStorage before any navigation
  await page.addInitScript((token) => {
    localStorage.setItem("access_token", token)
  }, TEST_TOKEN)

  // Navigate to app to establish the storage state
  await page.goto("/")
  await page.waitForURL("/")

  // Save the authenticated state
  await page.context().storageState({ path: "playwright/.auth/user.json" })
})
