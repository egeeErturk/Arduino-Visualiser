import { generateBom, bomToMarkdown } from "./bom.js";
import type { CircuitProject, ProjectDocumentation, ValidationWarning } from "./types.js";

export function buildProjectDocumentation(
  project: CircuitProject,
  warnings: ValidationWarning[],
  generatedCode: string,
): ProjectDocumentation {
  const componentsById = new Map(project.components.map((component) => [component.id, component]));

  return {
    title: `${project.metadata.name} Documentation`,
    projectName: project.metadata.name,
    generatedAt: new Date().toISOString(),
    metadata: project.metadata,
    components: project.components.map((component) => ({
      name: component.name,
      type: component.type,
      category: component.category,
      position: component.position,
      pinCount: component.pins.length,
    })),
    connections: project.connections.map((connection) => ({
      color: connection.color,
      fromComponent: componentsById.get(connection.fromComponentId)?.name ?? connection.fromComponentId,
      fromPin: componentsById.get(connection.fromComponentId)?.pins.find((pin) => pin.id === connection.fromPinId)?.label ?? connection.fromPinId,
      toComponent: componentsById.get(connection.toComponentId)?.name ?? connection.toComponentId,
      toPin: componentsById.get(connection.toComponentId)?.pins.find((pin) => pin.id === connection.toPinId)?.label ?? connection.toPinId,
    })),
    warnings,
    generatedCode,
    bom: generateBom(project),
  };
}

export function documentationToMarkdown(documentation: ProjectDocumentation) {
  return [
    `# ${documentation.title}`,
    "",
    "## Project Metadata",
    "",
    `- Name: ${documentation.metadata.name}`,
    `- Description: ${documentation.metadata.description || "None"}`,
    `- Author: ${documentation.metadata.author || "Unknown"}`,
    `- Board Type: ${documentation.metadata.boardType}`,
    `- Created: ${documentation.metadata.createdAt}`,
    `- Updated: ${documentation.metadata.updatedAt}`,
    `- Generated: ${documentation.generatedAt}`,
    "",
    "## Bill Of Materials",
    "",
    bomToMarkdown(documentation.bom),
    "## Components",
    "",
    ...documentation.components.map((component) =>
      `- ${component.name} | ${component.type} | ${component.category} | pins: ${component.pinCount} | position: (${component.position.x}, ${component.position.y})`,
    ),
    "",
    "## Connections",
    "",
    ...documentation.connections.map((connection) =>
      `- ${connection.fromComponent} ${connection.fromPin} -> ${connection.toComponent} ${connection.toPin} | ${connection.color}`,
    ),
    "",
    "## Warnings",
    "",
    ...(documentation.warnings.length > 0
      ? documentation.warnings.map((warning) => `- [${warning.severity}] ${warning.title}: ${warning.description}`)
      : ["- No active warnings."]),
    "",
    "## Generated Arduino Code",
    "",
    "```cpp",
    documentation.generatedCode.trimEnd(),
    "```",
    "",
  ].join("\n");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function documentationToHtml(documentation: ProjectDocumentation) {
  const warningItems = documentation.warnings.length > 0
    ? documentation.warnings.map((warning) => `<li><strong>[${warning.severity}] ${escapeHtml(warning.title)}</strong>: ${escapeHtml(warning.description)}</li>`).join("")
    : "<li>No active warnings.</li>";

  const componentRows = documentation.components.map((component) =>
    `<tr><td>${escapeHtml(component.name)}</td><td>${escapeHtml(component.type)}</td><td>${escapeHtml(component.category)}</td><td>${component.pinCount}</td><td>${component.position.x}, ${component.position.y}</td></tr>`,
  ).join("");

  const connectionRows = documentation.connections.map((connection) =>
    `<tr><td>${escapeHtml(connection.fromComponent)}</td><td>${escapeHtml(connection.fromPin)}</td><td>${escapeHtml(connection.toComponent)}</td><td>${escapeHtml(connection.toPin)}</td><td>${escapeHtml(connection.color)}</td></tr>`,
  ).join("");

  const bomRows = documentation.bom.map((item) =>
    `<tr><td>${escapeHtml(item.category)}</td><td>${escapeHtml(item.type)}</td><td>${escapeHtml(item.name)}</td><td>${item.quantity}</td><td>${escapeHtml(item.references.join(", "))}</td></tr>`,
  ).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(documentation.title)}</title>
  <style>
    body { font-family: "Segoe UI", sans-serif; margin: 32px; color: #0f172a; }
    h1, h2 { color: #0f3b78; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #e2e8f0; }
    code, pre { font-family: Consolas, monospace; background: #e2e8f0; }
    pre { padding: 16px; border-radius: 12px; overflow: auto; }
  </style>
</head>
<body>
  <h1>${escapeHtml(documentation.title)}</h1>
  <p><strong>Board:</strong> ${escapeHtml(documentation.metadata.boardType)}<br />
  <strong>Author:</strong> ${escapeHtml(documentation.metadata.author || "Unknown")}<br />
  <strong>Generated:</strong> ${escapeHtml(documentation.generatedAt)}</p>
  <h2>Bill Of Materials</h2>
  <table><thead><tr><th>Category</th><th>Type</th><th>Name</th><th>Qty</th><th>References</th></tr></thead><tbody>${bomRows}</tbody></table>
  <h2>Components</h2>
  <table><thead><tr><th>Name</th><th>Type</th><th>Category</th><th>Pins</th><th>Position</th></tr></thead><tbody>${componentRows}</tbody></table>
  <h2>Connections</h2>
  <table><thead><tr><th>From</th><th>Pin</th><th>To</th><th>Pin</th><th>Color</th></tr></thead><tbody>${connectionRows}</tbody></table>
  <h2>Warnings</h2>
  <ul>${warningItems}</ul>
  <h2>Generated Arduino Code</h2>
  <pre><code>${escapeHtml(documentation.generatedCode)}</code></pre>
</body>
</html>`;
}
