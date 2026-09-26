import { BadgeCheck, ExternalLink, FileText, Landmark } from 'lucide-react'

export const NMC_EVIDENCE = {
  documentTitle: 'Environment Status Report 2023-2024',
  publisher: 'Nagpur Municipal Corporation',
  publisherShort: 'Nagpur Municipal Corporation (NMC)',
  documentType: 'Government Report',
  sourceStatus: 'Official Public Source',
  sourceAuthority: 'Nagpur Municipal Corporation',
  sourceName: 'Official NMC Website',
  sourceUrl: 'https://nmcnagpur.gov.in/',
  documentUrl:
    'https://nmcnagpur.gov.in/assets/300/2025/08/Public-Notices/ESR_Final_Report_2023-2024.pdf',
  demoLabel: 'DEMO EVIDENCE — OFFICIAL PUBLIC SOURCE',
}

interface EvidenceViewerModalProps {
  open: boolean
  onClose: () => void
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-jv-border bg-slate-50 px-3.5 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-jv-muted">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-jv-navy">{value}</p>
    </div>
  )
}

export default function EvidenceViewerModal({ open, onClose }: EvidenceViewerModalProps) {
  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="evv-title"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-jv-navy/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-b border-jv-border bg-gradient-to-r from-jv-navy to-jv-blue p-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                <Landmark className="h-3 w-3" aria-hidden />
                Official Government Evidence
              </p>
              <h2 id="evv-title" className="mt-2.5 text-lg font-bold leading-tight">
                {NMC_EVIDENCE.documentTitle}
              </h2>
              <p className="mt-0.5 text-sm text-jv-slate-200">{NMC_EVIDENCE.publisher}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close evidence viewer"
              className="rounded-full bg-white/15 p-1.5 text-white transition hover:bg-white/25"
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden>
                <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-amber-300/40 bg-amber-400/15 px-2.5 py-1 text-[11px] font-semibold text-amber-100">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
            {NMC_EVIDENCE.demoLabel}
          </p>
        </header>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <DetailRow label="Document Type" value={NMC_EVIDENCE.documentType} />
            <DetailRow label="Source Authority" value={NMC_EVIDENCE.sourceAuthority} />
            <DetailRow label="Source Status" value={NMC_EVIDENCE.sourceStatus} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={NMC_EVIDENCE.documentUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-jv-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-jv-blue/90"
            >
              <FileText className="h-4 w-4" aria-hidden />
              Open Original Source
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
            <a
              href={NMC_EVIDENCE.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-jv-border bg-white px-4 py-2 text-sm font-semibold text-jv-navy transition hover:bg-slate-50"
            >
              <BadgeCheck className="h-4 w-4 text-jv-green" aria-hidden />
              NMC Website
            </a>
          </div>

          <section aria-label="Document preview" className="rounded-2xl border border-dashed border-jv-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-jv-navy">
                Document Preview
              </h3>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                PDF · Official public report
              </span>
            </div>
            <div className="mt-3 flex flex-col items-start gap-3 rounded-xl border border-jv-border bg-slate-50 p-4 sm:flex-row sm:items-center">
              <div className="flex h-24 w-18 shrink-0 flex-col justify-center rounded-md bg-gradient-to-b from-jv-blue to-jv-navy px-2 text-white shadow-sm">
                <p className="text-[8px] font-bold leading-tight uppercase">NMC</p>
                <p className="mt-1 text-[7px] font-semibold leading-tight text-jv-slate-200">
                  Environment
                  <br />
                  Status Report
                  <br />
                  2023–2024
                </p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-jv-navy">{NMC_EVIDENCE.documentTitle}</p>
                <p className="mt-0.5 text-xs text-jv-muted">
                  Published by {NMC_EVIDENCE.publisher} under public disclosure.
                </p>
                <p className="mt-1.5 text-[11px] text-jv-muted">
                  This report is hosted directly on the official NMC website. Your browser may block
                  inline previews of external PDFs — use&nbsp;
                  <a
                    href={NMC_EVIDENCE.documentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-jv-blue underline underline-offset-2 hover:text-jv-blue/80"
                  >
                    Open Original Source →
                  </a>
                  &nbsp;to view it in a new tab.
                </p>
              </div>
            </div>
          </section>

          <section aria-label="Source traceability" className="rounded-2xl border border-jv-border p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-jv-navy">
              Source Traceability
            </h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <dt className="text-jv-muted">Source Authority</dt>
                <dd className="font-semibold text-jv-navy">{NMC_EVIDENCE.sourceAuthority}</dd>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <dt className="text-jv-muted">Source</dt>
                <dd className="font-semibold text-jv-navy">{NMC_EVIDENCE.sourceName}</dd>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <dt className="text-jv-muted">Document</dt>
                <dd className="font-semibold text-jv-navy">{NMC_EVIDENCE.documentTitle}</dd>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <dt className="text-jv-muted">Source URL</dt>
                <dd className="max-w-[60%] truncate text-right text-xs font-medium text-jv-blue">
                  <a href={NMC_EVIDENCE.documentUrl} target="_blank" rel="noreferrer" className="hover:underline">
                    {NMC_EVIDENCE.documentUrl}
                  </a>
                </dd>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-jv-border pt-2">
                <dt className="text-jv-muted">Data classification</dt>
                <dd>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    REAL PUBLIC DOCUMENT — DEMO REFERENCE
                  </span>
                </dd>
              </div>
            </dl>
          </section>

          <p className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs leading-5 text-amber-900">
            This document is included as a real public-source demonstration for the hackathon. It is
            not presented as direct evidence for the synthetic project on this page and is not a
            claim that any government body confirmed this project.
          </p>
        </div>
      </div>
    </div>
  )
}