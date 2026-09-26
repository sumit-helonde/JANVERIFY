import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Camera,
  CheckCircle2,
  Clock,
  Eye,
  Hammer,
  ImagePlus,
Map as MapIcon,
  MapPin,
  Megaphone,
  MessageSquare,
  ShieldCheck,
  ThumbsUp,
  TriangleAlert,
  Wrench,
  X,
  XCircle,
} from 'lucide-react'

import DashboardImage from '../components/dashboard/DashboardImage'
import { useAuth } from '../context/AuthContext'
import { SYNTHETIC_LABEL } from '../data/mockDashboard'
import {
  CIVIC_FILTERS,
  CIVICWATCH_SUMMARY,
  type CivicCategoryKey,
  type CivicFilterKey,
  type CivicIssue,
} from '../data/civicWatchData'
import {
  CIVIC_COMMENT_THREADS,
  commentThreadKey,
  type CivicComment,
} from '../data/civicWatchComments'
import CommentsDrawer from '../components/civicwatch/CommentsDrawer'
import CivicWatchMap from '../components/civicwatch/CivicWatchMap'
import {
  civicToView,
  confirmCivicIssue,
  submitCivicIssueWithPhoto,
  fetchCivicIssues,
  transitionCivicIssue,
  verifyCivicIssue,
  type CivicIssueDto,
} from '../lib/api'
import { roleShort } from '../lib/roles'

const STATUS_TONES: Record<CivicIssue['statusTone'], string> = {
  blue: 'bg-jv-blue/10 text-jv-blue',
  green: 'bg-jv-green/10 text-jv-green',
  amber: 'bg-amber-100 text-amber-800',
  rose: 'bg-rose-100 text-rose-700',
  slate: 'bg-slate-100 text-jv-navy',
}

function verifyTone(state: NonNullable<CivicIssue['verify']>['state']): string {
  if (state === 'FIXED') return 'bg-jv-green/10 text-jv-green'
  if (state === 'RESOLUTION DISPUTED') return 'bg-rose-100 text-rose-700'
  return 'bg-slate-100 text-jv-navy'
}

function isResolvedIssue(issue: CivicIssue): boolean {
  return (
    issue.statusLabel === 'MARKED FIXED' ||
    issue.statusLabel === 'CITIZEN VERIFIED' ||
    issue.statusLabel === 'RESOLVED'
  )
}

interface PostCardProps {
  issue: CivicIssue
  caps: CivicIssueDto['capabilities']
  onConfirm: (id: string) => void
  onTransition: (id: string, action: 'action' | 'progress' | 'mark-fixed') => void
  onVerify: (id: string, verdict: 'FIXED' | 'PARTIALLY_FIXED' | 'STILL_EXISTS') => void
  onOpenComments: () => void
  commentCount: number
  busy: boolean
}

function PostCard({
  issue,
  caps,
  onConfirm,
  onTransition,
  onVerify,
  onOpenComments,
  commentCount,
  busy,
}: PostCardProps) {
  const headerBadges = (
    <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5">
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold text-white"
        style={{ backgroundColor: issue.categoryColor }}
      >
        <span className="h-2 w-2 rounded-full bg-white/90" aria-hidden />
        {issue.categoryLabel.toUpperCase()}
      </span>
      <span className="rounded-full bg-jv-navy/85 px-2.5 py-1 text-[11px] font-bold text-jv-mint backdrop-blur md:hidden">
        PUBLIC-SUBMITTED
      </span>
      <span
        className={`hidden rounded-full px-2.5 py-1 text-[11px] font-bold backdrop-blur md:inline-flex ${STATUS_TONES[issue.statusTone]}`}
      >
        {issue.statusLabel}
      </span>
    </div>
  )

  const slaBanner = issue.slaExceeded ? (
    <div className="absolute inset-x-3 bottom-3 rounded-xl border border-rose-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
      <p className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
        <XCircle className="h-3.5 w-3.5" aria-hidden />
        24-HOUR RESPONSE TARGET EXCEEDED
      </p>
      <p className="mt-0.5 text-[11px] text-jv-muted">
        Work has not been recorded as completed yet.
      </p>
    </div>
  ) : null

  const afterChip = (label: string, green: boolean) => (
    <span
      className={`absolute left-1/2 top-2 -translate-x-1/2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${
        green ? 'bg-jv-green/90' : 'bg-jv-navy/85'
      }`}
    >
      {label}
    </span>
  )

  const media = issue.afterImage ? (
    <>
      <div className="relative md:hidden">
        <DashboardImage
          asset={issue.mainImage}
          alt={issue.mainImage.caption}
          fallbackLabel={issue.categoryLabel}
          fallbackColor={issue.categoryColor}
          className="h-64 w-full"
        />
        {headerBadges}
        {slaBanner}
      </div>
      <div className="relative hidden gap-1.5 overflow-hidden md:grid md:grid-cols-2">
        <div className="relative overflow-hidden">
          <DashboardImage
            asset={issue.mainImage}
            alt={issue.mainImage.caption}
            fallbackLabel={issue.categoryLabel}
            fallbackColor={issue.categoryColor}
            className="h-44 w-full"
          />
          {afterChip('Before', false)}
        </div>
        <div className="relative overflow-hidden">
          <DashboardImage
            asset={issue.afterImage}
            alt={issue.afterImage.caption}
            fallbackLabel={`${issue.categoryLabel} after`}
            fallbackColor={issue.categoryColor}
            className="h-44 w-full"
          />
          {afterChip('After', true)}
        </div>
        {headerBadges}
        {slaBanner}
      </div>
    </>
  ) : (
    <div className="relative">
      <DashboardImage
        asset={issue.mainImage}
        alt={issue.mainImage.caption}
        fallbackLabel={issue.categoryLabel}
        fallbackColor={issue.categoryColor}
        className="h-64 w-full md:h-44"
      />
      {headerBadges}
      {slaBanner}
    </div>
  )

  const canRespondVerify = !!issue.verify?.canRespond && issue.verify.state !== 'FIXED'

  const verifyRespondButtons = (
    <div className="mt-3 flex flex-wrap gap-2 text-xs">
      <button
        type="button"
        disabled={busy}
        onClick={() => onVerify(issue.id, 'FIXED')}
        className="inline-flex items-center gap-1 rounded-lg bg-jv-green px-3 py-1.5 font-semibold text-white hover:bg-jv-green/90 disabled:opacity-50"
      >
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> YES — FIXED
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => onVerify(issue.id, 'PARTIALLY_FIXED')}
        className="rounded-lg border border-jv-border bg-white px-3 py-1.5 font-semibold text-jv-navy hover:bg-slate-50 disabled:opacity-50"
      >
        PARTIALLY FIXED
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => onVerify(issue.id, 'STILL_EXISTS')}
        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-1.5 font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
      >
        <XCircle className="h-3.5 w-3.5" aria-hidden /> NO — STILL EXISTS
      </button>
    </div>
  )

  return (
    <article
      aria-label={`Issue ${issue.id}`}
      className="overflow-hidden rounded-2xl border border-jv-border bg-white shadow-sm"
    >
      {media}

      <div className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-jv-muted">
          <span className="inline-flex items-center gap-1 font-medium text-jv-navy">
            <MapPin className="h-3.5 w-3.5 text-jv-blue" aria-hidden />
            {issue.location}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {issue.reportedAt}
          </span>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-jv-navy md:line-clamp-2">{issue.description}</p>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
          {caps.can_confirm && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onConfirm(issue.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-jv-border bg-slate-50 px-3 py-1.5 font-semibold text-jv-navy transition-colors hover:border-jv-blue/40 hover:text-jv-blue disabled:opacity-50"
            >
              <ThumbsUp className="h-3.5 w-3.5" aria-hidden />
              Confirm Issue
            </button>
          )}
          <span>
            <span className="font-bold tabular-nums text-jv-navy">{issue.confirmations}</span>{' '}
            citizens confirmed this issue
          </span>
          <button
            type="button"
            onClick={onOpenComments}
            aria-label={`Open ${commentCount} comments on issue ${issue.id}`}
            className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-transparent px-2 py-1 font-semibold text-jv-blue transition-colors hover:border-jv-blue/30 hover:bg-jv-blue/5"
          >
            <MessageSquare className="h-3.5 w-3.5" aria-hidden />
            {commentCount} Comments
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-jv-border bg-slate-50 p-3 md:p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-jv-muted">
            Authority Status
          </p>
          <span
            className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${STATUS_TONES[issue.statusTone]}`}
          >
            {issue.statusLabel}
          </span>
          {issue.slaExceeded ? (
            <p className="mt-2 text-xs text-jv-muted">
              The product-level 24-hour response target has elapsed with no recorded completion.
              <span className="ml-1 font-medium text-jv-navy">Demo / SLA-style state</span> — a response target is
              not a claim that any authority is legally bound to fix within 24 hours.
            </p>
          ) : (
            <p className="mt-2 text-xs text-jv-muted">
              Product-level {issue.statusLabel === 'MARKED FIXED' ? 'resolution claim recorded.' : 'response target active.'}
            </p>
          )}
        </div>

        <div className="mt-3 hidden items-center justify-between gap-2 md:flex">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-jv-muted">
            Response Target
          </span>
          {issue.slaExceeded ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-bold text-rose-700">
              <XCircle className="h-3 w-3" aria-hidden /> 24H EXCEEDED
            </span>
          ) : isResolvedIssue(issue) && issue.verify?.state === 'FIXED' ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-jv-green/10 px-2.5 py-1 text-[10px] font-bold text-jv-green">
              <CheckCircle2 className="h-3 w-3" aria-hidden /> CITIZEN VERIFIED
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-jv-navy">
              ACTIVE
            </span>
          )}
        </div>

        {caps.can_act && (
          <div className="mt-4 rounded-xl border border-jv-border p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-jv-muted">
              <Wrench className="h-3.5 w-3.5 text-jv-blue" aria-hidden />
              Authority Desk
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {issue.statusLabel === 'CITIZEN-SUBMITTED' ||
              issue.statusLabel === 'UNDER PUBLIC REVIEW' ||
              issue.statusLabel === 'AUTHORITY NOTIFIED' ||
              issue.statusLabel === 'RESOLUTION DISPUTED' ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onTransition(issue.id, 'action')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-jv-blue px-3 py-1.5 font-semibold text-white hover:bg-jv-blue/90 disabled:opacity-50"
                >
                  <Hammer className="h-3.5 w-3.5" aria-hidden /> Start Action
                </button>
              ) : null}
              {issue.statusLabel === 'UNDER ACTION' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onTransition(issue.id, 'progress')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-jv-blue px-3 py-1.5 font-semibold text-white hover:bg-jv-blue/90 disabled:opacity-50"
                >
                  <Wrench className="h-3.5 w-3.5" aria-hidden /> Log Work In Progress
                </button>
              )}
              {issue.statusLabel === 'WORK IN PROGRESS' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onTransition(issue.id, 'mark-fixed')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-jv-green px-3 py-1.5 font-semibold text-white hover:bg-jv-green/90 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Mark Fixed
                </button>
              )}
              {(issue.statusLabel === 'MARKED FIXED' ||
                issue.statusLabel === 'CITIZEN VERIFIED' ||
                issue.statusLabel === 'RESOLVED') && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-jv-green/10 px-3 py-1.5 font-semibold text-jv-green">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Fix recorded
                </span>
              )}
            </div>
          </div>
        )}

        {issue.verify && canRespondVerify && (
          <div className="hidden md:block">{verifyRespondButtons}</div>
        )}

        <div className="mt-4 md:hidden">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-jv-muted">Evidence Timeline</p>
          <ol className="mt-2 space-y-0">
            {issue.workflow.map((step, i) => {
              const dot =
                step.tone === 'bad'
                  ? 'bg-rose-500'
                  : step.tone === 'warn'
                    ? 'bg-amber-500'
                    : step.tone === 'ok'
                      ? 'bg-jv-green'
                      : 'bg-slate-300'
              return (
                <li key={step.label} className="relative flex gap-3 pb-3 last:pb-0">
                  {i < issue.workflow.length - 1 && (
                    <span
                      className="absolute left-[5px] top-3 h-full w-px bg-jv-border"
                      aria-hidden
                    />
                  )}
                  <span
                    className={`relative mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white ${dot}`}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-jv-navy">
                      {step.label}
                      {step.time && (
                        <span className="ml-1.5 font-normal text-jv-muted">{step.time}</span>
                      )}
                    </p>
                    {step.note && <p className="text-[11px] text-jv-muted">{step.note}</p>}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>

        {issue.evidenceImages.length > 0 && (
          <div className="mt-4 md:hidden">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-jv-muted">
              Latest Citizen Evidence
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {issue.evidenceImages.map((img, i) => (
                <div key={`${issue.id}-ev-${i}`} className="overflow-hidden rounded-xl border border-jv-border">
                  <DashboardImage
                    asset={img}
                    alt={img.caption}
                    fallbackLabel="Citizen evidence"
                    fallbackColor={issue.categoryColor}
                    className="h-36 w-full"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {issue.verify && (
          <div className="mt-4 rounded-xl border border-jv-border p-4 md:hidden">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-jv-muted">
                {issue.verify.heading}
              </p>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${verifyTone(issue.verify.state)}`}
              >
                {issue.verify.state}
              </span>
            </div>
            <p className="mt-2 text-xs text-jv-muted">{issue.verify.note}</p>
            {issue.verify.canRespond && issue.verify.state === 'FIXED' && (
              <div className="mt-3 rounded-lg bg-jv-green/5 px-3 py-2 text-xs">
                <p className="flex items-center gap-1.5 font-bold text-jv-green">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> CITIZEN VERIFIED
                </p>
                <p className="mt-0.5 text-jv-muted">New evidence supports the authority’s recorded fix.</p>
              </div>
            )}
            {canRespondVerify && verifyRespondButtons}
          </div>
        )}

        <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2.5 text-xs ring-1 ring-jv-border md:hidden">
          <p className="flex items-center gap-1.5 font-semibold text-jv-navy">
            <ShieldCheck className="h-3.5 w-3.5 text-jv-green" aria-hidden />
            TRUSTMESH {issue.trustmesh.state}
          </p>
          <p className="mt-0.5 italic text-jv-muted">“{issue.trustmesh.summary}”</p>
        </div>

        <p className="mt-3 text-[10px] text-jv-muted">
          Demo issue · {issue.mainImage.attribution} / {issue.mainImage.license} (Wikimedia Commons) —
          representative photo, not evidence of a specific Nagpur incident.
        </p>
      </div>
    </article>
  )
}

interface ReportPayload {
  title: string
  description: string
  category: string
  categoryKey: CivicIssue['categoryKey']
  ward?: string
  locality?: string
  file: File
}

const CITIZEN_REPORT_CATEGORIES = [
  'Roads',
  'Bridges',
  'Schools',
  'Hospitals',
  'Water Plants',
  'Water Supply',
  'Public Buildings',
  'Other Infrastructure',
] as const

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PHOTO_BYTES = 8 * 1024 * 1024

function ReportForm({ onClose, onSubmit }: { onClose: () => void; onSubmit: (payload: ReportPayload) => Promise<string> }) {
  const [photo, setPhoto] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photo2, setPhoto2] = useState<string | null>(null)
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState<string>(CITIZEN_REPORT_CATEGORIES[0])
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const photoRef = useRef<HTMLInputElement | null>(null)
  const photo2Ref = useRef<HTMLInputElement | null>(null)
  const [submittedRef, setSubmittedRef] = useState<string | null>(null)

  function preview(file: File | undefined, setter: (url: string | null) => void, ref: { current: HTMLInputElement | null }) {
    if (!file) return
    const url = URL.createObjectURL(file)
    setter(url)
    if (ref.current) ref.current.value = ''
    return () => URL.revokeObjectURL(url)
  }

  function pickPhoto(file: File | undefined) {
    if (!file) return
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError('Photo must be a JPG, PNG or WEBP image.')
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError('Photo is larger than the 8 MB limit. Please choose a smaller image.')
      return
    }
    setError(null)
    setPhotoFile(file)
    preview(file, setPhoto, photoRef)
  }

  if (submittedRef) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-jv-green/10">
          <CheckCircle2 className="h-6 w-6 text-jv-green" aria-hidden />
        </span>
        <h3 className="mt-4 text-lg font-bold text-jv-navy">Issue Submitted</h3>
        <p className="mt-2 text-sm text-jv-muted">
          Your civic issue has been submitted successfully.
        </p>
        <p className="mt-3 text-2xl font-bold tabular-nums text-jv-navy">{submittedRef}</p>
        <p className="mt-2 text-sm text-jv-muted">
          Status: <span className="font-bold text-jv-navy">CITIZEN-SUBMITTED</span>
        </p>
        <p className="mt-2 text-[11px] leading-4 text-jv-muted">
          Citizen submissions enter human review and never become verified evidence automatically.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-jv-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-jv-blue/90"
        >
          View on CivicWatch
        </button>
      </div>
    )
  }

  return (
    <form
      className="max-h-[calc(100vh-10rem)] overflow-y-auto p-6"
      aria-label="Report an issue"
      onSubmit={(e) => {
        e.preventDefault()
        if (!photoFile) {
          setError('Please upload a photo of the issue. A photo is required.')
          return
        }
        if (!location.trim()) {
          setError('Please enter the location, for example "Ward 24, Nagpur".')
          return
        }
        if (!description.trim()) {
          setError('Please add a short description of the issue.')
          return
        }
        setError(null)
        setSubmitting(true)
        void onSubmit({
          title: description.trim(),
          description: description.trim(),
          category,
          categoryKey: 'other',
          ward: location.trim(),
          file: photoFile,
        })
          .then((ref) => setSubmittedRef(ref))
          .catch((err) => {
            setError(err instanceof Error ? err.message : 'Could not submit report.')
            setSubmitting(false)
          })
      }}
    >
      <div className="grid gap-4">
        <div>
          <p className="mb-1.5 text-xs font-semibold text-jv-navy">Photo (required)</p>
          <button
            type="button"
            onClick={() => photoRef.current?.click()}
            className="flex h-28 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-jv-border bg-slate-50 text-xs font-semibold text-jv-muted hover:border-jv-blue/40 hover:text-jv-blue"
          >
            {photo ? <img src={photo} alt="Selected" className="h-full w-full rounded-xl object-cover" /> : (
              <>
                <ImagePlus className="h-5 w-5" aria-hidden /> Upload photo
              </>
            )}
          </button>
          <input
            ref={photoRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => pickPhoto(e.target.files?.[0])}
          />
          <p className="mt-1 text-[10px] text-jv-muted">
            JPG, PNG or WEBP up to 8 MB. The photo is uploaded and saved with your report.
          </p>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold text-jv-navy">Additional photo (local preview)</p>
          <button
            type="button"
            onClick={() => photo2Ref.current?.click()}
            className="flex h-20 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-jv-border bg-slate-50 text-xs font-semibold text-jv-muted hover:border-jv-blue/40 hover:text-jv-blue"
          >
            {photo2 ? <img src={photo2} alt="Selected" className="h-full w-full rounded-xl object-cover" /> : (
              <>
                <ImagePlus className="h-4 w-4" aria-hidden /> Upload additional photo
              </>
            )}
          </button>
          <input
            ref={photo2Ref}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => preview(e.target.files?.[0], setPhoto2, photo2Ref)}
          />
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-jv-navy">Location</span>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Ward 24, Nagpur"
            className="w-full rounded-lg border border-jv-border px-3 py-2 text-sm text-jv-navy placeholder:text-jv-muted focus:border-jv-blue focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-jv-navy">Issue category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-jv-border px-3 py-2 text-sm text-jv-navy focus:border-jv-blue focus:outline-none"
          >
            {CITIZEN_REPORT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-jv-navy">Short description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Describe what you saw..."
            className="w-full resize-none rounded-lg border border-jv-border px-3 py-2 text-sm text-jv-navy placeholder:text-jv-muted focus:border-jv-blue focus:outline-none"
          />
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-jv-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-jv-blue/90 disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit Report'}
        </button>
        <p className="text-center text-[11px] leading-4 text-jv-muted">
          Submissions are logged as <span className="font-semibold text-jv-navy">CITIZEN-SUBMITTED</span> and
          reviewed before becoming verified evidence.
        </p>
      </div>
    </form>
  )
}

function CardEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-jv-muted">
      {children}
    </p>
  )
}

const REF_ASSETS = {
  pothole: '/assets/civicwatch/civicwatch-pothole.jpg',
  manholeAfter: '/assets/civicwatch/civicwatch-manhole-after.jpg',
  garbage: '/assets/civicwatch/civicwatch-garbage.jpg',
  roadBefore: '/assets/civicwatch/civicwatch-road-before.jpg',
  roadAfter: '/assets/civicwatch/civicwatch-road-after.jpg',
}

interface RefCardData {
  id?: string
  category: string
  pillClass: string
  statusPill: { label: string; className: string }
  image?: string
  before?: string
  after?: string
  location: string
  time: string
  description: string
  confirmations: number
  comments: number
  authority: { label: string; dot: string }
  target: { label: string; state: string; icon: 'clock' | 'check'; className: string }
  statusBg: string
}

const DESKTOP_REF_CARDS: RefCardData[] = [
  {
    id: 'CW-0258',
    category: 'OPEN MANHOLE',
    pillClass: 'bg-violet-700/90 text-white',
    statusPill: { label: 'CITIZEN VERIFIED', className: 'bg-jv-green text-white' },
    image: REF_ASSETS.manholeAfter,
    location: 'Ward 18, Nagpur',
    time: '2d ago',
    description: 'Open manhole cover near a bus stop became a risk for pedestrians and two-wheelers.',
    confirmations: 8,
    comments: 3,
    authority: { label: 'MARKED FIXED', dot: 'bg-jv-green' },
    target: { label: 'VERIFIED BY CITIZENS', state: 'FIXED', icon: 'check', className: 'text-jv-green' },
    statusBg: 'bg-jv-green/5',
  },
  {
    id: 'CW-0312',
    category: 'ROAD DAMAGE',
    pillClass: 'bg-jv-blue/90 text-white',
    statusPill: { label: 'CITIZEN VERIFIED', className: 'bg-jv-green text-white' },
    before: REF_ASSETS.roadBefore,
    after: REF_ASSETS.roadAfter,
    location: 'Ward 12, Nagpur',
    time: '3d ago',
    description: 'Damaged road near school zone, causing traffic issues and vehicle damage.',
    confirmations: 7,
    comments: 2,
    authority: { label: 'MARKED FIXED', dot: 'bg-jv-green' },
    target: { label: 'VERIFIED BY CITIZENS', state: 'FIXED', icon: 'check', className: 'text-jv-green' },
    statusBg: 'bg-jv-green/5',
  },
]

function RefCard({
  card,
  commentCount,
  onOpenComments,
}: {
  card: RefCardData
  commentCount: number
  onOpenComments: () => void
}) {
  const media =
    card.before && card.after ? (
      <div className="relative grid h-[145px] w-full grid-cols-2 gap-1.5 overflow-hidden">
        <div className="relative overflow-hidden">
          <img src={card.before} alt={`${card.category} before`} className="h-full w-full object-cover" />
          <span className="absolute bottom-1.5 left-1.5 rounded bg-jv-navy/85 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
            Before
          </span>
        </div>
        <div className="relative overflow-hidden">
          <img src={card.after} alt={`${card.category} after`} className="h-full w-full object-cover" />
          <span className="absolute bottom-1.5 right-1.5 rounded bg-jv-green/90 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
            After
          </span>
        </div>
      </div>
    ) : (
      <div className="relative h-[145px] w-full overflow-hidden">
        <img src={card.image!} alt={`${card.category} photo`} className="h-full w-full object-cover" />
        {card.id ? (
          <span className="absolute bottom-2 left-2 rounded bg-jv-navy/85 px-2 py-0.5 text-[10px] font-bold text-white">
            {card.id}
          </span>
        ) : null}
      </div>
    )

  return (
    <article
      aria-label={`Demo issue ${card.category}`}
      className="overflow-hidden rounded-xl border border-jv-border bg-white shadow-sm"
    >
      <div className="relative">
        {media}
        <span className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-[10px] font-bold ${card.pillClass}`}>
          {card.category}
        </span>
        <span
          className={`absolute right-2 top-2 rounded-full px-2.5 py-1 text-[10px] font-bold ${card.statusPill.className}`}
        >
          {card.statusPill.label}
        </span>
      </div>

      <div className="p-3.5">
        <div className="flex items-center justify-between gap-2 text-[11px] text-jv-muted">
          <span className="inline-flex items-center gap-1 font-medium text-jv-navy">
            <MapPin className="h-3.5 w-3.5 text-jv-blue" aria-hidden />
            {card.location}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {card.time}
          </span>
        </div>

        <p className="mt-2 text-[13px] leading-snug text-jv-navy">{card.description}</p>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-jv-muted">
          <span className="inline-flex items-center gap-1.5 font-semibold text-jv-navy">
            <ThumbsUp className="h-3.5 w-3.5 text-jv-blue" aria-hidden />
            {card.confirmations} citizens confirmed this issue
          </span>
          <button
            type="button"
            onClick={onOpenComments}
            aria-label={`Open ${commentCount} comments on ${card.category}`}
            className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-transparent px-2 py-1 font-semibold text-jv-blue transition-colors hover:border-jv-blue/30 hover:bg-jv-blue/5"
          >
            <MessageSquare className="h-3.5 w-3.5" aria-hidden />
            {commentCount} Comments
          </button>
        </div>

        <div className={`mt-3 grid grid-cols-2 gap-2 rounded-lg ${card.statusBg} px-3 py-2.5`}>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-jv-muted">Authority Status</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-bold text-jv-navy">
              <span className={`h-2 w-2 rounded-full ${card.authority.dot}`} aria-hidden />
              {card.authority.label}
            </p>
          </div>
          <div className="border-l border-jv-border pl-3">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-jv-muted">{card.target.label}</p>
            <p className={`mt-0.5 flex items-center gap-1.5 text-[11px] font-bold ${card.target.className}`}>
              {card.target.icon === 'clock' ? (
                <Clock className="h-3 w-3" aria-hidden />
              ) : (
                <CheckCircle2 className="h-3 w-3" aria-hidden />
              )}
              {card.target.state}
            </p>
          </div>
        </div>
      </div>
    </article>
  )
}

function BlueprintPulseCard() {
  const metrics = [
    { value: '48', label: 'New Reports', cls: 'bg-blue-50' },
    { value: '21', label: 'Under Action', cls: 'bg-amber-50' },
    { value: '17', label: 'Resolved', cls: 'bg-green-50' },
    { value: '10', label: 'Awaiting Verification', cls: 'bg-violet-50' },
  ]
  return (
    <div className="rounded-xl border border-jv-border bg-white p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-jv-blue/40 hover:shadow-md">
      <CardEyebrow>
        <Activity className="h-3.5 w-3.5 text-jv-green" aria-hidden /> CivicWatch Pulse
      </CardEyebrow>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        {metrics.map((m) => (
          <div key={m.label} className={`rounded-lg px-3 py-2 text-center ${m.cls}`}>
            <div className="text-lg font-bold tabular-nums text-jv-navy">{m.value}</div>
            <div className="mt-0.5 text-[10px] font-medium text-jv-muted">{m.label}</div>
          </div>
        ))}
        <div className="col-span-2 rounded-lg bg-rose-50 px-3 py-2 text-center">
          <div className="text-lg font-bold tabular-nums text-rose-700">6</div>
          <div className="mt-0.5 text-[10px] font-medium text-rose-700">Response Target Exceeded</div>
        </div>
      </div>
    </div>
  )
}

const REF_PRIORITY = [
  { thumb: REF_ASSETS.pothole, title: 'Road Pothole', meta: 'Ward 24 • 36h ago' },
  { thumb: REF_ASSETS.garbage, title: 'Garbage Accumulation', meta: 'Ward 11 • 31h ago' },
]

function BlueprintPriorityCard({ onViewAll }: { onViewAll: () => void }) {
  return (
    <div className="rounded-xl border border-jv-border bg-white p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-jv-blue/40 hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <CardEyebrow>
          <TriangleAlert className="h-3.5 w-3.5 text-rose-600" aria-hidden /> Priority Issues
        </CardEyebrow>
        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex items-center gap-0.5 text-[11px] font-bold text-jv-blue hover:text-jv-blue/80"
        >
          View all <ArrowRight className="h-3 w-3" aria-hidden />
        </button>
      </div>
      <ul className="mt-2.5 space-y-2">
        {REF_PRIORITY.map((item) => (
          <li
            key={item.title}
            className="flex items-center gap-2.5 rounded-lg border border-jv-border bg-white px-2.5 py-2"
          >
            <img src={item.thumb} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-bold text-jv-navy">{item.title}</span>
              <span className="block text-[11px] text-jv-muted">{item.meta}</span>
            </span>
            <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
              Target Exceeded
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function BlueprintMapCard({
  issues,
  onOpenMap,
  onSelectPost,
}: {
  issues: CivicIssue[]
  onOpenMap: () => void
  onSelectPost: (id: string) => void
}) {
  return (
    <div className="rounded-xl border border-jv-border bg-white p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-jv-blue/40 hover:shadow-md">
      <CardEyebrow>
        <MapIcon className="h-3.5 w-3.5 text-jv-blue" aria-hidden /> CivicWatch Map
      </CardEyebrow>
      <div className="mt-2.5">
        <CivicWatchMap issues={issues} onSelect={onSelectPost} compact onExpand={onOpenMap} />
      </div>
    </div>
  )
}

interface RefResolvedItem {
  title: string
  before?: string
  after: string
}

const REF_RESOLVED: RefResolvedItem[] = [
  { title: 'Open Manhole → Repaired', after: REF_ASSETS.manholeAfter },
  { title: 'Damaged Road → Repaired', before: REF_ASSETS.roadBefore, after: REF_ASSETS.roadAfter },
]

function BlueprintRecentlyResolvedCard({ onViewAll }: { onViewAll: () => void }) {
  return (
    <div className="rounded-xl border border-jv-border bg-white p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-jv-blue/40 hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <CardEyebrow>
          <BadgeCheck className="h-3.5 w-3.5 text-jv-green" aria-hidden /> Recently Resolved
        </CardEyebrow>
        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex items-center gap-0.5 text-[11px] font-bold text-jv-blue hover:text-jv-blue/80"
        >
          View all <ArrowRight className="h-3 w-3" aria-hidden />
        </button>
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        {REF_RESOLVED.map((item) => (
          <div key={item.title} className="rounded-lg border border-jv-border p-1.5">
            {item.before ? (
              <div className="grid grid-cols-2 gap-1">
                <div className="relative overflow-hidden rounded-md">
                  <img src={item.before} alt="" className="h-14 w-full object-cover" />
                  <span className="absolute bottom-1 left-1 rounded bg-jv-navy/85 px-1 text-[8px] font-bold uppercase text-white">
                    Before
                  </span>
                </div>
                <div className="relative overflow-hidden rounded-md">
                  <img src={item.after} alt="" className="h-14 w-full object-cover" />
                  <span className="absolute bottom-1 right-1 rounded bg-jv-green/90 px-1 text-[8px] font-bold uppercase text-white">
                    After
                  </span>
                </div>
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-md">
                <img src={item.after} alt="" className="h-14 w-full object-cover" />
                <span className="absolute bottom-1 right-1 rounded bg-jv-green/90 px-1 text-[8px] font-bold uppercase text-white">
                  After
                </span>
              </div>
            )}
            <p className="mt-1.5 text-[11px] font-bold text-jv-navy">{item.title}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-jv-green">
              <CheckCircle2 className="h-3 w-3" aria-hidden /> Citizen Verified
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function BlueprintHowVerificationCard() {
  return (
    <div className="rounded-xl border border-jv-border bg-white p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-jv-blue/40 hover:shadow-md">
      <CardEyebrow>
        <ShieldCheck className="h-3.5 w-3.5 text-jv-green" aria-hidden /> How Verification Works
      </CardEyebrow>
      <p className="mt-2 text-xs leading-5 text-jv-muted">
        Citizen confirmations are community corroboration, not automatic proof. Authority “MARKED FIXED”
        claims are compared against latest citizen evidence before a fix is treated as verified.
      </p>
      <Link
        to="/"
        className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-jv-blue hover:underline"
      >
        View verification process <ArrowRight className="h-3 w-3" aria-hidden />
      </Link>
    </div>
  )
}

function BlueprintRail({
  issues,
  onViewAll,
  onOpenMap,
  onSelectPost,
}: {
  issues: CivicIssue[]
  onViewAll: () => void
  onOpenMap: () => void
  onSelectPost: (id: string) => void
}) {
  return (
    <aside className="w-full shrink-0 space-y-4">
      <BlueprintPulseCard />
      <BlueprintPriorityCard onViewAll={onViewAll} />
      <BlueprintMapCard issues={issues} onOpenMap={onOpenMap} onSelectPost={onSelectPost} />
      <BlueprintRecentlyResolvedCard onViewAll={onViewAll} />
      <BlueprintHowVerificationCard />
    </aside>
  )
}

export default function CivicWatchPage() {
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [filter, setFilter] = useState<CivicFilterKey>('all')
  const [issues, setIssues] = useState<CivicIssue[]>([])
  const [dtos, setDtos] = useState<Map<string, CivicIssueDto['capabilities']>>(new Map())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busyRef, setBusyRef] = useState<string | null>(null)
  const [reportOpen, setReportOpen] = useState(() => searchParams.get('report') === '1')
  const [mapOpen, setMapOpen] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [commentIssue, setCommentIssue] = useState<{
    ref: string
    title: string
    location: string
    categoryKey?: CivicCategoryKey
    imageUrl?: string
    status?: string
  } | null>(null)
  const [addedComments, setAddedComments] = useState<Record<string, CivicComment[]>>({})
  const commentTriggerRef = useRef<HTMLButtonElement | null>(null)
  const selectedRef = useRef<HTMLDivElement | null>(null)

  const refresh = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    fetchCivicIssues({ limit: 100 })
      .then((items) => {
        setIssues(items.map(civicToView))
        setDtos(new Map(items.map((d) => [d.issue_reference, d.capabilities])))
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Could not load issues.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!notice) return
    const t = window.setTimeout(() => setNotice(null), 2600)
    return () => window.clearTimeout(t)
  }, [notice])

  const visible = useMemo(() => {
    if (filter === 'all' || filter === 'nearby') return issues
    return issues.filter((i) => i.categoryKey === filter)
  }, [issues, filter])

  const liveRefCards = useMemo<RefCardData[]>(
    () =>
      visible.map((issue) => ({
        id: issue.id,
        category: issue.categoryLabel,
        pillClass: 'bg-jv-navy/90 text-white',
        statusPill: { label: issue.statusLabel, className: STATUS_TONES[issue.statusTone] },
        image: issue.mainImage.url,
        location: issue.location,
        time: issue.reportedAt,
        description: issue.description,
        confirmations: issue.confirmations,
        comments: threadFor(issue.id, issue.categoryKey).length,
        authority: { label: 'Authority review pending', dot: 'bg-amber-400' },
        target: { label: '24-Hour Response Target', state: 'active', icon: 'clock', className: '' },
        statusBg: 'bg-white',
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, addedComments]
  )

  function flash(message: string) {
    setNotice(message)
  }

  async function confirmIssue(id: string) {
    setBusyRef(id)
    try {
      const updated = await confirmCivicIssue(id)
      setIssues((prev) => prev.map((i) => (i.id === updated.issue_reference ? civicToView(updated) : i)))
      setDtos((prev) => new Map(prev).set(id, updated.capabilities))
      flash('Confirmation recorded.')
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Confirmation failed.')
    } finally {
      setBusyRef(null)
    }
  }

  async function runTransition(id: string, action: 'action' | 'progress' | 'mark-fixed') {
    setBusyRef(id)
    try {
      const updated = await transitionCivicIssue(id, action)
      setIssues((prev) => prev.map((i) => (i.id === updated.issue_reference ? civicToView(updated) : i)))
      setDtos((prev) => new Map(prev).set(id, updated.capabilities))
      flash(
        action === 'action'
          ? 'Authority action started.'
          : action === 'progress'
            ? 'Work in progress recorded.'
            : 'Fix marked — citizen verification is now open.',
      )
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Action failed.')
    } finally {
      setBusyRef(null)
    }
  }

  async function runVerify(id: string, verdict: 'FIXED' | 'PARTIALLY_FIXED' | 'STILL_EXISTS') {
    setBusyRef(id)
    try {
      const updated = await verifyCivicIssue(id, verdict)
      setIssues((prev) => prev.map((i) => (i.id === updated.issue_reference ? civicToView(updated) : i)))
      setDtos((prev) => new Map(prev).set(id, updated.capabilities))
      flash(verdict === 'STILL_EXISTS' ? 'Dispute recorded — the records now conflict.' : 'Verification recorded.')
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Verification failed.')
    } finally {
      setBusyRef(null)
    }
  }

  async function submitReport(payload: {
    title: string
    description: string
    category: string
    categoryKey: CivicIssue['categoryKey']
    ward?: string
    locality?: string
    file: File
  }): Promise<string> {
    const created = await submitCivicIssueWithPhoto({
      photo: payload.file,
      category: payload.category,
      location: payload.ward ?? '',
      description: payload.description,
    })
    setIssues((prev) => [civicToView(created), ...prev])
    setDtos((prev) => new Map(prev).set(created.issue_reference, created.capabilities))
    refresh()
    return created.issue_reference
  }

  function handleSelect(issueId: string) {
    setMapOpen(false)
    window.setTimeout(() => {
      const el = document.querySelector(`[aria-label="Issue ${issueId}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      selectedRef.current = null
    }, 80)
  }

  const handleViewAll = useCallback(() => {
    setFilter('all')
    setMapOpen(false)
  }, [])

  const handleOpenMap = useCallback(() => {
    setMapOpen(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const commentAuthor = user?.full_name?.trim() || 'You'

  function threadFor(issueRef: string, categoryKey?: CivicCategoryKey): CivicComment[] {
    const key = commentThreadKey(issueRef, categoryKey)
    return [...(CIVIC_COMMENT_THREADS[key] ?? []), ...(addedComments[key] ?? [])]
  }

  const closeComments = useCallback(() => {
    setCommentsOpen(false)
    const trigger = commentTriggerRef.current
    if (trigger) window.setTimeout(() => trigger.focus(), 0)
  }, [])

  function openComments(issue: {
    ref: string
    title: string
    location: string
    categoryKey?: CivicCategoryKey
    imageUrl?: string
    status?: string
  }) {
    commentTriggerRef.current =
      document.activeElement instanceof HTMLButtonElement ? document.activeElement : null
    setCommentIssue(issue)
    setCommentsOpen(true)
  }

  function addComment(text: string) {
    if (!commentIssue) return
    const key = commentThreadKey(commentIssue.ref, commentIssue.categoryKey)
    setAddedComments((prev) => ({
      ...prev,
      [key]: [
        ...(prev[key] ?? []),
        {
          id: `${key}-local-${(prev[key]?.length ?? 0) + 1}`,
          author: commentAuthor,
          authorKind: 'CITIZEN',
          time: 'just now',
          text,
        },
      ],
    }))
  }

  return (
    <div className="pb-10">
      <section className="border-b border-jv-border bg-white">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 lg:max-w-[1766px] lg:px-6 lg:py-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-jv-blue/10 px-3 py-1 text-xs font-semibold text-jv-blue">
                  <Megaphone className="h-3.5 w-3.5" aria-hidden />
                  CivicWatch
                </span>
                {user && (
                  <span className="rounded-full bg-jv-mint px-3 py-1 text-xs font-bold text-jv-navy">
                    Signed in as {roleShort(user.role)}
                  </span>
                )}
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-jv-navy">
                  {SYNTHETIC_LABEL}
                </span>
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-jv-navy sm:text-4xl">
                CivicWatch
              </h1>
              <p className="mt-1.5 text-sm text-jv-muted sm:text-base">
                See it. Report it. Track it. Verify the fix.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {user?.role === 'citizen' || user?.role === 'admin' ? (
                <button
                  type="button"
                  onClick={() => setReportOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-jv-blue px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-jv-blue/90"
                >
                  <Camera className="h-4 w-4" aria-hidden />
                  Report an Issue
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setMapOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-lg border border-jv-border bg-white px-4 py-2.5 text-sm font-semibold text-jv-navy shadow-sm hover:text-jv-blue"
              >
                {mapOpen ? 'Back to Feed' : 'CivicWatch Map'}
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-1.5 lg:mt-4">
            {CIVIC_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                aria-pressed={filter === f.key}
                className={
                  filter === f.key
                    ? 'rounded-full bg-jv-navy px-3.5 py-1.5 text-xs font-semibold text-jv-mint'
                    : 'rounded-full border border-jv-border bg-white px-3.5 py-1.5 text-xs font-semibold text-jv-navy hover:bg-slate-50'
                }
              >
                {f.label}
              </button>
            ))}
            <span className="hidden lg:inline-flex">
              <button
                type="button"
                onClick={() => setFilter('water')}
                aria-pressed={filter === 'water'}
                className={
                  filter === 'water'
                    ? 'rounded-full bg-jv-navy px-3.5 py-1.5 text-xs font-semibold text-jv-mint'
                    : 'rounded-full border border-jv-border bg-white px-3.5 py-1.5 text-xs font-semibold text-jv-navy hover:bg-slate-50'
                }
              >
                Water
              </button>
            </span>
          </div>
        </div>
      </section>

      {notice && (
        <div className="mx-auto mt-4 w-full max-w-5xl px-4 lg:max-w-[1766px] lg:px-6">
          <p
            role="status"
            className="rounded-xl border border-jv-green/30 bg-jv-green/10 px-4 py-3 text-sm font-semibold text-jv-navy"
          >
            {notice}
          </p>
        </div>
      )}
      {loadError && (
        <div className="mx-auto mt-4 w-full max-w-5xl px-4 lg:max-w-[1766px] lg:px-6">
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {loadError} — <button type="button" onClick={refresh} className="underline">Retry</button>
          </p>
        </div>
      )}

      {/* MOBILE / TABLET — existing live feed (unchanged) */}
      <div className="lg:hidden">
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 px-4 py-6 lg:max-w-7xl lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8">
          <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2" ref={selectedRef}>
            {loading ? (
              <div className="flex justify-center rounded-2xl border border-jv-border bg-white p-14 md:col-span-2">
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-jv-border border-t-jv-blue" aria-label="Loading" />
              </div>
            ) : mapOpen ? (
              <div className="md:col-span-2">
                <CivicWatchMap issues={visible} onSelect={handleSelect} />
              </div>
            ) : visible.length === 0 ? (
              <div className="rounded-2xl border border-jv-border bg-white p-10 text-center md:col-span-2">
                <EyeglassesIcon />
                <p className="mt-3 text-sm font-semibold text-jv-navy">No issues in this filter</p>
                <p className="mt-1 text-xs text-jv-muted">Try a different category.</p>
              </div>
            ) : (
              visible.map((issue) => (
                <PostCard
                  key={issue.id}
                  issue={issue}
                  caps={dtos.get(issue.id) ?? DEMO_CAPS}
                  busy={busyRef === issue.id}
                  onConfirm={confirmIssue}
                  onTransition={runTransition}
                  onVerify={runVerify}
                  commentCount={threadFor(issue.id, issue.categoryKey).length}
                  onOpenComments={() =>
                    openComments({
                      ref: issue.id,
                      title: issue.categoryLabel,
                      location: issue.location,
                      categoryKey: issue.categoryKey,
                      imageUrl: issue.mainImage.url,
                      status: issue.statusLabel,
                    })
                  }
                />
              ))
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-jv-border bg-white p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-jv-muted">
                CivicWatch Summary
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                {CIVICWATCH_SUMMARY.metrics.map((m) => (
                  <div key={m.label} className="rounded-lg bg-slate-50 px-3 py-2.5 text-center">
                    <div className="text-lg font-bold tabular-nums text-jv-navy">{m.value}</div>
                    <div className="mt-0.5 text-[10px] font-medium text-jv-muted">{m.label}</div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[10px] leading-4 text-jv-muted">
                Product demo metrics · {SYNTHETIC_LABEL}. Not a claim about any real Nagpur volume.
              </p>
            </div>

            <div className="rounded-2xl border border-jv-border bg-white p-4 shadow-sm">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-jv-muted">
                <ShieldCheck className="h-3.5 w-3.5 text-jv-green" aria-hidden />
                How verification works
              </p>
              <p className="mt-2 text-xs leading-5 text-jv-muted">
                Citizen confirmations are community corroboration, not automatic proof. Authority “MARKED
                FIXED” claims are compared against latest citizen evidence before a fix is treated as verified.
              </p>
              <Link
                to="/"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-jv-blue hover:underline"
              >
                Back to Dashboard
              </Link>
            </div>
          </aside>
        </div>
      </div>

      {/* DESKTOP — reference blueprint (lg+) */}
      <div className="mx-auto hidden w-full max-w-[1766px] px-6 py-6 lg:block">
        <div className="flex items-start gap-5">
          <div className="min-w-0 flex-1">
            {loading ? (
              <div className="flex justify-center rounded-xl border border-jv-border bg-white p-14">
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-jv-border border-t-jv-blue" aria-label="Loading" />
              </div>
            ) : mapOpen ? (
              <CivicWatchMap issues={visible} onSelect={handleSelect} />
            ) : (
              <div className="grid grid-cols-1 gap-4 min-[1200px]:grid-cols-2">
                {[...liveRefCards, ...DESKTOP_REF_CARDS].map((card) => {
                  const ref = card.id ?? card.category
                  return (
                    <RefCard
                      key={ref}
                      card={card}
                      commentCount={threadFor(ref).length}
                      onOpenComments={() =>
                        openComments({
                          ref,
                          title: card.category,
                          location: card.location,
                          imageUrl: card.image ?? card.before,
                          status: card.statusPill.label,
                        })
                      }
                    />
                  )
                })}
              </div>
            )}
          </div>

          <div className="w-[350px] shrink-0 xl:w-[460px]">
            <BlueprintRail
              issues={visible}
              onViewAll={handleViewAll}
              onOpenMap={handleOpenMap}
              onSelectPost={handleSelect}
            />
          </div>
        </div>
      </div>

      {reportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-jv-navy/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Report an issue"
        >
          <div className="relative mt-6 w-full max-w-lg rounded-2xl border border-jv-border bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-jv-border px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-jv-navy">Report an Issue</h2>
                <p className="text-xs text-jv-muted">Public submission — reviewed before publishing.</p>
              </div>
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                aria-label="Close report form"
                className="rounded-lg p-1.5 text-jv-muted hover:bg-slate-100 hover:text-jv-navy"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <ReportForm onClose={() => setReportOpen(false)} onSubmit={submitReport} />
          </div>
        </div>
      )}

      {commentsOpen && commentIssue ? (
        <CommentsDrawer
          onClose={closeComments}
          title={commentIssue.title}
          issueRef={commentIssue.ref}
          location={commentIssue.location}
          comments={threadFor(commentIssue.ref, commentIssue.categoryKey)}
          onAdd={addComment}
          imageUrl={commentIssue.imageUrl}
          status={commentIssue.status}
        />
      ) : null}
    </div>
  )
}

const DEMO_CAPS = {
  can_create: true,
  can_confirm: true,
  can_act: false,
  can_verify: true,
  can_review: false,
  can_view: true,
}

function EyeglassesIcon() {
  return (
    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50">
      <Eye className="h-6 w-6 text-jv-muted" aria-hidden />
    </span>
  )
}