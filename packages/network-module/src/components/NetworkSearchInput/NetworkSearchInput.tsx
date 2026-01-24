/**
 * NetworkSearchInput Component
 *
 * Search input for filtering network requests by URL, method, or HTTP method.
 */

import { Button, Input } from '@codelobby/ui-kit'
import { Search, X } from 'lucide-react'

export interface NetworkSearchInputProps {
  /** Current search query value */
  value: string
  /** Callback when search value changes */
  onChange: (value: string) => void
  /** Placeholder text for the input */
  placeholder?: string
}

export function NetworkSearchInput({
  value,
  onChange,
  placeholder = 'Filter by URL...'
}: NetworkSearchInputProps): React.JSX.Element {
  return (
    <div className="px-3 py-2 flex-shrink-0" data-testid="network-search-container">
      <div className="relative w-full">
        <Search
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none"
          data-testid="search-icon"
        />
        <Input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 pl-8 pr-8 text-xs w-full"
          data-testid="search-input"
          aria-label="Search network requests"
        />
        {value && (
          <Button
            variant="unstyled"
            size="none"
            onClick={() => onChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
            data-testid="clear-search-button"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
