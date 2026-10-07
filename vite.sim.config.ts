// A server-free build of the same simulator: ONE html file a reader can double-click. That is
// what a handbook chapter vendors into its iframe (ADR-0008). file:// refuses module fetches, so
// the script and the stylesheet are inlined into the document instead of left as siblings.
import { readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";
import { APP_VERSION } from "./src/lib/version.ts";

const outDir = fileURLToPath(new URL("output/sim/", import.meta.url));

function inlineIntoSingleFile(): Plugin {
  return {
    name: "fusion:single-file-sim",
    apply: "build",
    closeBundle() {
      const assets = join(outDir, "assets");
      const js = readdirSync(assets).find((f) => f.endsWith(".js"));
      const css = readdirSync(assets).find((f) => f.endsWith(".css"));
      if (!js || !css) throw new Error(`expected one js and one css under ${assets}`);
      const style = readFileSync(join(outDir, "assets", css), "utf8");
      // A literal </script> would close the tag early; \/ is the same character to JS.
      const script = readFileSync(join(outDir, "assets", js), "utf8").replace(
        /<\/script>/g,
        "<\\/script>",
      );
      // Replacement *functions*, not strings: minified code is full of $' and $` sequences that
      // String.replace would otherwise splice in as literal substrings of this very document.
      const doc = readFileSync(join(outDir, "sim.html"), "utf8")
        .replace(/<link rel="stylesheet"[^>]*>/, () => `<style>\n${style}\n</style>`)
        .replace(
          /<script type="module"[^>]*><\/script>/,
          () => `<script type="module">\n${script}\n</script>`,
        );
      const target = `fusion-sim-${APP_VERSION}.html`;
      writeFileSync(join(outDir, target), doc);
      rmSync(join(outDir, "sim.html"), { force: true });
      rmSync(assets, { recursive: true, force: true });
      console.log(`wrote output/sim/${target} (${Math.round(doc.length / 1024)} KB)`);
    },
  };
}

export default defineConfig({
  base: "./",
  resolve: { tsconfigPaths: true },
  plugins: [react(), tailwindcss(), inlineIntoSingleFile()],
  build: {
    outDir: "output/sim",
    emptyOutDir: true,
    cssCodeSplit: false,
    // Everything the stylesheet can reference (fonts, icons) becomes a data URI, because a
    // single file has nowhere to fetch siblings from.
    assetsInlineLimit: 100_000_000,
    rollupOptions: {
      input: "sim.html",
      output: {
        inlineDynamicImports: true,
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
