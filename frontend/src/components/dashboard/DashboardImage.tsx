import { useState } from 'react'

import type { ImageAsset } from '../../data/dashboardContent'

interface DashboardImageProps {
  asset: ImageAsset
  alt: string
  className?: string
  fallbackLabel?: string
  fallbackColor?: string
  showBadge?: boolean
}

export default function DashboardImage({
  asset,
  alt,
  className = '',
  fallbackLabel = 'Infrastructure photo',
  fallbackColor = '#1d5cc7',
  showBadge = false,
}: DashboardImageProps) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div
        className={`relative flex items-center justify-center overflow-hidden bg-jv-navy ${className}`}
        role="img"
        aria-label={`${alt} (image unavailable)`}
      >
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background: `linear-gradient(135deg, ${fallbackColor}22 0%, ${fallbackColor}55 100%)`,
          }}
        />
        <div className="relative z-10 flex flex-col items-center px-3 text-center">
          <svg
            className="h-8 w-8 text-white/90"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden
          >
            <path d="M3 3h18v18H3z" />
            <path d="M3 15l5-5 4 4 3-3 6 6" />
            <circle cx="9" cy="9" r="1.5" fill="currentColor" stroke="none" />
          </svg>
          <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/90">
            {fallbackLabel}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden bg-slate-200 ${className}`}>
      <img
        src={asset.url}
        alt={alt}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="h-full w-full object-cover"
        onError={() => setFailed(true)}
      />
      {showBadge && (
        <>
          <span className="absolute inset-x-0 bottom-0 bg-jv-navy/70 px-2 py-[3px] text-center text-[9px] font-semibold text-white">
            Representative image — not evidence
          </span>
          <span className="absolute right-1.5 top-1.5 rounded bg-white/85 px-1.5 py-0.5 text-[9px] font-semibold text-jv-navy">
            {asset.license}
          </span>
        </>
      )}
    </div>
  )
}