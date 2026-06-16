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

const notes = `# Arduino Circuit Visualizer v${packageJson.version}

## Public Release Summary

Arduino Circuit Visualizer is now available as a desktop-first Arduino workflow tool for circuit planning, code generation, project management, and beginner-friendly logic simulation.

## Highlights

- Desktop Electron app with native save/open/import/export flows
- Visual circuit editor with inspector, templates, undo/redo, and validation warnings
- Local app project library with recent projects and search
- Arduino starter sketch generation with \`.ino\` export
- Monaco-based code editor with \`.ino\`, \`.cpp\`, and \`.h\` import
- Beginner-friendly simulation workspace with serial monitor output
- Arduino CLI integration for compile, upload, and serial monitoring
- BOM and project documentation export
- Runtime plugin manifest support for future extension packs
- Windows packaging with installer and portable executable output

## Installer Output

- Windows installer: \`release/Arduino Circuit Visualizer Setup ${packageJson.version}.exe\`
- Windows portable: \`release/Arduino Circuit Visualizer ${packageJson.version}.exe\`

## Important Notes

- Generated code is a starter template and may require manual refinement.
- Simulation supports an educational Arduino subset and is not a full electrical simulator.
- Arduino CLI workflows require a local \`arduino-cli\` installation.

## Changelog

${changelog}
`;

const outputDir = path.join(root, "release-assets");
await mkdir(outputDir, { recursive: true });
const outputPath = path.join(outputDir, `release-notes-${packageJson.version}.md`);
const latestPath = path.join(outputDir, "release-notes-latest.md");
await writeFile(outputPath, notes, "utf8");
await writeFile(latestPath, notes, "utf8");
console.log(`Release notes written to ${outputPath}`);
