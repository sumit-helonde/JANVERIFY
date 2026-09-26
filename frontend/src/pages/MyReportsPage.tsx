import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'

import CivicIssueRow, { SectionHeader } from '../components/civicwatch/CivicIssueRow'
import { useAuth } from '../context/AuthContext'
import { useCivicData } from '../lib/useCivicData'
import { SYNTHETIC_LABEL } from '../data/mockDashboard'

export default function MyReportsPage() {
  const { user } = useAuth()
  const { issues, loading, error, refresh } = useCivicData()

  const mine = useMemo(() => issues, [issues])

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-6">
      <SectionHeader
        eyebrow="Citizen Desk"
        title="My Reports"
        note={`Signed in as ${user?.email}. Reports you submitted against the CivicWatch record.`}
      />

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="flex justify-center rounded-2xl border border-jv-border bg-white p-14">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-jv-border border-t-jv-blue" aria-label="Loading" />
          </div>
        ) : error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error} — <button type="button" onClick={refresh} className="underline">Retry</button>
          </p>
        ) : mine.length === 0 ? (
          <div className="rounded-2xl border border-jv-border bg-white p-10 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50">
              <ClipboardList className="h-6 w-6 text-jv-muted" aria-hidden />
            </span>
            <p className="mt-3 text-sm font-semibold text-jv-navy">No CivicWatch reports yet</p>
            <p className="mt-1 text-xs text-jv-muted">
              Report an issue from CivicWatch and track it here.
            </p>
            <Link
              to="/civicwatch?report=1"
              className="mt-4 inline-flex rounded-lg bg-jv-blue px-4 py-2 text-sm font-semibold text-white hover:bg-jv-blue/90"
            >
              Report an Issue
            </Link>
          </div>
        ) : (
          mine.map((issue) => (
            <CivicIssueRow key={issue.id} issue={issue} detailHref="/civicwatch" />
          ))
        )}
      </div>

      <p className="mt-6 text-xs text-jv-muted">
        All records shown are {SYNTHETIC_LABEL} generated for the demo. Confirmation and verification actions are
        enforced by role on the backend.
      </p>
    </div>
  )
}