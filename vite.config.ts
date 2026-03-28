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
  if (process.env.GH_HOST) return `https://${process.env.GH_HOST}/api/v3`;
  return "";
}

export default defineConfig(({ mode }) => {
  const ghApiUrl =
    mode === "development" ? getGhApiUrl() : (process.env.GH_API_URL ?? "");

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      __DATA_MODE__: JSON.stringify(process.env.DATA_MODE ?? "api"),
      __GH_API_URL__: JSON.stringify(ghApiUrl),
      // Token is never inlined in the client bundle — proxied in dev
      __GH_TOKEN__: JSON.stringify(""),
    },
    server: {
      proxy: mode === "development"
        ? {
            "/ghapi": {
              target: ghApiUrl || "https://api.github.com",
              changeOrigin: true,
              rewrite: (path: string) => path.replace(/^\/ghapi/, ""),
              headers: {
                ...(getGhToken()
                  ? { Authorization: `Bearer ${getGhToken()}` }
                  : {}),
              },
            },
          }
        : undefined,
    },
  };
});
