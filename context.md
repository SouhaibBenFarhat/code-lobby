# CodeLobby - Full Application Context

> **Version**: 1.0.0  
> **Last Updated**: January 2026  
> **Platform**: macOS (Electron Desktop App)

---

## 🎯 Vision & Purpose

CodeLobby reimagines how developers interact with their Pull Requests. Instead of bouncing between GitHub tabs, terminal windows, and IDEs, CodeLobby provides a **unified command center** for PR management.

### The Core Insight

Modern software development has shifted:
- **Code is increasingly AI-generated** - Engineers focus less on writing code, more on reviewing and orchestrating
- **PRs are the atomic unit of work** - Not files, not commits, but Pull Requests
- **Context switching is expensive** - Every tab switch costs cognitive load

CodeLobby treats PRs like an IDE treats files:
- Repositories → Folders
- Pull Requests → Files  
- Review Comments → Lines of code
- CI Failures → Compiler errors

### Future Direction

The app is evolving toward **intent-driven development** where natural language commands drive actions:
- *"Fix the failing CI on this PR"*
- *"Address all review comments"*
- *"Merge when ready"*

---

## 🏗️ Technical Stack

### Core Technologies

| Layer | Technology | Purpose |
|-------|------------|---------|
| Desktop Framework | Electron 28 | Cross-platform desktop app |
| Frontend | React 18 + TypeScript | UI components |
| Styling | Tailwind CSS + shadcn/ui | Design system |
| State Management | TanStack Query | Server state & caching |
| Storage | electron-store | Encrypted local persistence |
| API | GitHub GraphQL | Single-query data fetching |
| AI | Anthropic Claude SDK | AI assistant integration |
| Build | electron-vite | Fast development & builds |

### Key Libraries

- `@octokit/graphql` - GitHub API client
- `@anthropic-ai/sdk` - Claude AI integration
- `@tanstack/react-virtual` - Virtual scrolling for performance
- `react-rnd` - Draggable/resizable windows
- `react-markdown` - Markdown rendering with syntax highlighting
- `lucide-react` - Icon system
- `@radix-ui/*` - Accessible UI primitives

---

## 🖥️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Electron App                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                 Renderer Process                      │   │
│  │                                                       │   │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │   │   Canvas    │  │   IDE View  │  │  AI Chat    │  │   │
│  │   │   View      │  │   (Tree)    │  │   Panel     │  │   │
│  │   └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  │                                                       │   │
│  │   ┌──────────────────────────────────────────────┐   │   │
│  │   │              TanStack Query                   │   │   │
│  │   │         (Caching & Server State)              │   │   │
│  │   └──────────────────────────────────────────────┘   │   │
│  │                         │                             │   │
│  └─────────────────────────┼─────────────────────────────┘   │
│                            │ IPC (contextBridge)             │
│  ┌─────────────────────────┼─────────────────────────────┐   │
│  │                  Preload Script                        │   │
│  │              (Type-safe API Bridge)                    │   │
│  └─────────────────────────┼─────────────────────────────┘   │
│                            │                                 │
│  ┌─────────────────────────┼─────────────────────────────┐   │
│  │                   Main Process                         │   │
│  │                                                        │   │
│  │   ┌──────────┐  ┌──────────┐  ┌──────────┐           │   │
│  │   │ GitHub   │  │ Claude   │  │ electron │           │   │
│  │   │ GraphQL  │  │ API      │  │ -store   │           │   │
│  │   └──────────┘  └──────────┘  └──────────┘           │   │
│  │                                                        │   │
│  │   ┌──────────────────────────────────────────────┐    │   │
│  │   │              Logger (Persisted)               │    │   │
│  │   └──────────────────────────────────────────────┘    │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## ✨ Features Implemented

### 1. GitHub Integration

**Authentication**
- Personal Access Token (PAT) authentication
- Secure encrypted storage
- Token validation with user info caching
- Org-level permission support

**Data Fetching**
- Single GraphQL query fetches all PR data
- Automatic pagination for large datasets
- Rate limit monitoring and display
- Intelligent caching with TTL

**PR Information**
- Title, author, creation date, branch info
- CI/CD status (checks, workflows)
- Review status and reviewers
- Comments (general + review comments)
- Labels and milestones

### 2. Dual View Modes

**Canvas View**
- Free-form draggable repository windows
- Resize any window to any size
- Position persistence across sessions
- Lock/unlock layout toggle
- Per-window controls (close, collapse)

**IDE View**
- Familiar tree-based navigation
- Repositories as collapsible folders
- PRs as selectable items
- Resizable sidebar
- Expansion state persistence

### 3. PR Detail Panel

- Resizable right-side panel
- Full PR metadata display
- CI jobs grouped by workflow
- Collapsible sections
- Timeline of comments
- Review comments by reviewer
- Bot vs human comment filtering

### 4. AI Assistant (Claude Integration)

**Setup**
- API key input and validation
- Encrypted key storage
- Model selection dropdown
- Extended thinking toggle

**Chat Features**
- Streaming responses (real-time typing)
- Message queue (stack messages while AI responds)
- Virtual scrolling for long conversations
- Smart auto-scroll (respects user scroll position)
- Markdown rendering with syntax highlighting
- Thinking process visualization

**Panel**
- Resizable right-side panel
- State persistence (open/closed, width)
- Conversation history persistence

### 5. Logging System

- Centralized logger with categories
- Log levels (info, warn, error, debug)
- In-app log viewer
- Log export functionality
- Persisted to disk (5 session history)
- Filterable by level/category

### 6. UI/UX

**Apple Design Language**
- SF Pro system fonts
- Subtle shadows and borders
- Frosted glass effects (vibrancy)
- Smooth animations (Apple easing curves)
- Scale-on-press interactions
- Focus ring styling

**Theming**
- Light and dark mode
- System theme detection
- Persistent preference
- Polished dark mode (true black)

**Responsive Panels**
- All panels resizable
- Minimum/maximum constraints
- Size persistence

### 7. Repository Management

- Multi-repo selection
- Color coding per repository
- Show all PRs / My PRs toggle
- Custom ordering
- Close/hide windows

---

## 📁 Project Structure

```
codelobby/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── index.ts          # App entry, IPC handlers
│   │   ├── github-graphql.ts # GitHub API calls
│   │   ├── claude-api.ts     # Anthropic SDK integration
│   │   ├── store.ts          # electron-store configuration
│   │   ├── logger.ts         # Logging system
│   │   └── api-client.ts     # Retry/timeout utilities
│   │
│   ├── preload/              # Secure bridge
│   │   ├── index.ts          # IPC API exposure
│   │   └── index.d.ts        # TypeScript declarations
│   │
│   └── renderer/             # React frontend
│       ├── App.tsx           # Root component
│       ├── main.tsx          # React entry point
│       ├── components/
│       │   ├── ui/           # shadcn/ui components
│       │   ├── Header.tsx    # App header/toolbar
│       │   ├── PRGrid.tsx    # Canvas view
│       │   ├── IDEView.tsx   # Tree view
│       │   ├── PRDetail.tsx  # PR detail panel
│       │   ├── AIChat.tsx    # AI assistant panel
│       │   ├── PRCard.tsx    # Individual PR card
│       │   ├── RepoCard.tsx  # Repository window
│       │   └── ...           # Other components
│       ├── styles/
│       │   └── globals.css   # Global styles, CSS variables
│       └── lib/
│           └── utils.ts      # Utility functions
│
├── tests/                    # Test files (Vitest)
├── build/                    # Build assets
├── claude.md                 # AI assistant guidelines
├── context.md                # This file
└── package.json
```

---

## 🔐 Data Storage

### Persisted Data (electron-store)

| Key | Type | Purpose |
|-----|------|---------|
| `token` | string | GitHub PAT (encrypted) |
| `user` | object | Cached GitHub user info |
| `settings` | object | App preferences (theme, polling) |
| `selectedRepos` | string[] | Which repos to display |
| `cardLayouts` | object[] | Canvas window positions/sizes |
| `prDetailPanel` | object | Panel open state & width |
| `aiPanel` | object | AI panel open state & width |
| `viewMode` | string | 'canvas' or 'ide' |
| `ideViewSettings` | object | Sidebar width, expanded repos |
| `repoColors` | object | Custom colors per repo |
| `aiChat` | object | API key, model, history |

### Log Storage

- Location: `~/Library/Application Support/codelobby/logs/`
- Format: JSON files per session
- Retention: Last 5 sessions
- Max per session: 1000 entries

---

## 🔄 Data Flow

### PR Data Fetching

```
User Action (open app / refresh / interval)
    │
    ▼
TanStack Query (checks cache)
    │
    ├── Cache Hit (< 60s) ──► Return cached data
    │
    └── Cache Miss / Stale
            │
            ▼
    IPC: fetchAllPRsForRepos()
            │
            ▼
    Main Process: GitHub GraphQL
            │
            ├── Single query fetches:
            │   • PRs with metadata
            │   • CI status
            │   • Comments
            │   • Reviews
            │   • Rate limit
            │
            ▼
    Response processing
            │
            ├── Deduplicate PRs
            ├── Separate bot comments
            ├── Calculate derived data
            │
            ▼
    Return to renderer
            │
            ▼
    Update React state & UI
```

### AI Chat Flow

```
User types message
    │
    ▼
Add to queue (if AI busy) or send immediately
    │
    ▼
IPC: sendChatMessageStreaming()
    │
    ▼
Main Process: Claude SDK stream
    │
    ├── For each chunk:
    │   └── IPC event: chat-stream-chunk
    │           │
    │           ▼
    │       Update streaming state
    │       (content builds character by character)
    │
    ▼
Stream complete
    │
    ├── Save message to history (electron-store)
    ├── Process next queued message (if any)
    │
    ▼
UI shows complete message
```

---

## 🎨 Design System

### Colors (CSS Variables)

**Light Mode**
```css
--background: #FAFAFA
--foreground: #1D1D1F
--card: #FFFFFF
--primary: #007AFF (Apple Blue)
--muted: #F5F5F5
--border: rgba(0,0,0,0.06)
```

**Dark Mode**
```css
--background: #000000 (True Black)
--foreground: #F5F5F7
--card: #1C1C1E
--primary: #0A84FF
--muted: #2C2C2E
--border: rgba(255,255,255,0.08)
```

### Typography

- Font: SF Pro (system font stack)
- Body: 14px, -0.01em letter-spacing
- Headings: Semibold (600), -0.02em letter-spacing

### Spacing (4px grid)

- xs: 4px
- sm: 8px
- md: 12px
- lg: 16px
- xl: 24px

### Animation

- Easing: `cubic-bezier(0.25, 0.1, 0.25, 1)`
- Micro: 150ms
- Standard: 250ms
- Panel: 350ms

---

## 🚀 Development

### Commands

```bash
# Development with hot reload
npm run dev

# Run tests
npm test
npm run test:watch
npm run test:coverage

# Build for production
npm run build
npm run build:mac
npm run build:win
npm run build:linux
```

### Environment

- Node.js 18+
- macOS (primary), Windows/Linux (supported)
- GitHub PAT with repo + org permissions
- Claude API key (optional, for AI features)

---

## 🔮 Roadmap Ideas

### Near Term
- [ ] PR actions (merge, close, approve)
- [ ] Quick reply to comments
- [ ] Keyboard shortcuts
- [ ] Notification system
- [ ] Multiple GitHub accounts

### Medium Term
- [ ] Code review inline
- [ ] Diff viewer
- [ ] PR templates
- [ ] Custom workflows
- [ ] Team dashboards

### Long Term (Vision)
- [ ] AI-driven PR actions
- [ ] Natural language commands
- [ ] Cross-platform (GitLab, Bitbucket)
- [ ] Collaborative features
- [ ] Plugin system

---

## 📊 Current Metrics

- **Supported Platforms**: macOS (primary)
- **GitHub API**: GraphQL v4 with single-query optimization
- **Rate Limit Efficiency**: ~10 points per full refresh
- **Cache Duration**: 60 seconds (configurable)
- **Supported AI Models**: Claude 3.5/4/Opus/Sonnet/Haiku
- **Max Chat History**: Unlimited (persisted)
- **Log Retention**: 5 sessions

---

## 🤝 Contributing

See `claude.md` for:
- Code style guidelines
- Component patterns
- IPC communication patterns
- Testing conventions
- Apple design system implementation

---

*CodeLobby - Where PRs come to life* 🚀
