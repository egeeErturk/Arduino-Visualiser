/* global console, process */

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function prependPathSegment(existingPath, segment) {
  if (!segment) {
    return existingPath ?? "";
  }

  const currentParts = (existingPath ?? "").split(path.delimiter).filter(Boolean);
  if (currentParts.includes(segment)) {
    return existingPath ?? "";
  }

  return [segment, ...currentParts].join(path.delimiter);
}

const env = { ...process.env };
const nodeBinDir = path.dirname(process.execPath);
env.PATH = prependPathSegment(env.PATH, nodeBinDir);

for (const stalePath of [
  path.resolve("release", "win-unpacked"),
  path.resolve("release", "win-unpacked.tmp"),
]) {
  if (fs.existsSync(stalePath)) {
    fs.rmSync(stalePath, { recursive: true, force: true });
  }
}

const systemRoot = process.env.SystemRoot ?? process.env.WINDIR;
if (systemRoot) {
  env.PATH = prependPathSegment(env.PATH, systemRoot);
  env.PATH = prependPathSegment(env.PATH, path.join(systemRoot, "System32"));
  env.PATH = prependPathSegment(env.PATH, path.join(systemRoot, "System32", "WindowsPowerShell", "v1.0"));
}

{
  const shimDir = fs.mkdtempSync(path.join(os.tmpdir(), "arduino-circuit-visualizer-npm-"));
  const nodeExecutable = process.execPath.replaceAll("\\", "\\\\");
  const npmExecutable = process.env.npm_execpath?.replaceAll("\\", "\\\\") ?? "";
  const npmCmdPath = path.join(shimDir, "npm.cmd");
  const npmShimScriptPath = path.join(shimDir, "npm-shim.cjs");
  const npmShimScript = `
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const args = process.argv.slice(2);
const firstArg = args[0] || "";

function outputDependencyTree() {
  const packageJson = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8"));
  const tree = {
    name: packageJson.name || "arduino-circuit-visualizer",
    version: packageJson.version || "1.0.0",
    path: process.cwd(),
    dependencies: {},
  };
  process.stdout.write(JSON.stringify(tree));
}

if (firstArg === "list" || firstArg === "ls") {
  outputDependencyTree();
  process.exit(0);
}

const npmExecPath = ${JSON.stringify(process.env.npm_execpath ?? "")};
if (npmExecPath && fs.existsSync(npmExecPath)) {
  const child = spawnSync(process.execPath, [npmExecPath, ...args], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  });
  process.exit(child.status ?? 1);
}

process.stderr.write("npm shim could not satisfy command: " + args.join(" ") + "\\n");
process.exit(1);
`;
  const npmShim = `@echo off\r\n"${nodeExecutable}" "${npmShimScriptPath.replaceAll("\\", "\\\\")}" %*\r\n`;

  fs.writeFileSync(npmShimScriptPath, npmShimScript, "utf8");
  fs.writeFileSync(npmCmdPath, npmShim, "utf8");
  env.PATH = prependPathSegment(env.PATH, shimDir);
  if (npmExecutable) {
    env.npm_execpath = npmExecutable;
  }
}

const electronBuilderCli = path.resolve("node_modules", "electron-builder", "cli.js");
const child = spawn(process.execPath, [electronBuilderCli], {
  stdio: "inherit",
  env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
