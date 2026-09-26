import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'

import { useAuth } from '../context/AuthContext'
import { roleLabel } from '../lib/roles'

interface RequireRoleProps {
  roles: string[]
  children: ReactNode
}

export default function RequireRole({ roles, children }: RequireRoleProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-jv-border border-t-jv-blue" aria-label="Loading" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  }

  if (!roles.includes(user.role)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-jv-border bg-white p-8 text-center shadow-sm">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <ShieldAlert className="h-6 w-6 text-amber-600" aria-hidden />
          </span>
          <h1 className="mt-4 text-lg font-bold text-jv-navy">Access restricted</h1>
          <p className="mt-2 text-sm leading-6 text-jv-muted">
            This area is for the <span className="font-semibold text-jv-navy">{roles.map(roleLabel).join(' or ')}</span>{' '}
            role. You are signed in as <span className="font-semibold text-jv-navy">{roleLabel(user.role)}</span>.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}