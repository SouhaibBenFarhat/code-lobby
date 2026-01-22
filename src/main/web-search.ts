/**
 * Web Search Tool for AI Chat
 * Uses Tavily API for AI-optimized web search
 * https://tavily.com/
 */

import { LogCategory, logger } from './logger'

export interface SearchResult {
  title: string
  url: string
  content: string
  score: number
}

export interface WebSearchResponse {
  success: boolean
  results?: SearchResult[]
  answer?: string // AI-generated answer from Tavily
  error?: string
}

// Tool definition for Claude
export const WEB_SEARCH_TOOL = {
  name: 'web_search',
  description:
    'Search the internet for current information. Use this when you need up-to-date information, facts about recent events, technical documentation, or any information that might have changed since your training cutoff. Returns relevant web pages with titles, URLs, and content snippets.',
  input_schema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description:
          'The search query. Be specific and include relevant keywords. For technical queries, include version numbers or technology names.'
      },
      search_depth: {
        type: 'string',
        enum: ['basic', 'advanced'],
        description:
          "Search depth. 'basic' is faster and suitable for simple queries. 'advanced' does deeper research for complex topics. Defaults to 'basic'."
      },
      max_results: {
        type: 'number',
        description: 'Maximum number of results to return (1-10). Defaults to 5.'
      }
    },
    required: ['query']
  }
}

/**
 * Execute a web search using Tavily API
 */
export async function executeWebSearch(
  tavilyApiKey: string,
  query: string,
  searchDepth: 'basic' | 'advanced' = 'basic',
  maxResults: number = 5
): Promise<WebSearchResponse> {
  logger.info(LogCategory.API, 'Executing web search', {
    query,
    searchDepth,
    maxResults
  })

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: tavilyApiKey,
        query,
        search_depth: searchDepth,
        max_results: Math.min(Math.max(maxResults, 1), 10), // Clamp between 1-10
        include_answer: true, // Get AI-generated summary
        include_raw_content: false // Don't need full page content
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error(LogCategory.API, 'Tavily API error', {
        status: response.status,
        error: errorText
      })

      if (response.status === 401) {
        return { success: false, error: 'Invalid Tavily API key' }
      }
      if (response.status === 429) {
        return { success: false, error: 'Search rate limit exceeded. Please try again.' }
      }

      return { success: false, error: `Search failed: ${errorText}` }
    }

    const data = await response.json()

    const results: SearchResult[] = (data.results || []).map(
      (r: { title: string; url: string; content: string; score: number }) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        score: r.score
      })
    )

    logger.info(LogCategory.API, 'Web search complete', {
      query,
      resultsCount: results.length,
      hasAnswer: !!data.answer
    })

    return {
      success: true,
      results,
      answer: data.answer
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(LogCategory.API, 'Web search error', { error: errorMessage })
    return { success: false, error: `Search failed: ${errorMessage}` }
  }
}

/**
 * Format search results for Claude to read
 */
export function formatSearchResultsForClaude(response: WebSearchResponse): string {
  if (!response.success) {
    return `Search failed: ${response.error}`
  }

  const lines: string[] = []

  if (response.answer) {
    lines.push('## Summary')
    lines.push(response.answer)
    lines.push('')
  }

  if (response.results && response.results.length > 0) {
    lines.push('## Search Results')
    lines.push('')

    for (const result of response.results) {
      lines.push(`### ${result.title}`)
      lines.push(`URL: ${result.url}`)
      lines.push('')
      lines.push(result.content)
      lines.push('')
    }
  } else {
    lines.push('No results found for this query.')
  }

  return lines.join('\n')
}

/**
 * Validate Tavily API key
 */
export async function validateTavilyApiKey(apiKey: string): Promise<boolean> {
  try {
    // Do a minimal search to validate the key
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: 'test',
        max_results: 1
      })
    })

    if (response.status === 401) {
      logger.warn(LogCategory.AUTH, 'Invalid Tavily API key')
      return false
    }

    logger.info(LogCategory.AUTH, 'Tavily API key validated successfully')
    return response.ok
  } catch (error) {
    logger.error(LogCategory.AUTH, 'Error validating Tavily API key', {
      error: error instanceof Error ? error.message : String(error)
    })
    return false
  }
}
