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

declare const __GH_TOKEN__: string;

const token = typeof __GH_TOKEN__ !== "undefined" ? __GH_TOKEN__ : "";

const headers: HeadersInit = {
  Accept: "application/vnd.github+json",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

export async function searchTopics(query: string): Promise<SearchTopicsResponse> {
  const res = await fetch(
    `${GITHUB_API}/search/topics?q=${encodeURIComponent(query)}&per_page=20`,
    { headers }
  );
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

export async function getTopicRepos(
  topic: string,
  sort: string = "stars",
  page: number = 1
): Promise<SearchReposResponse> {
  const res = await fetch(
    `${GITHUB_API}/search/repositories?q=${encodeURIComponent(`topic:${topic}`)}&sort=${sort}&order=desc&per_page=30&page=${page}`,
    { headers }
  );
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}
