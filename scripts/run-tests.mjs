// Cross-platform test runner: `node --test 'scripts/**/*.test.mjs'` only expands
// on POSIX shells, so npm on Windows silently ran a subset. Resolve the files
// here and spawn node --test with an explicit list.
import { spawnSync } from "node:child_process";
import { globSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

const suites = [
  { files: globSync("scripts/*.test.mjs", { cwd: root }).sort(), flags: [] },
  {
    files: globSync("src/**/*.test.ts", { cwd: root }).sort(),
    flags: ["--experimental-strip-types"],
  },
];

for (const suite of suites) {
  if (suite.files.length === 0) {
    console.error("run-tests: no test files matched");
    process.exit(1);
  }
  const result = spawnSync(process.execPath, [...suite.flags, "--test", ...suite.files], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
