import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { execSync } from "child_process";
import path from "path";

function getGhToken(): string {
  try {
    return execSync("gh auth token", { encoding: "utf-8" }).trim();
  } catch {
    return "";
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define:
    mode === "development"
      ? { __GH_TOKEN__: JSON.stringify(getGhToken()) }
      : {},
}));
