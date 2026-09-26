import type { ImageAsset } from './dashboardContent'

export type CivicCategoryKey =
  | 'roads'
  | 'manholes'
  | 'garbage'
  | 'water'
  | 'streetlights'
  | 'other'

export type CivicFilterKey = 'all' | 'nearby' | CivicCategoryKey

export type VerifyState =
  | 'FIXED'
  | 'NOT FIXED'
  | 'PARTIALLY FIXED'
  | 'RESOLUTION DISPUTED'
  | 'AWAITING VERIFICATION'

export interface CivicTimelineStep {
  label: string
  time: string
  tone?: 'ok' | 'warn' | 'bad' | 'neutral'
  note?: string
}

export interface CivicIssue {
  id: string
  categoryKey: CivicCategoryKey
  categoryLabel: string
  categoryColor: string
  location: string
  reportedAt: string
  description: string
  confirmations: number
  comments: number
  statusLabel: string
  statusTone: 'blue' | 'green' | 'amber' | 'rose' | 'slate'
  slaExceeded?: boolean
  mainImage: ImageAsset
  afterImage?: ImageAsset
  evidenceImages: ImageAsset[]
  workflow: CivicTimelineStep[]
  verify?: {
    state: VerifyState
    heading: string
    note: string
    canRespond: boolean
  }
  trustmesh: { state: string; summary: string }
  coords: [number, number]
}

export const CIVIC_FILTERS: ReadonlyArray<{ key: CivicFilterKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'nearby', label: 'Nearby' },
  { key: 'roads', label: 'Roads' },
  { key: 'manholes', label: 'Manholes' },
  { key: 'garbage', label: 'Garbage' },
  { key: 'water', label: 'Water' },
  { key: 'streetlights', label: 'Streetlights' },
]

export const ISSUE_CATEGORIES: ReadonlyArray<{
  key: string
  label: string
  category: CivicCategoryKey
  color: string
}> = [
  { key: 'pothole', label: 'Road pothole / road damage', category: 'roads', color: '#1d5cc7' },
  { key: 'manhole', label: 'Open or damaged manhole', category: 'manholes', color: '#7c3aed' },
  { key: 'garbage', label: 'Garbage / waste accumulation', category: 'garbage', color: '#d97706' },
  { key: 'streetlight', label: 'Broken streetlight', category: 'streetlights', color: '#f59e0b' },
  { key: 'leakage', label: 'Water leakage', category: 'water', color: '#0891b2' },
  { key: 'drainage', label: 'Drainage / waterlogging', category: 'water', color: '#2563eb' },
  { key: 'footpath', label: 'Damaged footpath', category: 'roads', color: '#1d5cc7' },
  { key: 'other', label: 'Other public infrastructure', category: 'other', color: '#64748b' },
]

export const CATEGORY_LABELS: Record<CivicCategoryKey, string> = {
  roads: 'Roads',
  manholes: 'Manholes',
  garbage: 'Garbage',
  water: 'Water',
  streetlights: 'Streetlights',
  other: 'Other',
}

export const CATEGORY_COLORS: Record<CivicCategoryKey, string> = {
  roads: '#1d5cc7',
  manholes: '#7c3aed',
  garbage: '#d97706',
  water: '#0891b2',
  streetlights: '#f59e0b',
  other: '#64748b',
}

export const CIVICWATCH_SUMMARY = {
  metrics: [
    { label: 'New Reports', value: '48' },
    { label: 'Under Action', value: '21' },
    { label: 'Resolved', value: '17' },
    { label: 'Awaiting Verification', value: '10' },
  ],
}


export const MAP_STATUSES = {
  resolved: 'Resolved',
  reported: 'Reported',
  underAction: 'Under Action',
  targetExceeded: 'Response Target Exceeded',
  verificationRequired: 'Verification Required',
} as const
