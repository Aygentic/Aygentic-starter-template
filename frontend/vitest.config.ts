import path from "node:path"
import react from "@vitejs/plugin-react-swc"
import { defineConfig } from "vitest/config"

// Node 25 ships a built-in Web Storage API that conflicts with jsdom's
// localStorage/sessionStorage. Disable it so jsdom can provide its own.
const nodeMajor = parseInt(process.versions.node.split(".")[0], 10)
const needsNoWebstorage = nodeMajor >= 25

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    execArgv: needsNoWebstorage ? ["--no-webstorage"] : [],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/client/**",
        "src/routeTree.gen.ts",
        "src/components/ui/**",
        "src/main.tsx",
        "src/test/**",
        "src/**/*.d.ts",
      ],
      // TODO: Raise thresholds as test coverage improves
      thresholds: {
        statements: 30,
        branches: 40,
        functions: 18,
        lines: 30,
      },
    },
  },
})
