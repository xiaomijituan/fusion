import { useMemo } from "react";
import { mulberry32 } from "@/lib/rng";

type Layout = {
  /** virtual canvas the composition is designed on */
  w: number;
  h: number;
  cx: number;
  cy: number;
  rays: number;
  reach: number;
  spread: number;
  /** keep dots right of this x — the wide layout leaves the copy side clear */
  minX: number;
  glow: number;
  core: number;
  dim: number;
};

const SCENE: Layout = {
  w: 1200,
  h: 630,
  cx: 848,
  cy: 315,
  rays: 26,
  reach: 620,
  spread: 1.5,
  minX: 560,
  glow: 340,
  core: 26,
  dim: 1,
};

/** Narrow screen: the orb hangs off the top-right corner, the sky falls across the page. */
const CORNER: Layout = {
  w: 390,
  h: 844,
  cx: 398,
  cy: 128,
  rays: 22,
  reach: 470,
  spread: 1.25,
  minX: -9999,
  glow: 230,
  core: 18,
  dim: 0.7,
};

type Dot = { left: string; top: string; size: string; opacity: string };

/** The share card's sky: rays of starlight converging on one glowing point. */
export function StarField({
  seed = 20261002,
  variant = "scene",
}: {
  seed?: number;
  variant?: "scene" | "corner";
}) {
  const box = variant === "corner" ? CORNER : SCENE;

  const dots = useMemo<Dot[]>(() => {
    const rnd = mulberry32(seed);
    const out: Dot[] = [];
    for (let r = 0; r < box.rays; r += 1) {
      const base = (r / box.rays) * Math.PI * 2 + rnd() * 0.35;
      const points = 14 + Math.floor(rnd() * 10);
      for (let i = 0; i < points; i += 1) {
        const t = (i + 1) / points;
        const dist = 40 + t * (box.reach * 0.55 + rnd() * box.reach * 0.45);
        const ang = base + (rnd() - 0.5) * 0.22 * t;
        const x = box.cx + Math.cos(ang) * dist * box.spread;
        const y = box.cy + Math.sin(ang) * dist;
        if (x < box.minX || x > box.w + 60 || y < -60 || y > box.h + 60) continue;
        const near = 1 - Math.min(1, dist / box.reach);
        out.push({
          left: `${(x / box.w) * 100}%`,
          top: `${(y / box.h) * 100}%`,
          size: `${1.2 + near * 2.4 + rnd() * 0.8}px`,
          opacity: ((0.12 + near * 0.75) * box.dim).toFixed(2),
        });
      }
    }
    return out;
  }, [seed, box]);

  const at = { left: `${(box.cx / box.w) * 100}%`, top: `${(box.cy / box.h) * 100}%` };

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {dots.map((dot, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-accent"
          style={{
            left: dot.left,
            top: dot.top,
            width: dot.size,
            height: dot.size,
            opacity: dot.opacity,
          }}
        />
      ))}
      <span
        className="absolute rounded-full"
        style={{
          ...at,
          width: `${box.glow}px`,
          height: `${box.glow}px`,
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(circle, rgba(236,231,219,0.95) 0%, rgba(183,195,168,0.5) 26%, rgba(183,195,168,0.12) 55%, transparent 72%)",
        }}
      />
      <span
        className="absolute rounded-full bg-fg"
        style={{
          ...at,
          width: `${box.core}px`,
          height: `${box.core}px`,
          transform: "translate(-50%, -50%)",
        }}
      />
    </div>
  );
}
