import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router-dom'

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>()
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

import { fetchProject, fetchRelatedProjects } from '../lib/api'
import { PROJECTS } from '../data/testFixtures'
import ProjectPage from './ProjectPage'
import { renderWithProviders } from '../test/helpers'

const mockedFetchProject = vi.mocked(fetchProject)
const mockedFetchRelated = vi.mocked(fetchRelatedProjects)

function renderRoute(path: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/projects/:id" element={<ProjectPage />} />
    </Routes>,
    { initialEntries: [path] },
  )
}

beforeEach(() => {
  mockedFetchProject.mockReset()
  mockedFetchRelated.mockReset()
  mockedFetchRelated.mockResolvedValue(PROJECTS.filter((p) => p.id !== 'NRD-204'))
})

describe('ProjectPage', () => {
  it('renders financial metrics, evidence, contractor and tender links', async () => {
    mockedFetchProject.mockResolvedValue(PROJECTS[0])
    renderRoute('/projects/NRD-204')

    expect(
      await screen.findByRole('heading', { name: 'Ward 24 Road Development', level: 2 }),
    ).toBeInTheDocument()
    for (const value of ['₹50 Cr', '₹47.8 Cr', '₹42 Cr', '₹39 Cr']) {
      expect(screen.getAllByText(value, { exact: true }).length).toBeGreaterThan(0)
    }

    await screen.findByRole('link', { name: /BuildRight Infra Pvt\. Ltd\./ })
    await screen.findByRole('link', { name: /TND-2024-118/ })

    expect(screen.getByRole('heading', { name: 'Related Projects' })).toBeInTheDocument()
    expect(screen.getByText('Government High School')).toBeInTheDocument()
  })

  it('shows the loading panel while the project is pending', () => {
    mockedFetchProject.mockImplementation(() => new Promise(() => {}))
    renderRoute('/projects/NRD-204')
    expect(screen.getByTestId('loading-panel')).toBeInTheDocument()
  })

  it('shows an error state with retry for an unknown id', async () => {
    mockedFetchProject.mockRejectedValueOnce(new Error('Project XXX-01 not found'))
    mockedFetchProject.mockResolvedValueOnce(PROJECTS[0])

    renderRoute('/projects/XXX-01')
    expect(await screen.findByTestId('error-state')).toHaveTextContent(
      'Project XXX-01 not found',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(
      await screen.findByRole('heading', { name: 'Ward 24 Road Development', level: 2 }),
    ).toBeInTheDocument()
  })
})