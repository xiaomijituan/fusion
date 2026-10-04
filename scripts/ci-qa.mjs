// Serve the production build and run the browser QA walk against it.
// Used by CI (and runnable locally): node scripts/ci-qa.mjs
import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const PORT = 8081;
const URL_TO_CHECK = `http://127.0.0.1:${PORT}/`;
const READY_TIMEOUT_MS = 90_000;

if (!existsSync(join(root, ".vercel", "output"))) {
  console.error("no .vercel/output — run npm run build first (CI does this before the QA step).");
  process.exit(2);
}

// Spawn node directly instead of `npm run preview`: on Windows `spawn("npm")`
// misses the .cmd shim (ENOENT), and this is exactly what that script runs.
const server = spawn(process.execPath, ["scripts/with-app-env.mjs", "vite", "preview"], {
  cwd: root,
  detached: process.platform !== "win32",
  stdio: ["ignore", "ignore", "inherit"],
});

function stopServer() {
  if (!server.pid) return;
  try {
    if (process.platform === "win32") {
      // the wrapper spawns vite as a grandchild; kill the whole tree
      spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      process.kill(-server.pid, "SIGTERM");
    }
  } catch {
    // already gone
  }
}

async function waitForReady() {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(URL_TO_CHECK, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return true;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function run(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd: root, stdio: "inherit" });
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

let exitCode = 1;
try {
  if (!(await waitForReady())) {
    console.error(
      `preview server never answered on ${URL_TO_CHECK} within ${READY_TIMEOUT_MS / 1000}s`,
    );
  } else {
    console.log(`preview up on ${URL_TO_CHECK} — running the QA walk`);
    exitCode = await run(["output/qa-local.mjs", URL_TO_CHECK]);
  }
} finally {
  stopServer();
}
process.exit(exitCode);
