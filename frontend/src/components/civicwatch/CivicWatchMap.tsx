import L from 'leaflet'
import { useEffect, useRef } from 'react'
import { ArrowRight } from 'lucide-react'

import type { CivicIssue } from '../../data/civicWatchData'

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

const DEFAULT_CENTER: [number, number] = [21.1458, 79.0882]

function statusOf(issue: CivicIssue): { label: string; color: string } {
  if (issue.statusLabel === 'MARKED FIXED' && issue.verify?.state === 'FIXED')
    return { label: 'Resolved', color: '#179c5d' }
  if (issue.statusLabel === 'MARKED FIXED') return { label: 'Verification Required', color: '#f59e0b' }
  if (issue.slaExceeded) return { label: 'Response Target Exceeded', color: '#e11d48' }
  if (issue.statusLabel === 'UNDER ACTION') return { label: 'Under Action', color: '#1d5cc7' }
  return { label: 'Reported', color: '#64748b' }
}

function markerHtml(color: string, id: string): string {
  return `
    <div class="jv-pin" style="--pin-color:${color}">
      <span>${id.replace('CW-', '')}</span>
    </div>
  `
}

export default function CivicWatchMap({
  issues,
  onSelect,
  compact = false,
  onExpand,
}: {
  issues: CivicIssue[]
  onSelect: (id: string) => void
  compact?: boolean
  onExpand?: () => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 13,
      scrollWheelZoom: false,
    })
    mapRef.current = map

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map)

    layerRef.current = L.layerGroup().addTo(map)

    return () => {
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current || !layerRef.current) return
    layerRef.current.clearLayers()
    issues.forEach((issue) => {
      const { label, color } = statusOf(issue)
      const icon = L.divIcon({
        className: '',
        html: markerHtml(color, issue.id),
        iconSize: [26, 30],
        iconAnchor: [13, 28],
        popupAnchor: [0, -26],
      })
      const marker = L.marker(issue.coords, { icon }).addTo(layerRef.current!)
      marker.bindPopup(
        `<div style="font-family:system-ui,sans-serif;min-width:170px">
          <p style="margin:0 0 2px;font-weight:700;font-size:12px">${issue.id} · ${issue.categoryLabel}</p>
          <p style="margin:0 0 4px;font-size:11px;color:#475569">${issue.location}</p>
          <p style="margin:0 0 6px;font-size:11px;color:#0f172a">${label}</p>
          <button data-issue="${issue.id}" style="border:0;border-radius:6px;background:#1d5cc7;color:#fff;font-size:11px;padding:3px 8px;cursor:pointer">Open post</button>
        </div>`,
      )
      marker.on('popupopen', () => {
        const btn = document.querySelector(`button[data-issue="${issue.id}"]`)
        btn?.addEventListener('click', () => onSelect(issue.id))
      })
    })
  }, [issues, onSelect])

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-jv-border">
        <div
          ref={containerRef}
          className={compact ? 'h-40 w-full' : 'h-80 w-full sm:h-96'}
          aria-label="CivicWatch issue map"
        />
        {compact && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-jv-border bg-slate-50 px-3 py-2">
            <div className="flex items-center gap-2.5 text-[10px] font-medium text-jv-muted">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-600" aria-hidden /> New / Unresolved
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden /> Under action
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-jv-green" aria-hidden /> Resolved
              </span>
            </div>
            <button
              type="button"
              onClick={onExpand}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-jv-blue hover:text-jv-blue/80"
            >
              View full map <ArrowRight className="h-3 w-3" aria-hidden />
            </button>
          </div>
        )}
      </div>

      {!compact && (
        <div className="mt-4 rounded-2xl border border-jv-border bg-white shadow-sm">
          <div className="border-b border-jv-border px-4 py-3">
            <p className="text-sm font-bold text-jv-navy">Issues on map · {issues.length}</p>
            <p className="text-[11px] text-jv-muted">Click an issue to open its CivicWatch post.</p>
          </div>
          <ul className="divide-y divide-jv-border">
            {issues.map((issue) => {
              const { label, color } = statusOf(issue)
              return (
                <li key={issue.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(issue.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                      style={{ backgroundColor: color }}
                      aria-hidden
                    >
                      {issue.id.replace('CW-', '')}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-jv-navy">
                        {issue.categoryLabel} · {issue.location}
                      </span>
                      <span className="block truncate text-[11px] text-jv-muted">
                        {issue.description}
                      </span>
                    </span>
                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold"
                      style={{ backgroundColor: `${color}18`, color }}
                    >
                      {label}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}