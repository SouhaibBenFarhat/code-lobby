# CodeLobby API & Data Flow

This document describes how data flows between the UI and external services (GitHub API, Claude AI API) in CodeLobby's TanStack Query-based architecture.

---

## Table of Contents

1. [High-Level Overview](#1-high-level-overview)
2. [GitHub Data Flow](#2-github-data-flow)
3. [Claude AI Data Flow](#3-claude-ai-data-flow)
4. [Network Tracking](#4-network-tracking)
5. [Caching Strategy](#5-caching-strategy)
6. [Rate Limit Management](#6-rate-limit-management)
7. [Error Handling](#7-error-handling)
8. [Best Practices](#8-best-practices)

---

## 1. High-Level Overview

CodeLobby uses a **simplified 3-layer architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                       External APIs                          │
│        GitHub API (GraphQL)     │     Claude API (REST)      │
└─────────────────────────────────┴────────────────────────────┘
                    ▲                           ▲
                    │ fetch()                   │ Anthropic SDK
                    │ (direct)                  │ (via IPC)
┌───────────────────┴───────────────┬───────────┴──────────────┐
│        @data            │      Main Process        │
│  ┌─────────────────────────────┐  │  ┌────────────────────┐  │
│  │  github.ts (API functions)  │  │  │   claude-api.ts    │  │
│  │  queries/* (useQuery hooks) │  │  │   (streaming AI)   │  │
│  │  mutations/* (useMutation)  │  │  └────────────────────┘  │
│  └─────────────────────────────┘  │                          │
└───────────────────────────────────┴──────────────────────────┘
                    ▲                           ▲
                    │ useQuery/useMutation      │ IPC
                    │                           │
┌───────────────────┴───────────────────────────┴──────────────┐
│                      UI Components                            │
│  Header │ PRDetail │ Canvas │ AIChat │ Network │ Explorer    │
└──────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **GitHub API calls are direct** — fetch() from renderer, no IPC
2. **Claude AI uses IPC** — Streaming requires main process
3. **TanStack Query manages all state** — Caching, loading states, persistence
4. **Network tracking via fetch interception** — Global fetch wrapper

---

## 2. GitHub Data Flow

### Architecture

GitHub API calls go directly from the renderer process using `fetch()`:

```
Component → useQuery hook → github.ts → fetch() → GitHub API
```

### Example: Fetching Repositories

```typescript
// 1. Component uses hook
function RepoSelector() {
  const { data: repos, isLoading } = useRepos()
  // ...
}

// 2. Query hook (queries/repository.ts)
export function useRepos() {
  const qc = useQueryClient()
  const token = qc.getQueryData<string>(keys.githubToken)
  
  return useQuery({
    queryKey: keys.repos,
    queryFn: () => github.fetchRepos(token!),
    enabled: !!token,
    staleTime: 60 * 60 * 1000  // 1 hour
  })
}

// 3. API function (github.ts)
export async function fetchRepos(token: string): Promise<Repository[]> {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      query: `
        query {
          viewer {
            organizations(first: 100) {
              nodes {
                repositories(first: 100) {
                  nodes { ... }
                }
              }
            }
          }
        }
      `
    })
  })

  const data = await response.json()
  return transformRepos(data)
}
```

### GitHub API Usage

Most GitHub data is fetched via **GraphQL** for efficiency. Some operations use the **REST API** when GraphQL doesn't provide the required data:

| Query | Data Fetched | API |
|-------|--------------|-----|
| `fetchRepos` | Organization repositories | GraphQL |
| `fetchPRsForRepos` | PRs with CI status, comments, reviews | GraphQL |
| `fetchSinglePR` | Single PR with full details | GraphQL |
| `fetchPRFiles` | Changed files with diffs (patches) | **REST** |
| `fetchRateLimit` | API rate limit status | REST |
| `validateToken` | Token validation + user info | GraphQL |
| `submitPRReview` | Submit review with inline comments | **REST** |

**Why REST for some operations:**
- `fetchPRFiles` uses REST because GraphQL doesn't return patch/diff content
- `submitPRReview` with inline comments requires REST API format

### Transform Layer

GraphQL responses are transformed to match app types:

```typescript
// github.ts
function transformPR(node: GraphQLPR): PullRequest {
  return {
    id: node.id,
    number: node.number,
    title: node.title,
    created_at: node.createdAt,        // camelCase → snake_case
    avatar_url: node.author?.avatarUrl,
    full_name: node.repository.nameWithOwner,
    draft: node.isDraft,
    checks: transformChecks(node.commits),
    // ... etc
  }
}
```

---

## 3. Claude AI Data Flow

### Why IPC for AI?

Claude AI requires the main process because:
1. **Streaming** — Real-time token streaming requires proper handling
2. **API Key security** — Keys stored in electron-store (encrypted)
3. **SDK usage** — Anthropic SDK runs in Node.js

### Architecture

```
Component → IPC → Main Process → Anthropic SDK → Claude API
    ↑                                                │
    └──────────── streaming chunks ←─────────────────┘
```

### Example: Sending Chat Message

```typescript
// 1. Component
const sendMessage = useSendChatMessage()
sendMessage.mutate({ content: "Review this PR" })

// 2. Mutation hook (mutations/ai.ts)
export function useSendChatMessage() {
  return useMutation({
    mutationFn: async ({ content }) => {
      // Start streaming via IPC
      await window.electron.sendChatMessageStreaming(content, systemContext)
    }
  })
}

// 3. Preload exposes IPC
sendChatMessageStreaming: (message, context) =>
  ipcRenderer.invoke('send-chat-message-streaming', message, context)

// 4. Main process handler (index.ts)
ipcMain.handle('send-chat-message-streaming', async (_, message, context) => {
  await sendMessageStreaming(apiKey, messages, (chunk) => {
    mainWindow?.webContents.send('chat-stream-chunk', chunk)
  })
})

// 5. Claude API (claude-api.ts)
export async function sendMessageStreaming(
  apiKey: string,
  messages: Message[],
  onChunk: (chunk: StreamChunk) => void
) {
  const client = new Anthropic({ apiKey })
  const stream = await client.messages.stream({ ... })
  
  stream.on('text', (text) => onChunk({ type: 'text', content: text }))
  stream.on('thinking', (text) => onChunk({ type: 'thinking', thinking: text }))
}
```

---

## 4. Network Tracking

### How It Works

The network panel intercepts ALL `fetch()` calls globally:

```typescript
// hooks/useNetworkTracking.ts

// Save original fetch
const originalFetch = window.fetch

// Override global fetch
window.fetch = async (input, init) => {
  const startTime = Date.now()
  
  // Add pending request to cache
  addNetworkRequest({ status: 'pending', url, startTime, requestBody })
  
  const response = await originalFetch(input, init)
  
  // Clone to read body without consuming
  const responseBody = await response.clone().text()
  
  // Update with response data
  updateNetworkRequest({
        status: response.ok ? 'success' : 'error',
        statusCode: response.status,
        responseBody,
    durationMs: Date.now() - startTime
  })
  
  return response
}
```

### What Gets Tracked

| Field | Description |
|-------|-------------|
| `url` | Request URL |
| `httpMethod` | GET, POST, etc. |
| `requestBody` | Full request body (GraphQL queries) |
| `responseBody` | Full response body (JSON) |
| `statusCode` | HTTP status code |
| `durationMs` | Request duration |
| `status` | pending / success / error |

---

## 5. Caching Strategy

### Multi-Level Caching

```
┌─────────────────────────────────────────────────────────────┐
│                      CACHING LEVELS                          │
├─────────────────────────────────────────────────────────────┤
│ Level 1: TanStack Query (Memory)                            │
│   - staleTime: How long data is considered fresh            │
│   - Automatic background refetch on window focus            │
├─────────────────────────────────────────────────────────────┤
│ Level 2: localStorage (Disk)                                │
│   - Settings and AI data persist across app restarts        │
│   - GitHub data persists (survives reload)                  │
└─────────────────────────────────────────────────────────────┘
```

### Cache Configuration by Data Type

| Data Type | staleTime | Persisted | Notes |
|-----------|-----------|-----------|-------|
| Repositories | 1 hour | ✅ | Rarely changes |
| Pull Requests | 15 min | ✅ | Background refresh |
| PR Detail | 5 min | ❌ | Fresh on open |
| Settings | Infinity | ✅ | Never stale |
| AI Chat History | Infinity | ✅ | User data |
| Network Requests | Infinity | ❌ | Session only |

### Persistence Configuration

```typescript
// client.ts
persistQueryClient({
  queryClient,
  persister,
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      const key = query.queryKey[0]
      // Persist settings, ai, local, and github data
      return ['settings', 'ai', 'local', 'github'].includes(key)
    }
  }
})
```

---

## 6. Rate Limit Management

### How Rate Limits are Tracked

Rate limit info comes from GitHub API response headers:

```typescript
// github.ts
export async function fetchRateLimit(token: string): Promise<RateLimit> {
  const response = await fetch('https://api.github.com/rate_limit', {
    headers: headers(token)
  })
  const data = await response.json()
  return {
    limit: data.resources.graphql.limit,
    remaining: data.resources.graphql.remaining,
    used: data.resources.graphql.used,
    resetAt: new Date(data.resources.graphql.reset * 1000).toISOString()
  }
}
```

### UI Integration

```typescript
// Header.tsx
function RateLimitGauge() {
  const { data: rateLimit } = useRateLimit()
  
  const percentage = rateLimit 
    ? (rateLimit.used / rateLimit.limit) * 100 
    : 0

  return (
    <Progress 
      value={percentage}
      className={percentage > 80 ? 'bg-red-500' : 'bg-green-500'}
    />
  )
}
```

---

## 7. Error Handling

### Standard Error Pattern

```typescript
// All queries and mutations handle errors consistently
export function useRepos() {
  return useQuery({
    queryKey: keys.repos,
    queryFn: async () => {
      const response = await fetch(...)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || `HTTP ${response.status}`)
      }
      
      return response.json()
    }
  })
}

// Components can check error state
function RepoList() {
  const { data, error, isError } = useRepos()
  
  if (isError) {
    return <ErrorMessage error={error} />
  }
}
```

### GitHub-Specific Errors

```typescript
// github.ts
async function graphql(token: string, query: string) {
  const response = await fetch(GITHUB_GRAPHQL_URL, { ... })
  const data = await response.json()
  
  if (data.errors?.length) {
    const message = data.errors.map(e => e.message).join(', ')
    throw new Error(`GitHub API Error: ${message}`)
  }
  
  return data.data
}
```

---

## 8. Best Practices

### For Components

```typescript
// ✅ DO: Use query hooks
const { data, isLoading, error } = useRepos()

// ✅ DO: Use mutation hooks for writes
const setViewMode = useSetViewMode()
setViewMode.mutate('ide')

// ❌ DON'T: Call fetch directly in components
const repos = await fetch('/api/repos')  // Wrong!
```

### For Adding New API Endpoints

1. **Add function** in `github.ts`:
```typescript
export async function fetchNewData(token: string) {
  return graphql(token, NEW_DATA_QUERY)
}
```

2. **Add query key** in `keys.ts`:
```typescript
newData: ['github', 'new-data'] as const
```

3. **Create query hook** in `queries/`:
```typescript
export function useNewData() {
  const token = useGitHubToken()
  return useQuery({
    queryKey: keys.newData,
    queryFn: () => github.fetchNewData(token!),
    enabled: !!token
  })
}
```

4. **Export** from `index.ts`.

### For Error Handling

```typescript
// ✅ DO: Let TanStack Query handle errors
const { data, error, isError } = useQuery({ ... })

// ✅ DO: Show user-friendly error messages
if (isError) {
  return <Alert>{error.message}</Alert>
}

// ❌ DON'T: Swallow errors silently
try {
  const data = await fetch(...)
} catch (e) {
  // Silent fail - bad!
}
```

---

## Summary

| Data Type | Source | Method | Persistence |
|-----------|--------|--------|-------------|
| GitHub repos/PRs | GitHub GraphQL | Direct fetch | Persisted |
| Settings | Local | TanStack cache | Persisted |
| AI chat | Claude API | IPC + streaming | Persisted |
| Network requests | Fetch interceptor | TanStack cache | Not persisted |
| System state | Electron | IPC | Not persisted |

**Key takeaway:** TanStack Query handles everything — fetching, caching, loading states, and persistence. GitHub calls are direct from renderer, Claude AI uses IPC for streaming.

---

*Last updated: January 26, 2026*
