import {
  Building2,
  Bridge,
  Camera,
  Droplets,
  Factory,
  FileText,
  FolderKanban,
  GitCompareArrows,
  Hospital,
  Landmark,
  LayoutDashboard,
  Megaphone,
  Radio,
  Road,
  Scale,
  School,
  ScrollText,
  ShieldCheck,
  Star,
  Upload,
  X,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
import { CATEGORIES, SIDEBAR_MAIN, TOOLS } from '../../data/mockDashboard'
import { roleLabel } from '../../lib/roles'

const ICONS: Record<string, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  folder: FolderKanban,
  compare: GitCompareArrows,
  report: FileText,
  star: Star,
  upload: Upload,
  camera: Camera,
  logs: ScrollText,
  civic: Megaphone,
  review: ScrollText,
  authority: Radio,
  government: Scale,
}

const CATEGORY_ICONS: Record<string, typeof LayoutDashboard> = {
  Roads: Road,
  Bridges: Bridge,
  Schools: School,
  Hospitals: Hospital,
  'Water Plants': Factory,
  'Water Supply': Droplets,
  'Public Buildings': Building2,
  'Other Infrastructure': Landmark,
}

function isActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/'
  if (href === '/projects') {
    return pathname === '/projects' || pathname.startsWith('/projects/')
  }
  return pathname.startsWith(href)
}

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { pathname, search } = useLocation()
  const { user, logout } = useAuth()
  const privileged = user?.role === 'admin' || user?.role === 'reviewer'
  const activeCategory =
    pathname === '/projects' ? new URLSearchParams(search).get('category') : null

  const ROLE_LINKS: Array<{ label: string; href: string; icon: string } | null> = []
  if (user?.role === 'inspector' || user?.role === 'admin') {
    ROLE_LINKS.push({ label: 'Authority Desk', href: '/authority', icon: 'authority' })
  }
  if (user?.role === 'department_official' || user?.role === 'admin') {
    ROLE_LINKS.push({ label: 'Government Desk', href: '/government', icon: 'government' })
  }
  if (user?.role === 'admin' || user?.role === 'reviewer') {
    ROLE_LINKS.push({ label: 'Team Review', href: '/review', icon: 'review' })
  }

  return (
    <>
      {open && (
        <div
          aria-hidden
          onClick={onClose}
          className="fixed inset-0 z-30 bg-jv-navy/40 lg:hidden"
        />
      )}

      <aside
        aria-label="Sidebar"
        className={
          // Mobile: a self-contained off-canvas drawer that slides in and
          // scrolls on its own, so it can never trap the page behind it.
          // Desktop (lg+): unchanged sticky column.
          open
            ? 'fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] translate-x-0 flex-col overflow-y-auto overscroll-contain border-r border-jv-border bg-white shadow-xl transition-transform duration-200 motion-reduce:transition-none lg:static lg:z-30 lg:w-64 lg:max-w-none lg:translate-x-0 lg:shadow-none lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)]'
            : 'fixed inset-y-0 left-0 z-40 hidden w-72 max-w-[85vw] -translate-x-full overflow-y-auto overscroll-contain border-r border-jv-border bg-white transition-transform duration-200 motion-reduce:transition-none lg:block lg:static lg:z-30 lg:w-64 lg:max-w-none lg:translate-x-0 lg:shadow-none lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)]'
        }
      >
        <div className="flex flex-col gap-6 p-4">
          <div className="flex items-center justify-between lg:hidden">
            <span className="text-sm font-bold uppercase tracking-wider text-jv-muted">Menu</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-jv-border text-lg text-jv-muted transition-colors hover:bg-slate-50 hover:text-jv-navy"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <nav aria-label="Main" className="space-y-1">
            {SIDEBAR_MAIN.map((item) => {
              const Icon = ICONS[item.icon]
              const active = isActive(item.href, pathname)
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={
                    active
                      ? 'flex items-center gap-3 rounded-lg bg-jv-blue/10 px-3 py-2 text-sm font-semibold text-jv-blue'
                      : 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-jv-muted hover:bg-slate-50 hover:text-jv-navy'
                  }
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {user && ROLE_LINKS.length > 0 && (
            <div>
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-jv-muted">
                Your Role
              </p>
              <nav aria-label="Role" className="space-y-0.5">
                {ROLE_LINKS.map((link) => {
                  if (!link) return null
                  const Icon = ICONS[link.icon]
                  const active = isActive(link.href, pathname)
                  return (
                    <Link
                      key={link.label}
                      to={link.href}
                      aria-current={active ? 'page' : undefined}
                      className={
                        active
                          ? 'flex items-center gap-3 rounded-lg bg-jv-mint/60 px-3 py-2 text-sm font-semibold text-jv-navy'
                          : 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-jv-muted hover:bg-slate-50 hover:text-jv-navy'
                      }
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                      {link.label}
                    </Link>
                  )
                })}
              </nav>
            </div>
          )}

          <div>
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-jv-muted">
              Categories
            </p>
            <nav aria-label="Categories" className="space-y-0.5">
              {CATEGORIES.map((cat) => {
                const Icon = CATEGORY_ICONS[cat.label]
                const active = activeCategory === cat.label
                return (
                  <Link
                    key={cat.label}
                    to={`/projects?category=${encodeURIComponent(cat.label)}`}
                    aria-current={active ? 'page' : undefined}
                    className={
                      active
                        ? 'flex items-center gap-2.5 rounded-lg bg-jv-blue/10 px-3 py-2 text-sm font-semibold text-jv-blue'
                        : 'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-jv-muted hover:bg-slate-50 hover:text-jv-navy'
                    }
                  >
                    <Icon
                      className="h-[17px] w-[17px] shrink-0"
                      strokeWidth={1.9}
                      style={{ color: cat.color }}
                      aria-hidden
                    />
                    {cat.label}
                  </Link>
                )
              })}
            </nav>
          </div>

          <div>
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-jv-muted">
              Tools
            </p>
            <nav aria-label="Tools" className="space-y-0.5">
              {TOOLS.map((tool) => {
                const Icon = ICONS[tool.icon]
                return (
                  <Link
                    key={tool.label}
                    to={tool.href ?? '/submit-evidence'}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-jv-muted hover:bg-slate-50 hover:text-jv-navy"
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {tool.label}
                  </Link>
                )
              })}
              {privileged && (
                <Link
                  to="/audit-logs"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-jv-muted hover:bg-slate-50 hover:text-jv-navy"
                >
                  <ScrollText className="h-4 w-4" aria-hidden />
                  Audit Logs
                </Link>
              )}
            </nav>
          </div>

          <div className="rounded-xl border border-jv-border bg-slate-50 px-4 py-3 text-xs">
            {user ? (
              <div className="space-y-2">
                <p className="truncate font-semibold text-jv-navy">{user.full_name}</p>
                <p className="truncate text-jv-muted">{user.email}</p>
                <p>
                  <span className="rounded bg-jv-green/10 px-1.5 py-0.5 font-medium text-jv-green">
                    {roleLabel(user.role)}
                  </span>
                </p>
                <button
                  onClick={() => void logout()}
                  className="w-full rounded-lg border border-jv-border bg-white px-2 py-1.5 font-medium text-jv-navy hover:bg-slate-100"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="block rounded-lg bg-jv-blue px-2 py-1.5 text-center font-semibold text-white hover:bg-jv-blue/90"
              >
                Sign in
              </Link>
            )}
          </div>

          <div className="mt-auto rounded-xl border border-jv-border bg-slate-50 px-4 py-3 text-xs leading-5 text-jv-muted">
            <p className="mb-1 flex items-center gap-1.5 font-semibold text-jv-navy">
              <ShieldCheck className="h-4 w-4 text-jv-green" aria-hidden />
              JANVERIFY
            </p>
            <p>Independent.</p>
            <p>Non-partisan.</p>
            <p>Evidence-first.</p>
          </div>
        </div>
      </aside>
    </>
  )
}