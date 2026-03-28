import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import type { Topic, Repository } from "../src/github";

const API_URL = process.env.GH_API_URL || "https://api.github.com";
const TOKEN = process.env.GH_TOKEN || "";

const headers: Record<string, string> = {
  Accept: "application/vnd.github+json",
  "User-Agent": "topical-fetcher",
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

let rateLimitRemaining = Infinity;
let rateLimitReset = 0;

async function ghFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers });

  const remaining = res.headers.get("x-ratelimit-remaining");
  const reset = res.headers.get("x-ratelimit-reset");
  if (remaining) rateLimitRemaining = parseInt(remaining, 10);
  if (reset) rateLimitReset = parseInt(reset, 10);

  if (!res.ok) {
    if (res.status === 403 && rateLimitRemaining === 0) {
      const waitMs = rateLimitReset * 1000 - Date.now() + 1000;
      console.log(`  Rate limited. Waiting ${Math.ceil(waitMs / 1000)}s...`);
      await sleep(waitMs);
      return ghFetch(url);
    }
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pauseIfNeeded() {
  if (rateLimitRemaining < 10 && rateLimitRemaining > 0) {
    const waitMs = rateLimitReset * 1000 - Date.now() + 1000;
    if (waitMs > 0) {
      console.log(`  Rate limit low (${rateLimitRemaining}). Waiting ${Math.ceil(waitMs / 1000)}s...`);
      await sleep(waitMs);
    }
  }
}

async function main() {
  const root = join(import.meta.dirname, "..");
  const config = JSON.parse(readFileSync(join(root, "topics.json"), "utf-8"));
  const topicNames: string[] = config.topics;

  console.log(`Fetching data for ${topicNames.length} topics from ${API_URL}`);
  if (!TOKEN) console.log("Warning: No GH_TOKEN set. Rate limit is 60 req/hr.");

  const dataDir = join(root, "public", "data");
  const reposDir = join(dataDir, "repos");
  mkdirSync(reposDir, { recursive: true });

  const topics: Topic[] = [];

  for (let i = 0; i < topicNames.length; i++) {
    const name = topicNames[i];
    console.log(`[${i + 1}/${topicNames.length}] ${name} (rate limit: ${rateLimitRemaining})`);

    await pauseIfNeeded();

    // Fetch topic metadata and repos in parallel
    const [topicRes, repoRes] = await Promise.all([
      ghFetch<{ items: Topic[] }>(
        `${API_URL}/search/topics?q=${encodeURIComponent(name)}&per_page=5`
      ),
      ghFetch<{ total_count: number; items: Repository[] }>(
        `${API_URL}/search/repositories?q=${encodeURIComponent(`topic:${name}`)}&sort=stars&order=desc&per_page=30`
      ),
    ]);

    const match = topicRes.items.find(
      (t) => t.name.toLowerCase() === name.toLowerCase()
    );
    topics.push(
      match ?? {
        name,
        display_name: name,
        short_description: "",
        description: "",
        created_by: "",
        featured: false,
        curated: false,
      }
    );

    writeFileSync(
      join(reposDir, `${name}.json`),
      JSON.stringify(
        {
          topic: name,
          total_count: repoRes.total_count,
          repos: repoRes.items,
          generated_at: new Date().toISOString(),
        },
        null,
        2
      )
    );
  }

  writeFileSync(
    join(dataDir, "topics.json"),
    JSON.stringify(
      {
        topics,
        generated_at: new Date().toISOString(),
      },
      null,
      2
    )
  );

  console.log(`Done! Wrote ${topics.length} topics to public/data/`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
