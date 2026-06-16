import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "coverage",
      include: [
        "src/main/pluginRuntime.ts",
        "src/shared/arduinoSketch.ts",
        "src/shared/bom.ts",
        "src/shared/circuitAssistant.ts",
        "src/shared/connectionRules.ts",
        "src/shared/project.ts",
        "src/shared/projectDocumentation.ts",
      ],
    },
  },
});
