/**
 * Network Module Utilities
 *
 * Helper functions for formatting and styling network request data.
 */

/**
 * Format duration in milliseconds to a human-readable string.
 * @param ms - Duration in milliseconds
 * @returns Formatted string (e.g., "150ms" or "1.5s")
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

/**
 * Format a GraphQL query string for display.
 * Handles indentation and line breaks properly.
 * @param query - GraphQL query string
 * @returns Formatted query string
 */
function formatGraphQLQuery(query: string): string {
  // Clean up the query - normalize line breaks and remove excessive whitespace
  return query
    .replace(/\\n/g, '\n') // Convert escaped newlines to actual newlines
    .replace(/\r\n/g, '\n') // Normalize Windows line endings
    .split('\n')
    .map((line) => line.trimEnd()) // Remove trailing whitespace from each line
    .join('\n')
    .trim()
}

/**
 * Pretty print JSON string with indentation.
 * Specially handles GraphQL request bodies to format the query field nicely.
 * Returns the original string if it's not valid JSON.
 * @param body - JSON string to format
 * @returns Formatted JSON string or original string if not valid JSON
 */
export function formatJsonBody(body: string): string {
  try {
    const parsed = JSON.parse(body)

    // Check if this is a GraphQL request (has query field)
    if (parsed && typeof parsed.query === 'string') {
      const formattedQuery = formatGraphQLQuery(parsed.query)
      // Create a custom formatted output for GraphQL
      const lines: string[] = ['{']

      // Format the query field specially
      lines.push('  "query": `')
      formattedQuery.split('\n').forEach((line) => {
        lines.push(`    ${line}`)
      })
      lines.push('  `,')

      // Format variables if present
      if (parsed.variables !== undefined) {
        const varsJson = JSON.stringify(parsed.variables, null, 2)
        const varsLines = varsJson.split('\n')
        lines.push(`  "variables": ${varsLines[0]}`)
        for (let i = 1; i < varsLines.length; i++) {
          lines.push(`  ${varsLines[i]}`)
        }
      }

      // Add any other fields
      for (const key of Object.keys(parsed)) {
        if (key !== 'query' && key !== 'variables') {
          lines.push(`  "${key}": ${JSON.stringify(parsed[key], null, 2).split('\n').join('\n  ')}`)
        }
      }

      lines.push('}')
      return lines.join('\n')
    }

    // Standard JSON formatting for non-GraphQL bodies
    return JSON.stringify(parsed, null, 2)
  } catch {
    // Not valid JSON, return as-is
    return body
  }
}

/**
 * Get Tailwind CSS classes for HTTP method badge colors.
 * @param method - HTTP method (GET, POST, PUT, DELETE, PATCH)
 * @returns CSS class string for styling the badge
 */
export function getMethodColor(method?: string): string {
  switch (method?.toUpperCase()) {
    case 'GET':
      return 'bg-green-500/10 text-green-500/70 border-green-500/15'
    case 'POST':
      return 'bg-blue-500/10 text-blue-500/70 border-blue-500/15'
    case 'PUT':
      return 'bg-yellow-500/10 text-yellow-500/60 border-yellow-500/15'
    case 'DELETE':
      return 'bg-red-500/10 text-red-500/70 border-red-500/15'
    case 'PATCH':
      return 'bg-purple-500/10 text-purple-500/70 border-purple-500/15'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

/**
 * Filter network requests by search query.
 * Searches in URL, method name, and HTTP method.
 * @param requests - Array of network requests
 * @param query - Search query string
 * @returns Filtered array of requests
 */
export function filterRequests<T extends { url?: string; method?: string; httpMethod?: string }>(
  requests: T[],
  query: string
): T[] {
  if (!query.trim()) return requests
  const lowerQuery = query.toLowerCase()
  return requests.filter((req) => {
    const url = req.url?.toLowerCase() || ''
    const method = req.method?.toLowerCase() || ''
    const httpMethod = req.httpMethod?.toLowerCase() || ''
    return (
      url.includes(lowerQuery) || method.includes(lowerQuery) || httpMethod.includes(lowerQuery)
    )
  })
}

/**
 * Calculate totals from network requests.
 * @param requests - Array of network requests
 * @returns Object with totalCost, successCount, errorCount, pendingCount, and total
 */
export function calculateTotals<T extends { cost?: number; status: string }>(
  requests: T[]
): {
  totalCost: number
  successCount: number
  errorCount: number
  pendingCount: number
  total: number
} {
  let totalCost = 0
  let successCount = 0
  let errorCount = 0
  let pendingCount = 0

  for (const req of requests) {
    if (req.cost) totalCost += req.cost
    if (req.status === 'success') successCount++
    if (req.status === 'error') errorCount++
    if (req.status === 'pending') pendingCount++
  }

  return { totalCost, successCount, errorCount, pendingCount, total: requests.length }
}
