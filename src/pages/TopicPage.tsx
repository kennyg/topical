import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import { getTopicRepos, searchTopics, type Repository, type Topic } from "../github";

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  const days = Math.floor(seconds / 86400);
  if (days > 365) return `${Math.floor(days / 365)}y ago`;
  if (days > 30) return `${Math.floor(days / 30)}mo ago`;
  if (days > 0) return `${days}d ago`;
  const hours = Math.floor(seconds / 3600);
  if (hours > 0) return `${hours}h ago`;
  return "just now";
}

const SORT_OPTIONS = [
  { key: "stars", label: "Stars" },
  { key: "forks", label: "Forks" },
  { key: "updated", label: "Recently updated" },
];

export function TopicPage() {
  const { name } = useParams<{ name: string }>();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [sort, setSort] = useState("stars");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!name) return;
    setRepos([]);
    setPage(1);
    setLoading(true);
    setError(null);

    Promise.all([
      searchTopics(name).then((d) => {
        const match = d.items.find(
          (t) => t.name.toLowerCase() === name.toLowerCase()
        );
        setTopic(match ?? null);
      }),
      getTopicRepos(name, sort, 1).then((d) => {
        setRepos(d.items);
        setTotalCount(d.total_count);
      }),
    ])
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [name, sort]);

  async function loadMore() {
    if (!name) return;
    const next = page + 1;
    setLoadingMore(true);
    try {
      const d = await getTopicRepos(name, sort, next);
      setRepos((prev) => [...prev, ...d.items]);
      setPage(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  }

  if (loading) return <div className="loading">Loading topic...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <main>
      <div className="topic-header">
        <h1>{topic?.display_name || name}</h1>
        {totalCount > 0 && (
          <div className="topic-meta">
            {formatCount(totalCount)} repositories
          </div>
        )}
        {topic?.short_description && (
          <div className="topic-description">{topic.short_description}</div>
        )}
      </div>

      <div className="sort-bar">
        <span>Sort:</span>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            className={sort === opt.key ? "active" : ""}
            onClick={() => setSort(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {repos.length > 0 && (
        <div className="repo-list">
          {repos.map((repo) => (
            <div key={repo.id} className="repo-item">
              <img
                className="repo-avatar"
                src={repo.owner.avatar_url}
                alt=""
                loading="lazy"
              />
              <div className="repo-info">
                <a
                  className="repo-name"
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {repo.full_name}
                </a>
                {repo.description && (
                  <div className="repo-desc">{repo.description}</div>
                )}
                <div className="repo-meta">
                  <span style={{ color: "var(--star)" }}>&starf; {formatCount(repo.stargazers_count)}</span>
                  {repo.language && <span>{repo.language}</span>}
                  <span>Updated {timeAgo(repo.updated_at)}</span>
                </div>
                {repo.topics.length > 0 && (
                  <div className="repo-topics">
                    {repo.topics.slice(0, 8).map((t) => (
                      <Link
                        key={t}
                        to={`/topics/${t}`}
                        className="repo-topic-tag"
                      >
                        {t}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {repos.length < totalCount && (
        <button
          className="load-more"
          onClick={loadMore}
          disabled={loadingMore}
        >
          {loadingMore ? "Loading..." : "Load more repositories"}
        </button>
      )}
    </main>
  );
}
