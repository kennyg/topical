declare const __GH_API_URL__: string;

const CONFIGURED_API =
  typeof __GH_API_URL__ !== "undefined" && __GH_API_URL__
    ? __GH_API_URL__
    : "https://api.github.com";

// In dev, Vite proxies /ghapi to the real API with auth headers server-side.
// In prod, hit the configured API directly (no token in client bundle).
const IS_DEV = import.meta.env.DEV;
const GITHUB_API = IS_DEV ? "/ghapi" : CONFIGURED_API;

export type SortKey = "stars" | "forks" | "updated";

export interface Topic {
  name: string;
  display_name: string;
  short_description: string;
  description: string;
  created_by: string;
  featured: boolean;
  curated: boolean;
}

export interface Repository {
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

export interface SearchTopicsResponse {
  total_count: number;
  items: Topic[];
}

export interface SearchReposResponse {
  total_count: number;
  items: Repository[];
}

export interface RateLimit {
  remaining: number;
  limit: number;
  reset: number;
}

const headers: HeadersInit = {
  Accept: "application/vnd.github+json",
};

let _rateLimit: RateLimit = { remaining: -1, limit: -1, reset: 0 };
const rateLimitListeners = new Set<(rl: RateLimit) => void>();

export function onRateLimitChange(fn: (rl: RateLimit) => void) {
  rateLimitListeners.add(fn);
  if (_rateLimit.remaining >= 0) fn(_rateLimit);
  return () => { rateLimitListeners.delete(fn); };
}

function updateRateLimit(res: Response) {
  const remaining = res.headers.get("x-ratelimit-remaining");
  const limit = res.headers.get("x-ratelimit-limit");
  const reset = res.headers.get("x-ratelimit-reset");
  if (remaining && limit) {
    const next: RateLimit = {
      remaining: parseInt(remaining, 10),
      limit: parseInt(limit, 10),
      reset: reset ? parseInt(reset, 10) : 0,
    };
    if (next.remaining !== _rateLimit.remaining || next.limit !== _rateLimit.limit) {
      _rateLimit = next;
      rateLimitListeners.forEach((fn) => fn(_rateLimit));
    }
  }
}

export async function ghFetch<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { headers, signal });
  updateRateLimit(res);
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

export async function searchTopics(query: string, signal?: AbortSignal): Promise<SearchTopicsResponse> {
  return ghFetch(`${GITHUB_API}/search/topics?q=${encodeURIComponent(query)}&per_page=20`, signal);
}

export async function getTopicRepos(
  topic: string,
  sort: SortKey = "stars",
  language: string = "",
  page: number = 1,
  signal?: AbortSignal
): Promise<SearchReposResponse> {
  let q = `topic:${topic}`;
  if (language) q += ` language:${language}`;
  return ghFetch(
    `${GITHUB_API}/search/repositories?q=${encodeURIComponent(q)}&sort=${sort}&order=desc&per_page=30&page=${page}`,
    signal
  );
}
