// Entry for the server-free single-file build (vite.sim.config.ts). The site mounts the same
// JustApp through TanStack Start; this mounts it directly, so the bundle has no router, no SSR
// and no platform plugins to fetch — which is what lets a chapter page vendor one html file.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { JustApp } from "@/components/just-app";
import "./styles.css";

const mount = document.getElementById("root");
if (mount) {
  createRoot(mount).render(
    <StrictMode>
      <JustApp />
    </StrictMode>,
  );
}
