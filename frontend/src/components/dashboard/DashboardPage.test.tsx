import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./LeafletMap', () => ({
  default: () => <div data-testid="map-placeholder" />,
}))

vi.mock('../../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api')>()
  return {
    ...actual,
    fetchProjects: vi.fn(),
    fetchProject: vi.fn(),
    fetchRelatedProjects: vi.fn(),
    fetchContractor: vi.fn(),
    fetchTender: vi.fn(),
    fetchPageInfo: vi.fn(),
    fetchDashboardSummary: vi.fn(),
    fetchProjectEvidence: vi.fn(),
    fetchProjectTimeline: vi.fn(),
    fetchProjectDecision: vi.fn(),
    fetchProjectMap: vi.fn(),
  }
})

import { fetchDashboardSummary, fetchProjects } from '../../lib/api'
import { PROJECTS } from '../../data/testFixtures'
import DashboardPage from '../../pages/DashboardPage'
import TopNav from '../layout/TopNav'
import { renderWithProviders } from '../../test/helpers'

const mockedFetchProjects = vi.mocked(fetchProjects)
const mockedFetchDashboardSummary = vi.mocked(fetchDashboardSummary)

function renderPage() {
  renderWithProviders(
    <>
      <TopNav onMenuClick={() => {}} />
      <DashboardPage />
    </>,
  )
}

beforeEach(() => {
  mockedFetchProjects.mockReset()
  mockedFetchDashboardSummary.mockReset()
  mockedFetchDashboardSummary.mockResolvedValue({
    projects: { total: 4, completed: 1, in_progress: 2 },
    departments: 4,
    contractors: 2,
    sanctioned_total: 300,
    evidence_count: 12,
    inspection_count: 5,
  })
})

describe('DashboardPage', () => {
  it('renders the hero, feature sections and project cards once projects arrive', async () => {
    mockedFetchProjects.mockResolvedValue(PROJECTS)
    renderPage()

    expect(await screen.findByText('See where public money is going.')).toBeInTheDocument()
    expect(await screen.findByText('Featured Projects')).toBeInTheDocument()
    expect(screen.getAllByText(/4 projects/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Ward 24 Road Development').length).toBeGreaterThan(0)
    expect((await screen.findAllByText('City Hospital Expansion')).length).toBeGreaterThan(0)
  })

  it('renders the NRD-204 money trail with a provisional TRUSTMESH state', async () => {
    mockedFetchProjects.mockResolvedValue(PROJECTS)
    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'Ward 24 Road Development', level: 2 }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('₹50 Cr').length).toBeGreaterThan(0)
    expect(screen.getByText('Government Claim')).toBeInTheDocument()
    expect(screen.getByTestId('trustmesh-state')).toHaveTextContent('TRUSTMESH CONFLICTING')
  })

  it('shows dashboard quick actions', async () => {
    mockedFetchProjects.mockResolvedValue(PROJECTS)
    renderPage()

    for (const label of ['Browse all projects', /View Comparison/, 'View CivicWatch', /View history/]) {
      expect(await screen.findByRole('link', { name: label })).toBeInTheDocument()
    }
  })

  it('filters cards from the shared search', async () => {
    const user = userEvent.setup()
    mockedFetchProjects.mockResolvedValue(PROJECTS)
    renderPage()
    await screen.findByText('Featured Projects')

    await user.type(screen.getByRole('searchbox', { name: 'Search projects' }), 'school')
    expect(await screen.findAllByRole('link', { name: 'Open Government High School' })).not.toHaveLength(0)
    expect(screen.queryByRole('link', { name: 'Open City Hospital Expansion' })).not.toBeInTheDocument()
  })

  it('shows an empty state when no projects match', async () => {
    mockedFetchProjects.mockResolvedValue([])
    renderPage()
    expect(await screen.findByTestId('empty-state')).toHaveTextContent(
      'No projects found',
    )
  })

  it('shows an error state with working retry', async () => {
    mockedFetchProjects.mockRejectedValueOnce(new Error('network down'))
    mockedFetchProjects.mockResolvedValueOnce(PROJECTS)

    renderPage()
    expect(await screen.findByTestId('error-state')).toHaveTextContent(
      'Could not load this page',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('4', { exact: true })).toBeInTheDocument()
  })

  it('shows the loading skeleton while projects are pending', () => {
    mockedFetchProjects.mockImplementation(() => new Promise(() => {}))
    mockedFetchDashboardSummary.mockImplementation(() => new Promise(() => {}))
    renderPage()
    expect(screen.getByTestId('loading-cards')).toBeInTheDocument()
  })
})