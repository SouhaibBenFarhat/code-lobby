/**
 * Daily Reports Hooks
 *
 * TanStack Query hooks for daily report CRUD operations using SQLite via IPC.
 */

import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query'

import type { DailyReport, DbResult, NewDailyReport } from '../types'

// =============================================================================
// Query Keys
// =============================================================================

export const dailyReportKeys = {
  all: ['db', 'dailyReports'] as const,
  lists: (): readonly ['db', 'dailyReports', 'list'] => [...dailyReportKeys.all, 'list'] as const,
  list: (): readonly ['db', 'dailyReports', 'list'] => [...dailyReportKeys.lists()] as const,
  recent: (limit?: number): readonly ['db', 'dailyReports', 'recent', number | undefined] =>
    [...dailyReportKeys.all, 'recent', limit] as const,
  details: (): readonly ['db', 'dailyReports', 'detail'] =>
    [...dailyReportKeys.all, 'detail'] as const,
  detail: (id: string): readonly ['db', 'dailyReports', 'detail', string] =>
    [...dailyReportKeys.details(), id] as const,
  byDate: (date: string): readonly ['db', 'dailyReports', 'byDate', string] =>
    [...dailyReportKeys.all, 'byDate', date] as const
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Get all daily reports
 */
export function useDailyReports(): UseQueryResult<DailyReport[], Error> {
  return useQuery({
    queryKey: dailyReportKeys.list(),
    queryFn: async () => {
      const result: DbResult<DailyReport[]> = await window.electron.db.dailyReports.list()
      if (!result.success) throw new Error(result.error || 'Failed to load daily reports')
      return result.data || []
    }
  })
}

/**
 * Get recent daily reports (last N)
 */
export function useRecentDailyReports(limit: number = 30): UseQueryResult<DailyReport[], Error> {
  return useQuery({
    queryKey: dailyReportKeys.recent(limit),
    queryFn: async () => {
      const result: DbResult<DailyReport[]> =
        await window.electron.db.dailyReports.listRecent(limit)
      if (!result.success) throw new Error(result.error || 'Failed to load recent daily reports')
      return result.data || []
    }
  })
}

/**
 * Get a single daily report by ID
 */
export function useDailyReport(id: string | null): UseQueryResult<DailyReport | null, Error> {
  return useQuery({
    queryKey: dailyReportKeys.detail(id || ''),
    queryFn: async () => {
      if (!id) return null
      const result: DbResult<DailyReport | undefined> =
        await window.electron.db.dailyReports.get(id)
      if (!result.success) throw new Error(result.error || 'Failed to load daily report')
      return result.data || null
    },
    enabled: !!id
  })
}

/**
 * Get a daily report by date (YYYY-MM-DD)
 */
export function useDailyReportByDate(
  date: string | null
): UseQueryResult<DailyReport | null, Error> {
  return useQuery({
    queryKey: dailyReportKeys.byDate(date || ''),
    queryFn: async () => {
      if (!date) return null
      const result: DbResult<DailyReport | undefined> =
        await window.electron.db.dailyReports.getByDate(date)
      if (!result.success) throw new Error(result.error || 'Failed to load daily report')
      return result.data || null
    },
    enabled: !!date
  })
}

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new daily report
 */
export function useCreateDailyReport(): UseMutationResult<
  DailyReport,
  Error,
  NewDailyReport,
  unknown
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: NewDailyReport) => {
      const result: DbResult<DailyReport> = await window.electron.db.dailyReports.create(data)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create daily report')
      }
      return result.data
    },
    onSuccess: (report) => {
      queryClient.invalidateQueries({ queryKey: dailyReportKeys.lists() })
      queryClient.setQueryData(dailyReportKeys.detail(report.id), report)
      queryClient.setQueryData(dailyReportKeys.byDate(report.date), report)
    }
  })
}

/**
 * Upsert a daily report (update if exists by date, create if not)
 */
export function useUpsertDailyReport(): UseMutationResult<
  DailyReport,
  Error,
  NewDailyReport,
  unknown
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: NewDailyReport) => {
      const result: DbResult<DailyReport> = await window.electron.db.dailyReports.upsert(data)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to upsert daily report')
      }
      return result.data
    },
    onSuccess: (report) => {
      queryClient.invalidateQueries({ queryKey: dailyReportKeys.lists() })
      queryClient.setQueryData(dailyReportKeys.detail(report.id), report)
      queryClient.setQueryData(dailyReportKeys.byDate(report.date), report)
    }
  })
}

/**
 * Update a daily report
 */
export function useUpdateDailyReport(): UseMutationResult<
  DailyReport,
  Error,
  { id: string; data: Partial<Omit<DailyReport, 'id' | 'createdAt' | 'updatedAt'>> },
  unknown
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const result: DbResult<DailyReport | undefined> =
        await window.electron.db.dailyReports.update(id, data)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to update daily report')
      }
      return result.data
    },
    onSuccess: (report) => {
      queryClient.invalidateQueries({ queryKey: dailyReportKeys.lists() })
      queryClient.setQueryData(dailyReportKeys.detail(report.id), report)
      queryClient.setQueryData(dailyReportKeys.byDate(report.date), report)
    }
  })
}

/**
 * Delete a daily report
 */
export function useDeleteDailyReport(): UseMutationResult<boolean, Error, string, unknown> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const result: DbResult<boolean> = await window.electron.db.dailyReports.delete(id)
      if (!result.success) throw new Error(result.error || 'Failed to delete daily report')
      return result.data || false
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: dailyReportKeys.lists() })
      queryClient.removeQueries({ queryKey: dailyReportKeys.detail(id) })
    }
  })
}
