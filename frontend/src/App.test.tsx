import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

vi.mock('./components/dashboard/LeafletMap', () => ({
  default: () => <div data-testid="map-placeholder" />,
}))

vi.mock('./lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./lib/api')>()
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

import App from './App'
import {
  fetchContractor,
  fetchDashboardSummary,
  fetchPageInfo,
  fetchProject,
  fetchProjectDecision,
  fetchProjectEvidence,
  fetchProjectTimeline,
  fetchProjects,
  fetchRelatedProjects,
  fetchTender,
} from './lib/api'
import { CONTRACTORS, PROJECTS, TENDERS } from './data/testFixtures'

function queryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderApp(initial = '/') {
  return render(
    <QueryClientProvider client={queryClient()}>
      <MemoryRouter initialEntries={[initial]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.mocked(fetchProjects).mockReset()
  vi.mocked(fetchProject).mockReset()
  vi.mocked(fetchRelatedProjects).mockReset()
  vi.mocked(fetchContractor).mockReset()
  vi.mocked(fetchTender).mockReset()
  vi.mocked(fetchPageInfo).mockReset()
  vi.mocked(fetchDashboardSummary).mockReset()
  vi.mocked(fetchProjectEvidence).mockReset()
  vi.mocked(fetchProjectTimeline).mockReset()
  vi.mocked(fetchProjectDecision).mockReset()

  vi.mocked(fetchProjects).mockResolvedValue(PROJECTS)
  vi.mocked(fetchProject).mockResolvedValue(PROJECTS[0])
  vi.mocked(fetchRelatedProjects).mockResolvedValue(
    PROJECTS.filter((p) => p.id !== 'NRD-204'),
  )
  vi.mocked(fetchContractor).mockResolvedValue(CONTRACTORS['1'])
  vi.mocked(fetchTender).mockResolvedValue(TENDERS['1'])
  vi.mocked(fetchDashboardSummary).mockResolvedValue({
    projects: { total: 4, completed: 1, in_progress: 2 },
    departments: 4,
    contractors: 2,
    sanctioned_total: 300,
    evidence_count: 12,
    inspection_count: 5,
  })
})

describe('App routing', () => {
  it('starts on the dashboard and filters via the top-nav search', async () => {
    const user = userEvent.setup()
    renderApp('/')

    expect(await screen.findByText('See where public money is going.')).toBeInTheDocument()
    await screen.findByText('Featured Projects')

    await user.type(screen.getByRole('searchbox', { name: 'Search projects' }), 'school')
    expect(screen.queryByRole('link', { name: 'Open City Hospital Expansion' })).not.toBeInTheDocument()
    expect((await screen.findAllByRole('link', { name: 'Open Government High School' })).length).toBeGreaterThan(0)
  })

  it('navigates to the projects list from the top nav', async () => {
    renderApp('/')
    await screen.findByText('4', { exact: true })

    const primaryNav = screen.getByRole('navigation', { name: 'Primary' })
    await userEvent.click(within(primaryNav).getByRole('link', { name: 'Projects' }))
    expect(
      await screen.findByRole('heading', { name: 'Projects', level: 1 }),
    ).toBeInTheDocument()
    expect(
      (await screen.findAllByText('SYNTHETIC HACKATHON DATA')).length,
    ).toBeGreaterThan(0)
  })

  it('opens a project detail, then the linked contractor page', async () => {
    const user = userEvent.setup()
    renderApp('/')
    await screen.findByText('4', { exact: true })

    await user.click(
      await screen.findByRole('link', { name: 'Open Ward 24 Road Development' }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Ward 24 Road Development', level: 2 }),
    ).toBeInTheDocument()
    await screen.findByRole('link', { name: /BuildRight Infra Pvt\. Ltd\./ })

    await user.click(screen.getByRole('link', { name: /BuildRight Infra Pvt\. Ltd\./ }))

    expect(
      await screen.findByRole('heading', { name: 'BuildRight Infra Pvt. Ltd.', level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getByText('Inspection records')).toBeInTheDocument()
    expect(screen.queryByText(/score/i)).not.toBeInTheDocument()
  })

  it('navigates to a tender page from the tender link', async () => {
    const user = userEvent.setup()
    renderApp('/projects/NRD-204')

    await screen.findByRole('heading', { name: 'Ward 24 Road Development', level: 2 })

    await user.click(screen.getByRole('link', { name: /TND-2024-118/ }))
    expect(await screen.findByText('Tender reference')).toBeInTheDocument()
    expect(screen.getByText('NAGPUR-PWD/2024/118')).toBeInTheDocument()
  })

  it('renders the 404 page for unknown routes', async () => {
    renderApp('/does-not-exist')
    expect(await screen.findByText('This page does not exist')).toBeInTheDocument()
  })
})