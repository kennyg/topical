# topical

Browse GitHub topics and discover repositories — like [github.com/topics](https://github.com/topics) but as a standalone app you can self-host.

## Features

- Search and browse GitHub topics
- View top repositories for any topic, sorted by stars/forks/activity
- Filter by programming language
- Discover related topics
- Infinite scroll
- Rate limit indicator
- Works with GitHub.com and GitHub Enterprise

## Getting started

### Prerequisites

- [mise](https://mise.jdx.dev) (installs Node and pnpm automatically)
- [GitHub CLI](https://cli.github.com/) (`gh`) — used for API auth during local dev

### Setup

```sh
git clone https://github.com/kennyg/topical.git
cd topical
mise trust && mise install
pnpm install
```

### Development

```sh
pnpm dev
```

The dev server auto-detects your `gh` auth token for higher API rate limits (5,000 req/hr vs 60).

### Build

```sh
pnpm build
pnpm preview  # preview the production build locally
```

## Configuration

### Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GH_TOKEN` | GitHub personal access token | Auto-detected from `gh auth token` in dev |
| `GH_API_URL` | GitHub API base URL | `https://api.github.com` |
| `GH_HOST` | GitHub Enterprise hostname (alternative to `GH_API_URL`) | — |

### GitHub Enterprise

To use with a GHE instance, set the API URL:

```sh
# Option A: set the API URL directly
GH_API_URL=https://github.yourcompany.com/api/v3 pnpm dev

# Option B: set the GH_HOST (also used by gh CLI)
GH_HOST=github.yourcompany.com pnpm dev

# Option C: for production builds
GH_API_URL=https://github.yourcompany.com/api/v3 pnpm build
```

You can also add these to a `.env.local` file:

```sh
GH_API_URL=https://github.yourcompany.com/api/v3
GH_TOKEN=ghp_your_token_here
```

## Deploy to Cloudflare Pages

1. Push to GitHub
2. Connect the repo in the [Cloudflare Pages dashboard](https://dash.cloudflare.com/)
3. Set build configuration:
   - **Build command:** `pnpm build`
   - **Build output directory:** `dist`
   - **Node version:** `22`
4. Optionally set `GH_API_URL` as an environment variable for GHE

SPA routing is handled by `public/_redirects`.

## Tech stack

- [Vite](https://vite.dev/) + [React](https://react.dev/) + TypeScript
- [shadcn/ui](https://ui.shadcn.com/) + [Tailwind CSS v4](https://tailwindcss.com/)
- [GitHub REST API](https://docs.github.com/en/rest)
- [mise](https://mise.jdx.dev/) for toolchain management

## License

MIT
