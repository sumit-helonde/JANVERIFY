import { Bell, LogOut, Menu, MapPin, Scale, Search } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
import { useSearchQuery } from '../../context/SearchContext'
import { NAV_ITEMS } from '../../data/mockDashboard'
import { roleLabel, ROLE_ACCENT } from '../../lib/roles'

interface TopNavProps {
  onMenuClick: () => void
}

export default function TopNav({ onMenuClick }: TopNavProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { query, setQuery } = useSearchQuery()
  const { user, logout } = useAuth()

  return (
    <header className="sticky top-0 z-40 border-b border-jv-border bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:gap-4 lg:px-6">
        <button
          type="button"
          aria-label="Open navigation menu"
          onClick={onMenuClick}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-jv-border text-jv-navy hover:bg-slate-50 lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>

        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-jv-navy text-white">
            <Scale className="h-5 w-5 text-jv-green" aria-hidden />
          </span>
          <span className="text-lg font-bold tracking-tight text-jv-navy">
            JANVERIFY
          </span>
        </Link>
        <span className="hidden text-[11px] font-medium leading-tight text-jv-muted xl:block">
          Your Tax. Your Evidence.
          <br />
          Your Right to Know.
        </span>

        <nav aria-label="Primary" className="ml-4 hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => {
            const active =
              (item.href === '/' && pathname === '/') ||
              (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.label}
                to={item.href}
                aria-current={active ? 'page' : undefined}
                className={
                  active
                    ? 'rounded-lg bg-jv-navy px-3 py-2 text-sm font-medium text-white'
                    : 'rounded-lg px-3 py-2 text-sm font-medium text-jv-muted hover:bg-slate-50 hover:text-jv-navy'
                }
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="relative hidden sm:block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-jv-muted"
              aria-hidden
            />
            <input
              type="search"
              role="searchbox"
              aria-label="Search projects"
              placeholder="Search projects..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-10 w-44 rounded-lg border border-jv-border bg-slate-50 pl-9 pr-3 text-sm text-jv-navy placeholder:text-jv-muted focus:border-jv-blue focus:outline-none focus:ring-2 focus:ring-jv-blue/20 md:w-64 lg:w-72"
            />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-jv-border bg-slate-50 px-3 py-2 text-sm font-medium text-jv-navy">
            <MapPin className="h-4 w-4 text-jv-blue" aria-hidden />
            Nagpur
          </span>

          <button
            type="button"
            aria-label="Notifications"
            className="relative hidden h-9 w-9 items-center justify-center rounded-lg border border-jv-border text-jv-muted hover:bg-slate-50 hover:text-jv-navy sm:inline-flex"
          >
            <Bell className="h-4 w-4" aria-hidden />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-jv-green ring-2 ring-white" aria-hidden />
          </button>

          {user ? (
            <>
              <span
                data-testid="user-chip"
                className="hidden items-center gap-2 rounded-lg border border-jv-border bg-slate-50 px-3 py-1.5 text-sm font-medium text-jv-navy sm:inline-flex"
              >
                <span
                  className="inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 font-bold text-white"
                  style={{ backgroundColor: ROLE_ACCENT[user.role] ?? '#1d5cc7' }}
                >
                  {user.full_name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden text-xs font-semibold md:inline">{roleLabel(user.role)}</span>
              </span>
              <button
                type="button"
                aria-label="Sign out"
                onClick={() => {
                  void logout().then(() => navigate('/'))
                }}
                className="hidden h-9 items-center justify-center gap-1 rounded-lg border border-jv-border px-3 text-sm font-semibold text-jv-navy hover:bg-slate-50 hover:text-jv-blue sm:inline-flex"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                <span className="hidden lg:inline">Sign out</span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden items-center rounded-lg px-3 py-2 text-sm font-semibold text-jv-navy hover:text-jv-blue sm:inline-flex"
              >
                Sign In
              </Link>

              <Link
                to="/login"
                className="hidden items-center rounded-lg bg-jv-blue px-4 py-2 text-sm font-semibold text-white hover:bg-jv-blue/90 sm:inline-flex"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}