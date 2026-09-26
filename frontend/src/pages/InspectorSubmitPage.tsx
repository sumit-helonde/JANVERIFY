import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { ShieldCheck } from 'lucide-react'

import { useResource } from '../hooks/useResource'
import { fetchProjects, submitInspection } from '../lib/api'
import type { InspectorSubmissionResult } from '../lib/api'

const inputClass =
  'w-full rounded-lg border border-jv-border bg-white px-3 py-2 text-sm text-jv-navy placeholder:text-jv-muted focus:border-jv-blue focus:outline-none focus:ring-2 focus:ring-jv-blue/20'

function StateBadge({ state }: { state: string }) {
  const styles: Record<string, string> = {
    SUPPORTED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    INCOMPLETE: 'bg-amber-50 text-amber-700 ring-amber-200',
    CONFLICTING: 'bg-rose-50 text-rose-700 ring-rose-200',
    QUESTIONABLE: 'bg-amber-50 text-amber-700 ring-amber-200',
    HUMAN_REVIEW_REQUIRED: 'bg-orange-50 text-orange-700 ring-orange-200',
    INSUFFICIENT: 'bg-slate-100 text-slate-600 ring-slate-200',
  }
  const cls = styles[state] ?? 'bg-slate-100 text-slate-600 ring-slate-200'
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${cls}`}>
      {state}
    </span>
  )
}

export default function InspectorSubmitPage() {
  const { data: projects = [], isLoading } = useResource(['projects'], fetchProjects)
  const [reference, setReference] = useState('')
  const [date, setDate] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [progress, setProgress] = useState('')
  const [remarks, setRemarks] = useState('')
  const [synthetic, setSynthetic] = useState(true)
  const [photo, setPhoto] = useState<File | null>(null)
  const [document, setDocument] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<InspectorSubmissionResult | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (projects.length > 0 && !reference) setReference(projects[0].id)
  }, [projects, reference])

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [result])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResult(null)
    if (!reference || !date || !latitude || !longitude || !progress) {
      setError('All required fields must be filled in.')
      return
    }
    setSubmitting(true)
    try {
      const res = await submitInspection({
        projectReference: reference,
        inspectionDate: date,
        latitude,
        longitude,
        measuredProgress: progress,
        remarks,
        synthetic,
        photo: photo ?? undefined,
        document: document ?? undefined,
      })
      setResult(res)
      setDate('')
      setLatitude('')
      setLongitude('')
      setProgress('')
      setRemarks('')
      setPhoto(null)
      setDocument(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit inspection.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-jv-navy">Submit Inspection</h1>
        <p className="mt-1 text-sm text-jv-muted">
          Submit an independent site inspection record, GPS position, measured progress and
          supporting files. Each submission is stored with a SHA-256 checksum and fed back into
          TRUSTMESH.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-jv-border bg-white p-5 shadow-sm lg:col-span-2"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-jv-navy">Project</span>
              <select
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className={inputClass}
                aria-label="Project"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} — {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-jv-navy">Inspection date</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
                aria-label="Inspection date"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-jv-navy">GPS latitude</span>
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="e.g. 21.468324"
                className={inputClass}
                aria-label="GPS latitude"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-jv-navy">GPS longitude</span>
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="e.g. 72.796481"
                className={inputClass}
                aria-label="GPS longitude"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-jv-navy">
                Measured progress (%)
              </span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={progress}
                onChange={(e) => setProgress(e.target.value)}
                placeholder="e.g. 82"
                className={inputClass}
                aria-label="Measured progress"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-jv-navy">Field photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-jv-muted file:mr-3 file:rounded-lg file:border-0 file:bg-jv-blue/10 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-jv-blue"
                aria-label="Field photo"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-jv-navy">
                Measurement / document
              </span>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt,.csv"
                onChange={(e) => setDocument(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-jv-muted file:mr-3 file:rounded-lg file:border-0 file:bg-jv-blue/10 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-jv-blue"
                aria-label="Measurement or document"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-jv-navy">Remarks</span>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={4}
                placeholder="Describe the site conditions, method of measurement and observations."
                className={inputClass}
                aria-label="Remarks"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-jv-navy sm:col-span-2">
              <input
                type="checkbox"
                checked={synthetic}
                onChange={(e) => setSynthetic(e.target.checked)}
                className="h-4 w-4 rounded border-jv-border text-jv-blue focus:ring-jv-blue/20"
              />
              This is synthetic demo/test data (gets labelled SYNTHETIC HACKATHON DATA)
            </label>
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-jv-navy px-4 py-2 text-sm font-semibold text-white hover:bg-jv-blue disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'Submit inspection'}
          </button>
        </form>

        <aside className="space-y-4">
          <div className="rounded-xl border border-jv-border bg-slate-50 p-5 text-xs leading-5 text-jv-muted">
            <p className="mb-1 flex items-center gap-1.5 font-semibold text-jv-navy">
              <ShieldCheck className="h-4 w-4 text-jv-green" aria-hidden />
              How it works
            </p>
            <ul className="list-disc space-y-1 pl-4">
              <li>Files are content-addressed using SHA-256 and stored once.</li>
              <li>The measured progress is parsed and used by the evidence graph.</li>
              <li>TRUSTMESH is recomputed immediately after submission.</li>
              <li>Synthetic records are clearly labelled and never shown as real allegations.</li>
            </ul>
          </div>
          {isLoading && <p className="text-sm text-jv-muted">Loading projects…</p>}
        </aside>
      </div>

      {result && (
        <div
          ref={resultRef}
          className="mt-6 scroll-mt-24 rounded-xl border border-jv-border bg-white p-5 shadow-sm"
        >
          <p className="text-base font-semibold text-jv-navy">Inspection evidence submitted successfully.</p>
          <div className="mt-3 grid gap-2 text-sm text-jv-navy sm:grid-cols-2">
            <p>
              Reference: <span className="font-semibold">{result.inspection_reference}</span>
            </p>
            <p>
              Measured progress: <span className="font-semibold">{result.measured_progress}%</span>
            </p>
            <p>
              Documents stored:{' '}
              <span className="font-semibold">{result.documents.length}</span>
            </p>
            {result.synthetic && (
              <p className="text-xs text-jv-muted">Labelled as SYNTHETIC HACKATHON DATA.</p>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <StateBadge state={result.trustmesh.state} />
            <span className="text-sm text-jv-muted">{result.trustmesh.summary}</span>
          </div>
          <Link
            to={`/projects/${result.project_id}`}
            className="mt-4 inline-flex items-center rounded-lg bg-jv-blue/10 px-3 py-2 text-sm font-semibold text-jv-blue hover:bg-jv-blue/20"
          >
            View project record
          </Link>
        </div>
      )}
    </div>
  )
}