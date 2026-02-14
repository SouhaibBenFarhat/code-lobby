/**
 * GitHub Status Queries
 *
 * Fetches the public GitHub status API to display
 * operational health of services relevant to CodeLobby.
 */

import { type UseQueryResult, useQuery } from '@tanstack/react-query'
import { keys } from '../keys'

// ─── Types ───────────────────────────────────────────────────────────────────

export type ComponentStatus =
  | 'operational'
  | 'degraded_performance'
  | 'partial_outage'
  | 'major_outage'

export interface GitHubStatusComponent {
  id: string
  name: string
  status: ComponentStatus
  description: string | null
}

export interface GitHubStatusIncident {
  id: string
  name: string
  status: string
  impact: string
  shortlink: string
  started_at: string
  updated_at: string
}

export interface GitHubStatusSummary {
  page: {
    id: string
    name: string
    url: string
    updated_at: string
  }
  status: {
    indicator: 'none' | 'minor' | 'major' | 'critical'
    description: string
  }
  components: GitHubStatusComponent[]
  incidents: GitHubStatusIncident[]
}

/**
 * Component IDs relevant to CodeLobby's functionality.
 * We filter the full list to only show what matters.
 */
const RELEVANT_COMPONENT_NAMES = [
  'API Requests',
  'Pull Requests',
  'Actions',
  'Git Operations',
  'Webhooks',
  'Issues',
  'Copilot'
]

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useGitHubStatus(): UseQueryResult<GitHubStatusSummary, Error> {
  return useQuery({
    queryKey: keys.githubStatus,
    queryFn: async (): Promise<GitHubStatusSummary> => {
      const res = await fetch('https://www.githubstatus.com/api/v2/summary.json')
      if (!res.ok) throw new Error(`GitHub Status API returned ${res.status}`)
      const data = await res.json()

      // Filter components to only those relevant to CodeLobby
      return {
        ...data,
        components: data.components.filter((c: GitHubStatusComponent) =>
          RELEVANT_COMPONENT_NAMES.includes(c.name)
        )
      }
    },
    staleTime: 60 * 1000, // Consider fresh for 1 minute
    refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
    retry: 2
  })
}
