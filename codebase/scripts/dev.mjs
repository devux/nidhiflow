import { spawn } from "node:child_process";

const applications = [
  {
    name: "frontend",
    workspace: "@nidhiflow/frontend",
  },
  {
    name: "backend",
    workspace: "@nidhiflow/backend",
  },
];

const children = applications.map(({ name, workspace }) => {
  const child = spawn("npm", ["run", "dev", "--workspace", workspace], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      return;
    }

    if (code !== 0) {
      console.error(`${name} development process exited with code ${String(code)}.`);
      shutdown();
      process.exitCode = code ?? 1;
    }
  });

  return child;
});

let shuttingDown = false;

function shutdown() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
