import { useEffect, useState } from 'react'
import { ScrollText } from 'lucide-react'

import { fetchAuditLogs, type AuditLogEntry } from '../lib/api'

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAuditLogs()
      .then(setLogs)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load audit logs.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <h1 className="flex items-center gap-2 text-lg font-bold text-jv-navy">
        <ScrollText className="h-5 w-5" aria-hidden /> Audit Logs
      </h1>
      <p className="mt-1 text-sm text-jv-muted">
        Immutable trail of authentication, citizen evidence and inspection actions. Restricted to
        reviewers/admins server-side.
      </p>

      {loading && <p className="mt-6 text-sm text-jv-muted">Loading audit logs…</p>}

      {!loading && error && (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          {error.includes('401') || error.includes('403')
            ? ' — sign in with a reviewer or admin account to view the audit trail.'
            : ''}
        </p>
      )}

      {!loading && !error && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-jv-border">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-jv-border bg-slate-50 text-left text-xs uppercase tracking-wider text-jv-muted">
                <th className="px-4 py-2">When</th>
                <th className="px-4 py-2">Actor</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Action</th>
                <th className="px-4 py-2">Entity</th>
                <th className="px-4 py-2">Entity ID</th>
                <th className="px-4 py-2">Project</th>
                <th className="px-4 py-2">Details</th>
                <th className="px-4 py-2">Source</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-jv-border last:border-0">
                  <td className="whitespace-nowrap px-4 py-2 text-jv-muted">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">{log.actor_email ?? '—'}</td>
                  <td className="px-4 py-2">{log.actor_role ?? '—'}</td>
                  <td className="px-4 py-2">
                    <span className="rounded bg-jv-blue/10 px-1.5 py-0.5 text-xs font-medium text-jv-blue">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-2">{log.entity}</td>
                  <td className="px-4 py-2">{log.entity_id ?? '—'}</td>
                  <td className="px-4 py-2">{log.project_id ?? '—'}</td>
                  <td className="px-4 py-2">
                    {typeof log.after === 'string' || log.after === null
                      ? (log.after ?? '—')
                      : JSON.stringify(log.after)}
                  </td>
                  <td className="px-4 py-2 text-jv-muted">{log.source ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && <p className="p-6 text-sm text-jv-muted">No audit records yet.</p>}
        </div>
      )}
    </div>
  )
}