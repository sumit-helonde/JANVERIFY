export const SYNTHETIC_LABEL = 'SYNTHETIC HACKATHON DATA'

export const NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'Projects', href: '/projects' },
  { label: 'CivicWatch', href: '/civicwatch' },
  { label: 'Compare', href: '/compare' },
  { label: 'Reports', href: '/reports' },
  { label: 'About', href: '/about' },
] as const

export const SIDEBAR_MAIN = [
  { label: 'Dashboard', href: '/', icon: 'dashboard' },
  { label: 'Projects', href: '/projects', icon: 'folder' },
  { label: 'CivicWatch', href: '/civicwatch', icon: 'civic' },
  { label: 'Compare', href: '/compare', icon: 'compare' },
  { label: 'Reports', href: '/reports', icon: 'report' },
  { label: 'My Watchlist', href: '/watchlist', icon: 'star' },
] as const

export const CATEGORIES = [
  { label: 'Roads', color: '#1d5cc7', short: 'R' },
  { label: 'Bridges', color: '#0ea5e9', short: 'B' },
  { label: 'Schools', color: '#179c5d', short: 'S' },
  { label: 'Hospitals', color: '#e11d48', short: 'H' },
  { label: 'Water Plants', color: '#0891b2', short: 'W' },
  { label: 'Water Supply', color: '#2563eb', short: 'WS' },
  { label: 'Public Buildings', color: '#7c3aed', short: 'PB' },
  { label: 'Other Infrastructure', color: '#64748b', short: 'O' },
] as const

export const TOOLS = [
  { label: 'Submit Evidence', icon: 'upload', href: '/submit-evidence' },
  { label: 'Submit Inspection', icon: 'camera', href: '/submit-inspection' },
] as const

export type ProjectStatus = 'In Progress' | 'Completed' | 'Delayed'

export interface ProjectPhoto {
  imageUrl: string
  imageFilePage?: string
  caption?: string
  imageType?: string
  isRepresentative?: boolean
  sourceName?: string
  attribution?: string
  licenseInfo?: string
  imageDate?: string
}

export interface ProjectSource {
  sourceOrder: number
  organization: string
  documentType: string
  title: string
  url: string
  publishedDate?: string
  retrievedDate?: string
}

export interface Project {
  id: string
  backendId: number
  name: string
  category: string
  categoryShort: string
  location: string
  status: ProjectStatus
  progress: number
  budget: string
  evidenceStatus: string
  evidenceState: 'verified' | 'review'
  sanctioned: string
  contract: string
  released: string
  expenditure: string
  govProgress: number
  earlierInspection: number
  latestInspection: number
  department: string
  contractor: string
  contractorId: string
  tender: string
  tenderId: string
  description: string
  min: [number, number]
  financials?: {
    sanctioned: number
    contract: number
    released: number
    expenditure: number
  }
  dataSource?: 'SYNTHETIC' | 'REAL_PUBLIC'
  sourceName?: string
  sourceUrl?: string
  sourceTitle?: string
  sourceRetrievedOn?: string
  photos?: ProjectPhoto[]
  sources?: ProjectSource[]
  progressMissing?: boolean
}

export const FEATURED_PROJECT_REFERENCE = 'NRD-204'

export const CATEGORY_LEGEND = [
  { label: 'Roads', color: '#1d5cc7' },
  { label: 'Bridges', color: '#0ea5e9' },
  { label: 'Schools', color: '#179c5d' },
  { label: 'Hospitals', color: '#e11d48' },
  { label: 'Water Plants', color: '#0891b2' },
] as const

export interface EvidenceCardData {
  id: string
  title: string
  type: string
  date: string
  source: string
  state: 'SUPPORTED' | 'PENDING_REVIEW' | 'REVIEW'
  summary: string
}