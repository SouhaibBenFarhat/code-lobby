/**
 * Web Fetch Tool for Claude
 *
 * A FREE tool that allows Claude to fetch and read web page content.
 * Claude already knows thousands of URLs from training (docs, APIs, etc.),
 * so it can directly request specific pages without needing a search API.
 *
 * Benefits:
 * - No API key required
 * - No rate limits (within reason)
 * - Goes directly to the source
 * - Works for documentation, GitHub, wikis, blogs, etc.
 */

import { LogCategory, mainLogger as logger } from '@logger/main'
import { http } from './http-client'

// Tool definition for Claude
export const FETCH_URL_TOOL = {
  name: 'fetch_url',
  description: `Fetch and read content from a URL. Use this when you need current information from a specific webpage.

You know many documentation URLs from your training:
- React: https://react.dev/reference/react/...
- Python: https://docs.python.org/3/library/...
- MDN: https://developer.mozilla.org/en-US/docs/Web/...
- Node.js: https://nodejs.org/api/...
- TypeScript: https://www.typescriptlang.org/docs/...
- npm packages: https://www.npmjs.com/package/...
- GitHub: https://github.com/owner/repo/...
- Wikipedia: https://en.wikipedia.org/wiki/...

Use this tool to get the latest documentation, README files, or any other web content.`,
  input_schema: {
    type: 'object' as const,
    properties: {
      url: {
        type: 'string',
        description: 'The URL to fetch and read. Must be a valid HTTP/HTTPS URL.'
      }
    },
    required: ['url']
  }
}

// Maximum content length to return (to avoid overwhelming the context)
const MAX_CONTENT_LENGTH = 50000

// Timeout for fetch requests (10 seconds)
const FETCH_TIMEOUT = 10000

/**
 * Extract readable text from HTML content
 * Strips tags, scripts, styles, and normalizes whitespace
 */
function extractTextFromHTML(html: string): string {
  // Remove script tags and their content
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  // Remove style tags and their content
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')

  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, '')

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ')

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '...')

  // Normalize whitespace (multiple spaces/newlines to single)
  text = text.replace(/\s+/g, ' ')

  // Remove leading/trailing whitespace from each line
  text = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n')

  return text.trim()
}

/**
 * Detect if content is likely HTML
 */
function isHTML(content: string): boolean {
  return /<(!doctype|html|head|body|div|p|span|a|script|style)/i.test(content)
}

/**
 * Detect if content is likely JSON
 */
function isJSON(content: string): boolean {
  const trimmed = content.trim()
  return (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  )
}

/**
 * Detect if content is likely Markdown
 */
function isMarkdown(url: string, content: string): boolean {
  // Check URL extension
  if (url.endsWith('.md') || url.includes('/readme')) {
    return true
  }
  // Check for common markdown patterns
  return /^#{1,6}\s|^\*\*|^-\s\[|\[.*\]\(.*\)/m.test(content)
}

/**
 * Execute the web fetch - fetches a URL and returns its content
 */
export async function executeWebFetch(url: string): Promise<{ content: string; isError: boolean }> {
  // Validate URL
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return {
        content: `Error: Only HTTP and HTTPS URLs are supported. Got: ${parsedUrl.protocol}`,
        isError: true
      }
    }
  } catch {
    return { content: `Error: Invalid URL format: ${url}`, isError: true }
  }

  try {
    const response = await http.get<string>(url, {
      headers: {
        // Pretend to be a browser to get better responses
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: FETCH_TIMEOUT,
      operationName: `webFetch(${parsedUrl.hostname})`
    })

    if (!response.ok) {
      return {
        content: `Error: HTTP ${response.status} ${response.statusText} when fetching ${url}`,
        isError: true
      }
    }

    const contentType = response.headers.get('content-type') || ''
    let content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data)

    logger.debug(LogCategory.API, 'Web fetch processing', {
      url,
      contentType,
      originalLength: content.length
    })

    // Process content based on type
    if (isHTML(content)) {
      content = extractTextFromHTML(content)
      logger.debug(LogCategory.API, 'Extracted text from HTML', { extractedLength: content.length })
    } else if (isJSON(content)) {
      // Pretty-print JSON for readability
      try {
        const parsed = JSON.parse(content)
        content = JSON.stringify(parsed, null, 2)
      } catch {
        // If JSON parsing fails, keep original
      }
    }
    // For Markdown and plain text, keep as-is

    // Truncate if too long
    if (content.length > MAX_CONTENT_LENGTH) {
      content = `${content.substring(0, MAX_CONTENT_LENGTH)}\n\n[Content truncated - page was too long]`
      logger.info(LogCategory.API, 'Content truncated', {
        originalLength: content.length,
        maxLength: MAX_CONTENT_LENGTH
      })
    }

    // Add source info
    const isMarkdownContent = isMarkdown(url, content)
    const contentLabel = isMarkdownContent
      ? 'Markdown'
      : isHTML(content)
        ? 'Extracted text'
        : 'Content'

    const result = `URL: ${url}\n${contentLabel} from page:\n\n${content}`

    return { content: result, isError: false }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    // Handle specific error types
    if (errorMessage.includes('timeout') || errorMessage.includes('abort')) {
      return {
        content: `Error: Request timed out after ${FETCH_TIMEOUT / 1000} seconds for ${url}`,
        isError: true
      }
    }

    return { content: `Error fetching ${url}: ${errorMessage}`, isError: true }
  }
}
