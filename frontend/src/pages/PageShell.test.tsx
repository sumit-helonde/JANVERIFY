import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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

import { fetchPageInfo } from '../lib/api'
import PageShell from './PageShell'
import { renderWithProviders } from '../test/helpers'
import type { PageInfo } from '../data/pageInfo'

const mockedFetchPageInfo = vi.mocked(fetchPageInfo)

const aboutInfo: PageInfo = {
  title: 'About JANVERIFY',
  description: 'An independent, non-partisan platform.',
  sections: [
    { id: 'mission', title: 'Mission', description: 'Every citizen has the right to know.' },
  ],
}

beforeEach(() => {
  mockedFetchPageInfo.mockReset()
})

describe('PageShell', () => {
  it('renders the page content on success', async () => {
    mockedFetchPageInfo.mockResolvedValue(aboutInfo)
    renderWithProviders(<PageShell slug="about" />)

    expect(
      await screen.findByRole('heading', { name: 'About JANVERIFY', level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Mission' })).toBeInTheDocument()
    expect(screen.getByText('Every citizen has the right to know.')).toBeInTheDocument()
  })

  it('shows the loading panel while pending', () => {
    mockedFetchPageInfo.mockImplementation(() => new Promise(() => {}))
    renderWithProviders(<PageShell slug="about" />)
    expect(screen.getByTestId('loading-panel')).toBeInTheDocument()
  })

  it('shows an empty state for a slug with no sections', async () => {
    mockedFetchPageInfo.mockResolvedValue({ title: 'X', description: 'x', sections: [] })
    renderWithProviders(<PageShell slug="unknown" />)
    expect(await screen.findByTestId('empty-state')).toHaveTextContent(
      'Nothing here yet',
    )
  })

  it('shows an error state and recovers on retry', async () => {
    mockedFetchPageInfo.mockRejectedValueOnce(new Error('Page service offline'))
    mockedFetchPageInfo.mockResolvedValueOnce(aboutInfo)

    renderWithProviders(<PageShell slug="about" />)
    expect(await screen.findByTestId('error-state')).toHaveTextContent(
      'Page service offline',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(
      await screen.findByRole('heading', { name: 'About JANVERIFY', level: 1 }),
    ).toBeInTheDocument()
  })
})