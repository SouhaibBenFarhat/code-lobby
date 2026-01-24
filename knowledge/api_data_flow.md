# CodeLobby API Request & Data Flow Architecture

This document provides an extensive technical overview of how API requests are created, routed, and how data flows between the UI and external services (GitHub API, Claude AI API).

---

## Table of Contents

1. [High-Level Overview](#1-high-level-overview)
2. [Complete Data Flow Diagram](#2-complete-data-flow-diagram)
3. [The Five Layers](#3-the-five-layers)
4. [Layer 1: UI Components (React)](#4-layer-1-ui-components-react)
5. [Layer 2: TanStack Query (@codelobby/queries)](#5-layer-2-tanstack-query-codelobbyqueries)
6. [Layer 3: API Client (@codelobby/api)](#6-layer-3-api-client-codelobbyapi)
7. [Layer 4: IPC Bridge (Preload Script)](#7-layer-4-ipc-bridge-preload-script)
8. [Layer 5: Main Process API Handlers](#8-layer-5-main-process-api-handlers)
9. [External API Integration](#9-external-api-integration)
10. [HTTP Client & Request Tracking](#10-http-client--request-tracking)
11. [Rate Limit Management](#11-rate-limit-management)
12. [Caching Strategy](#12-caching-strategy)
13. [Streaming APIs](#13-streaming-apis)
14. [Error Handling](#14-error-handling)
15. [Network Panel Integration](#15-network-panel-integration)
16. [Best Practices](#16-best-practices)

---

## 1. High-Level Overview

CodeLobby uses a **5-layer architecture** for API communication:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           RENDERER PROCESS                               │
│  ┌────────────────┐    ┌────────────────┐    ┌────────────────┐        │
│  │  UI Component  │───▶│ TanStack Query │───▶│   API Client   │        │
│  │    (React)     │◀───│  (@codelobby/  │◀───│  (@codelobby/  │        │
│  │                │    │    queries)    │    │      api)      │        │
│  └────────────────┘    └────────────────┘    └───────┬────────┘        │
└──────────────────────────────────────────────────────┼──────────────────┘
                                                       │
                    ┌──────────────────────────────────┼──────────────────┐
                    │           IPC Bridge (window.electron)              │
                    └──────────────────────────────────┼──────────────────┘
                                                       │
┌──────────────────────────────────────────────────────┼──────────────────┐
│                            MAIN PROCESS              ▼                   │
│  ┌────────────────┐    ┌────────────────┐    ┌────────────────┐        │
│  │  IPC Handlers  │───▶│  API Functions │───▶│  HTTP Client   │        │
│  │  (index.ts)    │◀───│ (github-*.ts,  │◀───│ (http-client)  │        │
│  │                │    │  claude-api.ts)│    │                │        │
│  └────────────────┘    └────────────────┘    └───────┬────────┘        │
└──────────────────────────────────────────────────────┼──────────────────┘
                                                       │
                         ┌─────────────────────────────┼─────────────────┐
                         │      EXTERNAL SERVICES      ▼                 │
                         │  ┌─────────────┐    ┌─────────────┐          │
                         │  │ GitHub API  │    │ Claude API  │          │
                         │  │  (GraphQL   │    │ (Anthropic  │          │
                         │  │  + REST)    │    │    SDK)     │          │
                         │  └─────────────┘    └─────────────┘          │
                         └───────────────────────────────────────────────┘
```

### Key Principles

1. **Single Point of Network Access** - All HTTP calls go through `http-client.ts` for unified tracking
2. **Type-Safe IPC** - Preload script provides type-safe bridge between renderer and main
3. **Automatic Logging** - Every layer logs operations with timing and context
4. **Network Panel Integration** - All requests are tracked for the Network Panel UI
5. **Caching at Multiple Levels** - TanStack Query (memory) + electron-store (disk)

---

## 2. Complete Data Flow Diagram

### Request Flow (UI → External API)

```
1. USER INTERACTION
   └─▶ React Component (e.g., usePRs hook)
       │
2. TANSTACK QUERY
   └─▶ useQuery({ queryFn: async () => { ... } })
       │
       └─▶ api.github.fetchAllPRsForRepos(repoNames)
           │
3. API CLIENT (@codelobby/api)
   └─▶ call('github.fetchAllPRsForRepos', ...)
       │
       └─▶ window.electron.fetchAllPRsForRepos(repoNames)
           │
4. IPC BRIDGE (contextBridge)
   └─▶ ipcRenderer.invoke('fetch-all-prs-for-repos', repoNames)
       │
       ═══════════════════ PROCESS BOUNDARY ═══════════════════
       │
5. MAIN PROCESS
   └─▶ ipcMain.handle('fetch-all-prs-for-repos', ...)
       │
       └─▶ fetchAllPRsForRepos(token, repoFullNames)
           │
           └─▶ executeGraphQL(client, GET_ALL_PRS_FOR_REPOS, ...)
               │
6. HTTP CLIENT
   └─▶ http.post('https://api.github.com/graphql', ...)
       │
       └─▶ fetch() ─────────▶ GitHub API
```

### Response Flow (External API → UI)

```
7. GITHUB RESPONSE
   └─▶ JSON data + rate limit headers
       │
8. HTTP CLIENT PROCESSING
   └─▶ Extract rate limit from headers
   └─▶ Notify rate limit callback
   └─▶ Notify network request callback (for Network Panel)
   └─▶ Parse JSON response
       │
9. DATA TRANSFORMATION
   └─▶ transformGraphQLPR() - Convert GraphQL format to internal format
       │
10. IPC RESPONSE
    └─▶ { success: true, data: pullRequests, rateLimit: {...} }
        │
        ═══════════════════ PROCESS BOUNDARY ═══════════════════
        │
11. API CLIENT LOGGING
    └─▶ logger.info('github.fetchAllPRsForRepos - success', {...})
        │
12. TANSTACK QUERY CACHING
    └─▶ queryClient.setQueryData(queryKeys.prs([repo]), prs)
        │
13. UI UPDATE
    └─▶ Component re-renders with new data
```

---

## 3. The Five Layers

| Layer | Package/Location | Responsibility |
|-------|------------------|----------------|
| **1. UI** | `packages/*-module/` | React components, user interaction |
| **2. Query** | `@codelobby/queries` | Caching, background refresh, optimistic updates |
| **3. API Client** | `@codelobby/api` | Logging wrapper, type-safe method calls |
| **4. IPC Bridge** | `src/preload/index.ts` | Secure process boundary crossing |
| **5. Main Process** | `src/main/` | Actual HTTP calls, token storage |

---

## 4. Layer 1: UI Components (React)

UI components use hooks from `@codelobby/queries` to fetch data:

```typescript
// Example: PRDetail component
import { usePRs, useRefreshRepoPRs } from '@codelobby/queries'

function PRList() {
  const { data, isLoading, error } = usePRs()
  const refreshMutation = useRefreshRepoPRs()
  
  // TanStack Query handles:
  // - Loading states
  // - Error states
  // - Automatic caching
  // - Background refetch on window focus
  
  return (
    <div>
      {data?.prs.map(pr => <PRCard key={pr.id} pr={pr} />)}
    </div>
  )
}
```

### Key UI Patterns

1. **Never call API directly** - Always use hooks from `@codelobby/queries`
2. **Optimistic Updates** - Use `onMutate` for instant UI feedback
3. **Loading States** - TanStack Query provides `isLoading`, `isFetching`
4. **Error Boundaries** - Handle errors at appropriate levels

---

## 5. Layer 2: TanStack Query (@codelobby/queries)

This layer provides intelligent caching and data fetching.

### Query Structure

```typescript
// packages/queries/src/index.ts
export function usePRs() {
  const { data: selectedRepos } = useSelectedRepos()
  const queryClient = useQueryClient()
  
  return useQuery({
    queryKey: ['prs', 'combined', ...selectedRepos.sort()],
    queryFn: async () => {
      // Check per-repo cache first
      for (const repoName of selectedRepos) {
        const cached = queryClient.getQueryData(queryKeys.prs([repoName]))
        if (cached) cachedPRs.push(...cached)
        else uncachedRepos.push(repoName)
      }
      
      // Only fetch uncached repos
      if (uncachedRepos.length > 0) {
        const result = await api.github.fetchAllPRsForRepos(uncachedRepos)
        // Cache each repo separately for future
        for (const [repo, prs] of prsByRepo) {
          queryClient.setQueryData(queryKeys.prs([repo]), prs)
        }
      }
      
      return { prs: [...cachedPRs, ...fetchedPRs], rateLimit }
    },
    staleTime: 5 * 60 * 1000,  // Fresh for 5 minutes
    gcTime: 30 * 60 * 1000     // Keep in cache for 30 minutes
  })
}
```

### Query Keys

```typescript
export const queryKeys = {
  repos: ['repos'],
  prs: (repoNames: string[]) => ['prs', ...repoNames],
  prFiles: (owner, repo, prNumber) => ['pr-files', owner, repo, prNumber],
  rateLimit: ['rate-limit'],
  selectedRepos: ['selected-repos'],
  // AI related
  claudeApiKey: ['claude-api-key'],
  selectedModel: ['selected-model'],
  chatHistory: ['chat-history'],
}
```

### Caching Strategy

| Query Type | staleTime | gcTime | Notes |
|------------|-----------|--------|-------|
| Repos | 5 min | 30 min | Rarely changes |
| PRs | 5 min | 30 min | Background refresh on focus |
| PR Files | 10 min | 1 hour | Files don't change often |
| Settings | Infinity | Infinity | Local only, never stale |

---

## 6. Layer 3: API Client (@codelobby/api)

Provides type-safe, logged API calls.

### Structure

```
packages/api/src/
├── index.ts         # Main export: api object
├── client.ts        # Aggregates all namespaces
├── call.ts          # Core logging wrapper
├── logger.ts        # Log categories
├── types.ts         # Type definitions
└── namespaces/
    ├── github.ts    # GitHub API methods
    ├── ai.ts        # Claude AI methods
    ├── settings.ts  # App settings methods
    └── index.ts     # Namespace exports
```

### The `call()` Wrapper

Every API call goes through this wrapper:

```typescript
// packages/api/src/call.ts
export async function call<T>(
  method: string,
  apiCall: () => Promise<T>,
  params?: unknown,
  options: ApiCallOptions = {}
): Promise<T> {
  const startTime = performance.now()
  
  // Log start
  logger.debug(category, `${method} - started`, { params: sanitizeParams(params) })
  
  try {
    const result = await apiCall()
    const durationMs = performance.now() - startTime
    
    // Log success
    logger.info(category, `${method} - success`, {
      durationMs: Math.round(durationMs * 100) / 100,
      response: summarizeResponse(result)
    })
    
    return result
  } catch (error) {
    logger.error(category, `${method} - failed`, { error })
    throw error
  }
}
```

### Namespace Example (GitHub)

```typescript
// packages/api/src/namespaces/github.ts
export const github = {
  async fetchAllPRsForRepos(repoFullNames: string[]) {
    return call(
      'github.fetchAllPRsForRepos',
      () => window.electron.fetchAllPRsForRepos(repoFullNames),
      { repos: repoFullNames.length },
      { category: LogCategory.GRAPHQL }
    )
  },
  
  async refreshSinglePR(repoFullName: string, prNumber: number) {
    return call(
      'github.refreshSinglePR',
      () => window.electron.refreshSinglePR(repoFullName, prNumber),
      { repo: repoFullName, prNumber },
      { category: LogCategory.GRAPHQL }
    )
  },
  
  // Real-time subscription (not a promise)
  onRateLimitUpdate(callback) {
    return window.electron.onRateLimitUpdate(callback)
  }
}
```

---

## 7. Layer 4: IPC Bridge (Preload Script)

The preload script creates a secure bridge between renderer and main process.

### Preload Implementation

```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  // GitHub API
  fetchAllPRsForRepos: (repoFullNames: string[]) =>
    ipcRenderer.invoke('fetch-all-prs-for-repos', repoFullNames),
  
  refreshSinglePR: (repoFullName: string, prNumber: number) =>
    ipcRenderer.invoke('refresh-single-pr', repoFullName, prNumber),
  
  // Real-time subscriptions
  onRateLimitUpdate: (callback) => {
    const listener = (_event, rateLimit) => callback(rateLimit)
    ipcRenderer.on('rate-limit-update', listener)
    return () => ipcRenderer.removeListener('rate-limit-update', listener)
  },
  
  // Streaming API
  onChatStreamChunk: (callback) => {
    const listener = (_event, chunk) => callback(chunk)
    ipcRenderer.on('chat-stream-chunk', listener)
    return () => ipcRenderer.removeListener('chat-stream-chunk', listener)
  }
})
```

### Type Definitions

```typescript
// src/preload/electron-api.d.ts
interface ElectronAPI {
  // GitHub
  fetchAllPRsForRepos(repoFullNames: string[]): Promise<{
    success: boolean
    data?: PullRequest[]
    currentUser?: string
    rateLimit?: RateLimit
    error?: string
  }>
  
  // Streaming subscriptions
  onRateLimitUpdate(callback: (rateLimit: RateLimit) => void): () => void
  onChatStreamChunk(callback: (chunk: StreamChunk) => void): () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
  }
}
```

---

## 8. Layer 5: Main Process API Handlers

IPC handlers in the main process that execute actual API calls.

### Handler Registration

```typescript
// src/main/index.ts
function setupIPCHandlers() {
  // GitHub API - Lazy loading
  ipcMain.handle('fetch-all-prs-for-repos', async (_, repoFullNames: string[]) => {
    const token = getToken()
    if (!token) return { success: false, error: 'No token' }
    
    try {
      // Check persistent cache first (30 min TTL)
      const persistentCache = getPRDataCache()
      if (persistentCache && isCacheValid(persistentCache.lastFetch, CACHE_TTL)) {
        return { success: true, data: persistentCache.data, fromCache: true }
      }
      
      // Fetch from GitHub API
      const data = await fetchAllPRsForRepos(token, repoFullNames)
      
      // Update persistent cache
      setPRDataCache(data, sortedRepos)
      
      return { success: true, data: data.pullRequests, rateLimit: data.rateLimit }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}
```

---

## 9. External API Integration

### GitHub GraphQL API

```typescript
// src/main/github-graphql.ts

// Create GraphQL client that uses our http.post()
function createGraphQLClient(token: string) {
  return async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await http.post<{ data?: T; errors?: Array<{ message: string }> }>(
      'https://api.github.com/graphql',
      {
        headers: {
          Authorization: `token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query, variables })
      }
    )
    
    if (response.data.errors?.length) {
      throw new Error(response.data.errors.map(e => e.message).join(', '))
    }
    
    return response.data.data
  }
}

// Execute with retry and timeout
async function executeGraphQL<T>(client, query, variables, context) {
  const result = await withRetryAndTimeout<T>(
    async () => client(query, variables),
    {
      retry: { maxRetries: 3, initialDelayMs: 2000, backoffMultiplier: 2 },
      timeoutMs: 45000,
      context
    }
  )
  
  // Extract rate limit from response
  if (result.rateLimit && rateLimitNotifier) {
    rateLimitNotifier({
      limit: result.rateLimit.limit,
      remaining: result.rateLimit.remaining,
      used: result.rateLimit.used,
      resetAt: result.rateLimit.resetAt,
      percentage: Math.round((result.rateLimit.used / result.rateLimit.limit) * 100),
      resource: 'graphql'
    })
  }
  
  return result
}
```

### Claude AI API (Anthropic SDK)

```typescript
// src/main/claude-api.ts
import Anthropic from '@anthropic-ai/sdk'

// Client caching by API key
const clientCache = new Map<string, Anthropic>()

function getClient(apiKey: string): Anthropic {
  if (!clientCache.has(apiKey)) {
    clientCache.set(apiKey, new Anthropic({ apiKey }))
  }
  return clientCache.get(apiKey)
}

// Fetch available models
export async function fetchModels(apiKey: string): Promise<ClaudeModel[]> {
  const client = getClient(apiKey)
  const response = await wrapSdkCall(
    'claude.models.list',
    () => client.models.list(),
    { logCategory: LogCategory.API }
  )
  return response.data.map(model => ({
    id: model.id,
    display_name: model.display_name,
    created_at: model.created_at,
    type: model.type
  }))
}

// Send message with streaming
export async function sendMessageStreaming(
  apiKey: string,
  messages: ClaudeMessage[],
  onChunk: StreamCallback,
  model?: string,
  systemPrompt?: string,
  enableThinking: boolean = false
): Promise<void> {
  const client = getClient(apiKey)
  
  const stream = await wrapSdkStreamCall(
    'claude.streamMessage',
    () => client.messages.stream({
      model: selectedModel,
      max_tokens: enableThinking ? 16000 : 4096,
      system: systemPrompt,
      messages,
      thinking: enableThinking ? { type: 'enabled', budget_tokens: 8000 } : undefined
    }),
    { logCategory: LogCategory.API }
  )
  
  stream.on('text', (text) => {
    onChunk({ type: 'text', content: text })
  })
  
  stream.on('thinking', (delta) => {
    onChunk({ type: 'thinking', thinking: delta })
  })
  
  const finalMessage = await stream.finalMessage()
  onChunk({ type: 'done', fullResponse: { ... } })
}
```

---

## 10. HTTP Client & Request Tracking

The centralized HTTP client ensures ALL requests are tracked.

### HTTP Client Structure

```typescript
// src/main/http-client.ts

// Request tracking callback for Network Panel
let networkRequestCallback: NetworkRequestCallback | null = null

export function onNetworkRequest(callback: NetworkRequestCallback | null): void {
  networkRequestCallback = callback
}

// Main fetch function
async function httpFetch<T>(url: string, options: HttpRequestOptions = {}): Promise<HttpResponse<T>> {
  const startTime = performance.now()
  const requestId = `http_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  
  // Track request start
  if (isGitHubApi && networkRequestCallback) {
    networkRequestCallback({
      id: requestId,
      method: `rest.${operationName}`,
      status: 'pending',
      startTime: Date.now(),
      httpMethod: method,
      url,
      requestBody
    })
  }
  
  try {
    const response = await fetch(url, { ...fetchOptions, signal: controller.signal })
    
    // Extract rate limit from headers
    if (isGitHubApi && rateLimitCallback) {
      const rateLimit = extractRateLimitFromHeaders(response.headers)
      if (rateLimit) rateLimitCallback(rateLimit)
    }
    
    // Track request success
    if (isGitHubApi && networkRequestCallback) {
      networkRequestCallback({
        id: requestId,
        status: response.ok ? 'success' : 'error',
        durationMs: performance.now() - startTime,
        statusCode: response.status,
        responseBody,
        rateLimit
      })
    }
    
    return { ok: response.ok, status: response.status, data, durationMs, size }
  } catch (error) {
    // Track request error
    networkRequestCallback?.({ id: requestId, status: 'error', error: errorMessage })
    throw new HttpError(errorMessage, { url, method, durationMs, isTimeout })
  }
}

// Convenience methods
export const http = {
  fetch: httpFetch,
  get: (url, options) => httpFetch(url, { ...options, method: 'GET' }),
  post: (url, options) => httpFetch(url, { ...options, method: 'POST' }),
  put: (url, options) => httpFetch(url, { ...options, method: 'PUT' }),
  delete: (url, options) => httpFetch(url, { ...options, method: 'DELETE' }),
  patch: (url, options) => httpFetch(url, { ...options, method: 'PATCH' })
}
```

### SDK Call Wrapper

```typescript
// Wrap SDK calls (like Anthropic) with logging
export async function wrapSdkCall<T>(
  operationName: string,
  fn: () => Promise<T>,
  options?: { logCategory?: string; details?: Record<string, unknown> }
): Promise<T> {
  const startTime = performance.now()
  logger.debug(logCategory, `${operationName} - started`, details)
  
  try {
    const result = await fn()
    logger.info(logCategory, `✓ ${operationName} - success`, { durationMs, ...details })
    return result
  } catch (error) {
    logger.error(logCategory, `✗ ${operationName} - failed`, { error, durationMs })
    throw error
  }
}
```

---

## 11. Rate Limit Management

### Real-Time Rate Limit Updates

```typescript
// Main process: Extract from every GitHub response
function extractRateLimitFromHeaders(headers: Headers): RateLimitUpdate | null {
  const limit = headers.get('x-ratelimit-limit')
  const remaining = headers.get('x-ratelimit-remaining')
  const reset = headers.get('x-ratelimit-reset')
  
  return {
    limit: parseInt(limit),
    remaining: parseInt(remaining),
    used: limit - remaining,
    resetAt: new Date(parseInt(reset) * 1000).toISOString(),
    percentage: Math.round((used / limit) * 100)
  }
}

// Notify renderer of rate limit updates
if (rateLimitCallback) {
  rateLimitCallback(rateLimit)
}

// In IPC setup
onRateLimitUpdate((rateLimit) => {
  mainWindow?.webContents.send('rate-limit-update', rateLimit)
})
```

### Renderer: Subscribe to Updates

```typescript
// packages/queries/src/index.ts
export function useRateLimit() {
  const rateLimit = useSignal(Store.rateLimit)
  
  useEffect(() => {
    // Subscribe to real-time updates
    const unsubscribe = api.github.onRateLimitUpdate((newRateLimit) => {
      Store.rateLimit.value = newRateLimit
    })
    
    // Fetch initial rate limit
    api.github.getRateLimit().then(result => {
      if (result.success) Store.rateLimit.value = result.data
    })
    
    return unsubscribe
  }, [])
  
  return { data: rateLimit }
}
```

---

## 12. Caching Strategy

### Multi-Level Caching

```
┌─────────────────────────────────────────────────────────────┐
│                      CACHING LEVELS                          │
├─────────────────────────────────────────────────────────────┤
│ Level 1: TanStack Query (Memory)                            │
│   - staleTime: How long data is considered fresh            │
│   - gcTime: How long to keep unused data in memory          │
│   - Automatic background refetch on window focus            │
├─────────────────────────────────────────────────────────────┤
│ Level 2: Main Process Session Cache (Memory)                │
│   - Quick lookups within app session                        │
│   - Cleared on app restart                                  │
├─────────────────────────────────────────────────────────────┤
│ Level 3: Persistent Cache (electron-store on disk)          │
│   - 30-minute TTL for PR data                               │
│   - 30-minute TTL for repository list                       │
│   - Survives app restart                                    │
│   - Invalidated on token change or manual refresh           │
└─────────────────────────────────────────────────────────────┘
```

### Cache Validation

```typescript
// src/main/index.ts
const CACHE_TTL_PR_DATA = 30 * 60 * 1000  // 30 minutes
const CACHE_TTL_ALL_REPOS = 30 * 60 * 1000

function isCacheValid(lastFetch: number, ttl: number): boolean {
  return Date.now() - lastFetch < ttl
}

// In IPC handler
const persistentCache = getPRDataCache()
if (persistentCache && isCacheValid(persistentCache.lastFetch, CACHE_TTL_PR_DATA)) {
  return { success: true, data: persistentCache.data, fromCache: true }
}
```

---

## 13. Streaming APIs

### AI Chat Streaming

```typescript
// Main process: Start stream and emit chunks
ipcMain.handle('send-chat-message-streaming', async (_, message, systemContext) => {
  const streamId = `stream_${Date.now()}`
  
  await sendMessageStreaming(
    apiKey,
    messages,
    (chunk) => {
      // Emit chunk to renderer via IPC
      mainWindow?.webContents.send('chat-stream-chunk', { streamId, ...chunk })
    },
    selectedModel,
    systemContext,
    enableThinking
  )
  
  return { success: true, streamId }
})

// Renderer: Subscribe to chunks
const unsubscribe = api.ai.onChatStreamChunk((chunk) => {
  if (chunk.streamId !== currentStreamId) return
  
  switch (chunk.type) {
    case 'thinking':
      setThinking(prev => prev + chunk.thinking)
      break
    case 'text':
      setContent(prev => prev + chunk.content)
      break
    case 'done':
      setIsLoading(false)
      break
    case 'error':
      setError(chunk.error)
      break
  }
})
```

---

## 14. Error Handling

### Error Response Convention

```typescript
// All IPC handlers return this shape:
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  rateLimit?: RateLimit
  fromCache?: boolean
}

// Error handling in main process
try {
  const data = await fetchAllPRsForRepos(token, repoFullNames)
  return { success: true, data: data.pullRequests, rateLimit: data.rateLimit }
} catch (error) {
  logger.error(LogCategory.API, 'Failed to fetch PRs', { error: error.message })
  return { success: false, error: error.message }
}
```

### GitHub Error Parsing

```typescript
// src/main/api-client.ts
export function parseGitHubError(error: unknown): Error {
  if (error instanceof Error) {
    // Check for HTML error response (GitHub 503)
    if (error.message.includes('<!DOCTYPE')) {
      return new Error('GitHub API temporarily unavailable. Please try again.')
    }
    // Rate limit error
    if (error.message.includes('rate limit')) {
      return new Error('GitHub API rate limit exceeded. Please wait and try again.')
    }
  }
  return error instanceof Error ? error : new Error(String(error))
}
```

### Claude API Error Handling

```typescript
// src/main/claude-api.ts
if (error instanceof Anthropic.AuthenticationError) {
  throw new Error('Invalid API key. Please check your Claude API key.')
}
if (error instanceof Anthropic.RateLimitError) {
  throw new Error('Rate limit exceeded. Please wait a moment and try again.')
}
if (error instanceof Anthropic.BadRequestError) {
  throw new Error(`Invalid request: ${error.message}`)
}
```

---

## 15. Network Panel Integration

### How Requests are Tracked

```typescript
// src/main/index.ts - Setup network request notifier
onNetworkRequest((event: NetworkRequestEvent) => {
  // Add to in-memory list
  networkRequests.push(event)
  
  // Trim old requests (keep last 500)
  if (networkRequests.length > 500) {
    networkRequests = networkRequests.slice(-500)
  }
  
  // Notify renderer
  mainWindow?.webContents.send('network-request', event)
})
```

### Network Request Event Shape

```typescript
interface NetworkRequestEvent {
  id: string
  method: string           // e.g., 'rest.github.fetchPRs' or 'graphql.GetAllPRData'
  status: 'pending' | 'success' | 'error'
  startTime: number
  endTime?: number
  durationMs?: number
  httpMethod?: string      // GET, POST, etc.
  url?: string
  statusCode?: number
  cost?: number            // GraphQL query cost
  rateLimit?: RateLimit
  error?: string
  requestBody?: string     // For debugging
  responseBody?: string    // For debugging
}
```

---

## 16. Best Practices

### For UI Components

```typescript
// ✅ DO: Use query hooks
const { data, isLoading } = usePRs()

// ✅ DO: Use mutations for write operations
const mutation = useSetSelectedRepos()
mutation.mutate(newRepos)

// ❌ DON'T: Call API directly
const result = await api.github.fetchPRs() // Wrong!
```

### For Adding New API Endpoints

1. **Main Process** - Add IPC handler in `src/main/index.ts`
2. **Preload** - Expose in `src/preload/index.ts`
3. **Types** - Add to `src/preload/electron-api.d.ts`
4. **API Namespace** - Add method in `packages/api/src/namespaces/`
5. **Query Hook** - Add hook in `packages/queries/src/index.ts`

### For External API Calls

```typescript
// ✅ DO: Use the http client for tracking
const response = await http.post(url, options)

// ✅ DO: Use SDK wrappers for logging
const result = await wrapSdkCall('operation.name', () => sdk.method())

// ❌ DON'T: Call fetch directly (bypasses tracking)
const result = await fetch(url) // Wrong!
```

### For Error Handling

```typescript
// ✅ DO: Return consistent error shape
return { success: false, error: 'User-friendly message' }

// ✅ DO: Log errors with context
logger.error(LogCategory.API, 'Operation failed', {
  operation: 'fetchPRs',
  error: error.message,
  context: { repoCount: repos.length }
})

// ❌ DON'T: Throw raw errors to UI
throw error // Let the handler catch and format
```

---

## Summary

The CodeLobby API architecture follows a strict layered approach:

1. **UI** calls **TanStack Query** hooks
2. **TanStack Query** manages caching and calls **API Client**
3. **API Client** adds logging and calls **IPC Bridge**
4. **IPC Bridge** securely crosses process boundary
5. **Main Process** executes actual HTTP calls via **HTTP Client**
6. **HTTP Client** tracks ALL requests for the Network Panel

This design ensures:
- Type safety across process boundaries
- Automatic logging at every layer
- Intelligent multi-level caching
- Real-time request tracking for debugging
- Consistent error handling and user feedback
