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

import { fetchProjects } from '../lib/api'
import { PROJECTS } from '../data/testFixtures'
import ProjectsPage from './ProjectsPage'
import { renderWithProviders } from '../test/helpers'

const mockedFetchProjects = vi.mocked(fetchProjects)

function renderPage(initial = '/projects') {
  return renderWithProviders(
    <Routes>
      <Route path="/projects" element={<ProjectsPage />} />
    </Routes>,
    { initialEntries: [initial] },
  )
}

beforeEach(() => {
  mockedFetchProjects.mockReset()
})

describe('ProjectsPage', () => {
  it('renders all project cards on success', async () => {
    mockedFetchProjects.mockResolvedValue(PROJECTS)
    renderPage()
    expect(
      await screen.findByRole('heading', { name: 'Projects', level: 1 }),
    ).toBeInTheDocument()
    for (const name of [
      'Ward 24 Road Development',
      'Government High School',
      'Water Treatment Plant',
      'City Hospital Expansion',
    ]) {
      expect(await screen.findByText(name)).toBeInTheDocument()
    }
  })

  it('shows the loading skeleton while pending', () => {
    mockedFetchProjects.mockImplementation(() => new Promise(() => {}))
    renderPage()
    expect(screen.getByTestId('loading-cards')).toBeInTheDocument()
  })

  it('shows an empty state when no projects exist', async () => {
    mockedFetchProjects.mockResolvedValue([])
    renderPage()
    expect(await screen.findByTestId('empty-state')).toHaveTextContent(
      'No projects found',
    )
  })

  it('shows an error state that recovers on retry', async () => {
    mockedFetchProjects.mockRejectedValueOnce(new Error('Registry offline'))
    mockedFetchProjects.mockResolvedValueOnce(PROJECTS)
    renderPage()

    expect(await screen.findByTestId('error-state')).toHaveTextContent(
      'Registry offline',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('City Hospital Expansion')).toBeInTheDocument()
  })

  it('filters by category from the URL', async () => {
    mockedFetchProjects.mockResolvedValue(PROJECTS)
    renderPage('/projects?category=Schools')
    expect(
      await screen.findByRole('heading', { name: 'Projects', level: 1 }),
    ).toBeInTheDocument()
    expect(
      (await screen.findAllByText('Government High School')).length,
    ).toBeGreaterThan(0)
    expect(screen.queryByText('Water Treatment Plant')).not.toBeInTheDocument()
    expect(await screen.findByText('Category: Schools')).toBeInTheDocument()
  })
})