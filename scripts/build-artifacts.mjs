// Bundle the two release artifacts ADR-0008 names: one file each, node-only, no browser.
// A handbook repo downloads these from the release page and runs them in its own CI — it never
// reads fusion's source, so everything they need (zod included) has to be inside the file.
// Run: npm run artifacts  ->  output/artifacts/scenario-check.mjs, review-cli.mjs
import { mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { rolldown } from "rolldown";
import { APP_VERSION } from "../src/lib/version.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const outDir = fileURLToPath(new URL("../output/artifacts/", import.meta.url));
mkdirSync(outDir, { recursive: true });

const sha = (() => {
  try {
    return execSync("git rev-parse --short HEAD", {
      cwd: root,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
})();

const targets = [
  {
    input: "src/cli/scenario-check-main.ts",
    file: "scenario-check.mjs",
    what: "剧本校验器 / scenario validator",
  },
  {
    input: "src/cli/review-cli-main.ts",
    file: "review-cli.mjs",
    what: "事件流 → 决策表投影 / event-stream projector",
  },
];

for (const target of targets) {
  const bundle = await rolldown({ input: target.input, platform: "node" });
  await bundle.write({
    format: "esm",
    file: `${outDir}${target.file}`,
    banner:
      `// fusion v${APP_VERSION} — ${target.what}\n` +
      `// built ${new Date().toISOString()} from ${sha}; single file, node >= 22, no browser.\n` +
      `// source of truth: fusion src/lib/scenario.ts / src/lib/review.ts (do not hand-edit)\n`,
  });
  await bundle.close();
  console.log(`wrote output/artifacts/${target.file}`);
}
