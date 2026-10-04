// Render the Fusion share card (og.jpg) with real text at exact brand tokens.
// Run: node scripts/make-og.mjs  → writes public/og.jpg (1200x630 @2x, JPEG)
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const out = `${root}public/og.jpg`;
mkdirSync(`${root}public`, { recursive: true });

const W = 1200;
const H = 630;

const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      :root {
        --bg: #0e0e0c;
        --paper: #ece7db;
        --sage: #b7c3a8;
      }
      * { margin: 0; box-sizing: border-box; }
      html, body { width: ${W}px; height: ${H}px; overflow: hidden; }
      body {
        background: var(--bg);
        color: var(--paper);
        font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
        position: relative;
      }
      #field { position: absolute; inset: 0; }
      .dot { position: absolute; border-radius: 50%; background: var(--sage); }
      #orb {
        position: absolute; left: 848px; top: 315px; width: 0; height: 0;
      }
      #orb::before {
        content: ""; position: absolute; left: -150px; top: -150px; width: 300px; height: 300px;
        border-radius: 50%;
        background: radial-gradient(circle,
          rgba(236,231,219,.95) 0%, rgba(183,195,168,.55) 26%, rgba(183,195,168,.12) 55%, transparent 72%);
      }
      #orb::after {
        content: ""; position: absolute; left: -14px; top: -14px; width: 28px; height: 28px;
        border-radius: 50%; background: var(--paper);
      }
      #copy { position: absolute; left: 84px; top: 128px; width: 640px; }
      .kicker {
        font-family: "IBM Plex Mono", Consolas, monospace;
        font-size: 15px; letter-spacing: .28em; color: var(--sage);
        text-transform: uppercase;
      }
      h1 {
        margin-top: 22px; font-family: Georgia, "Times New Roman", serif;
        font-weight: 600; font-size: 118px; line-height: 1; letter-spacing: -.01em;
      }
      .zh {
        margin-top: 14px; font-size: 54px; font-weight: 600; letter-spacing: .34em;
        color: var(--paper);
      }
      .slogan {
        margin-top: 40px; font-family: KaiTi, "STKaiti", Georgia, serif;
        font-style: italic; font-size: 27px; color: var(--sage); letter-spacing: .06em;
      }
      .sub {
        margin-top: 12px; font-family: Georgia, serif; font-style: italic;
        font-size: 17px; color: rgba(236,231,219,.55);
      }
      #foot {
        position: absolute; left: 84px; bottom: 56px;
        font-family: "IBM Plex Mono", Consolas, monospace;
        font-size: 14px; letter-spacing: .12em; color: rgba(236,231,219,.42);
      }
      #rule { position: absolute; left: 84px; bottom: 96px; width: 56px; height: 2px; background: var(--sage); opacity: .8; }
    </style>
  </head>
  <body>
    <div id="field"></div>
    <div id="orb"></div>
    <div id="copy">
      <div class="kicker">Multi-agent coding floor</div>
      <h1>Fusion</h1>
      <div class="zh">聚变</div>
      <div class="slogan">千万亿点星光——聚变。</div>
      <div class="sub">Millions of points of starlight — fusion.</div>
    </div>
    <div id="rule"></div>
    <div id="foot">An interactive simulator for teaching how humans run agent floors</div>
    <script>
      function mulberry32(a) {
        return function () {
          a |= 0; a = (a + 0x6d2b79f5) | 0;
          let t = Math.imul(a ^ (a >>> 15), 1 | a);
          t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      }
      const rnd = mulberry32(20261002);
      const CX = 848, CY = 315;
      const field = document.getElementById("field");
      const rays = 26;
      for (let r = 0; r < rays; r++) {
        const base = (r / rays) * Math.PI * 2 + rnd() * 0.35;
        const pts = 14 + Math.floor(rnd() * 10);
        for (let i = 0; i < pts; i++) {
          const t = (i + 1) / pts;
          const dist = 60 + t * (330 + rnd() * 260);
          const ang = base + (rnd() - 0.5) * 0.22 * t;
          const x = CX + Math.cos(ang) * dist * 1.5;
          const y = CY + Math.sin(ang) * dist;
          if (x < 700 || x > ${W + 40} || y < -20 || y > ${H + 20}) continue;
          const near = 1 - Math.min(1, dist / 620);
          const el = document.createElement("div");
          el.className = "dot";
          const size = 1.2 + near * 2.4 + rnd() * 0.8;
          el.style.width = size + "px";
          el.style.height = size + "px";
          el.style.left = x + "px";
          el.style.top = y + "px";
          el.style.opacity = (0.12 + near * 0.75).toFixed(2);
          field.appendChild(el);
        }
      }
    </script>
  </body>
</html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: "load" });
await page.waitForTimeout(300);
await page.screenshot({ path: out, type: "jpeg", quality: 86 });
await browser.close();
console.log(`wrote ${out}`);
