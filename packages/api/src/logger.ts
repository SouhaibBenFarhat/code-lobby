/**
 * Logger module for the API client
 *
 * Re-exports from @codelobby/logger for convenience
 */

import type { Logger } from '@codelobby/logger'
import { LogCategory, rendererLogger } from '@codelobby/logger'

// Re-export for convenience
export { LogCategory }

// Re-export renderer logger as 'logger' for backward compatibility
export const logger: Logger & { flush: () => Promise<void> } = rendererLogger
