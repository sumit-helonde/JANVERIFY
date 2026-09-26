import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-jv-blue">
        404 · Page not found
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-jv-navy">
        This page does not exist
      </h1>
      <p className="mt-1 max-w-md text-sm text-jv-muted">
        The address may be wrong, or the record may have been removed from the registry.
      </p>
      <Link
        to="/"
        className="mt-5 rounded-lg bg-jv-navy px-4 py-2 text-sm font-medium text-white hover:bg-jv-blue"
      >
        Back to dashboard
      </Link>
    </div>
  )
}