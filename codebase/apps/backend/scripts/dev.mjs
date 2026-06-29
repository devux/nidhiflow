import { spawn } from "node:child_process";

const tsxCommand = process.platform === "win32" ? "tsx.cmd" : "tsx";
const watcher = spawn(tsxCommand, ["watch", "src/server.ts"], {
  stdio: ["ignore", "inherit", "inherit"],
});

function stopWatcher(signal) {
  if (watcher.exitCode === null && watcher.signalCode === null) {
    watcher.kill(signal);
  }
}

process.once("SIGINT", () => stopWatcher("SIGINT"));
process.once("SIGTERM", () => stopWatcher("SIGTERM"));

watcher.once("error", (error) => {
  console.error("Unable to start the backend development watcher.", error);
  process.exitCode = 1;
});

watcher.once("exit", (code, signal) => {
  if (signal === "SIGINT") {
    process.exitCode = 130;
    return;
  }

  if (signal === "SIGTERM") {
    process.exitCode = 143;
    return;
  }

  process.exitCode = code ?? 1;
});
