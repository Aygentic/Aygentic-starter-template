import path from "node:path"
import { fileURLToPath } from "node:url"
import dotenv from "dotenv"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, "../../.env") })

function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name]
  if (!value) {
    if (defaultValue !== undefined) return defaultValue
    throw new Error(`Environment variable ${name} is undefined`)
  }
  return value
}

export const TEST_TOKEN = getEnvVar("TEST_TOKEN", "test-token-for-e2e")
