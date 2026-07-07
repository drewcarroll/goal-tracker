import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Mirrors tsconfig.json's "paths" — Vite/Vitest don't read tsconfig paths
    // on their own, so without this any alias import of a runtime value
    // (as opposed to a type-only import, which esbuild just erases) fails.
    alias: {
      "@/domain": path.resolve(__dirname, "./src/domain"),
      "@/application": path.resolve(__dirname, "./src/application"),
      "@/infrastructure": path.resolve(__dirname, "./src/infrastructure"),
      "@/interfaces": path.resolve(__dirname, "./src/interfaces"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
  },
});
