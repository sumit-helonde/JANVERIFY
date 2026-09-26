import { useCallback, useEffect, useState } from 'react'

import { civicToView, fetchCivicIssues, fetchCivicSummary, type CivicIssueDto, type CivicSummaryDto } from './api'
import type { CivicIssue } from '../data/civicWatchData'

export interface CivicData {
  issues: CivicIssue[]
  caps: Map<string, CivicIssueDto['capabilities']>
  summary: CivicSummaryDto | null
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useCivicData(): CivicData {
  const [issues, setIssues] = useState<CivicIssue[]>([])
  const [caps, setCaps] = useState<Map<string, CivicIssueDto['capabilities']>>(new Map())
  const [summary, setSummary] = useState<CivicSummaryDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.all([fetchCivicIssues({ limit: 200 }), fetchCivicSummary()])
      .then(([items, sum]) => {
        setIssues(items.map(civicToView))
        setCaps(new Map(items.map((d) => [d.issue_reference, d.capabilities])))
        setSummary(sum)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load CivicWatch data.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { issues, caps, summary, loading, error, refresh }
}