import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link } from "react-router";
import { getTopicRepos, searchTopics, type Repository, type Topic } from "../github";
import { useInfiniteScroll } from "../hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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
  { key: "updated", label: "Updated" },
] as const;

export function TopicPage() {
  const { name } = useParams<{ name: string }>();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [sort, setSort] = useState("stars");
  const [language, setLanguage] = useState("");
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
      getTopicRepos(name, sort, language, 1).then((d) => {
        setRepos(d.items);
        setTotalCount(d.total_count);
      }),
    ])
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [name, sort, language]);

  const loadMore = useCallback(async () => {
    if (!name || loadingMore) return;
    const next = page + 1;
    setLoadingMore(true);
    try {
      const d = await getTopicRepos(name, sort, language, next);
      setRepos((prev) => [...prev, ...d.items]);
      setPage(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  }, [name, sort, language, page, loadingMore]);

  const hasMore = repos.length < totalCount;
  const sentinelRef = useInfiniteScroll(loadMore, hasMore && !loadingMore);

  // Aggregate languages from loaded repos
  const topLanguages = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of repos) {
      if (r.language) counts.set(r.language, (counts.get(r.language) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([lang]) => lang);
  }, [repos]);

  // Aggregate related topics from loaded repos
  const relatedTopics = useMemo(() => {
    const counts = new Map<string, number>();
    const current = name?.toLowerCase() ?? "";
    for (const r of repos) {
      for (const t of r.topics) {
        if (t.toLowerCase() !== current) {
          counts.set(t, (counts.get(t) ?? 0) + 1);
        }
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([topic]) => topic);
  }, [repos, name]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-4 bg-card">
              <div className="flex gap-3">
                <Skeleton className="h-6 w-6 rounded-md shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive text-center">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {topic?.display_name || name}
        </h1>
        {totalCount > 0 && (
          <p className="text-sm text-muted-foreground">
            {formatCount(totalCount)} repositories
            {language && <> in <span className="text-foreground font-medium">{language}</span></>}
          </p>
        )}
        {topic?.short_description && (
          <p className="text-sm text-muted-foreground pt-1">
            {topic.short_description}
          </p>
        )}
      </div>

      {relatedTopics.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Related topics
          </p>
          <div className="flex flex-wrap gap-1.5">
            {relatedTopics.map((t) => (
              <Link key={t} to={`/topics/${t}`}>
                <Badge
                  variant="secondary"
                  className="text-xs font-normal hover:bg-primary/15 hover:text-primary cursor-pointer transition-colors"
                >
                  {t}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground mr-1">Sort</span>
        {SORT_OPTIONS.map((opt) => (
          <Button
            key={opt.key}
            variant={sort === opt.key ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSort(opt.key)}
          >
            {opt.label}
          </Button>
        ))}

        {topLanguages.length > 0 && (
          <>
            <div className="w-px h-5 bg-border mx-1" />
            <span className="text-xs text-muted-foreground mr-1">Language</span>
            <Button
              variant={language === "" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setLanguage("")}
            >
              All
            </Button>
            {topLanguages.map((lang) => (
              <Button
                key={lang}
                variant={language === lang ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setLanguage(lang)}
              >
                {lang}
              </Button>
            ))}
          </>
        )}
      </div>

      {repos.length > 0 && (
        <div className="space-y-2">
          {repos.map((repo) => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-1" />
      {loadingMore && (
        <div className="flex justify-center py-4">
          <div className="h-5 w-5 border-2 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

function RepoCard({ repo }: { repo: Repository }) {
  return (
    <Card className="p-4 bg-card hover:bg-accent/50 transition-colors">
      <div className="flex gap-3">
        <img
          src={repo.owner.avatar_url}
          alt=""
          className="h-6 w-6 rounded-md shrink-0 mt-0.5"
          loading="lazy"
        />
        <div className="min-w-0 flex-1 space-y-1.5">
          <a
            href={repo.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-primary hover:underline"
          >
            {repo.full_name}
          </a>

          {repo.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {repo.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <svg className="h-3.5 w-3.5 text-yellow-500" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z" />
              </svg>
              {formatCount(repo.stargazers_count)}
            </span>
            {repo.language && (
              <span>{repo.language}</span>
            )}
            <span>Updated {timeAgo(repo.updated_at)}</span>
          </div>

          {repo.topics.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {repo.topics.slice(0, 8).map((t) => (
                <Link key={t} to={`/topics/${t}`}>
                  <Badge
                    variant="secondary"
                    className="text-[11px] font-normal px-2 py-0 h-5 hover:bg-primary/15 hover:text-primary cursor-pointer transition-colors"
                  >
                    {t}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
