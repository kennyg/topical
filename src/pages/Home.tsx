import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router";
import { searchTopics, type Topic } from "../github";

const POPULAR_TOPICS = [
  "react", "typescript", "python", "machine-learning", "rust",
  "go", "docker", "kubernetes", "cli", "api",
  "nextjs", "tailwindcss", "graphql", "gh-extension", "vscode",
  "serverless", "terraform", "deno", "svelte", "wasm",
];

export function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const [input, setInput] = useState(query);
  const [results, setResults] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await searchTopics(q);
      setResults(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (query) search(query);
  }, [query, search]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input.trim()) {
      setSearchParams({ q: input.trim() });
    } else {
      setSearchParams({});
      setResults([]);
    }
  }

  return (
    <main>
      <form onSubmit={handleSubmit} className="search-container">
        <input
          className="search-input"
          type="text"
          placeholder="Search GitHub topics..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
        />
      </form>

      {error && <div className="error">{error}</div>}

      {loading && <div className="loading">Searching topics...</div>}

      {!loading && query && results.length > 0 && (
        <>
          <p className="featured-heading">Results for "{query}"</p>
          <div className="topics-grid">
            {results.map((t) => (
              <Link key={t.name} to={`/topics/${t.name}`} className="topic-card">
                <div className="topic-name">{t.display_name || t.name}</div>
                <div className="topic-desc">
                  {t.short_description || t.description || "No description"}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {!loading && query && results.length === 0 && !error && (
        <div className="empty-state">No topics found for "{query}"</div>
      )}

      {!query && (
        <>
          <p className="featured-heading">Popular topics</p>
          <div className="topics-grid">
            {POPULAR_TOPICS.map((name) => (
              <Link key={name} to={`/topics/${name}`} className="topic-card">
                <div className="topic-name">{name}</div>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
