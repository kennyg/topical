import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { execSync } from "child_process";
import path from "path";

function getGhToken(): string {
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  try {
    return execSync("gh auth token", { encoding: "utf-8" }).trim();
  } catch {
    return "";
  }
}

function getGhApiUrl(): string {
  if (process.env.GH_API_URL) return process.env.GH_API_URL;
  // Try to detect from gh CLI config (GHE)
  if (process.env.GH_HOST) return `https://${process.env.GH_HOST}/api/v3`;
  return "";
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
      ? {
          __GH_TOKEN__: JSON.stringify(getGhToken()),
          __GH_API_URL__: JSON.stringify(getGhApiUrl()),
        }
      : {
          __GH_TOKEN__: JSON.stringify(""),
          __GH_API_URL__: JSON.stringify(process.env.GH_API_URL ?? ""),
        },
}));
