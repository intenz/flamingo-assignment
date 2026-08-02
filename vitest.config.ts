import path from "node:path";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: [path.resolve(__dirname, "tests/setup.ts")],
    // prisma-dev drops connections under parallel file workers
    fileParallelism: false,
    maxWorkers: 1,
  },
});
