# 📡 Network Module

Real-time HTTP request monitoring panel for debugging API calls.

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  Component calls fetch() (via TanStack Query or directly)   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Global fetch() interceptor (useNetworkTracking hook)        │
│  ├── Captures: URL, method, request body                     │
│  ├── Adds NetworkRequest { status: 'pending' } to cache      │
│  └── Calls original fetch()                                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Actual HTTP request to GitHub/Claude/etc                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Response received                                           │
│  ├── Clones response to read body without consuming          │
│  ├── Updates NetworkRequest with:                            │
│  │   - status: 'success' | 'error'                          │
│  │   - statusCode: HTTP status                               │
│  │   - responseBody: Full response body (JSON data)          │
│  │   - durationMs: Request timing                            │
│  └── Returns original response to caller                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Network Panel UI                                            │
│  ├── Reads from useNetworkRequests() query                   │
│  ├── Displays list with status, timing, URL                  │
│  └── Expandable rows show full request/response bodies       │
└─────────────────────────────────────────────────────────────┘
```

## Key Implementation

### Global Fetch Interception

Located in `@codelobby/data` → `useNetworkTracking`:

```typescript
// Save original fetch
const originalFetch = window.fetch

// Override globally
window.fetch = async (input, init) => {
  const startTime = Date.now()
  const requestBody = init?.body
  
  // Add pending request to TanStack Query cache
  addNetworkRequest({ status: 'pending', url, requestBody, startTime })
  
  try {
    const response = await originalFetch(input, init)
    
    // Clone to read body without consuming
    const responseBody = await response.clone().text()
    
    // Update request with response data
    updateNetworkRequest(id, {
      status: response.ok ? 'success' : 'error',
      statusCode: response.status,
      responseBody,
      durationMs: Date.now() - startTime
    })
    
    return response  // Return original to caller
  } catch (error) {
    updateNetworkRequest(id, { status: 'error', error: error.message })
    throw error
  }
}
```

### Data Storage

Network requests are stored in TanStack Query cache:

```typescript
keys.networkRequests = ['network', 'requests']

// Queries
useNetworkRequests()      // Read all requests

// Mutations  
useClearNetworkRequests() // Clear all requests
```

### NetworkRequest Type

```typescript
interface NetworkRequest {
  id: string
  method: string           // Human-readable: "GitHub GraphQL", "fetchPRs"
  httpMethod: string       // HTTP method: "GET", "POST"
  url: string              // Full URL
  status: 'pending' | 'success' | 'error'
  startTime: number
  endTime?: number
  durationMs?: number
  statusCode?: number      // HTTP status code
  requestBody?: string     // Full request body (GraphQL queries)
  responseBody?: string    // Full response body (JSON)
  responseSize?: number
  error?: string
}
```

## Why Fetch Interception?

| Approach | Pros | Cons |
|----------|------|------|
| QueryCache.subscribe() | No global modification | Only metadata, no bodies |
| **Fetch interception** ✅ | Full request/response data | Modifies global fetch |

We need **full request/response bodies** to be useful for debugging.

## Module Structure

```
packages/network-module/
├── src/
│   ├── index.tsx              # Slot registration, useNetworkTracking()
│   ├── components/
│   │   ├── NetworkPanel/      # Main panel container
│   │   ├── NetworkPanelHeader/# Title, clear button, close button
│   │   ├── NetworkRequestList/# Scrollable request list
│   │   ├── NetworkRequestItem/# Individual request row (expandable)
│   │   ├── NetworkSearchInput/# URL filter input
│   │   └── NetworkStats/      # Summary stats
│   └── utils/
│       └── index.ts           # formatDuration, filterRequests
```

## Usage

1. Module auto-registers via `bootstrap.ts` import
2. Click Network button in header to toggle panel
3. All fetch requests are automatically tracked
