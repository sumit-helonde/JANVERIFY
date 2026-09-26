import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { Info, ShieldCheck } from 'lucide-react'

import { useResource } from '../hooks/useResource'
import { fetchProjects, submitCitizenReport } from '../lib/api'
import type { CitizenReportResult } from '../lib/api'

const CATEGORIES = [
  'Road',
  'Bridge',
  'School',
  'Hospital',
  'Water Plant',
  'Water Supply',
  'Public Building',
  'Other Infrastructure',
] as const

const inputClass =
  'w-full rounded-lg border border-jv-border bg-white px-3 py-2 text-sm text-jv-navy placeholder:text-jv-muted focus:border-jv-blue focus:outline-none focus:ring-2 focus:ring-jv-blue/20'

export default function SubmitEvidencePage() {
  const { data: projects = [], isLoading } = useResource(['projects'], fetchProjects)
  const [reference, setReference] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<string>(CATEGORIES[0])
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [synthetic, setSynthetic] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CitizenReportResult | null>(null)
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
    if (!reference || description.trim().length < 3) {
      setError('Please pick a project and describe what you observed.')
      return
    }
    if (latitude && Number.isNaN(Number(latitude))) {
      setError('Latitude must be a number.')
      return
    }
    if (longitude && Number.isNaN(Number(longitude))) {
      setError('Longitude must be a number.')
      return
    }
    setSubmitting(true)
    try {
      const res = await submitCitizenReport({
        projectReference: reference,
        description,
        category,
        latitude,
        longitude,
        synthetic,
        photo: photo ?? undefined,
      })
      setResult(res)
      setDescription('')
      setLatitude('')
      setLongitude('')
      setPhoto(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit your evidence.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-jv-navy">Submit Evidence</h1>
        <p className="mt-1 text-sm text-jv-muted">
          Share photos and observations about a public project. Community reports are seen by
          reviewers and are never treated as verified evidence on their own.
        </p>
      </div>

      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <span className="font-semibold">Citizen submissions are reviewed before they are used as verified evidence.</span>{' '}
        They appear separately from official records until a human review is completed.
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
              <span className="mb-1 block text-xs font-semibold text-jv-navy">Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass}
                aria-label="Category"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-jv-navy">Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="What did you see? Include landmarks, time and any useful detail."
                className={inputClass}
                aria-label="Description"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-jv-navy">Latitude (optional)</span>
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="e.g. 21.4683"
                className={inputClass}
                aria-label="Latitude"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-jv-navy">Longitude (optional)</span>
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="e.g. 72.7965"
                className={inputClass}
                aria-label="Longitude"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-jv-navy">Photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-jv-muted file:mr-3 file:rounded-lg file:border-0 file:bg-jv-blue/10 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-jv-blue"
                aria-label="Photo"
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
            {submitting ? 'Submitting…' : 'Submit evidence'}
          </button>
        </form>

        <aside className="space-y-4">
          <div className="rounded-xl border border-jv-border bg-slate-50 p-5 text-xs leading-5 text-jv-muted">
            <p className="mb-1 flex items-center gap-1.5 font-semibold text-jv-navy">
              <ShieldCheck className="h-4 w-4 text-jv-green" aria-hidden />
              What happens next
            </p>
            <ul className="list-disc space-y-1 pl-4">
              <li>Your report is stored as CITIZEN-SUBMITTED.</li>
              <li>Review status starts as PENDING_REVIEW.</li>
              <li>It is never counted as verified or SUPPORTED evidence automatically.</li>
              <li>Independent review decides if it may be used later.</li>
            </ul>
          </div>
          {isLoading && <p className="text-sm text-jv-muted">Loading projects…</p>}
        </aside>
      </div>

      {result && (
        <div ref={resultRef} className="mt-6 scroll-mt-24 rounded-xl border border-jv-border bg-white p-5 shadow-sm">
          <p className="text-base font-semibold text-jv-navy">Your evidence has been submitted.</p>
          <p className="mt-1 text-sm text-jv-muted">Reference: {result.reference}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
              Status: {result.status}
            </span>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
              Review: {result.review_status}
            </span>
          </div>
          <p className="mt-3 flex items-start gap-1.5 text-xs text-jv-muted">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            This submission is not treated as verified evidence until reviewed.
          </p>
          {result.project_id > 0 && (
            <Link
              to={`/projects/${result.project_id}`}
              className="mt-4 inline-flex items-center rounded-lg bg-jv-blue/10 px-3 py-2 text-sm font-semibold text-jv-blue hover:bg-jv-blue/20"
            >
              View project record
            </Link>
          )}
        </div>
      )}
    </div>
  )
}