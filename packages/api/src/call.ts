/**
 * Core API call wrapper with automatic logging
 *
 * This is the heart of the API client - every call goes through here.
 *
 * NOTE: Network request tracking is done in the main process (executeGraphQL)
 * where ACTUAL API calls happen, not here at the IPC layer.
 */

import { LogCategory, logger } from './logger'
import type { ApiCallOptions, LogCategoryType } from './types'

/**
 * Sanitize parameters for logging (remove sensitive data)
 */
function sanitizeParams(params: unknown): unknown {
  if (params === undefined || params === null) return undefined

  if (typeof params === 'string') {
    // Mask potential tokens/keys
    if (params.length > 20 && (params.startsWith('ghp_') || params.startsWith('sk-'))) {
      return `${params.substring(0, 8)}...${params.substring(params.length - 4)}`
    }
    return params
  }

  if (Array.isArray(params)) {
    // For arrays, show count and first few items
    if (params.length > 5) {
      return `[${params.length} items: ${JSON.stringify(params.slice(0, 3))}...]`
    }
    return params
  }

  if (typeof params === 'object') {
    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
      // Skip sensitive keys
      if (key.toLowerCase().includes('token') || key.toLowerCase().includes('key')) {
        sanitized[key] = '[REDACTED]'
      } else if (key.toLowerCase().includes('password') || key.toLowerCase().includes('secret')) {
        sanitized[key] = '[REDACTED]'
      } else {
        sanitized[key] = sanitizeParams(value)
      }
    }
    return sanitized
  }

  return params
}

/**
 * Summarize response for logging (avoid huge payloads in logs)
 */
function summarizeResponse(response: unknown): string {
  if (response === undefined || response === null) return 'null'

  if (typeof response === 'boolean') return String(response)
  if (typeof response === 'number') return String(response)
  if (typeof response === 'string') {
    if (response.length > 100) {
      return `"${response.substring(0, 100)}..." (${response.length} chars)`
    }
    return `"${response}"`
  }

  if (Array.isArray(response)) {
    return `[Array: ${response.length} items]`
  }

  if (typeof response === 'object') {
    const obj = response as Record<string, unknown>

    // Common response patterns
    if ('success' in obj) {
      if (obj.success === false && obj.error) {
        return `{ success: false, error: "${obj.error}" }`
      }
      if (obj.success === true) {
        if ('data' in obj && Array.isArray(obj.data)) {
          return `{ success: true, data: [${(obj.data as unknown[]).length} items] }`
        }
        return '{ success: true }'
      }
    }

    // Generic object summary
    const keys = Object.keys(obj)
    if (keys.length > 5) {
      return `{ ${keys.slice(0, 5).join(', ')}... (${keys.length} keys) }`
    }
    return `{ ${keys.join(', ')} }`
  }

  return String(response)
}

/**
 * Make an API call with automatic logging
 *
 * @param method - The method name (for logging)
 * @param apiCall - The actual API call function
 * @param params - Parameters passed to the call (for logging)
 * @param options - Additional options
 * @returns The result of the API call
 */
export async function call<T>(
  method: string,
  apiCall: () => Promise<T>,
  params?: unknown,
  options: ApiCallOptions = {}
): Promise<T> {
  const {
    category = LogCategory.API,
    logParams = true,
    logResponse = true,
    message,
    silent = false
  } = options

  const startTime = performance.now()

  // Skip logging if silent mode
  if (!silent) {
    const logMessage = message || `${method} - started`
    const logDetails: Record<string, unknown> = {}

    if (logParams && params !== undefined) {
      logDetails.params = sanitizeParams(params)
    }

    logger.debug(
      category as LogCategoryType,
      logMessage,
      Object.keys(logDetails).length > 0 ? logDetails : undefined
    )
  }

  try {
    const result = await apiCall()
    const durationMs = performance.now() - startTime

    // Log success (unless silent)
    if (!silent) {
      const successDetails: Record<string, unknown> = {
        durationMs: Math.round(durationMs * 100) / 100 // 2 decimal places
      }

      if (logResponse) {
        successDetails.response = summarizeResponse(result)
      }

      logger.info(category as LogCategoryType, `${method} - success`, successDetails)
    }

    return result
  } catch (error) {
    const durationMs = performance.now() - startTime

    // Always log errors, even in silent mode
    const errorMessage = error instanceof Error ? error.message : String(error)

    logger.error(category as LogCategoryType, `${method} - failed`, {
      durationMs: Math.round(durationMs * 100) / 100,
      error: errorMessage
    })

    throw error
  }
}

/**
 * Make a synchronous-style API call (for callbacks/event handlers)
 * Still logs but doesn't await the result
 */
export function callSync<T>(
  method: string,
  apiCall: () => T,
  params?: unknown,
  options: ApiCallOptions = {}
): T {
  const { category = LogCategory.API, logParams = true, logResponse = true, message } = options

  const startTime = performance.now()

  // Log the start
  const logMessage = message || `${method} - called`
  const logDetails: Record<string, unknown> = {}

  if (logParams && params !== undefined) {
    logDetails.params = sanitizeParams(params)
  }

  logger.debug(
    category as LogCategoryType,
    logMessage,
    Object.keys(logDetails).length > 0 ? logDetails : undefined
  )

  try {
    const result = apiCall()
    const durationMs = performance.now() - startTime

    const successDetails: Record<string, unknown> = {
      durationMs: Math.round(durationMs * 100) / 100
    }

    if (logResponse) {
      successDetails.response = summarizeResponse(result)
    }

    logger.info(category as LogCategoryType, `${method} - completed`, successDetails)

    return result
  } catch (error) {
    const durationMs = performance.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)

    logger.error(category as LogCategoryType, `${method} - failed`, {
      durationMs: Math.round(durationMs * 100) / 100,
      error: errorMessage
    })

    throw error
  }
}
