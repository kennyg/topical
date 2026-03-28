import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const API_URL = process.env.GH_API_URL || "https://api.github.com";
const TOKEN = process.env.GH_TOKEN || "";

const headers: Record<string, string> = {
  Accept: "application/vnd.github+json",
  "User-Agent": "topical-fetcher",
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

interface RateLimit {
  remaining: number;
  reset: number;
}

let rateLimit: RateLimit = { remaining: Infinity, reset: 0 };

async function ghFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers });

  const remaining = res.headers.get("x-ratelimit-remaining");
  const reset = res.headers.get("x-ratelimit-reset");
  if (remaining) rateLimit.remaining = parseInt(remaining, 10);
  if (reset) rateLimit.reset = parseInt(reset, 10);

  if (!res.ok) {
    if (res.status === 403 && rateLimit.remaining === 0) {
      const waitMs = (rateLimit.reset * 1000) - Date.now() + 1000;
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
  if (rateLimit.remaining < 10 && rateLimit.remaining > 0) {
    const waitMs = (rateLimit.reset * 1000) - Date.now() + 1000;
    if (waitMs > 0) {
      console.log(`  Rate limit low (${rateLimit.remaining}). Waiting ${Math.ceil(waitMs / 1000)}s...`);
      await sleep(waitMs);
    }
  }
}

interface TopicResult {
  name: string;
  display_name: string;
  short_description: string;
  description: string;
  created_by: string;
  featured: boolean;
  curated: boolean;
}

interface RepoResult {
  id: number;
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  updated_at: string;
  owner: {
    login: string;
    avatar_url: string;
  };
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

  const topics: TopicResult[] = [];

  for (let i = 0; i < topicNames.length; i++) {
    const name = topicNames[i];
    console.log(`[${i + 1}/${topicNames.length}] ${name} (rate limit: ${rateLimit.remaining})`);

    // Fetch topic metadata
    await pauseIfNeeded();
    const topicRes = await ghFetch<{ items: TopicResult[] }>(
      `${API_URL}/search/topics?q=${encodeURIComponent(name)}&per_page=5`
    );
    const match = topicRes.items.find(
      (t) => t.name.toLowerCase() === name.toLowerCase()
    );
    if (match) {
      topics.push(match);
    } else {
      // Create a minimal entry if no exact match
      topics.push({
        name,
        display_name: name,
        short_description: "",
        description: "",
        created_by: "",
        featured: false,
        curated: false,
      });
    }

    // Fetch top repos
    await pauseIfNeeded();
    const repoRes = await ghFetch<{ total_count: number; items: RepoResult[] }>(
      `${API_URL}/search/repositories?q=${encodeURIComponent(`topic:${name}`)}&sort=stars&order=desc&per_page=30`
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

  // Write topic index
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
