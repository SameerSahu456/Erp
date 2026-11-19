import path from "node:path";

import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // React Compiler (stable v1) — auto-memoizes components/hooks at build time so
  // the app no longer relies on hand-written memo/useMemo/useCallback. It runs as
  // a Babel pass via `reactCompilerPreset` (the only supported wiring on
  // @vitejs/plugin-react v6, which uses oxc rather than Babel for its own
  // transforms). Default "infer" mode: the compiler validates each component
  // against the Rules of React and silently skips any it can't prove safe — it
  // never breaks working code. The preset's filter already scopes this to app
  // JSX/TS files and excludes node_modules.
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "./src/shared"),
      "@modules": path.resolve(__dirname, "./src/modules"),
      "@app": path.resolve(__dirname, "./src/app"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Pull ONLY the always-loaded React ecosystem into one stable, long-cached
        // chunk so routine app-code changes don't force users to re-download React.
        // Everything else is deliberately left to Vite's automatic per-route
        // code-splitting, which already keeps feature/vendor code lazy — a catch-all
        // "vendor" chunk would wrongly make those lazy deps eager and bloat startup.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          // pnpm nests real packages under a second node_modules/, so resolve the
          // package name from the final node_modules segment.
          const tail = id.split("node_modules/").pop() ?? "";
          const pkg = tail.startsWith("@")
            ? tail.split("/").slice(0, 2).join("/")
            : tail.split("/")[0];
          // Just the stable React core (react-dom is the bulk of it). Router and
          // Query are intentionally left out so their lazily-used surface stays
          // in Vite's auto-split chunks rather than being forced eager.
          const REACT_CORE = new Set(["react", "react-dom", "scheduler", "react-is"]);
          if (REACT_CORE.has(pkg)) return "react-vendor";
        },
      },
    },
  },
  server: {
    port: 5173,
    // Bind on every interface, not just loopback, so the dev server is
    // reachable from other machines on the LAN — colleagues reviewing a
    // branch, or a phone testing the responsive layout. Equivalent to
    // passing `--host`, but persistent so nobody has to remember the flag.
    //
    // Note the API keeps working for those visitors WITHOUT exposing the
    // backend: the app calls relative `/api/v1/...`, which hits this
    // server, and the proxy below forwards it from THIS process to
    // localhost:8002. The backend never needs to leave loopback.
    host: true,
    allowedHosts: ["pre-prod-erp.comprint.co.in"],
    // Dev API proxy — the app calls relative `/api/v1/...`; without this the
    // Vite SPA fallback serves index.html for API calls (Content-Type text/html)
    // and every data view renders empty (Coding-guideline §6.7). Target is
    // env-overridable so it works whatever port the backend runs on.
    proxy: {
      "/api": {
        target: process.env.VITE_API_TARGET || "http://localhost:8002",
        changeOrigin: true,
      },
    },
  },
  preview: {
    allowedHosts: ["pre-prod-erp.comprint.co.in"],
  },
});
