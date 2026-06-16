import { describe, expect, it } from "vitest";
import { buildProjectDocumentation, documentationToHtml, documentationToMarkdown } from "./projectDocumentation.js";
import { connect, createProject, placeComponent } from "./testUtils.js";
import type { ValidationWarning } from "./types.js";

describe("project documentation generator", () => {
  it("includes metadata, BOM, warnings, and generated code", () => {
    const project = createProject("Docs");
    const uno = placeComponent("arduino-uno", { x: 0, y: 0 }, "Arduino Uno");
    const led = placeComponent("led", { x: 200, y: 0 }, "LED 1");
    project.components = [uno, led];
    project.connections = [connect(uno.id, "d13", led.id, "anode")];
    const warnings: ValidationWarning[] = [{
      id: "warning-1",
      severity: "warning",
      title: "LED without resistor",
      description: "LED 1 appears to be connected without a resistor.",
      componentIds: [led.id],
      connectionIds: project.connections.map((connection) => connection.id),
      pinRefs: [{ componentId: led.id, pinId: "anode" }],
    }];

    const documentation = buildProjectDocumentation(project, warnings, "void setup() {}\nvoid loop() {}");
    const markdown = documentationToMarkdown(documentation);
    const html = documentationToHtml(documentation);

    expect(documentation.bom).toHaveLength(2);
    expect(markdown).toContain("# Docs Documentation");
    expect(markdown).toContain("LED without resistor");
    expect(markdown).toContain("```cpp");
    expect(html).toContain("<table>");
    expect(html).toContain("LED without resistor");
  });
});
