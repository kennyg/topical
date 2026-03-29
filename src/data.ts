import {
  searchTopics as apiSearchTopics,
  getTopicRepos as apiGetTopicRepos,
  type Topic,
  type Repository,
  type SortKey,
} from "./github";

declare const __DATA_MODE__: string;

const isStatic =
  typeof __DATA_MODE__ !== "undefined" && __DATA_MODE__ === "static";

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

let topicIndexCache: TopicIndex | null = null;
const repoCache = new Map<string, TopicRepoFile>();

async function fetchTopicIndex(): Promise<TopicIndex | null> {
  if (topicIndexCache) return topicIndexCache;
  const res = await fetch("/data/topics.json");
  const contentType = res.headers.get("content-type") ?? "";
  if (!res.ok || !contentType.includes("application/json")) return null;
  topicIndexCache = await res.json();
  return topicIndexCache!;
}

async function fetchTopicRepos(topic: string): Promise<TopicRepoFile | null> {
  const cached = repoCache.get(topic);
  if (cached) return cached;
  const res = await fetch(`/data/repos/${encodeURIComponent(topic)}.json`);
  const contentType = res.headers.get("content-type") ?? "";
  if (!res.ok || !contentType.includes("application/json")) return null;
  const data: TopicRepoFile = await res.json();
  repoCache.set(topic, data);
  return data;
}

async function staticSearchTopics(query: string, signal?: AbortSignal) {
  const index = await fetchTopicIndex();
  if (!index) return apiSearchTopics(query, signal);
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
  sort: SortKey,
  language: string,
  page: number,
  signal?: AbortSignal
) {
  const data = await fetchTopicRepos(topic);
  if (!data) return apiGetTopicRepos(topic, sort, language, page, signal);
  let repos = [...data.repos];

  if (language) {
    repos = repos.filter(
      (r) => r.language?.toLowerCase() === language.toLowerCase()
    );
  }

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
    default:
      sort satisfies never;
  }

  const perPage = 30;
  const start = (page - 1) * perPage;
  const paged = repos.slice(start, start + perPage);

  return { total_count: repos.length, items: paged };
}

export type { Topic, Repository, SortKey } from "./github";
export { onRateLimitChange, type RateLimit } from "./github";

export async function searchTopics(query: string, signal?: AbortSignal) {
  if (isStatic) return staticSearchTopics(query, signal);
  return apiSearchTopics(query, signal);
}

export async function getTopicRepos(
  topic: string,
  sort: SortKey = "stars",
  language: string = "",
  page: number = 1,
  signal?: AbortSignal
) {
  if (isStatic) return staticGetTopicRepos(topic, sort, language, page, signal);
  return apiGetTopicRepos(topic, sort, language, page, signal);
}

export async function getPopularTopics(): Promise<Topic[]> {
  if (isStatic) {
    const index = await fetchTopicIndex();
    return index?.topics ?? [];
  }
  return [];
}

export { isStatic };
