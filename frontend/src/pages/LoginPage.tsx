import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Check, ChevronRight, KeyRound, Lock, Mail, Scale, ShieldCheck } from 'lucide-react'

import { useAuth } from '../context/AuthContext'
import { DEMO_ACCOUNTS, ROLE_HOME, roleLabel } from '../lib/roles'

export default function LoginPage() {
  const { user, login } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const redirectTo = user && ROLE_HOME[user.role] ? (from !== '/' ? from : ROLE_HOME[user.role]) : from

  if (user) return <Navigate to={redirectTo} replace />

  async function submit(emailValue: string, passwordValue: string) {
    setBusy(true)
    setError(null)
    try {
      await login(emailValue, passwordValue)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message === 'Login failed with status 401'
            ? 'Invalid email or password.'
            : err.message
          : 'Login failed.',
      )
    } finally {
      setBusy(false)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void submit(email.trim(), password)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-6 lg:py-12">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-jv-navy text-white">
              <Scale className="h-6 w-6 text-jv-green" aria-hidden />
            </span>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-jv-navy">Role sign-in</h1>
              <p className="text-sm text-jv-muted">Four roles, one shared public record.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {DEMO_ACCOUNTS.map((account) => {
              const rolesByColor: Record<string, string> = {
                citizen: '#179c5d',
                inspector: '#1d5cc7',
                department_official: '#7c3aed',
                admin: '#0ea5e9',
              }
              const color = rolesByColor[account.role] ?? '#64748b'
              return (
                <button
                  key={account.key}
                  type="button"
                  disabled={busy}
                  onClick={() => void submit(account.email, account.password)}
                  className="group flex flex-col rounded-2xl border border-jv-border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-jv-blue/40 hover:shadow-md disabled:opacity-60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white"
                      style={{ backgroundColor: color }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-white/90" aria-hidden />
                      {roleLabel(account.role)}
                    </span>
                    <span className="rounded bg-jv-mint px-1.5 py-0.5 text-[10px] font-bold text-jv-navy">
                      {account.badge}
                    </span>
                  </div>
                  <p className="mt-3 text-base font-bold text-jv-navy">{account.name}</p>
                  <ul className="mt-2 space-y-1">
                    {account.permissions.map((perm) => (
                      <li key={perm} className="flex items-center gap-1.5 text-xs text-jv-muted">
                        <Check className="h-3 w-3 shrink-0" style={{ color }} aria-hidden />
                        {perm}
                      </li>
                    ))}
                  </ul>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-jv-blue group-hover:gap-2">
                    Continue as {account.name.split(' ')[0]}
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </span>
                </button>
              )
            })}
          </div>

          <p className="mt-4 text-xs leading-5 text-jv-muted">
            Demo accounts are <span className="font-semibold text-jv-navy">SYNTHETIC HACKATHON DATA</span> with
            password <span className="font-semibold text-jv-navy">demo1234</span>. Roles are enforced server-side —
            the backend rejects any call the role cannot make with 403, regardless of what the interface shows.
          </p>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-jv-border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-jv-navy">
              <KeyRound className="h-5 w-5 text-jv-green" aria-hidden />
              <span className="text-base font-bold">Manual sign-in</span>
            </div>
            <p className="mt-1 text-xs text-jv-muted">
              Use any seeded account, e.g. <span className="font-mono">synthetic.citizen.001@janverify.test / citizen:1</span>.
            </p>

            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="email" className="mb-1 flex items-center gap-1.5 text-sm font-medium text-jv-navy">
                  <Mail className="h-3.5 w-3.5 text-jv-muted" aria-hidden /> Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-jv-border px-3 py-2 text-sm"
                  placeholder="citizen@janverify.demo"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="mb-1 flex items-center gap-1.5 text-sm font-medium text-jv-navy">
                  <Lock className="h-3.5 w-3.5 text-jv-muted" aria-hidden /> Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-jv-border px-3 py-2 text-sm"
                  placeholder="demo1234"
                  required
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-jv-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-jv-blue/90 disabled:opacity-50"
              >
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>

          <div className="mt-4 rounded-2xl border border-jv-border bg-jv-mint/40 p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-jv-navy">
              <ShieldCheck className="h-4 w-4 text-jv-green" aria-hidden />
              Why roles?
            </p>
            <p className="mt-1.5 text-xs leading-5 text-jv-muted">
              Every actor writes to a shared, audited record: citizens report and verify, authorities act, government
              oversees, and the JANVERIFY neutral team reviews conflicts. No role can edit what it did not do.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}