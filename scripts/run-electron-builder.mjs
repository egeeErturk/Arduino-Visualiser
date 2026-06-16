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

const systemRoot = process.env.SystemRoot ?? process.env.WINDIR;
if (systemRoot) {
  env.PATH = prependPathSegment(env.PATH, systemRoot);
  env.PATH = prependPathSegment(env.PATH, path.join(systemRoot, "System32"));
  env.PATH = prependPathSegment(env.PATH, path.join(systemRoot, "System32", "WindowsPowerShell", "v1.0"));
}

if (process.env.npm_execpath) {
  const shimDir = fs.mkdtempSync(path.join(os.tmpdir(), "arduino-circuit-visualizer-npm-"));
  const nodeExecutable = process.execPath.replaceAll("\\", "\\\\");
  const npmExecutable = process.env.npm_execpath.replaceAll("\\", "\\\\");
  const npmCmdPath = path.join(shimDir, "npm.cmd");
  const npmShim = `@echo off\r\n"${nodeExecutable}" "${npmExecutable}" %*\r\n`;

  fs.writeFileSync(npmCmdPath, npmShim, "utf8");
  env.PATH = prependPathSegment(env.PATH, shimDir);
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
