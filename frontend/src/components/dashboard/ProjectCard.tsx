import { BadgeCheck, ExternalLink, MapPin } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import type { Project } from '../../data/mockDashboard'
import { CATEGORIES, SYNTHETIC_LABEL } from '../../data/mockDashboard'

const STATUS_STYLES: Record<Project['status'], string> = {
  'In Progress': 'bg-jv-blue/10 text-jv-blue',
  Completed: 'bg-jv-green/10 text-jv-green',
  Delayed: 'bg-rose-500/10 text-rose-600',
}

function categoryColor(category: string): string {
  return CATEGORIES.find((c) => c.label === category)?.color ?? '#64748b'
}

export default function ProjectCard({
  project,
  linkTo,
}: {
  project: Project
  linkTo?: string
}) {
  const accent = categoryColor(project.category)
  const verified = project.evidenceState === 'verified'
  const isReal = project.dataSource === 'REAL_PUBLIC'
  const photo = project.photos?.[0]
  const progressMissing = project.progressMissing || (isReal && project.progress === 0)
  const budgetUnavailable = project.budget === '—'
  const navigate = useNavigate()

  const card = (
    <article className="flex h-full flex-col rounded-2xl border border-jv-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      {photo && (
        <div className="relative mb-3 overflow-hidden rounded-xl border border-jv-border">
          <img
            src={photo.imageUrl}
            alt={photo.caption ?? `${project.name} photograph`}
            loading="lazy"
            className="h-28 w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          {photo.isRepresentative && (
            <span className="absolute inset-x-0 bottom-0 bg-jv-navy/70 px-2 py-[3px] text-center text-[9px] font-semibold text-white">
              Representative image — not project evidence
            </span>
          )}
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ backgroundColor: `${accent}14`, color: accent }}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: accent }}
            aria-hidden
          />
          {project.category}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[project.status]}`}
        >
          {project.status}
        </span>
      </div>

      <h3 className="mt-3 text-base font-bold leading-snug text-jv-navy">
        {project.name}
      </h3>
      <p className="mt-1 flex items-center gap-1 text-xs text-jv-muted">
        <MapPin className="h-3.5 w-3.5" aria-hidden />
        {project.location}
      </p>

      <div className="mt-4">
        {progressMissing ? (
          <p className="text-xs font-medium text-jv-muted">
            Progress: <span className="font-semibold text-jv-navy">Not publicly available</span>
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-jv-navy">Progress</span>
              <span className="font-semibold text-jv-navy">{project.progress}%</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${project.progress}%`,
                  backgroundColor: verified ? '#179c5d' : '#1d5cc7',
                }}
              />
            </div>
          </>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-jv-border pt-3 text-xs">
        <span className="text-jv-muted">
          Budget{' '}
          <span className="font-semibold text-jv-navy">
            {budgetUnavailable ? 'Not publicly available' : project.budget}
          </span>
        </span>
        <span
          className={
            verified
              ? 'inline-flex items-center gap-1 font-medium text-jv-green'
              : 'inline-flex items-center gap-1 font-medium text-amber-600'
          }
        >
          <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
          {project.evidenceStatus}
        </span>
      </div>

      {isReal ? (
        <div className="mt-3 border-t border-jv-border pt-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
            REAL PUBLIC DATA — NAGPUR
          </p>
          {project.sourceUrl && (
            <a
              href={project.sourceUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-1 inline-flex max-w-full items-center gap-1 text-[10px] text-jv-muted underline-offset-2 hover:underline"
            >
              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{project.sourceTitle ?? project.sourceName}</span>
            </a>
          )}
        </div>
      ) : (
        <p className="mt-3 border-t border-jv-border pt-3 text-[10px] uppercase tracking-wider text-jv-muted">
          {SYNTHETIC_LABEL}
        </p>
      )}
    </article>
  )

  if (linkTo) {
    return (
      <div
        role="link"
        tabIndex={0}
        aria-label={`Open ${project.name}`}
        onClick={() => navigate(linkTo)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            navigate(linkTo)
          }
        }}
        className="block h-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-jv-blue/40"
      >
        {card}
      </div>
    )
  }

  return card
}