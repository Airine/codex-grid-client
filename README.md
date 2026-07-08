# Codex Grid Client

> A pure, focused Codex subscription desktop app for [Neurasea Grid](https://grid.agon.win).

Built with **Electron + React + TypeScript**, based on the [codex-tools](https://github.com/170-carry/codex-tools) open-source project.

## Features

- **Subscription Management** — View your Codex subscription plan, quota, and usage
- **Usage Dashboard** — Real-time token consumption monitoring with charts (5h / 24h / 7d / 30d)
- **Local API Proxy** — OpenAI-compatible `/v1` endpoint at `http://127.0.0.1:8787`
- **Dark / Light Theme** — System-aware theme switching
- **System Tray** — Stay running in background with quick controls
- **Multi-language** — English and Chinese (中文) support
- **Auto Updater** — GitHub releases integration

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Electron 33+ |
| UI | React 19 + TypeScript 5.7 |
| Build | Vite 6 |
| Styling | Pure CSS (CSS variables for theming) |
| State | React hooks (useState/useEffect) |

## Project Structure

```
src/
  main/          # Electron main process
    main.ts      # App entry, window, IPC handlers
    api-proxy.ts # Local HTTP proxy server
    store.ts     # electron-store persistence
    tray.ts      # System tray
    updater.ts   # Auto-updater
  preload/       # Preload script
    index.ts     # Secure IPC bridge
  renderer/      # React frontend
    App.tsx      # Root component
    components/  # UI components
    hooks/       # Custom hooks
    styles/      # CSS themes & styles
  shared/        # Shared types & constants
    types.ts
    constants.ts
```

## Getting Started

```bash
# Install dependencies
npm install

# Development (starts Vite + Electron)
npm run dev

# Build for production
npm run build

# Package for distribution
npm run dist
```

## License

MIT
