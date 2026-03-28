import { BrowserRouter, Routes, Route, Link } from "react-router";
import "./App.css";
import { Home } from "./pages/Home";
import { TopicPage } from "./pages/TopicPage";

function App() {
  return (
    <BrowserRouter>
      <header>
        <Link to="/">
          <span className="logo-mark">#</span> topical
        </Link>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/topics/:name" element={<TopicPage />} />
      </Routes>
      <footer>
        Browse GitHub topics &middot; Powered by the GitHub API
      </footer>
    </BrowserRouter>
  );
}

export default App;
