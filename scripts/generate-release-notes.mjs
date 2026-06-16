/* global console, process */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const changelogPath = path.join(root, "CHANGELOG.md");
let changelog = "";

try {
  changelog = await readFile(changelogPath, "utf8");
} catch {
  changelog = "# Changelog\n\n## Unreleased\n\n- Initial release notes pending.\n";
}

const notes = `# Release Notes ${packageJson.version}

## Highlights

- Runtime plugin loading from the desktop plugin directory
- Bill of materials export in CSV and Markdown
- Project documentation export in Markdown, HTML, and PDF
- Additional built-in boards: ESP32 DevKit V1, ESP8266 NodeMCU, Raspberry Pi Pico
- Windows desktop packaging through Electron Builder

## Changelog Snapshot

${changelog}
`;

const outputDir = path.join(root, "release-assets");
await mkdir(outputDir, { recursive: true });
const outputPath = path.join(outputDir, `release-notes-${packageJson.version}.md`);
const latestPath = path.join(outputDir, "release-notes-latest.md");
await writeFile(outputPath, notes, "utf8");
await writeFile(latestPath, notes, "utf8");
console.log(`Release notes written to ${outputPath}`);
