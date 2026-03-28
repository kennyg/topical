import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router";
import { searchTopics, type Topic } from "../github";
import { useDebounce } from "../hooks";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const POPULAR_TOPICS = [
  { name: "react", desc: "JavaScript library for building UIs" },
  { name: "typescript", desc: "Typed superset of JavaScript" },
  { name: "python", desc: "General-purpose programming language" },
  { name: "machine-learning", desc: "ML algorithms, models, and tools" },
  { name: "rust", desc: "Safe, concurrent systems language" },
  { name: "go", desc: "Simple, reliable, efficient language" },
  { name: "docker", desc: "Container platform for applications" },
  { name: "kubernetes", desc: "Container orchestration at scale" },
  { name: "cli", desc: "Command-line interface tools" },
  { name: "api", desc: "Application programming interfaces" },
  { name: "nextjs", desc: "React framework for the web" },
  { name: "tailwindcss", desc: "Utility-first CSS framework" },
  { name: "graphql", desc: "Query language for APIs" },
  { name: "gh-extension", desc: "Extensions for the GitHub CLI" },
  { name: "vscode", desc: "VS Code extensions and themes" },
  { name: "serverless", desc: "Cloud functions and serverless" },
  { name: "terraform", desc: "Infrastructure as code tool" },
  { name: "deno", desc: "Secure JavaScript/TypeScript runtime" },
  { name: "svelte", desc: "Cybernetically enhanced web apps" },
  { name: "wasm", desc: "WebAssembly tools and runtimes" },
];

export function Home() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const [results, setResults] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, 300);

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
    search(debouncedQuery);
  }, [debouncedQuery, search]);

  return (
    <div className="space-y-8">
      {!query && (
        <div className="text-center space-y-3 pt-4">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Explore GitHub Topics
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Discover repositories organized by topic, language, and community.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive text-center">
          {error}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="bg-card">
              <CardHeader className="p-4 space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {!loading && query && results.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Results for &ldquo;{query}&rdquo;
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {results.map((t) => (
              <Link key={t.name} to={`/topics/${t.name}`}>
                <Card className="bg-card hover:bg-accent hover:border-primary/30 transition-colors cursor-pointer h-full">
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm font-medium text-primary">
                      {t.display_name || t.name}
                    </CardTitle>
                    {t.short_description && (
                      <CardDescription className="text-xs line-clamp-2">
                        {t.short_description}
                      </CardDescription>
                    )}
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!loading && query && results.length === 0 && !error && (
        <p className="text-center text-muted-foreground py-12">
          No topics found for &ldquo;{query}&rdquo;
        </p>
      )}

      {!query && !loading && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Popular topics
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {POPULAR_TOPICS.map((t) => (
              <Link key={t.name} to={`/topics/${t.name}`}>
                <Card className="bg-card hover:bg-accent hover:border-primary/30 transition-colors cursor-pointer h-full">
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm font-medium text-primary">
                      {t.name}
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-2">
                      {t.desc}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
