const GITHUB_API = "https://api.github.com";

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

interface SearchTopicsResponse {
  total_count: number;
  items: Topic[];
}

interface SearchReposResponse {
  total_count: number;
  items: Repository[];
}

export interface RateLimit {
  remaining: number;
  limit: number;
  reset: number;
}

declare const __GH_TOKEN__: string;

const token = typeof __GH_TOKEN__ !== "undefined" ? __GH_TOKEN__ : "";

const headers: HeadersInit = {
  Accept: "application/vnd.github+json",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    _rateLimit = {
      remaining: parseInt(remaining, 10),
      limit: parseInt(limit, 10),
      reset: reset ? parseInt(reset, 10) : 0,
    };
    rateLimitListeners.forEach((fn) => fn(_rateLimit));
  }
}

async function ghFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers });
  updateRateLimit(res);
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

export async function searchTopics(query: string): Promise<SearchTopicsResponse> {
  return ghFetch(`${GITHUB_API}/search/topics?q=${encodeURIComponent(query)}&per_page=20`);
}

export async function getTopicRepos(
  topic: string,
  sort: string = "stars",
  language: string = "",
  page: number = 1
): Promise<SearchReposResponse> {
  let q = `topic:${topic}`;
  if (language) q += ` language:${language}`;
  return ghFetch(
    `${GITHUB_API}/search/repositories?q=${encodeURIComponent(q)}&sort=${sort}&order=desc&per_page=30&page=${page}`
  );
}
