/**
 * ListFooter Component
 *
 * Displays a footer at the end of a list to mark the end and show count.
 */

export interface ListFooterProps {
  /** Number of items in the list */
  count: number
}

export function ListFooter({ count }: ListFooterProps): React.JSX.Element {
  return (
    <div
      className="flex items-center justify-center py-4 border-t border-border-subtle"
      data-testid="list-footer"
    >
      <p className="text-[10px] text-foreground-subtle">
        — End of list ({count} request{count !== 1 ? 's' : ''}) —
      </p>
    </div>
  )
}
