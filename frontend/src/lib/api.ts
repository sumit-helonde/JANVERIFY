import type { EvidenceCardData, Project } from '../data/mockDashboard'
import type { PageInfo } from '../data/pageInfo'
import type { ImageAsset } from '../data/dashboardContent'
import {
  CATEGORY_COLORS,
  type CivicCategoryKey,
  type CivicIssue,
} from '../data/civicWatchData'

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api'

export interface HealthResponse {
  status: string
  service: string
}

async function getJSON<T>(path: string): Promise<T> {
  // One retry: a proxy/CDN can occasionally answer with an HTML page instead
  // of the API response, and a second attempt usually succeeds.
  try {
    return await requestJSON<T>(path)
  } catch (firstError) {
    if (firstError instanceof Error && firstError.message.includes('non-JSON')) {
      await new Promise((resolve) => setTimeout(resolve, 400))
      try {
        return await requestJSON<T>(path)
      } catch (retryError) {
        throw new Error(
          `${(retryError as Error).message} | full URL: ${API_BASE_URL}${path} | origin: ${window.location.origin}`,
        )
      }
    }
    throw firstError
  }
}

async function requestJSON<T>(path: string): Promise<T> {
  const token = tokenFromStorage()
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (!res.ok) {
    // A 404/proxy error can come back with an empty body, so parse defensively
    // and always name the failing request instead of crashing on res.json().
    const detail = await readErrorDetail(res)
    throw new Error(
      `GET ${path} failed (${res.status}${detail ? `: ${detail}` : ''})`,
    )
  }
  const text = await res.text()
  if (!text) {
    throw new Error(`GET ${path} returned an empty response (${res.status})`)
  }
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`GET ${path} returned a non-JSON response (${res.status})`)
  }
}

async function readErrorDetail(res: Response): Promise<string> {
  try {
    const text = await res.text()
    if (!text) return ''
    try {
      const parsed = JSON.parse(text) as { detail?: unknown }
      if (typeof parsed.detail === 'string') return parsed.detail
    } catch {
      return text.slice(0, 120)
    }
  } catch {
    /* ignore */
  }
  return ''
}

export function tokenFromStorage(): string | null {
  try {
    return window.localStorage.getItem('janverify_token')
  } catch {
    return null
  }
}

export interface AuthUser {
  id: number
  email: string
  full_name: string
  role: string
  status: string
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const text = await res.text()
  let body: { token?: string; user?: AuthUser; detail?: string } = {}
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      throw new Error(
        `Login returned a non-JSON response (${res.status}). The API may be unreachable.`,
      )
    }
  } else {
    throw new Error(
      `Login returned an empty response (${res.status}). The API may be unreachable.`,
    )
  }
  if (!res.ok || !body.token || !body.user) {
    throw new Error(body.detail ?? `Login failed with status ${res.status}`)
  }
  window.localStorage.setItem('janverify_token', body.token)
  return body.user
}

export async function logout(): Promise<void> {
  const token = tokenFromStorage()
  if (!token) return
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function fetchMe(): Promise<AuthUser> {
  return getJSON<AuthUser>('/auth/me')
}

export interface AuditLogEntry {
  id: number
  timestamp: string
  actor_email: string | null
  actor_role: string | null
  action: string
  entity: string
  entity_id: string | null
  project_id: number | null
  before: unknown
  after: unknown
  source: string | null
}

export async function fetchAuditLogs(limit = 200): Promise<AuditLogEntry[]> {
  const res = await getJSON<{ items: AuditLogEntry[] }>(`/audit-logs?limit=${limit}`)
  return res.items
}

export interface ReviewResult {
  report_id: number
  reference: string
  status: string
  review_status: string
  reviewed_by: number
  origin: string
}

export async function reviewCitizenReport(reportId: number, reviewStatus: string): Promise<ReviewResult> {
  const token = tokenFromStorage()
  const res = await fetch(`${API_BASE_URL}/citizen-reports/${reportId}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ review_status: reviewStatus }),
  })
  const body = (await res.json()) as ReviewResult & { detail?: string }
  if (!res.ok) throw new Error(body.detail ?? `Review failed with status ${res.status}`)
  return body
}

export interface InspectorSubmissionResult {
  message: string
  project_id: number
  inspection_reference: string
  measured_progress: number
  documents: Array<{ type: string; id: number; checksum_sha256: string }>
  synthetic: boolean
  trustmesh: { state: string; summary: string }
}

export async function submitInspection(
  payload: {
    projectReference: string
    inspectionDate: string
    latitude: string
    longitude: string
    measuredProgress: string
    remarks: string
    synthetic: boolean
    photo?: File
    document?: File
  },
): Promise<InspectorSubmissionResult> {
  const form = new FormData()
  form.append('project_reference', payload.projectReference)
  form.append('inspection_date', payload.inspectionDate)
  form.append('latitude', payload.latitude)
  form.append('longitude', payload.longitude)
  form.append('measured_progress', payload.measuredProgress)
  form.append('remarks', payload.remarks)
  form.append('synthetic', String(payload.synthetic))
  if (payload.photo) form.append('photo', payload.photo)
  if (payload.document) form.append('document', payload.document)

  const res = await fetch(`${API_BASE_URL}/inspector-submissions`, {
    method: 'POST',
    body: form,
    headers: tokenFromStorage()
      ? { Authorization: `Bearer ${tokenFromStorage()}` }
      : undefined,
  })
  if (!res.ok) {
    let detail = `Request failed with status ${res.status}`
    try {
      const body = (await res.json()) as { detail?: string }
      if (body.detail) detail = body.detail
    } catch {
      /* keep default message */
    }
    throw new Error(detail)
  }
  return (await res.json()) as InspectorSubmissionResult
}

export interface CitizenReportResult {
  message: string
  reference: string
  project_id: number
  project_reference: string
  status: string
  review_status: string
  automatically_supported: boolean
  verified: boolean
}

export async function submitCitizenReport(payload: {
  projectReference: string
  description: string
  category: string
  latitude: string
  longitude: string
  synthetic: boolean
  photo?: File
}): Promise<CitizenReportResult> {
  const form = new FormData()
  form.append('project_reference', payload.projectReference)
  form.append('description', payload.description)
  form.append('category', payload.category)
  form.append('latitude', payload.latitude)
  form.append('longitude', payload.longitude)
  form.append('synthetic', String(payload.synthetic))
  if (payload.photo) form.append('photo', payload.photo)

  const res = await fetch(`${API_BASE_URL}/citizen-reports`, {
    method: 'POST',
    body: form,
    headers: tokenFromStorage()
      ? { Authorization: `Bearer ${tokenFromStorage()}` }
      : undefined,
  })
  if (!res.ok) {
    let detail = `Request failed with status ${res.status}`
    try {
      const body = (await res.json()) as { detail?: string }
      if (body.detail) detail = body.detail
    } catch {
      /* keep default message */
    }
    throw new Error(detail)
  }
  return (await res.json()) as CitizenReportResult
}

export function formatCrore(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return `₹${value.toLocaleString('en-IN')} Cr`
}

const SYNTHETIC_SUFFIX = ' [SYNTHETIC HACKATHON DATA]'

function clean(value: string | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return value.endsWith(SYNTHETIC_SUFFIX)
    ? value.slice(0, -SYNTHETIC_SUFFIX.length)
    : value
}

function fractionToPercent(value: number | null | undefined): number {
  if (value === null || value === undefined) return 0
  return Math.round(value * 100)
}

function percentLabel(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return `${Math.round(value)}%`
}

const STATUS_LABELS: Record<string, Project['status']> = {
  completed: 'Completed',
  in_progress: 'In Progress',
  delayed: 'Delayed',
  on_hold: 'Delayed',
}

function mapStatus(status: string | null): Project['status'] {
  return STATUS_LABELS[status ?? ''] ?? 'In Progress'
}

interface ProjectPhotoRow {
  image_url: string
  image_file_page?: string | null
  caption?: string | null
  image_type?: string | null
  is_representative?: boolean
  source_name?: string | null
  attribution?: string | null
  license_info?: string | null
  image_date?: string | null
  source_type?: string | null
}

interface ProjectSourceRow {
  source_order: number
  organization: string
  document_type: string
  title: string
  url: string
  published_date?: string | null
  retrieved_date?: string | null
}

interface ProjectListRow {
  id: number
  reference_number: string
  name: string
  description: string
  status: string
  city: string
  state: string
  latitude: number | null
  longitude: number | null
  sanctioned: number | null
  released: number | null
  government_progress: number | null
  verified_progress: number | null
  category?: string | null
  department?: string | null
  data_source_type?: string | null
  source_name?: string | null
  source_url?: string | null
  source_title?: string | null
  source_retrieved_on?: string | null
  photos?: ProjectPhotoRow[]
  sources?: ProjectSourceRow[]
}

interface ProjectDetailRow extends ProjectListRow {
  category: string | null
  department: string | null
  location: { id: number | null; name: string | null; latitude: number | null; longitude: number | null } | null
  financial_summary: {
    sanctioned: number | null
    contract: number | null
    released: number | null
    expenditure: number | null
    note?: string | null
  } | null
  progress_summary: { government: number | null; verified: number | null }
  contractor: string | null
  contractor_id: number | null
  tender_id: number | null
  tender_reference: string | null
  contract_reference: string | null
  evidence_count: number
  inspection_count: number
}

function categoryShort(category: string | null): string {
  if (!category) return 'O'
  const known: Record<string, string> = {
    Roads: 'R',
    Bridges: 'B',
    Schools: 'S',
    Hospitals: 'H',
    'Water Plants': 'W',
    'Water Supply': 'WS',
    'Public Buildings': 'PB',
    'Other Infrastructure': 'O',
  }
  return known[category] ?? category.slice(0, 2).toUpperCase()
}

function toPhotos(row: ProjectListRow): Project['photos'] {
  return (row.photos ?? []).map((p) => ({
    imageUrl: p.image_url,
    imageFilePage: p.image_file_page ?? undefined,
    caption: p.caption ?? undefined,
    imageType: p.image_type ?? undefined,
    isRepresentative: p.is_representative,
    sourceName: p.source_name ?? undefined,
    attribution: p.attribution ?? undefined,
    licenseInfo: p.license_info ?? undefined,
    imageDate: p.image_date ?? undefined,
  }))
}

function toSources(row: ProjectListRow): Project['sources'] {
  return (row.sources ?? []).map((s) => ({
    sourceOrder: s.source_order,
    organization: s.organization,
    documentType: s.document_type,
    title: s.title,
    url: s.url,
    publishedDate: s.published_date ?? undefined,
    retrievedDate: s.retrieved_date ?? undefined,
  }))
}

function toProject(row: ProjectListRow): Project {
  const rawCategory = row.category ?? 'Other Infrastructure'
  const category = clean(rawCategory)
  const gov = fractionToPercent(row.government_progress)
  const verified = fractionToPercent(row.verified_progress)
  const needsReview = gov > 0 && verified > 0 && Math.abs(gov - verified) >= 1
  const isReal = (row.data_source_type ?? 'SYNTHETIC') === 'REAL_PUBLIC'
  const progressMissing = isReal && gov === 0 && verified === 0
  return {
    id: row.reference_number,
    backendId: row.id,
    name: clean(row.name),
    category,
    categoryShort: categoryShort(category),
    location: clean(row.city ?? '—'),
    status: mapStatus(row.status),
    progress: verified || gov,
    budget: formatCrore(row.sanctioned),
    evidenceStatus: isReal
      ? row.source_name
        ? 'Source verified'
        : 'Documentation incomplete'
      : needsReview
        ? 'Review Needed'
        : 'Verified',
    evidenceState: needsReview ? 'review' : 'verified',
    sanctioned: formatCrore(row.sanctioned),
    contract: '—',
    released: formatCrore(row.released),
    expenditure: '—',
    govProgress: gov,
    earlierInspection: 0,
    latestInspection: 0,
    department: clean(row.department ?? '—'),
    contractor: '—',
    contractorId: '',
    tender: '—',
    tenderId: '',
    description: row.description ?? '',
    min: [
      row.latitude !== null && row.latitude !== undefined ? row.latitude : 21.1458,
      row.longitude !== null && row.longitude !== undefined ? row.longitude : 79.0882,
    ],
    dataSource: (row.data_source_type as Project['dataSource']) ?? 'SYNTHETIC',
    sourceName: row.source_name ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    sourceTitle: row.source_title ?? undefined,
    sourceRetrievedOn: row.source_retrieved_on ?? undefined,
    photos: toPhotos(row),
    sources: toSources(row),
    progressMissing,
  }
}

function toProjectDetail(row: ProjectDetailRow, base: Project): Project {
  const gov = fractionToPercent(row.progress_summary.government)
  const verified = fractionToPercent(row.progress_summary.verified)
  const fin = row.financial_summary
  const needsReview = gov > 0 && verified > 0 && Math.abs(gov - verified) >= 1
  const isReal = (row.data_source_type ?? 'SYNTHETIC') === 'REAL_PUBLIC'
  const progressMissing = isReal && gov === 0 && verified === 0
  return {
    ...base,
    category: clean(row.category ?? base.category),
    department: clean(row.department ?? base.department),
    status: mapStatus(row.status),
    progress: verified || gov,
    govProgress: gov,
    sanctioned: fin ? formatCrore(fin.sanctioned) : base.sanctioned,
    contract: fin ? formatCrore(fin.contract) : '—',
    released: fin ? formatCrore(fin.released) : base.released,
    expenditure: fin ? formatCrore(fin.expenditure) : '—',
    evidenceStatus: isReal
      ? row.source_name
        ? 'Source verified'
        : 'Documentation incomplete'
      : needsReview
        ? 'Review Needed'
        : 'Verified',
    evidenceState: needsReview ? 'review' : 'verified',
    location: clean(row.location?.name ?? row.city ?? base.location),
    contractor: clean(row.contractor ?? '—'),
    contractorId: row.contractor_id !== null && row.contractor_id !== undefined ? String(row.contractor_id) : '',
    tenderId: row.tender_id !== null && row.tender_id !== undefined ? String(row.tender_id) : '',
    tender: row.tender_reference ?? '—',
    description: row.description,
    min:
      row.latitude !== null && row.longitude !== null
        ? [row.latitude, row.longitude]
        : base.min,
    financials: fin
      ? {
          sanctioned: fin.sanctioned ?? 0,
          contract: fin.contract ?? 0,
          released: fin.released ?? 0,
          expenditure: fin.expenditure ?? 0,
        }
      : base.financials,
    photos: row.photos?.length ? toPhotos(row) : base.photos,
    sources: row.sources?.length ? toSources(row) : base.sources,
    progressMissing,
  }
}

export async function fetchHealth(): Promise<HealthResponse> {
  return getJSON<HealthResponse>('/health')
}

export interface DashboardSummary {
  projects: { total: number; completed: number; in_progress: number }
  departments: number
  contractors: number
  sanctioned_total: number
  evidence_count: number
  inspection_count: number
}

export function fetchDashboardSummary(): Promise<DashboardSummary> {
  return getJSON<DashboardSummary>('/dashboard/summary')
}

async function resolveProjectId(idOrRef: string): Promise<string> {
  if (/^\d+$/.test(idOrRef)) return idOrRef
  const res = await getJSON<{ items: ProjectListRow[] }>(
    `/projects?search=${encodeURIComponent(idOrRef)}`,
  )
  const match = res.items[0]
  if (!match) throw new Error(`Project ${idOrRef} not found`)
  return String(match.id)
}

export async function fetchProjects(arg?: unknown): Promise<Project[]> {
  const dataSource = typeof arg === 'string' ? (arg as 'REAL_PUBLIC' | 'SYNTHETIC') : undefined
  const qs = dataSource ? `?data_source=${encodeURIComponent(dataSource)}&page_size=100` : '?page_size=100'
  const res = await getJSON<{ items: ProjectListRow[] }>(`/projects${qs}`)
  return res.items.map(toProject)
}

export async function fetchProject(idOrRef: string): Promise<Project> {
  const pid = await resolveProjectId(idOrRef)
  const row = await getJSON<ProjectDetailRow>(`/projects/${pid}`)
  return toProjectDetail(row, toProject(row))
}

export async function fetchRelatedProjects(idOrRef: string, limit = 3): Promise<Project[]> {
  const pid = await resolveProjectId(idOrRef)
  const base = await fetchProject(pid)
  const res = await getJSON<{ items: ProjectListRow[] }>('/projects?page_size=100')
  const same = res.items.filter((r) => r.id !== Number(pid) && r.category === base.category)
  const rest = res.items.filter((r) => r.id !== Number(pid) && r.category !== base.category)
  return [...same, ...rest].slice(0, limit).map((r) => toProject({ ...r, category: r.category ?? base.category }))
}

export interface ProjectFinancials {
  sanctioned: number | null
  contract_amount: number | null
  released: number | null
  recorded_expenditure: number | null
  tender_estimated_value: number | null
  contract_reference: string | null
  contract_status: string | null
  payments: { reference: string; date: string | null; amount: number | null; type: string; status: string }[]
  financial_documents: { title: string; type: string; uploaded_at: string | null }[]
}

export function fetchProjectFinancials(idOrRef: string): Promise<ProjectFinancials> {
  return resolveProjectId(idOrRef).then((pid) => getJSON<ProjectFinancials>(`/projects/${pid}/financials`))
}

export interface ProjectEvidence {
  project_id: number
  government_claims: { reference: string; type: string; amount: number | null; status: string; description: string | null }[]
  inspections: {
    reference: string
    date: string | null
    type: string
    outcome: string | null
    findings: string | null
    measured_progress?: number | null
  }[]
  progress_reports: { reference: string; date: string | null; financial_percent: number | null; physical_percent: number | null; verified_percent: number | null }[]
  documents: { title: string; type: string; visibility: string | null }[]
  evidence: { id: number; description: string | null; source_type: string; status: string; captured_at: string | null; checksum: string }[]
  citizen_reports: {
    reference: string
    description: string
    status: string
    review_status: string
    reported_at: string | null
    photos: string[]
    report_type: string
  }[]
}

export function fetchProjectEvidence(idOrRef: string): Promise<ProjectEvidence> {
  return resolveProjectId(idOrRef).then((pid) => getJSON<ProjectEvidence>(`/projects/${pid}/evidence`))
}

export interface EvidenceSummary {
  project_id: number
  project_reference: string
  financials: {
    sanctioned: number | null
    contract: number | null
    released: number | null
    recorded_expenditure: number | null
  }
  progress: {
    government: number | null
    earlier_inspection: number | null
    latest_inspection: number | null
  }
  trustmesh: { state: string; reason: string; summary: string }
  fraudscope: { status: string; review_amount: string | null }
  counts: { evidence: number; citizen_reports: number }
}

export function fetchProjectEvidenceSummary(idOrRef: string): Promise<EvidenceSummary> {
  return resolveProjectId(idOrRef).then((pid) => getJSON<EvidenceSummary>(`/projects/${pid}/evidence-summary`))
}

export interface ProjectTimeline {
  project_id: number
  events: { date: string | null; type: string; title: string }[]
}

export function fetchProjectTimeline(idOrRef: string): Promise<ProjectTimeline> {
  return resolveProjectId(idOrRef).then((pid) => getJSON<ProjectTimeline>(`/projects/${pid}/timeline`))
}

export interface ProjectMap {
  project_id: number
  project_name: string
  latitude: number | null
  longitude: number | null
  location_name: string
}

export function fetchProjectMap(idOrRef: string): Promise<ProjectMap> {
  return resolveProjectId(idOrRef).then((pid) => getJSON<ProjectMap>(`/projects/${pid}/map`))
}

export interface ProjectDecision {
  project_id: number
  state: string
  reason: string
  summary?: string
  supporting?: string[]
  conflicting?: string[]
  missing?: string[]
  sources?: { type: string; reference: string; date: string | null }[]
  progress?: { gov: number | null; earlier: number | null; latest: number | null }
  claim_count: number
  evidence_count: number
  inspection_count: number
  verification: string
}

export function fetchProjectDecision(idOrRef: string): Promise<ProjectDecision> {
  return resolveProjectId(idOrRef).then((pid) => getJSON<ProjectDecision>(`/projects/${pid}/decision`))
}

export interface EvidenceGraphNode {
  id: string
  type: string
  title: string
  summary: string
  source: string | null
  date: string | null
  status: string | null
  meta: Record<string, string>
}

export interface EvidenceGraphEdge {
  id: string
  source: string
  target: string
  type: string
}

export interface EvidenceGraphData {
  project_id: number
  nodes: EvidenceGraphNode[]
  edges: EvidenceGraphEdge[]
}

export function fetchEvidenceGraph(idOrRef: string): Promise<EvidenceGraphData> {
  return resolveProjectId(idOrRef).then((pid) => getJSON<EvidenceGraphData>(`/projects/${pid}/evidence-graph`))
}

export interface FraudscopeFinding {
  type: string
  description: string
  reason: string
  amount_value: number | null
  amount_text: string | null
  supporting: string[]
  conflicting: string[]
  source: string | null
  date: string | null
  status: string
  human_review: boolean
}

export interface FraudscopeResult {
  project_id: number
  status: string
  summary: string
  findings: FraudscopeFinding[]
  verification: string
}

export function fetchFraudscope(idOrRef: string): Promise<FraudscopeResult> {
  return resolveProjectId(idOrRef).then((pid) => getJSON<FraudscopeResult>(`/projects/${pid}/fraudscope`))
}

export interface ContractorProjectRow {
  id: string
  name: string
  category: string
  status: string
  role: string
  value: string
}

export interface ContractRecord {
  id: string
  projectId: string
  projectName: string
  amount: string
  signed: string
  status: string
}

export interface AwardRecord {
  id: string
  title: string
  projectName: string
  date: string
  value: string
}

export interface PaymentRecord {
  id: string
  projectId: string
  projectName: string
  date: string
  amount: string
  status: string
}

export interface DelayRecord {
  id: string
  projectId: string
  projectName: string
  days: number
  reason: string
  status: string
}

export interface InspectionRecord {
  id: string
  projectId: string
  projectName: string
  date: string
  finding: string
}

export interface ContractorDocument {
  id: string
  title: string
  type: string
  date: string
}

export interface ContractorRecord {
  id: string
  name: string
  location: string
  registration: string
  established: number | null
  specialization: string
  projects: ContractorProjectRow[]
  contracts: ContractRecord[]
  awards: AwardRecord[]
  payments: PaymentRecord[]
  delays: DelayRecord[]
  inspections: InspectionRecord[]
  documents: ContractorDocument[]
}

interface ContractorApiRow {
  id: number
  name: string
  vendor_code: string | null
  registration_number: string | null
  pan_number: string | null
  gst_number: string | null
  contact_person: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  status: string | null
  projects: { id: number; reference_number: string; name: string; status: string | null }[]
  tender_awards: { id: number; reference: string; estimated_value: number | null; status: string | null; project_name?: string | null }[]
  contracts: {
    reference: string
    project_id: number
    status: string | null
    amount: number | null
    start_date: string | null
    completion_date: string | null
  }[]
  payments: { reference: string; date: string | null; amount: number | null; type: string; status: string; project_name?: string | null }[]
  inspections: { reference: string; date: string | null; outcome: string | null; type: string; findings: string | null; project_name?: string | null }[]
}

function contractStatus(status: string | null): string {
  const map: Record<string, string> = {
    active: 'Active',
    completed: 'Closed',
    terminated: 'Closed',
    on_hold: 'Ongoing',
    disputed: 'Reviewed',
    draft: 'Ongoing',
  }
  return map[status ?? ''] ?? (status ? `${status[0].toUpperCase()}${status.slice(1)}` : '—')
}

function projectNameMap(rows: ContractorApiRow): Map<number, string> {
  const map = new Map<number, string>()
  for (const p of rows.projects) map.set(p.id, clean(p.name))
  return map
}

export async function fetchContractor(id: string): Promise<ContractorRecord> {
  const row = await getJSON<ContractorApiRow>(`/contractors/${id}`)
  const names = projectNameMap(row)
  const contracts = row.contracts.map((c) => ({
    id: c.reference,
    projectId: String(c.project_id),
    projectName: names.get(c.project_id) ?? '—',
    amount: formatCrore(c.amount),
    signed: c.start_date ?? '—',
    status: contractStatus(c.status),
  }))
  return {
    id: String(row.id),
    name: clean(row.name),
    location: row.address ?? '—',
    registration: row.registration_number ?? '—',
    established: earliestYear(contracts),
    specialization: 'Registered vendor',
    projects: row.projects.map((p) => ({
      id: p.reference_number,
      name: clean(p.name),
      category: mapStatus(p.status),
      status: mapStatus(p.status),
      role: 'Contract holder',
      value: contractValue(contracts, p.id),
    })),
    contracts,
    awards: row.tender_awards.map((a) => ({
      id: a.reference,
      title: `Tender ${a.reference}`,
      projectName: clean(a.project_name ?? '—'),
      date: '—',
      value: formatCrore(a.estimated_value),
    })),
    payments: row.payments.map((p) => ({
      id: p.reference,
      projectId: '—',
      projectName: clean(p.project_name ?? '—'),
      date: p.date ?? '—',
      amount: formatCrore(p.amount),
      status: statusPillText(p.status),
    })),
    delays: [],
    inspections: row.inspections.map((i) => ({
      id: i.reference,
      projectId: '—',
      projectName: clean(i.project_name ?? '—'),
      date: i.date ?? '—',
      finding: i.findings ?? i.outcome ?? '—',
    })),
    documents: [],
  }
}

function statusPillText(status: string): string {
  const map: Record<string, string> = {
    paid: 'Paid',
    pending: 'Pending',
    approved: 'Reviewed',
    reviewed: 'Reviewed',
    withheld: 'Reviewed',
    completed: 'Closed',
  }
  return map[status] ?? (status ? `${status[0].toUpperCase()}${status.slice(1)}` : '—')
}

function earliestYear(contracts: { signed: string }[]): number | null {
  const years = contracts
    .map((c) => Number(c.signed?.slice(0, 4)))
    .filter((y) => Number.isFinite(y) && y > 1900)
  return years.length ? Math.min(...years) : null
}

function contractValue(contracts: ContractRecord[], projectId: number): string {
  const match = contracts.find((c) => c.projectId === String(projectId))
  return match?.amount ?? '—'
}

export interface TenderDocument {
  id: string
  title: string
  type: string
  date: string
}

export interface TenderRecord {
  id: string
  reference: string
  department: string
  tenderDate: string
  awardDate: string
  estimatedValue: string
  contractorId: string
  contractor: string
  contractAmount: string
  duration: string
  workOrder: string
  documents: TenderDocument[]
}

interface TenderApiRow {
  id: number
  reference: string
  title: string
  description: string | null
  department: string | null
  project_id: number | null
  publication_date: string | null
  submission_deadline: string | null
  estimated_value: number | null
  status: string | null
  awarded_contractor: string | null
  contractor_id: number | null
  contract_amount: number | null
  duration_days: number | null
  contract: {
    reference: string
    amount: number | null
    start_date: string | null
    completion_date: string | null
  } | null
  documents: { title: string; type: string }[]
}

export async function fetchTender(id: string): Promise<TenderRecord> {
  const row = await getJSON<TenderApiRow>(`/tenders/${id}`)
  return {
    id: row.reference,
    reference: row.reference,
    department: clean(row.department ?? '—'),
    tenderDate: row.publication_date ?? '—',
    awardDate: row.contract?.start_date ?? '—',
    estimatedValue: formatCrore(row.estimated_value),
    contractorId: row.contractor_id !== null && row.contractor_id !== undefined ? String(row.contractor_id) : '',
    contractor: clean(row.awarded_contractor ?? '—'),
    contractAmount: formatCrore(row.contract_amount ?? row.contract?.amount),
    duration: row.duration_days ? `${row.duration_days} days` : '—',
    workOrder: row.contract?.reference ?? '—',
    documents: row.documents.map((d, i) => ({
      id: `${row.reference}-${i}`,
      title: clean(d.title),
      type: d.type,
      date: '',
    })),
  }
}

export function evidenceCardsFromApi(data: ProjectEvidence): EvidenceCardData[] {
  const cards: EvidenceCardData[] = []

  for (const ins of data.inspections) {
    cards.push({
      id: ins.reference,
      title: 'Site inspection',
      type: 'Inspection Report',
      date: ins.date ?? '—',
      source: 'Independent Inspector',
      state: ins.outcome && !/pass|accept|^ok$/i.test(ins.outcome) ? 'REVIEW' : 'SUPPORTED',
      summary: ins.findings ?? ins.outcome ?? 'Inspection record.',
    })
  }

  for (const r of data.progress_reports) {
    cards.push({
      id: r.reference,
      title: 'Progress report',
      type: 'Progress Report',
      date: r.date ?? '—',
      source: 'Department Record',
      state: 'SUPPORTED',
      summary: `Physical ${percentLabel(r.physical_percent)} · financial ${percentLabel(r.financial_percent)} · verified ${percentLabel(r.verified_percent)}.`,
    })
  }

  for (const e of data.evidence) {
    const citizen = e.source_type.startsWith('citizen')
    cards.push({
      id: `EV-${e.id}`,
      title: e.description ?? 'Captured evidence',
      type: 'Citizen Evidence',
      date: e.captured_at?.slice(0, 10) ?? '—',
      source: citizen ? 'Citizen submission' : 'Verified record',
      state: citizen ? 'PENDING_REVIEW' : e.status === 'verified' ? 'SUPPORTED' : 'REVIEW',
      summary: `Source ${e.source_type} · status ${e.status}.`,
    })
  }

  for (const c of data.government_claims) {
    if (c.status === 'under_review' || c.type === 'financial_documentation') {
      cards.push({
        id: c.reference,
        title: 'Financial claim',
        type: 'Financial Record',
        date: '—',
        source: 'Treasury Record',
        state: 'REVIEW',
        summary: `${formatCrore(c.amount)} for ${c.type.replace(/_/g, ' ')}. Supporting documents pending review.`,
      })
    }
  }

  for (const d of data.documents) {
    cards.push({
      id: `DOC-${d.title}`,
      title: clean(d.title),
      type: 'Document',
      date: '—',
      source: 'Record Centre',
      state: 'SUPPORTED',
      summary: `${d.type.replace(/_/g, ' ')} document on file.`,
    })
  }

  return cards
}

export function moneyTrailFromDetail(project: Project) {
  return [
    { value: project.sanctioned, label: 'Sanctioned' },
    { value: project.contract, label: 'Contract' },
    { label: 'Contractor', value: project.contractor },
    { value: project.released, label: 'Released' },
    { value: project.expenditure, label: 'Recorded Expenditure' },
    { value: `${project.govProgress}%`, label: 'Physical Progress' },
  ]
}

export function projectDecisionLabel(state: string): string {
  const map: Record<string, string> = {
    INSUFFICIENT: 'INSUFFICIENT',
    NEEDS_REVIEW: 'HUMAN_REVIEW_REQUIRED',
    PENDING: 'INCOMPLETE',
    CONFLICTING: 'CONFLICTING',
  }
  return map[state] ?? state.replace(/_/g, ' ')
}

export function fetchPageInfo(slug: string): Promise<PageInfo> {
  return import('../data/pageInfo').then((mod) => Promise.resolve(mod.PAGE_INFO[slug] ?? { title: slug, description: 'Page coming soon.', sections: [] }))
}

export interface CompareFilters {
  city?: string
  category?: string
  department?: string
  from?: string
  to?: string
}

export interface CompareGroupRow {
  projects: number
  completed: number
  in_progress: number
  delayed: number
  sanctioned: number
  contract: number
  released: number
  expenditure: number
  evidence_count: number
  inspections: number
  evidence_completeness_pct: number
  inspection_coverage_pct: number
  average_delay_days: number | null
}

export interface CompareResponse {
  filters_applied: CompareFilters
  summary: CompareGroupRow & { total_projects: number; evidence_count: number; inspection_count: number }
  by_category: Record<string, CompareGroupRow>
  by_department: Record<string, CompareGroupRow>
  filter_options: { cities: string[]; categories: string[]; departments: string[] }
  metric_notes: Record<string, string>
}

export function fetchCompare(filters: CompareFilters = {}): Promise<CompareResponse> {
  const params = new URLSearchParams()
  if (filters.city) params.set('city', filters.city)
  if (filters.category) params.set('category', filters.category)
  if (filters.department) params.set('department', filters.department)
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  const qs = params.toString()
  return getJSON<CompareResponse>(`/compare${qs ? `?${qs}` : ''}`)
}

// ---------------------------------------------------------------------------
// CivicWatch (role-driven)
// ---------------------------------------------------------------------------

export interface CivicEvidenceSnapshot {
  url: string | null
  caption: string | null
  kind: string
  by_role: string
  attribution?: string | null
  license?: string | null
  note?: string | null
  at?: string | null
}

export interface CivicIssueDto {
  id: number
  issue_reference: string
  reported_by_id: number | null
  title: string
  description: string
  category: string
  category_key: string
  ward: string | null
  locality: string | null
  city: string
  location: string
  latitude: number | null
  longitude: number | null
  status: string
  trust_state: string
  confirmations: number
  comments_count: number
  reported_at: string | null
  notified_at: string | null
  sla: { target_hours: number; exceeded: boolean; note: string }
  main_image: {
    url: string | null
    caption: string | null
    attribution: string | null
    license: string | null
  }
  evidence: CivicEvidenceSnapshot[]
  verdict: string | null
  verdict_note: string | null
  verified_at: string | null
  capabilities: {
    can_create: boolean
    can_confirm: boolean
    can_act: boolean
    can_verify: boolean
    can_review: boolean
    can_view: boolean
  }
}

export interface CivicSummaryDto {
  total: number
  new_reports: number
  under_action: number
  awaiting_verification: number
  resolved: number
  conflicting: number
}

export interface CivicTimelineEvent {
  timestamp: string
  actor_email: string | null
  action: string
  before: unknown
  after: unknown
  source: string | null
}

async function send<T>(
  path: string,
  init?: RequestInit & { body?: BodyInit | null },
): Promise<T> {
  const token = tokenFromStorage()
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })
  if (!res.ok) {
    let detail = `Request failed with status ${res.status}`
    try {
      const body = (await res.json()) as { detail?: string }
      if (body.detail) detail = body.detail
    } catch {
      /* keep default message */
    }
    throw new Error(detail)
  }
  return (await res.json()) as T
}

export function fetchCivicIssues(opts?: {
  limit?: number
  categoryKey?: CivicCategoryKey | 'all' | 'nearby'
  status?: string
}): Promise<CivicIssueDto[]> {
  const params = new URLSearchParams()
  if (opts?.limit) params.set('limit', String(opts.limit))
  if (opts?.categoryKey && opts.categoryKey !== 'all' && opts.categoryKey !== 'nearby') {
    params.set('category_key', opts.categoryKey)
  }
  if (opts?.status) params.set('status', opts.status)
  const qs = params.toString()
  return getJSON<{ items: CivicIssueDto[] }>(`/civicwatch/issues${qs ? `?${qs}` : ''}`).then(
    (r) => r.items,
  )
}

export function fetchCivicIssue(id: number | string): Promise<CivicIssueDto> {
  return getJSON<CivicIssueDto>(`/civicwatch/issues/${id}`)
}

export function fetchCivicIssueTimeline(id: number | string): Promise<CivicTimelineEvent[]> {
  return getJSON<{ items: CivicTimelineEvent[] }>(`/civicwatch/issues/${id}/timeline`).then(
    (r) => r.items,
  )
}

export function fetchCivicSummary(): Promise<CivicSummaryDto> {
  return getJSON<CivicSummaryDto>('/civicwatch/summary')
}

export function createCivicIssue(payload: {
  title: string
  description: string
  category: string
  categoryKey: CivicCategoryKey
  ward?: string
  locality?: string
  city?: string
  latitude?: number
  longitude?: number
  photoUrl?: string
}): Promise<CivicIssueDto> {
  return send<CivicIssueDto>('/civicwatch/issues', {
    method: 'POST',
    body: JSON.stringify({
      title: payload.title,
      description: payload.description,
      category: payload.category,
      category_key: payload.categoryKey,
      ward: payload.ward,
      locality: payload.locality,
      city: payload.city ?? 'Nagpur',
      latitude: payload.latitude,
      longitude: payload.longitude,
      photo_url: payload.photoUrl,
    }),
  })
}

export function submitCivicIssueWithPhoto(payload: {
  photo: File
  category: string
  location: string
  description: string
}): Promise<CivicIssueDto> {
  const form = new FormData()
  form.append('photo', payload.photo)
  form.append('category', payload.category)
  form.append('location', payload.location)
  form.append('description', payload.description)
  form.append('title', payload.description.slice(0, 120))
  form.append('city', 'Nagpur')
  return sendForm<CivicIssueDto>('/civicwatch/issues', form)
}

async function sendForm<T>(path: string, form: FormData): Promise<T> {
  const token = tokenFromStorage()
  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      body: form,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.')
  }
  if (!res.ok) {
    let detail = `Submission failed (status ${res.status}).`
    try {
      const body = (await res.json()) as { detail?: string }
      if (body.detail) detail = body.detail
    } catch {
      /* keep default message */
    }
    throw new Error(detail)
  }
  return (await res.json()) as T
}

export function confirmCivicIssue(id: number | string): Promise<CivicIssueDto> {
  return send<CivicIssueDto>(`/civicwatch/issues/${id}/confirm`, { method: 'POST', body: '{}' })
}

export function transitionCivicIssue(
  id: number | string,
  action: 'action' | 'progress' | 'mark-fixed',
  note = '',
): Promise<CivicIssueDto> {
  return send<CivicIssueDto>(`/civicwatch/issues/${id}/${action}`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  })
}

export function verifyCivicIssue(
  id: number | string,
  verdict: 'FIXED' | 'PARTIALLY_FIXED' | 'STILL_EXISTS',
  note = '',
): Promise<CivicIssueDto> {
  return send<CivicIssueDto>(`/civicwatch/issues/${id}/verify`, {
    method: 'POST',
    body: JSON.stringify({ verdict, note }),
  })
}

export function reviewCivicIssue(
  id: number | string,
  decision: string,
  note = '',
): Promise<CivicIssueDto> {
  return send<CivicIssueDto>(`/civicwatch/issues/${id}/review`, {
    method: 'POST',
    body: JSON.stringify({ decision, note }),
  })
}

// ---------------------------------------------------------------------------
// CivicWatch DTO -> view mapper (shares the verified CivicIssue view shape)
// ---------------------------------------------------------------------------

const CATEGORY_LABEL_DETAIL: Record<string, string> = {
  pothole: 'Road Pothole',
  manhole: 'Open Manhole',
  garbage: 'Garbage Accumulation',
  streetlight: 'Broken Streetlight',
  leakage: 'Water Leakage',
  drainage: 'Drainage / Waterlogging',
  footpath: 'Damaged Footpath',
  roads: 'Roads',
  bridges: 'Bridges',
  schools: 'Schools',
  hospitals: 'Hospitals',
  water_plants: 'Water Plants',
  water_supply: 'Water Supply',
  public_buildings: 'Public Buildings',
  other: 'Other Infrastructure',
}

const STATUS_LABEL_MAP: Record<string, string> = {
  CITIZEN_SUBMITTED: 'CITIZEN-SUBMITTED',
  UNDER_PUBLIC_REVIEW: 'UNDER PUBLIC REVIEW',
  AUTHORITY_NOTIFIED: 'AUTHORITY NOTIFIED',
  UNDER_ACTION: 'UNDER ACTION',
  WORK_IN_PROGRESS: 'WORK IN PROGRESS',
  MARKED_FIXED: 'MARKED FIXED',
  CITIZEN_VERIFIED: 'CITIZEN VERIFIED',
  RESOLVED: 'RESOLVED',
  CONFLICTING: 'RESOLUTION DISPUTED',
  CLOSED: 'CLOSED',
}

function statusTone(status: string, exceeded: boolean): CivicIssue['statusTone'] {
  if (status === 'CONFLICTING') return 'rose'
  if (status === 'MARKED_FIXED' || status === 'CITIZEN_VERIFIED' || status === 'RESOLVED') return 'green'
  if (exceeded) return 'rose'
  if (status === 'AUTHORITY_NOTIFIED') return 'amber'
  if (status === 'UNDER_ACTION' || status === 'WORK_IN_PROGRESS') return 'blue'
  return 'slate'
}

function trustSummary(state: string | null): string {
  switch ((state ?? '').toUpperCase()) {
    case 'CONFLICTING':
      return "The records don't fully agree yet."
    case 'SUPPORTED':
      return 'Citizen verification evidence matches the authority resolution claim.'
    case 'QUESTIONABLE':
      return 'Records only partially agree; a neutral check is recommended.'
    case 'HUMAN_REVIEW_REQUIRED':
      return 'Human review recommended before treating this as settled.'
    case 'INCOMPLETE':
      return 'The evidence chain is incomplete.'
    case 'INSUFFICIENT':
      return 'Not enough independent evidence yet for a machine assessment.'
    default:
      return 'Assessment state pending.'
  }
}

function relTime(iso: string | null): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const mins = Math.max(0, Math.round(diff / 60000))
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

function imageAsset(dto: CivicIssueDto, snapshot: { url?: string | null; caption?: string | null }): ImageAsset {
  return {
    url: snapshot.url ?? dto.main_image.url ?? 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Potholes_on_road.jpg/960px-Potholes_on_road.jpg',
    caption: snapshot.caption ?? dto.main_image.caption ?? 'Representative image.',
    attribution: dto.main_image.attribution ?? 'Wikimedia Commons',
    license: dto.main_image.license ?? '—',
  }
}

export function civicToView(dto: CivicIssueDto): CivicIssue {
  const categoryKey = (dto.category_key || 'other') as CivicCategoryKey
  const evidenceSnapshots = (dto.evidence ?? []).filter((e) => e.url)
  const uniqueEvidence = evidenceSnapshots.reduce<CivicEvidenceSnapshot[]>((acc, e) => {
    if (!acc.some((x) => x.url === e.url)) acc.push(e)
    return acc
  }, [])
  const fixed = dto.status === 'MARKED_FIXED' || dto.status === 'CITIZEN_VERIFIED' || dto.status === 'RESOLVED'
  const beforeAfter =
    fixed && uniqueEvidence.length > 0
      ? (uniqueEvidence.find((e) => e.kind === 'completion') ?? uniqueEvidence[0])
      : undefined

  const workflow: CivicIssue['workflow'] = [
    { label: 'Citizen Report', time: relTime(dto.reported_at), tone: 'ok' },
  ]
  if (dto.confirmations > 0) {
    workflow.push({
      label: 'Public Confirmation',
      time: `${relTime(dto.notified_at ?? dto.reported_at) ?? '—'} · ${dto.confirmations} citizens`,
      tone: 'ok',
    })
  }
  if (dto.notified_at) {
    workflow.push({
      label: 'Authority Notified',
      time: relTime(dto.notified_at),
      tone: 'ok',
      note: 'Concerned authority informed.',
    })
  }
  if (!fixed) {
    workflow.push({
      label: '24-Hour Response Target',
      time: dto.sla.exceeded ? 'exceeded' : 'active',
      tone: dto.sla.exceeded ? 'bad' : 'warn',
      note: 'Product-level demo state; not a legal deadline.',
    })
  }
  if (dto.status === 'UNDER_ACTION') {
    workflow.push({ label: 'Under Action', time: 'now', tone: 'ok', note: 'Authority has started work.' })
  } else if (dto.status === 'WORK_IN_PROGRESS') {
    workflow.push({ label: 'Under Action', time: '—', tone: 'ok' })
    workflow.push({ label: 'Work In Progress', time: 'now', tone: 'ok', note: 'Work logged by the authority.' })
  } else if (dto.status === 'MARKED_FIXED') {
    workflow.push({ label: 'Authority Action', time: '—', tone: 'ok', note: 'Work recorded by the authority.' })
    workflow.push({ label: 'Marked Fixed', time: 'now', tone: 'ok' })
  } else if (dto.status === 'CITIZEN_VERIFIED' || dto.status === 'RESOLVED') {
    workflow.push({ label: 'Authority Action', time: '—', tone: 'ok' })
    workflow.push({ label: 'Marked Fixed', time: relTime(dto.verified_at) ?? '—', tone: 'ok' })
    workflow.push({
      label: 'Citizen Verification',
      time: relTime(dto.verified_at),
      tone: dto.verdict === 'FIXED' ? 'ok' : 'warn',
      note: dto.verdict_note ?? '',
    })
  } else if (dto.status === 'CONFLICTING') {
    workflow.push({ label: 'Still Unresolved', time: 'now', tone: 'bad', note: "The records don't fully agree yet." })
  }

  let verify: CivicIssue['verify']
  if (dto.verdict) {
    const state = dto.verdict === 'FIXED' ? 'FIXED' : dto.verdict === 'PARTIALLY_FIXED' ? 'PARTIALLY FIXED' : 'RESOLUTION DISPUTED'
    verify = {
      state,
      heading: 'Citizen Verification',
      note: dto.verdict_note ?? 'Verification recorded by a citizen.',
      canRespond: dto.capabilities.can_verify && (dto.status === 'MARKED_FIXED' || dto.status === 'CITIZEN_VERIFIED' || dto.status === 'CONFLICTING'),
    }
  } else if (dto.status === 'MARKED_FIXED') {
    verify = {
      state: 'AWAITING VERIFICATION',
      heading: 'Citizen Verification',
      note: 'Authority recorded the fix. Citizens can now confirm or dispute it.',
      canRespond: dto.capabilities.can_verify,
    }
  } else {
    verify = {
      state: 'AWAITING VERIFICATION',
      heading: 'Citizen Verification',
      note: 'Waiting for authority action and citizen verification.',
      canRespond: false,
    }
  }

  return {
    id: dto.issue_reference,
    categoryKey,
    categoryLabel: CATEGORY_LABEL_DETAIL[dto.category] ?? CATEGORY_LABEL_DETAIL.other,
    categoryColor: CATEGORY_COLORS[categoryKey] ?? '#64748b',
    location: dto.location,
    reportedAt: relTime(dto.reported_at),
    description: dto.description,
    confirmations: dto.confirmations,
    comments: dto.comments_count,
    statusLabel: STATUS_LABEL_MAP[dto.status] ?? dto.status.replace(/_/g, ' '),
    statusTone: statusTone(dto.status, dto.sla.exceeded),
    slaExceeded: dto.sla.exceeded,
    mainImage: imageAsset(dto, { url: dto.main_image.url, caption: dto.main_image.caption }),
    afterImage: beforeAfter ? imageAsset(dto, beforeAfter) : undefined,
    evidenceImages: uniqueEvidence.slice(0, 4).map((e) => imageAsset(dto, e)),
    workflow,
    verify,
    trustmesh: { state: dto.trust_state, summary: trustSummary(dto.trust_state) },
    coords: [
      dto.latitude !== null && dto.latitude !== undefined ? dto.latitude : 21.1458,
      dto.longitude !== null && dto.longitude !== undefined ? dto.longitude : 79.0882,
    ],
  }
}