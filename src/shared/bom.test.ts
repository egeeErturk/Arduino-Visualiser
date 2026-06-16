import { describe, expect, it } from "vitest";
import { bomToCsv, bomToMarkdown, generateBom } from "./bom.js";
import { connect, createProject, placeComponent } from "./testUtils.js";

describe("BOM generator", () => {
  it("groups identical component types and preserves references", () => {
    const project = createProject("BOM");
    const ledA = placeComponent("led", { x: 10, y: 10 }, "LED A");
    const ledB = placeComponent("led", { x: 30, y: 10 }, "LED B");
    const resistor = placeComponent("resistor", { x: 20, y: 30 }, "R1");
    project.components = [ledA, ledB, resistor];
    project.connections = [connect(resistor.id, "right", ledA.id, "anode")];

    const items = generateBom(project);

    expect(items).toHaveLength(2);
    expect(items.find((item) => item.type === "led")).toMatchObject({
      quantity: 2,
      references: ["LED A", "LED B"],
    });
  });

  it("exports CSV and Markdown headings", () => {
    const project = createProject("Exports");
    project.components = [placeComponent("arduino-uno", { x: 0, y: 0 }, "Uno")];

    const items = generateBom(project);
    expect(bomToCsv(items)).toContain("\"Category\",\"Type\",\"Display Name\",\"Quantity\",\"References\"");
    expect(bomToMarkdown(items)).toContain("| Category | Type | Display Name | Quantity | References |");
  });
});
