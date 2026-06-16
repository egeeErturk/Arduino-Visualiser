import { BrowserWindow } from "electron";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import type { ArduinoCliConfig, ArduinoCliStatus, ArduinoCommandResult, ArduinoDetectedPort } from "../shared/types.js";

interface ArduinoDesktopStateAccess {
  readConfig(): Promise<ArduinoCliConfig>;
  writeConfig(config: ArduinoCliConfig): Promise<void>;
  getWindow(): BrowserWindow | null;
}

function normalizeCliExecutable(cliPath: string | null) {
  return cliPath?.trim() || "arduino-cli";
}

function runCommand(command: string, args: string[]) {
  return new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve) => {
    const child = spawn(command, args, {
      windowsHide: true,
      shell: false,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      resolve({ stdout, stderr: stderr || error.message, exitCode: 1 });
    });

    child.on("close", (exitCode) => {
      resolve({ stdout, stderr, exitCode: exitCode ?? 1 });
    });
  });
}

function parseBoardListOutput(raw: string): ArduinoDetectedPort[] {
  try {
    const parsed = JSON.parse(raw) as {
      detected_ports?: Array<{
        port?: { address?: string; label?: string; protocol?: string; properties?: { address?: string } };
        matching_boards?: Array<{ name?: string; fqbn?: string }>;
      }>;
      ports?: Array<{
        address?: string;
        label?: string;
        protocol?: string;
        matching_boards?: Array<{ name?: string; fqbn?: string }>;
      }>;
    };

    const source = parsed.detected_ports ?? parsed.ports ?? [];
    return source.map((entry) => {
      const port = "port" in entry && entry.port ? entry.port : {
        address: "address" in entry ? entry.address : undefined,
        label: "label" in entry ? entry.label : undefined,
        protocol: "protocol" in entry ? entry.protocol : undefined,
        properties: undefined,
      };
      const matchingBoard = entry.matching_boards?.[0];
      return {
        address: port.address ?? port.properties?.address ?? "Unknown",
        label: port.label ?? port.address ?? "Unknown port",
        protocol: port.protocol ?? null,
        boardName: matchingBoard?.name ?? null,
        fqbn: matchingBoard?.fqbn ?? null,
      };
    });
  } catch {
    return raw
      .split(/\r?\n/)
      .slice(1)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [address, protocol = "", type = ""] = line.split(/\s{2,}/);
        return {
          address,
          label: address,
          protocol: protocol || null,
          boardName: type || null,
          fqbn: null,
        };
      });
  }
}

export function createArduinoService(access: ArduinoDesktopStateAccess) {
  let monitorProcess: ReturnType<typeof spawn> | null = null;

  async function getConfig() {
    return access.readConfig();
  }

  async function setConfig(config: Partial<ArduinoCliConfig>) {
    const current = await access.readConfig();
    const nextConfig: ArduinoCliConfig = {
      cliPath: config.cliPath ?? current.cliPath,
      serialBaudRate: config.serialBaudRate ?? current.serialBaudRate,
    };
    await access.writeConfig(nextConfig);
    return nextConfig;
  }

  async function detectCli(): Promise<ArduinoCliStatus> {
    const config = await access.readConfig();
    const cliPath = normalizeCliExecutable(config.cliPath);
    const result = await runCommand(cliPath, ["version"]);
    if (result.exitCode !== 0) {
      return {
        found: false,
        cliPath: config.cliPath,
        version: null,
        error: result.stderr.trim() || "Arduino CLI was not found.",
      };
    }

    return {
      found: true,
      cliPath: config.cliPath ?? cliPath,
      version: result.stdout.trim() || result.stderr.trim() || "Unknown version",
      error: null,
    };
  }

  async function listBoardsAndPorts() {
    const config = await access.readConfig();
    const cliPath = normalizeCliExecutable(config.cliPath);
    const result = await runCommand(cliPath, ["board", "list", "--json"]);
    if (result.exitCode !== 0) {
      return {
        success: false,
        output: result.stdout,
        error: result.stderr.trim() || "Could not list connected boards.",
        ports: [] as ArduinoDetectedPort[],
      };
    }

    return {
      success: true,
      output: result.stdout,
      error: null,
      ports: parseBoardListOutput(result.stdout),
    };
  }

  async function materializeSketch(sketchName: string, sketchCode: string) {
    const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "arduino-circuit-visualizer-"));
    const sketchDir = path.join(baseDir, sketchName);
    await fs.mkdir(sketchDir, { recursive: true });
    const sketchPath = path.join(sketchDir, `${sketchName}.ino`);
    await fs.writeFile(sketchPath, sketchCode, "utf8");
    return { sketchDir, sketchPath };
  }

  async function compileSketch(payload: { sketchName: string; sketchCode: string; fqbn: string }): Promise<ArduinoCommandResult> {
    const config = await access.readConfig();
    const cliPath = normalizeCliExecutable(config.cliPath);
    const { sketchDir, sketchPath } = await materializeSketch(payload.sketchName, payload.sketchCode);
    const args = ["compile", "--fqbn", payload.fqbn, sketchDir];
    const result = await runCommand(cliPath, args);
    return {
      success: result.exitCode === 0,
      command: `${cliPath} ${args.join(" ")}`,
      output: result.stdout || result.stderr,
      error: result.exitCode === 0 ? null : result.stderr.trim() || "Compile failed.",
      sketchPath,
    };
  }

  async function uploadSketch(payload: { sketchName: string; sketchCode: string; fqbn: string; port: string }): Promise<ArduinoCommandResult> {
    const config = await access.readConfig();
    const cliPath = normalizeCliExecutable(config.cliPath);
    const { sketchDir, sketchPath } = await materializeSketch(payload.sketchName, payload.sketchCode);
    const args = ["upload", "-p", payload.port, "--fqbn", payload.fqbn, sketchDir];
    const result = await runCommand(cliPath, args);
    return {
      success: result.exitCode === 0,
      command: `${cliPath} ${args.join(" ")}`,
      output: result.stdout || result.stderr,
      error: result.exitCode === 0 ? null : result.stderr.trim() || "Upload failed.",
      sketchPath,
    };
  }

  function stopSerialMonitor() {
    if (monitorProcess) {
      monitorProcess.kill();
      monitorProcess = null;
    }
    return { success: true };
  }

  async function startSerialMonitor(payload: { port: string; baudRate?: number }) {
    stopSerialMonitor();
    const config = await access.readConfig();
    const cliPath = normalizeCliExecutable(config.cliPath);
    const baudRate = payload.baudRate ?? config.serialBaudRate;
    const args = ["monitor", "-p", payload.port, "-c", `baudrate=${baudRate}`];
    const window = access.getWindow();

    monitorProcess = spawn(cliPath, args, {
      windowsHide: true,
      shell: false,
    });

    monitorProcess.stdout?.on("data", (chunk) => {
      window?.webContents.send("arduino:monitor-data", { stream: "stdout", data: chunk.toString() });
    });
    monitorProcess.stderr?.on("data", (chunk) => {
      window?.webContents.send("arduino:monitor-data", { stream: "stderr", data: chunk.toString() });
    });
    monitorProcess.on("close", () => {
      window?.webContents.send("arduino:monitor-data", { stream: "status", data: "Serial monitor stopped.\n" });
      monitorProcess = null;
    });
    monitorProcess.on("error", (error) => {
      window?.webContents.send("arduino:monitor-data", { stream: "stderr", data: `${error.message}\n` });
      monitorProcess = null;
    });

    return {
      success: true,
      command: `${cliPath} ${args.join(" ")}`,
    };
  }

  return {
    getConfig,
    setConfig,
    detectCli,
    listBoardsAndPorts,
    compileSketch,
    uploadSketch,
    startSerialMonitor,
    stopSerialMonitor,
  };
}
