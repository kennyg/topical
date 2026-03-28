import { BrowserRouter, Routes, Route, Link, useNavigate, useSearchParams } from "react-router";
import { useState, useEffect } from "react";
import { Home } from "./pages/Home";
import { TopicPage } from "./pages/TopicPage";
import { isStatic } from "./data";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useRateLimit } from "./hooks";

function RateLimitIndicator() {
  const rl = useRateLimit();
  if (!rl || rl.remaining < 0) return null;

  const pct = rl.limit > 0 ? rl.remaining / rl.limit : 1;
  const color =
    pct > 0.5 ? "bg-emerald-500" : pct > 0.15 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="flex items-center gap-2 text-[11px] text-muted-foreground" title={`${rl.remaining}/${rl.limit} API requests remaining`}>
      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <span>{rl.remaining}</span>
    </div>
  );
}

function HeaderSearch() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const qParam = searchParams.get("q") ?? "";
  const [input, setInput] = useState(qParam);

  useEffect(() => {
    setInput(qParam);
  }, [qParam]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input.trim()) {
      navigate(`/?q=${encodeURIComponent(input.trim())}`);
    } else {
      navigate("/");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex-1 max-w-sm">
      <Input
        type="text"
        placeholder="Search topics..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="h-8 text-sm bg-secondary/50"
      />
    </form>
  );
}

function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link
            to="/"
            className="text-lg font-semibold tracking-tight hover:opacity-80 transition-opacity shrink-0"
          >
            <span className="text-primary">#</span>{" "}
            <span className="text-foreground">topical</span>
          </Link>
          <HeaderSearch />
          {!isStatic && <RateLimitIndicator />}
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 w-full py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/topics/:name" element={<TopicPage />} />
        </Routes>
      </main>

      <Separator />
      <footer className="py-6 text-center text-xs text-muted-foreground">
        Browse GitHub topics &middot; Powered by the GitHub API
      </footer>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}

export default App;
