import {
  searchTopics as apiSearchTopics,
  getTopicRepos as apiGetTopicRepos,
  type Topic,
  type Repository,
} from "./github";

declare const __DATA_MODE__: string;

const isStatic =
  typeof __DATA_MODE__ !== "undefined" && __DATA_MODE__ === "static";

// --- Static mode types ---

interface TopicIndex {
  topics: Topic[];
  generated_at: string;
}

interface TopicRepoFile {
  topic: string;
  total_count: number;
  repos: Repository[];
  generated_at: string;
}

// --- Static mode cache ---

let topicIndexCache: TopicIndex | null = null;
const repoCache = new Map<string, TopicRepoFile>();

async function fetchTopicIndex(): Promise<TopicIndex> {
  if (topicIndexCache) return topicIndexCache;
  const res = await fetch("/data/topics.json");
  if (!res.ok) throw new Error("Failed to load topic index");
  topicIndexCache = await res.json();
  return topicIndexCache!;
}

async function fetchTopicRepos(topic: string): Promise<TopicRepoFile> {
  const cached = repoCache.get(topic);
  if (cached) return cached;
  const res = await fetch(`/data/repos/${encodeURIComponent(topic)}.json`);
  if (!res.ok) throw new Error(`No data for topic: ${topic}`);
  const data: TopicRepoFile = await res.json();
  repoCache.set(topic, data);
  return data;
}

// --- Static mode implementations ---

async function staticSearchTopics(query: string) {
  const index = await fetchTopicIndex();
  const q = query.toLowerCase();
  const items = index.topics.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.display_name?.toLowerCase().includes(q) ||
      t.short_description?.toLowerCase().includes(q)
  );
  return { total_count: items.length, items };
}

async function staticGetTopicRepos(
  topic: string,
  sort: string,
  language: string,
  page: number
) {
  const data = await fetchTopicRepos(topic);
  let repos = [...data.repos];

  // Language filter
  if (language) {
    repos = repos.filter(
      (r) => r.language?.toLowerCase() === language.toLowerCase()
    );
  }

  // Sort
  switch (sort) {
    case "stars":
      repos.sort((a, b) => b.stargazers_count - a.stargazers_count);
      break;
    case "forks":
      repos.sort((a, b) => b.forks_count - a.forks_count);
      break;
    case "updated":
      repos.sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      break;
  }

  // Paginate
  const perPage = 30;
  const start = (page - 1) * perPage;
  const paged = repos.slice(start, start + perPage);

  return { total_count: repos.length, items: paged };
}

// --- Public API (same signatures as github.ts) ---

export type { Topic, Repository } from "./github";
export { onRateLimitChange, type RateLimit } from "./github";

export async function searchTopics(query: string) {
  if (isStatic) return staticSearchTopics(query);
  return apiSearchTopics(query);
}

export async function getTopicRepos(
  topic: string,
  sort: string = "stars",
  language: string = "",
  page: number = 1
) {
  if (isStatic) return staticGetTopicRepos(topic, sort, language, page);
  return apiGetTopicRepos(topic, sort, language, page);
}

export async function getPopularTopics(): Promise<Topic[]> {
  if (isStatic) {
    const index = await fetchTopicIndex();
    return index.topics;
  }
  return [];
}

export { isStatic };
