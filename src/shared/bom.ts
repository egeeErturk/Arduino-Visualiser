import type { BomItem, CircuitProject } from "./types.js";

export function generateBom(project: CircuitProject): BomItem[] {
  const byType = new Map<string, BomItem>();

  for (const component of project.components) {
    const existing = byType.get(component.type);
    if (existing) {
      existing.quantity += 1;
      existing.references.push(component.name);
      continue;
    }

    byType.set(component.type, {
      key: component.type,
      type: component.type,
      name: component.name,
      category: component.category,
      quantity: 1,
      references: [component.name],
    });
  }

  return [...byType.values()].sort((left, right) => left.category.localeCompare(right.category) || left.name.localeCompare(right.name));
}

export function bomToCsv(items: BomItem[]) {
  const escape = (value: string | number) => `"${String(value).replace(/"/g, "\"\"")}"`;
  const rows = [
    ["Category", "Type", "Display Name", "Quantity", "References"],
    ...items.map((item) => [
      item.category,
      item.type,
      item.name,
      item.quantity,
      item.references.join("; "),
    ]),
  ];

  return rows.map((row) => row.map(escape).join(",")).join("\n");
}

export function bomToMarkdown(items: BomItem[]) {
  const header = "| Category | Type | Display Name | Quantity | References |\n| --- | --- | --- | ---: | --- |";
  const rows = items.map((item) =>
    `| ${item.category} | ${item.type} | ${item.name} | ${item.quantity} | ${item.references.join(", ")} |`,
  );
  return [header, ...rows, ""].join("\n");
}
